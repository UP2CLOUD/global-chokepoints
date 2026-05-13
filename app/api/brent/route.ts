// ============================================================
// /api/brent — Live Brent Crude price + 7-day history
//
// Source priority (first success wins):
//  1. Yahoo Finance (BZ=F) — real-time, no key.  Can 429 on server-side calls.
//  2. EIA (RBRTE)          — keyed, up to 5 d lag acceptable.
//  3. EIA (stale)          — if Yahoo is down and EIA is older than 5 d, still
//                            serve it flagged as stale rather than returning 502.
//  4. Module-level cache   — last successful Yahoo payload (up to 6 h old).
//
// Never return 502 when we have any data at all, even stale.
// ============================================================
import { NextResponse } from 'next/server';
import { fetchEiaSpot, eiaToTicker } from '@/app/lib/eia';

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

// In-process cache for the Yahoo fallback so a 429 doesn't blank out
// the dashboard. Replaced as soon as a fresh fetch succeeds.
let yahooCache: { ts: number; payload: Payload } | null = null;
const STALE_OK_MS = 6 * 60 * 60 * 1000;

async function fetchYahoo(): Promise<Payload> {
  // Try query2 first (different rate-limit pool), fall back to query1
  const hosts = ['query2.finance.yahoo.com', 'query1.finance.yahoo.com'];
  let lastErr: unknown;
  for (const host of hosts) {
    const url =
      `https://${host}/v8/finance/chart/BZ=F` +
      '?interval=1d&range=14d&includePrePost=false';
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          Accept: 'application/json, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Referer: 'https://finance.yahoo.com/',
          Origin: 'https://finance.yahoo.com',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} (${host})`);
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
      yahooCache = { ts: Date.now(), payload };
      return payload;
    } catch (err) {
      console.warn(`[brent] Yahoo ${host} failed:`, (err as Error).message);
      lastErr = err;
    }
  }
  // Both Yahoo hosts failed — try stale cache before giving up
  if (yahooCache && Date.now() - yahooCache.ts < STALE_OK_MS) {
    console.warn('[brent] all Yahoo hosts failed; serving stale cache.');
    return { ...yahooCache.payload, stale: true, source: 'Yahoo Finance (cached)' };
  }
  throw lastErr;
}

// Preferred EIA freshness limit. If EIA data is older than this,
// we prefer Yahoo — but still fall back to stale EIA over a 502.
const EIA_PREFERRED_MAX_AGE_DAYS = 5;

export async function GET() {
  // 1) Try Yahoo Finance first — real-time, no key required
  try {
    const payload = await fetchYahoo();
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.warn('[api/brent] Yahoo failed, trying EIA:', (err as Error).message);
  }

  // 2) Try EIA — fresh data preferred, stale data accepted as last resort
  try {
    const eia = await fetchEiaSpot('RBRTE');
    if (eia) {
      const latestTs = eia.points[eia.points.length - 1].ts;
      const ageDays = (Date.now() - latestTs) / (1000 * 60 * 60 * 24);
      const isStale = ageDays > EIA_PREFERRED_MAX_AGE_DAYS;

      if (isStale) {
        console.warn(
          `[api/brent] EIA data is ${ageDays.toFixed(1)} days old — serving as stale fallback`
        );
      }

      const payload = eiaToTicker(eia);
      return NextResponse.json(
        {
          ...payload,
          source: isStale
            ? `EIA (PET.RBRTE.D · ${Math.round(ageDays)}d old)`
            : 'EIA (PET.RBRTE.D)',
          stale: isStale || undefined,
        },
        {
          headers: {
            'Cache-Control': isStale
              ? 'public, s-maxage=60, stale-while-revalidate=120'
              : 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }
  } catch (err) {
    console.error('[api/brent] EIA also failed:', (err as Error).message);
  }

  // Should never reach here in practice (EIA key is always set)
  return NextResponse.json(
    { error: 'Both Yahoo Finance and EIA are unavailable', source: 'all sources failed' },
    { status: 502 }
  );
}
