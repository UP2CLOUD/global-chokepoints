// ============================================================
// /api/portwatch — IMF PortWatch daily transit counts for all
// tracked maritime chokepoints (Hormuz, Red Sea, Suez, Panama).
//
// Source: IMF PortWatch ArcGIS REST API (free, no auth required)
// Updates: weekly on Tuesdays at ~09:00 ET (data is ~2 days lagged)
//
// Root-level fields (days, todayTotal, …) remain Hormuz data for
// backward compatibility with TransitChart and HormuzMap.
// The `chokepoints` field carries per-CP breakdowns.
// ============================================================
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getKV } from '@/app/lib/kv';
import { PORTWATCH_CP_CONFIG } from '@/app/lib/constants';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

// ── Config ────────────────────────────────────────────────────
const PORTWATCH_URL =
  'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/ArcGIS/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query';

const DAYS          = 60;
const KV_CACHE_KEY  = 'portwatch:multi';
const CACHE_TTL_SEC = 4 * 3600;

// ── Types ─────────────────────────────────────────────────────
export type PortWatchDay = {
  date: string;
  total: number;
  tanker: number;
  cargo: number;
  container: number;
  dryBulk: number;
};

export type ChokepointStats = {
  days: PortWatchDay[];
  todayTotal: number;
  sevenDayAvg: number;
  baselineDaily: number;
  vsBaseline: number;
  latestDate: string;
};

type MultiPayload = ChokepointStats & {
  fetchedAt: number;
  chokepoints: Record<string, ChokepointStats>;
};

// ── Module-level fallback ─────────────────────────────────────
let moduleCache: MultiPayload | null = null;

// ── Helpers ───────────────────────────────────────────────────
function toISODate(raw: unknown): string {
  if (typeof raw === 'number') return new Date(raw).toISOString().slice(0, 10);
  const s = String(raw ?? '');
  const n = Number(s);
  if (!isNaN(n) && n > 1_000_000_000_000) return new Date(n).toISOString().slice(0, 10);
  return s.slice(0, 10);
}

async function fetchCP(portid: string): Promise<PortWatchDay[]> {
  const since = new Date(Date.now() - DAYS * 86400_000).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    where: `portid = '${portid}' AND date >= DATE '${since}'`,
    outFields: 'date,n_total,n_tanker,n_cargo,n_container,n_dry_bulk',
    orderByFields: 'date ASC',
    resultRecordCount: String(DAYS),
    f: 'json',
  });
  const res = await fetch(`${PORTWATCH_URL}?${params}`, {
    signal: AbortSignal.timeout(10_000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`PortWatch HTTP ${res.status} for ${portid}`);
  const json = await res.json() as { features?: { attributes: Record<string, unknown> }[] };
  return (json.features ?? []).map(f => {
    const a = f.attributes;
    return {
      date:      toISODate(a.date),
      total:     Number(a.n_total     ?? 0),
      tanker:    Number(a.n_tanker    ?? 0),
      cargo:     Number(a.n_cargo     ?? 0),
      container: Number(a.n_container ?? 0),
      dryBulk:   Number(a.n_dry_bulk  ?? 0),
    };
  });
}

function buildStats(days: PortWatchDay[], baseline: number): ChokepointStats {
  const last = days.at(-1);
  const last7 = days.slice(-7);
  const sevenDayAvg = last7.length
    ? Math.round(last7.reduce((s, d) => s + d.total, 0) / last7.length * 10) / 10
    : 0;
  const todayTotal = last?.total ?? 0;
  const vsBaseline = Math.round(((todayTotal - baseline) / baseline) * 100);
  return { days, todayTotal, sevenDayAvg, baselineDaily: baseline, vsBaseline, latestDate: last?.date ?? '' };
}

function emptyStats(baseline: number): ChokepointStats {
  return { days: [], todayTotal: 0, sevenDayAvg: 0, baselineDaily: baseline, vsBaseline: 0, latestDate: '' };
}

// ── Route handler ─────────────────────────────────────────────
export async function GET() {
  const kv = getKV();

  // ── Try cache ─────────────────────────────────────────────
  let cached: MultiPayload | null = null;
  if (kv) {
    try { cached = (await kv.get(KV_CACHE_KEY, 'json')) as MultiPayload | null; } catch { /* KV unavailable */ }
  }
  if (!cached && moduleCache) cached = moduleCache;

  const nowMs  = Date.now();
  const isFresh = cached && (nowMs - cached.fetchedAt) < CACHE_TTL_SEC * 1000;

  if (isFresh && cached) {
    return NextResponse.json(
      { ok: true, source: 'IMF PortWatch', cached: true, ...cached },
      { headers: { 'Cache-Control': 'no-store', 'X-Cache': 'HIT' } }
    );
  }

  // ── Fetch all chokepoints in parallel ─────────────────────
  const results = await Promise.allSettled(
    PORTWATCH_CP_CONFIG.map(cp => fetchCP(cp.portid))
  );

  const chokepoints: Record<string, ChokepointStats> = {};
  PORTWATCH_CP_CONFIG.forEach((cp, i) => {
    const r = results[i];
    chokepoints[cp.key] = r.status === 'fulfilled'
      ? buildStats(r.value, cp.baseline)
      : (cached?.chokepoints?.[cp.key] ?? emptyStats(cp.baseline));
  });

  // Hormuz at root level for backward compat
  const hormuz = chokepoints.hormuz ?? emptyStats(34);
  const payload: MultiPayload = { ...hormuz, fetchedAt: nowMs, chokepoints };

  if (kv) {
    try { await kv.put(KV_CACHE_KEY, JSON.stringify(payload), { expirationTtl: CACHE_TTL_SEC * 2 }); } catch { /* KV write failed */ }
  }
  moduleCache = payload;

  return NextResponse.json(
    { ok: true, source: 'IMF PortWatch', cached: false, ...payload },
    { headers: { 'Cache-Control': 'no-store', 'X-Cache': 'MISS' } }
  );
}
