// ============================================================
// /api/vessels — Real AIS vessel positions, Strait of Hormuz
//
// Strategy (CF Workers compatible):
//
//   1. Read from KV cache (key: "vessels:cache").
//      If fresh (< CACHE_TTL_SEC old) → return immediately.
//
//   2. If stale / no cache → open a WebSocket to aisstream.io,
//      collect PositionReport + ShipStaticData messages for
//      COLLECT_WINDOW_MS, close, write to KV, return.
//
//   3. On subsequent requests while cache is valid, we still
//      trigger a background refresh via ctx.waitUntil() when
//      the cache is more than REFRESH_AFTER_SEC old — so the
//      next caller always gets fresh data without waiting.
//
//   4. Module-level fallback cache: for local dev / environments
//      where KV is unavailable the same logic applies but data
//      lives only for the process lifetime.
//
// Why not the old module-level WebSocket approach?
//   CF Workers isolates are torn down between requests; the vessel
//   Map was always empty when a new isolate handled a request.
// ============================================================

import { NextResponse } from 'next/server';
import { getKV } from '@/app/lib/kv';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

// ── Config ────────────────────────────────────────────────────
// AISStream BoundingBoxes format: [[top_left_lat, top_left_lon], [bottom_right_lat, bottom_right_lon]]
// i.e. NW corner → SE corner (NOT SW→NE). Strait of Hormuz coverage.
const BBOX: [[number, number], [number, number]] = [[27.8, 54.6], [25.2, 58.4]];
const KV_CACHE_KEY  = 'vessels:cache';
const KV_LOCK_KEY   = 'vessels:lock';
const CACHE_TTL_SEC = 120;          // serve cached data for up to 2 min
const REFRESH_AFTER_SEC = 60;       // background-refresh once cache is 1 min old
const COLLECT_WINDOW_MS = 7_000;    // how long to listen to AISStream per collect
const MAX_VESSELS   = 300;          // stop early if we have enough

// ── Ship-type lookup ──────────────────────────────────────────
const SHIP_TYPES: Record<number, string> = {
  30: 'Fishing', 31: 'Towing', 32: 'Towing',
  35: 'Military', 36: 'Sailing', 37: 'Pleasure',
  40: 'HSC', 50: 'Pilot', 51: 'SAR', 52: 'Tug', 53: 'Port tender',
  54: 'AntiPollution', 55: 'LawEnforcement',
};
for (let c = 60; c < 70; c++) SHIP_TYPES[c] = 'Passenger';
for (let c = 70; c < 80; c++) SHIP_TYPES[c] = 'Cargo';
for (let c = 80; c < 90; c++) SHIP_TYPES[c] = 'Tanker';

function classifyType(code: number | undefined): string {
  if (!code) return 'Unknown';
  return SHIP_TYPES[code] ?? (
    code >= 70 && code < 80 ? 'Cargo' :
    code >= 80 && code < 90 ? 'Tanker' :
    code >= 60 && code < 70 ? 'Passenger' : 'Unknown'
  );
}

// ── Types ─────────────────────────────────────────────────────
type VesselEntry = {
  mmsi: number; name: string; type: string;
  lat: number; lon: number;
  sog: number | null; cog: number | null; heading: number | null;
};

type KVPayload = {
  vessels: VesselEntry[];
  collectedAt: number; // epoch ms
};

// ── Module-level fallback (non-CF / local dev) ─────────────────
let moduleCache: KVPayload | null = null;
let collectingInProgress = false;

