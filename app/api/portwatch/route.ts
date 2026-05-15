// ============================================================
// /api/portwatch — IMF PortWatch daily Strait of Hormuz transit counts
//
// Source: IMF PortWatch ArcGIS REST API (free, no auth required)
// Chokepoint ID: chokepoint6 = Strait of Hormuz
// Updates: weekly on Tuesdays at 09:00 ET (data is typically ~2 days lagged)
//
// Returns last 30 days of daily transit counts by vessel type.
// ============================================================
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getKV } from '@/app/lib/kv';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

// ── Config ────────────────────────────────────────────────────
const PORTWATCH_URL =
  'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/ArcGIS/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query';

const PORTID        = 'chokepoint6';          // Strait of Hormuz
const DAYS          = 60;
const KV_CACHE_KEY  = 'portwatch:cache';
const CACHE_TTL_SEC = 4 * 3600;              // 4 hours — data updates weekly but we want fresher display

// Historical "normal" daily average (pre-2026 baseline: ~34 vessels/day)
const BASELINE_DAILY = 34;

// ── Types ─────────────────────────────────────────────────────
export type PortWatchDay = {
  date: string;          // YYYY-MM-DD
  total: number;
  tanker: number;
  cargo: number;
  container: number;
  dryBulk: number;
};

type PortWatchPayload = {
  days: PortWatchDay[];
  fetchedAt: number;
  latestDate: string;
  todayTotal: number;
  sevenDayAvg: number;
  baselineDaily: number;
  /** pct deviation from baseline, e.g. -88 = 88% below normal */
  vsBaseline: number;
};

// ── Module-level fallback ─────────────────────────────────────
let moduleCache: PortWatchPayload | null = null;

// ── Date parsing — ArcGIS returns esriFieldTypeDateOnly as "YYYY-MM-DD" strings
// but legacy DATE fields come back as epoch ms numbers. Handle both.
function toISODate(raw: unknown): string {
  if (typeof raw === 'number') return new Date(raw).toISOString().slice(0, 10);
  const s = String(raw ?? '');
  const n = Number(s);
  if (!isNaN(n) && n > 1_000_000_000_000) return new Date(n).toISOString().slice(0, 10);
  return s.slice(0, 10);
}

// ── Fetch from IMF PortWatch ──────────────────────────────────
async function fetchPortWatch(): Promise<PortWatchDay[]> {
  // Request last DAYS days explicitly so ordering is reliable
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const params = new URLSearchParams({
    where: `portid = '${PORTID}' AND date >= DATE '${since}'`,
    outFields: 'date,n_total,n_tanker,n_cargo,n_container,n_dry_bulk',
    orderByFields: 'date ASC',
    resultRecordCount: String(DAYS),
    f: 'json',
  });

  const res = await fetch(`${PORTWATCH_URL}?${params}`, {
    signal: AbortSignal.timeout(10_000),
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) throw new Error(`PortWatch HTTP ${res.status}`);
  const json = await res.json() as { features?: { attributes: Record<string, unknown> }[] };

  const features = json.features ?? [];
  return features.map((f) => {
    const a = f.attributes;
    return {
      date:      toISODate(a.date),
      total:     Number(a.n_total     ?? 0),
      tanker:    Number(a.n_tanker    ?? 0),
      cargo:     Number(a.n_cargo     ?? 0),
      container: Number(a.n_container ?? 0),
      dryBulk:   Number(a.n_dry_bulk  ?? 0),
    };
  }); // already ASC from orderByFields
}

function buildPayload(days: PortWatchDay[]): PortWatchPayload {
  const last = days.at(-1);
  const last7 = days.slice(-7);
  const sevenDayAvg = last7.length
    ? Math.round(last7.reduce((s, d) => s + d.total, 0) / last7.length * 10) / 10
    : 0;
  const todayTotal = last?.total ?? 0;
  const vsBaseline = Math.round(((todayTotal - BASELINE_DAILY) / BASELINE_DAILY) * 100);

  return {
    days,
    fetchedAt: Date.now(),
    latestDate:    last?.date ?? '',
    todayTotal,
    sevenDayAvg,
    baselineDaily: BASELINE_DAILY,
    vsBaseline,
  };
}

// ── Route handler ─────────────────────────────────────────────
export async function GET() {
  const kv = getKV();

  // ── Try cache ─────────────────────────────────────────────
  let cached: PortWatchPayload | null = null;
  if (kv) {
    try {
      cached = (await kv.get(KV_CACHE_KEY, 'json')) as PortWatchPayload | null;
    } catch { /* KV unavailable */ }
  }
  if (!cached && moduleCache) cached = moduleCache;

  const nowMs   = Date.now();
  const ageMs   = cached ? nowMs - cached.fetchedAt : Infinity;
  const isFresh = ageMs < CACHE_TTL_SEC * 1000;

  if (isFresh && cached) {
    return NextResponse.json(
      { ok: true, source: 'IMF PortWatch', cached: true, ...cached },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // ── Fetch fresh data ──────────────────────────────────────
  try {
    const days    = await fetchPortWatch();
    const payload = buildPayload(days);

    if (kv) {
      try {
        await kv.put(KV_CACHE_KEY, JSON.stringify(payload), {
          expirationTtl: CACHE_TTL_SEC * 2,
        });
      } catch { /* KV write failed */ }
    }
    moduleCache = payload;

    return NextResponse.json(
      { ok: true, source: 'IMF PortWatch', cached: false, ...payload },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[portwatch] fetch failed:', err);

    // Return stale cache if available
    if (cached) {
      return NextResponse.json(
        { ok: true, source: 'IMF PortWatch (stale)', cached: true, stale: true, ...cached },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { ok: false, error: String(err), days: [], todayTotal: 0, sevenDayAvg: 0, baselineDaily: BASELINE_DAILY, vsBaseline: 0 },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
