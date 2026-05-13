// ============================================================
// EIA Open Data — official US government commodity prices.
// Docs:  https://www.eia.gov/opendata/documentation.php
// Key:   https://www.eia.gov/opendata/register.php
//
// Series we use:
//   RBRTE   Europe Brent Spot FOB ($/bbl), daily      [dataset: petroleum/pri/spt]
//   RWTC    WTI Cushing Spot ($/bbl), daily            [dataset: petroleum/pri/spt]
//   RNGWHHD Henry Hub Natural Gas Spot ($/MMBtu), daily [dataset: natural-gas/pri/sum]
// ============================================================

export type EiaSeries = 'RBRTE' | 'RWTC' | 'RNGWHHD';
export type EiaPoint = { ts: number; period: string; price: number };

export interface EiaSeriesResult {
  series: EiaSeries;
  points: EiaPoint[];
  unit: string;
  asOf: string;
}

// Map each series to its dataset path. EIA splits commodities across
// distinct datasets — petroleum and natural-gas live in different trees.
const DATASETS: Record<EiaSeries, string> = {
  RBRTE:   'https://api.eia.gov/v2/petroleum/pri/spt/data/',
  RWTC:    'https://api.eia.gov/v2/petroleum/pri/spt/data/',
  RNGWHHD: 'https://api.eia.gov/v2/natural-gas/pri/sum/data/',
};

/**
 * Fetch the most recent N daily points for a given series.
 * Returns null when the API key is missing — caller decides whether
 * to fall back (we keep Yahoo Finance as a graceful fallback).
 */
export async function fetchEiaSpot(
  series: EiaSeries,
  length = 14
): Promise<EiaSeriesResult | null> {
  const key = process.env.EIA_API_KEY;
  if (!key) return null;

  const base = DATASETS[series];
  const url =
    `${base}?api_key=${encodeURIComponent(key)}` +
    `&frequency=daily&data[0]=value` +
    `&facets[series][]=${series}` +
    `&sort[0][column]=period&sort[0][direction]=desc` +
    `&offset=0&length=${length}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'IsStraitHormuzOpen/1.0' },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`EIA HTTP ${res.status} for ${series}`);
  const json = await res.json();
  const raw: any[] = json?.response?.data ?? [];
  if (!raw.length) throw new Error(`EIA: empty data for ${series}`);

  // EIA returns newest-first; reverse so history is oldest→newest.
  const points: EiaPoint[] = raw
    .map((row) => ({
      ts: +new Date(row.period),
      period: String(row.period),
      price: Number(row.value),
    }))
    .filter((p) => !isNaN(p.ts) && !isNaN(p.price))
    .reverse();

  if (points.length < 2) throw new Error(`EIA: insufficient history for ${series}`);

  return {
    series,
    points,
    unit: raw[0]?.units ?? (series === 'RNGWHHD' ? '$/MMBtu' : '$/bbl'),
    asOf: new Date(points[points.length - 1].ts).toISOString(),
  };
}

/** Convenience shape compatible with our existing Brent payload */
export function eiaToTicker(r: EiaSeriesResult) {
  const last = r.points[r.points.length - 1];
  const prev = r.points[r.points.length - 2];
  const change = last.price - prev.price;
  const changePercent = (change / prev.price) * 100;
  const history = r.points.slice(-7).map((p) => ({
    date: new Date(p.ts).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
    }),
    price: Number(p.price.toFixed(2)),
  }));
  return {
    price: Number(last.price.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    history,
    asOf: r.asOf,
  };
}