// ── AISStream collector ───────────────────────────────────────
function collectVessels(apiKey: string): Promise<VesselEntry[]> {
  return new Promise((resolve) => {
    const map = new Map<number, VesselEntry>();
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(1000, 'done'); } catch { /* best effort */ }
      resolve(Array.from(map.values()));
    };

    const timer = setTimeout(finish, COLLECT_WINDOW_MS);

    let ws: WebSocket;
    try {
      ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    } catch (err) {
      console.error('[vessels] WebSocket constructor failed:', err);
      clearTimeout(timer);
      resolve([]);
      return;
    }

    ws.onopen = () => {
      ws.send(JSON.stringify({
        APIKey: apiKey,
        BoundingBoxes: [BBOX],
        FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
      }));
    };

    ws.onmessage = async (event: MessageEvent) => {
      try {
        // AISStream sends binary frames — decode ArrayBuffer/Blob before parsing
        let raw: string;
        if (typeof event.data === 'string') {
          raw = event.data;
        } else if (event.data instanceof ArrayBuffer) {
          raw = new TextDecoder().decode(event.data);
        } else if (typeof event.data === 'object' && typeof (event.data as Blob).text === 'function') {
          raw = await (event.data as Blob).text();
        } else {
          raw = String(event.data);
        }
        const msg = JSON.parse(raw);
        const meta = msg.MetaData;
        if (!meta?.MMSI) return;
        const mmsi = Number(meta.MMSI);
        const existing = map.get(mmsi);

        if (msg.MessageType === 'PositionReport') {
          const pr = msg.Message?.PositionReport;
          if (!pr) return;
          const lat = Number(meta.latitude ?? pr.Latitude);
          const lon = Number(meta.longitude ?? pr.Longitude);
          if (!lat || !lon) return;
          map.set(mmsi, {
            mmsi,
            name: existing?.name || (meta.ShipName?.trim() ?? ''),
            type: existing?.type || 'Unknown',
            lat: parseFloat(lat.toFixed(5)),
            lon: parseFloat(lon.toFixed(5)),
            sog: pr.Sog != null ? parseFloat(Number(pr.Sog).toFixed(1)) : null,
            cog: pr.Cog != null ? parseFloat(Number(pr.Cog).toFixed(0)) : null,
            heading: pr.TrueHeading != null && pr.TrueHeading !== 511 ? pr.TrueHeading : null,
          });
        } else if (msg.MessageType === 'ShipStaticData') {
          const sd = msg.Message?.ShipStaticData;
          if (!sd) return;
          if (existing) {
            map.set(mmsi, {
              ...existing,
              name: sd.Name?.trim() || existing.name,
              type: classifyType(sd.Type) !== 'Unknown' ? classifyType(sd.Type) : existing.type,
            });
          }
        }

        // Stop early if we have enough vessels
        if (map.size >= MAX_VESSELS) {
          clearTimeout(timer);
          finish();
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = (err) => {
      console.error('[vessels] WebSocket error:', err);
      finish();
    };
    ws.onclose = () => finish();
  });
}

// ── Background refresh ────────────────────────────────────────
async function refreshAndCache(apiKey: string, kv: KVNamespace | null) {
  if (collectingInProgress) return;
  collectingInProgress = true;
  try {
    // KV lock — prevent parallel collections in multi-isolate CF Workers
    if (kv) {
      const lock = await kv.get(KV_LOCK_KEY);
      if (lock) return;
      await kv.put(KV_LOCK_KEY, '1', { expirationTtl: 30 });
    }

    const vessels = await collectVessels(apiKey);
    const payload: KVPayload = { vessels, collectedAt: Date.now() };

    if (kv) {
      await kv.put(KV_CACHE_KEY, JSON.stringify(payload), {
        expirationTtl: CACHE_TTL_SEC * 4,
      });
      await kv.delete(KV_LOCK_KEY);
    }
    moduleCache = payload; // always update module-level cache too
  } catch (err) {
    console.error('[vessels] refresh failed:', err);
  } finally {
    collectingInProgress = false;
  }
}

// ── Route handler ─────────────────────────────────────────────
export async function GET() {
  const apiKey = process.env.AISSTREAM_KEY;
  const kv = getKV();

  // ── No API key configured ─────────────────────────────────
  if (!apiKey) {
    return NextResponse.json(
      {
        running: false, stale: false, ageSec: null, count: 0,
        vessels: [], source: 'none', bbox: BBOX,
        generatedAt: new Date().toISOString(),
        instructions: 'Set AISSTREAM_KEY (wrangler secret / .env.local) to enable live AIS.',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // ── Try cache (KV first, module-level fallback) ───────────
  let cached: KVPayload | null = null;
  if (kv) {
    try {
      cached = (await kv.get(KV_CACHE_KEY, 'json')) as KVPayload | null;
    } catch { /* KV unavailable */ }
  }
  if (!cached && moduleCache) cached = moduleCache;

  const nowMs = Date.now();
  const ageMs = cached ? nowMs - cached.collectedAt : Infinity;
  const isFresh = ageMs < CACHE_TTL_SEC * 1000;

  // ── Get CF execution context for waitUntil ────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cfCtx: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    cfCtx = getCloudflareContext()?.ctx;
  } catch { /* local dev */ }

  // ── If fresh cache: return immediately, maybe refresh BG ─
  if (isFresh && cached) {
    const ageSec = Math.floor(ageMs / 1000);
    // Trigger background refresh when cache is getting old
    if (ageMs > REFRESH_AFTER_SEC * 1000 && !collectingInProgress) {
      const task = refreshAndCache(apiKey, kv);
      if (cfCtx?.waitUntil) {
        cfCtx.waitUntil(task);
      } else {
        task.catch(console.error);
      }
    }

    return NextResponse.json(
      {
        running: true, stale: false, ageSec,
        source: 'AISStream.io', bbox: BBOX,
        count: cached.vessels.length,
        vessels: cached.vessels,
        generatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // ── Stale or no cache: synchronous collect ────────────────
  // Return stale data immediately if we have it, and refresh in background
  if (cached && ageMs < CACHE_TTL_SEC * 4 * 1000) {
    // We have usable (just old) data — return it and refresh in background
    const ageSec = Math.floor(ageMs / 1000);
    if (!collectingInProgress) {
      const task = refreshAndCache(apiKey, kv);
      if (cfCtx?.waitUntil) {
        cfCtx.waitUntil(task);
      } else {
        task.catch(console.error);
      }
    }

    return NextResponse.json(
      {
        running: true, stale: true, ageSec,
        source: 'AISStream.io', bbox: BBOX,
        count: cached.vessels.length,
        vessels: cached.vessels,
        generatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // ── Cold start / no cache at all: block and collect ───────
  console.log('[vessels] cold start — collecting from AISStream…');
  const vessels = await collectVessels(apiKey);
  const payload: KVPayload = { vessels, collectedAt: nowMs };

  if (kv) {
    try {
      await kv.put(KV_CACHE_KEY, JSON.stringify(payload), {
        expirationTtl: CACHE_TTL_SEC * 4,
      });
    } catch (err) {
      console.error('[vessels] KV write failed:', err);
    }
  }
  moduleCache = payload;

  return NextResponse.json(
    {
      running: true, stale: false, ageSec: 0,
      source: 'AISStream.io', bbox: BBOX,
      count: vessels.length,
      vessels,
      generatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
