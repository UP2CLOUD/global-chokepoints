// ============================================================
// /api/markets — Brent + WTI + Henry Hub futures
// Primary:  EIA (RBRTE, RWTC) — official, no rate limits.
//           EIA does NOT have reliable daily NG spot in v2; natgas uses Yahoo.
// Fallback: Yahoo Finance (BZ=F, CL=F, NG=F)
//
// Yahoo Finance rate-limits aggressively from cloud IPs.
// Cache strategy (two layers):
//  1. KV (Cloudflare) — persists across isolate restarts; TTL = 6h
//  2. Module-level in-memory — local dev / non-CF environments
// On 429, both layers are checked before giving up.
// ============================================================
import { NextResponse } from 'next/server';
import { fetchEiaSpot, eiaToTicker, type EiaSeries } from '@/app/lib/eia';
import { getKV } from '@/app/lib/kv';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

interface Ticker {
  price: number;
  change: number;
  changePercent: number;
  history: { date: string; price: number }[];
  asOf: string;
  label?: string;
  symbol?: string;
  unit?: string;
  provider?: string;
  stale?: boolean;
  error?: string;
}

const SYMBOLS: { key: string; symbol: string; label: string; unit: string; eia?: EiaSeries }[] = [
  { key: 'brent',  symbol: 'BZ=F', label: 'Brent',     unit: 'USD/bbl',   eia: 'RBRTE' },
  { key: 'wti',    symbol: 'CL=F', label: 'WTI',       unit: 'USD/bbl',   eia: 'RWTC'  },
  // EIA v2 nat-gas/pri/sum only has monthly data; RNGWHHD daily not available in v2.
  // Yahoo Finance is the sole source for NG=F; KV cache prevents cold-start 429s.
  { key: 'natgas', symbol: 'NG=F', label: 'Henry Hub', unit: 'USD/MMBtu' },
];

// ── Cache constants ────────────────────────────────────────────
const KV_MARKETS_KEY = 'markets:cache';          // full markets payload
const KV_MARKETS_TTL = 6 * 3600;                 // 6 hour KV TTL
const STALE_OK_MS    = 6 * 60 * 60 * 1000;       // serve stale up to 6h

// Module-level in-memory cache (local dev / non-CF fallback).
// Flushed on dev hot-reload — that's fine.
type CacheEntry = { ts: number; payload: Omit<Ticker, 'stale'> };
const yahooCache: Record<string, CacheEntry> = {};

// Full markets KV cache (survives CF Workers isolate restarts)
type MarketsKVEntry = {
  markets: Record<string, Ticker>;
  savedAt: number;
};

const YAHOO_HOSTS = [
  'https://query2.finance.yahoo.com',
  'https://query1.finance.yahoo.com',
];

