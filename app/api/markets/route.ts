// ============================================================
// /api/markets — Brent + WTI + Henry Hub futures
// Primary:  EIA (RBRTE, RWTC, RNGWHHD) when EIA_API_KEY is set
// Fallback: Yahoo Finance (BZ=F, CL=F, NG=F)
//
// Yahoo Finance is an unofficial endpoint and rate-limits aggressively
// from cloud IPs. To survive HTTP 429s, every Yahoo response is held
// in a tiny in-process cache; on subsequent 429s we serve the last
// good payload with `stale: true` so the dashboard never blanks out.
// ============================================================
import { NextResponse } from 'next/server';
import { fetchEiaSpot, eiaToTicker, type EiaSeries } from '@/app/lib/eia';

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
  { key: 'brent',  symbol: 'BZ=F', label: 'Brent',     unit: 'USD/bbl',    eia: 'RBRTE' },
  { key: 'wti',    symbol: 'CL=F', label: 'WTI',       unit: 'USD/bbl',    eia: 'RWTC' },
  { key: 'natgas', symbol: 'NG=F', label: 'Henry Hub', unit: 'USD/MMBtu',  eia: 'RNGWHHD' },
];

// --- Tiny in-memory cache shared across requests (per Node process).
// Survives Yahoo 429s; flushed on dev hot-reload, which is fine —
// the next successful call refills it.
type CacheEntry = { ts: number; payload: Omit<Ticker, 'stale'> };
const yahooCache: Record<string, CacheEntry> = {};
const STALE_OK_MS = 6 * 60 * 60 * 1000; // serve stale up to 6h

async function fetchYahoo(symbol: string): Promise<Ticker> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}` +
    `?interval=1d&range=14d&includePrePost=false`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} for ${symbol}`);
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error(`No chart payload for ${symbol}`);

    const timestamps: number[] = result.timestamp ?? [];
    const closes: (number | null)[] =
      result.indicators?.quote?.[0]?.close ?? [];
    const meta = result.meta ?? {};

    const history = timestamps
      .map((t, i) => ({ ts: t, price: closes[i] }))
      .filter((p): p is { ts: number; price: number } => p.price != null);
    if (history.length < 2) throw new Error(`Insufficient history for ${symbol}`);

    const chart = history.slice(-7).map((h) => ({
      date: new Date(h.ts * 1000).toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
      }),
      price: Number(h.price.toFixed(2)),
    }));

    const latest = meta.regularMarketPrice ?? history[history.length - 1].price;
    const prev = meta.chartPreviousClose ?? history[history.length - 2].price;
    const change = latest - prev;
    const changePercent = (change / prev) * 100;

    const payload = {
      price: Number(latest.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      history: chart,
      asOf: new Date((meta.regularMarketTime ?? Date.now() / 1000) * 1000).toISOString(),
    };

    // Cache the freshest good payload, keyed by symbol
    yahooCache[symbol] = { ts: Date.now(), payload };
    return payload;
  } catch (err) {
    // On any failure (most importantly 429), serve the last good payload
    // marked as stale, if we still have one within STALE_OK_MS.
    const cached = yahooCache[symbol];
    if (cached && Date.now() - cached.ts < STALE_OK_MS) {
      console.warn(`[markets] Yahoo ${symbol} failed (${(err as Error).message}); serving stale cache from ${new Date(cached.ts).toISOString()}`);
      return { ...cached.payload, stale: true };
    }
    throw err;
  }
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
  const out: Record<string, Ticker> = {};
  await Promise.all(
    SYMBOLS.map(async (s) => {
      try {
        out[s.key] = await fetchOne(s);
      } catch (err) {
        console.warn(`[markets] ${s.symbol} failed:`, err);
        out[s.key] = {
          price: 0, change: 0, changePercent: 0, history: [], asOf: '',
          label: s.label, symbol: s.symbol, unit: s.unit,
          error: String(err),
        };
      }
    })
  );

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
