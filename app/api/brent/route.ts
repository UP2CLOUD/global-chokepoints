// ============================================================
// /api/brent — Live Brent Crude price + 7-day history
//
// Source priority (first success wins):
//  1. Yahoo Finance (BZ=F) — real-time, crumb-authenticated to avoid 429.
//  2. Stooq (BZ.F)         — free CSV, separate rate-limit pool.
//  3. EIA (RBRTE)          — keyed, up to 5 d lag acceptable.
//  4. Module-level cache   — last successful payload (up to 6 h old).
//
// Never return 502 when we have any data at all, even stale.
// ============================================================
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { fetchEiaSpot, eiaToTicker } from '@/app/lib/eia';
import { getKV } from '@/app/lib/kv';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

type Payload = {
  price: number;
  change: number;
  changePercent: number;
  history: { date: string; price: number }[];
  asOf: string;
  source: string;
  stale?: boolean;
};

// In-process cache — shared across all sources so any success survives
// a subsequent source failure.
let priceCache: { ts: number; payload: Payload } | null = null;
const STALE_OK_MS = 6 * 60 * 60 * 1000;

// Backoff: don't retry Yahoo for 5 min after a 429 (avoids burning rate limit in dev)
let yahooBackoffUntil = 0;

async function fetchYahoo(): Promise<Payload> {
  if (Date.now() < yahooBackoffUntil) throw new Error('Yahoo in backoff');
  // Minimal headers — Referer/Origin trigger 429; Edge Runtime fetch works without them.
  const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  let lastErr: unknown;
  for (const host of hosts) {
    const url =
      `https://${host}/v8/finance/chart/BZ=F` +
      `?interval=1d&range=14d&includePrePost=false`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept': 'application/json, */*' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        if (res.status === 429) yahooBackoffUntil = Date.now() + 5 * 60 * 1000;
        throw new Error(`Yahoo HTTP ${res.status} (${host})`);
      }
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) throw new Error('No chart payload');

      const timestamps: number[] = result.timestamp ?? [];
      const closes: (number | null)[] =
        result.indicators?.quote?.[0]?.close ?? [];
      const meta = result.meta ?? {};

      const history = timestamps
        .map((t, i) => ({ ts: t, price: closes[i] }))
        .filter((p): p is { ts: number; price: number } => p.price != null);
      if (history.length < 2) throw new Error('Insufficient history');

      const chart = history.slice(-7).map((h) => ({
        date: new Date(h.ts * 1000).toLocaleDateString('en-US', {
          day: '2-digit', month: '2-digit',
        }),
        price: Number(h.price.toFixed(2)),
      }));

      const latest = meta.regularMarketPrice ?? history[history.length - 1].price;
      const previous = meta.chartPreviousClose ?? history[history.length - 2].price;
      const change = latest - previous;
      const changePercent = (change / previous) * 100;

      const payload: Payload = {
        price: Number(latest.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        history: chart,
        asOf: new Date((meta.regularMarketTime ?? Date.now() / 1000) * 1000).toISOString(),
        source: `Yahoo Finance (${host})`,
      };
      priceCache = { ts: Date.now(), payload };
      return payload;
    } catch (err) {
      console.warn(`[brent] Yahoo ${host} failed:`, (err as Error).message);
      lastErr = err;
    }
  }
  throw lastErr;
}

// ── Stooq fallback (free, no key, separate rate-limit pool from Yahoo) ────
async function fetchStooq(): Promise<Payload> {
  // stooq returns CSV: Date,Open,High,Low,Close,Volume
  const url = 'https://stooq.com/q/d/l/?s=bz.f&i=d';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Stooq HTTP ${res.status}`);
  const csv = await res.text();
  const lines = csv.trim().split('\n').filter((l) => l && !l.startsWith('Date'));
  if (lines.length < 2) throw new Error('Stooq: insufficient data');

  const parsed = lines.map((line) => {
    const [date, , , , close] = line.split(',');
    return { date: date.trim(), price: parseFloat(close) };
  }).filter((p) => !isNaN(p.price));

  const history = parsed.slice(-7);
  const latest = history[history.length - 1].price;
  const previous = history[history.length - 2]?.price ?? latest;
  const change = latest - previous;
  const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

  // Format dates from YYYY-MM-DD to MM/DD
  const chart = history.map((h) => {
    const [, m, d] = h.date.split('-');
    return { date: `${m}/${d}`, price: Number(h.price.toFixed(2)) };
  });

  const payload: Payload = {
    price: Number(latest.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    history: chart,
    asOf: new Date().toISOString(),
    source: 'Stooq (BZ.F)',
  };
  priceCache = { ts: Date.now(), payload };
  return payload;
}

// Preferred EIA freshness limit. If EIA data is older than this,
// we prefer Yahoo — but still fall back to stale EIA over a 502.
const EIA_PREFERRED_MAX_AGE_DAYS = 5;

type XCache = 'HIT' | 'MISS' | 'STALE';

const ok = (payload: Payload, staleOverride?: boolean, xCache: XCache = 'MISS') =>
  NextResponse.json(
    staleOverride ? { ...payload, stale: true } : payload,
    { headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'X-Cache': xCache,
    }}
  );

export async function GET() {
  const kv = getKV();

  // Check KV cache first (if it exists and is fresh)
  if (kv) {
    try {
      const cached = await kv.get('BRENT_PAYLOAD', 'json');
      if (cached) {
        // If we want to return directly from KV, we could, but to keep data fresh,
        // we'll only return from KV if it's less than 5 mins old, otherwise we fetch
        // and update KV in the background or right now.
        // For simplicity, let's treat KV as a fallback just like module-cache but persistent.
        const parsed = cached as { ts: number; payload: Payload };
        if (Date.now() - parsed.ts < 5 * 60 * 1000) {
          return ok(parsed.payload, false, 'HIT');
        }
      }
    } catch (err) {
      console.warn('[api/brent] KV read failed:', err);
    }
  }

  const updateKV = (payload: Payload) => {
    if (kv) {
      kv.put('BRENT_PAYLOAD', JSON.stringify({ ts: Date.now(), payload })).catch(e => 
        console.warn('[api/brent] KV write failed:', e)
      );
    }
  };

  // 1) Yahoo Finance — real-time, minimal headers to avoid 429 in Edge Runtime
  try {
    const data = await fetchYahoo();
    updateKV(data);
    return ok(data);
  } catch (err) {
    console.warn('[api/brent] Yahoo failed, trying Stooq:', (err as Error).message);
  }

  // 2) Stooq — free CSV, separate rate-limit pool from Yahoo
  try {
    const data = await fetchStooq();
    updateKV(data);
    return ok(data);
  } catch (err) {
    console.warn('[api/brent] Stooq failed, trying EIA:', (err as Error).message);
  }

  // 3) EIA — keyed, up to 5-day lag acceptable; serve stale data over 502
  try {
    const eia = await fetchEiaSpot('RBRTE');
    if (eia) {
      const latestTs = eia.points[eia.points.length - 1].ts;
      const ageDays = (Date.now() - latestTs) / (1000 * 60 * 60 * 24);
      const isStale = ageDays > EIA_PREFERRED_MAX_AGE_DAYS;
      if (isStale) console.warn(`[api/brent] EIA data is ${ageDays.toFixed(1)} days old — serving as stale fallback`);
      const payload = eiaToTicker(eia);
      const result = {
        ...payload,
        source: isStale ? `EIA (PET.RBRTE.D · ${Math.round(ageDays)}d old)` : 'EIA (PET.RBRTE.D)',
        stale: isStale || undefined,
      };
      priceCache = { ts: Date.now(), payload: result };
      updateKV(result);
      return NextResponse.json(result, {
        headers: {
          'Cache-Control': isStale ? 'public, s-maxage=60, stale-while-revalidate=120' : 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Cache': 'MISS',
        },
      });
    }
  } catch (err) {
    console.error('[api/brent] EIA also failed:', (err as Error).message);
  }

  // 4) Last resort — serve whatever is in module-level cache (up to 6 h old)
  if (priceCache && Date.now() - priceCache.ts < STALE_OK_MS) {
    console.warn('[api/brent] all sources failed; serving module cache.');
    return ok(priceCache.payload, true, 'STALE');
  }

  // 5) KV Fallback — last ditch effort before returning 502
  if (kv) {
    try {
      const cached = await kv.get('BRENT_PAYLOAD', 'json');
      if (cached) {
        console.warn('[api/brent] all sources failed; serving KV cache.');
        const parsed = cached as { ts: number; payload: Payload };
        return ok(parsed.payload, true, 'STALE');
      }
    } catch (err) {
      console.warn('[api/brent] KV read fallback failed:', err);
    }
  }

  return NextResponse.json(
    { error: 'All Brent price sources unavailable', source: 'all sources failed' },
    { status: 502 }
  );
}