async function fetchYahoo(symbol: string): Promise<Ticker> {
  // URL-encode special characters (e.g. '=' in 'NG=F' → 'NG%3DF')
  const encodedSymbol = encodeURIComponent(symbol);
  const qs = '?interval=1d&range=14d&includePrePost=false';
  const HEADERS = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  let lastErr: Error = new Error(`Yahoo: no host succeeded for ${symbol}`);

  for (const host of YAHOO_HOSTS) {
    try {
      const url = `${host}/v8/finance/chart/${encodedSymbol}${qs}`;
      const res = await fetch(url, {
        headers: HEADERS,
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(8000),
      });

      // 429 = rate limited on this host — try next host immediately
      if (res.status === 429) {
        lastErr = new Error(`Yahoo HTTP 429 for ${symbol} on ${host}`);
        console.warn(`[markets] ${lastErr.message}, trying next host…`);
        continue;
      }
      if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} for ${symbol}`);

      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) throw new Error(`No chart payload for ${symbol}`);

      const timestamps: number[]        = result.timestamp ?? [];
      const closes: (number | null)[]   = result.indicators?.quote?.[0]?.close ?? [];
      const meta                        = result.meta ?? {};

      const history = timestamps
        .map((t, i) => ({ ts: t, price: closes[i] }))
        .filter((p): p is { ts: number; price: number } => p.price != null);
      if (history.length < 2) throw new Error(`Insufficient history for ${symbol}`);

      const chart = history.slice(-7).map((h) => ({
        date: new Date(h.ts * 1000).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }),
        price: Number(h.price.toFixed(2)),
      }));

      const latest        = meta.regularMarketPrice ?? history[history.length - 1].price;
      const prev          = meta.chartPreviousClose  ?? history[history.length - 2].price;
      const change        = latest - prev;
      const changePercent = (change / prev) * 100;

      const payload = {
        price:         Number(latest.toFixed(2)),
        change:        Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        history:       chart,
        asOf:          new Date((meta.regularMarketTime ?? Date.now() / 1000) * 1000).toISOString(),
      };

      // Update per-symbol cache on every successful fetch
      yahooCache[symbol] = { ts: Date.now(), payload };
      return payload;

    } catch (err) {
      lastErr = err as Error;
      // Non-429 errors: still try next host but log it
      console.warn(`[markets] Yahoo ${symbol} host ${host} failed: ${lastErr.message}`);
    }
  }

  // All hosts exhausted — serve stale cache if available
  const cached = yahooCache[symbol];
  if (cached && Date.now() - cached.ts < STALE_OK_MS) {
    console.warn(`[markets] serving stale Yahoo cache for ${symbol} (age ${Math.round((Date.now() - cached.ts) / 60000)}m)`);
    return { ...cached.payload, stale: true };
  }
  throw lastErr;
}

async function fetchOne(symbol: typeof SYMBOLS[number]): Promise<Ticker> {
  // Prefer EIA when keyed — official, no rate limits, no Yahoo dependence.
  if (symbol.eia) {
    try {
      const eia = await fetchEiaSpot(symbol.eia);
      if (eia) {
        return {
          ...eiaToTicker(eia),
          label: symbol.label,
          symbol: `EIA.${symbol.eia}`,
          unit: symbol.unit,
          provider: 'EIA',
        };
      }
    } catch (err) {
      console.warn(`[markets] EIA ${symbol.key} failed, falling back to Yahoo:`, err);
    }
  }
  const payload = await fetchYahoo(symbol.symbol);
  return {
    ...payload,
    label: symbol.label,
    symbol: symbol.symbol,
    unit: symbol.unit,
    provider: payload.stale ? 'Yahoo Finance (cached)' : 'Yahoo Finance',
  };
}

export async function GET() {
  const kv = getKV();

  // ── Load KV-persisted market snapshot (survives CF Workers restarts) ──
  let kvSnapshot: MarketsKVEntry | null = null;
  if (kv) {
    try {
      kvSnapshot = (await kv.get(KV_MARKETS_KEY, 'json')) as MarketsKVEntry | null;
      // Seed the in-memory Yahoo cache from KV so cold-start 429s serve stale data
      if (kvSnapshot) {
        const ageMs = Date.now() - kvSnapshot.savedAt;
        if (ageMs < STALE_OK_MS) {
          for (const [key, ticker] of Object.entries(kvSnapshot.markets)) {
            const sym = SYMBOLS.find(s => s.key === key)?.symbol;
            if (sym && ticker.price) {
              yahooCache[sym] = {
                ts: kvSnapshot.savedAt,
                payload: { price: ticker.price, change: ticker.change, changePercent: ticker.changePercent, history: ticker.history ?? [], asOf: ticker.asOf ?? '' },
              };
            }
          }
        }
      }
    } catch { /* KV unavailable */ }
  }

  const out: Record<string, Ticker> = {};
  await Promise.all(
    SYMBOLS.map(async (s) => {
      try {
        out[s.key] = await fetchOne(s);
      } catch (err) {
        console.warn(`[markets] ${s.symbol} failed:`, err);
        // Last resort: serve KV snapshot for this specific symbol
        const kvTicker = kvSnapshot?.markets?.[s.key];
        if (kvTicker && kvTicker.price) {
          const ageMs = Date.now() - (kvSnapshot?.savedAt ?? 0);
          out[s.key] = {
            ...kvTicker,
            stale: true,
            provider: `${kvTicker.provider ?? 'cached'} (stale ${Math.round(ageMs / 3600000)}h)`,
          };
        } else {
          out[s.key] = {
            price: 0, change: 0, changePercent: 0, history: [], asOf: '',
            label: s.label, symbol: s.symbol, unit: s.unit,
            error: String(err),
          };
        }
      }
    })
  );

  // ── Persist fresh snapshot to KV ─────────────────────────────
  const hasAllFresh = SYMBOLS.every(s => out[s.key]?.price && !out[s.key]?.error);
  if (kv && hasAllFresh) {
    try {
      const entry: MarketsKVEntry = { markets: out, savedAt: Date.now() };
      await kv.put(KV_MARKETS_KEY, JSON.stringify(entry), { expirationTtl: KV_MARKETS_TTL * 2 });
    } catch { /* KV write failed */ }
  }

  // Aggregate source label for the rail header
  const providers: string[] = [];
  for (const v of Object.values(out)) {
    if (v.provider && !providers.includes(v.provider)) providers.push(v.provider);
  }

  return NextResponse.json(
    {
      markets: out,
      source: providers.join(' + ') || 'unavailable',
      generatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}
