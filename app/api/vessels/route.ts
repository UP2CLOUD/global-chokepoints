// ============================================================
// /api/vessels — AIS vessel positions for the Strait of Hormuz.
//
// Embedded collector:
//   Rather than depending on a separate `npm run ais` sidecar process,
//   this route maintains its own module-level WebSocket connection to
//   aisstream.io.  The connection is established on the first incoming
//   GET request and kept alive within the server process via auto-reconnect.
//   Vessel data is stored in a module-level Map and returned directly.
//
//   This makes AIS data self-contained — no extra process required.
//   Only AISSTREAM_KEY in .env.local is needed.
//
// Fallback:
//   When the key is absent, or within the first 10 s warm-up window,
//   running:false is returned so the UI can show simulated lanes.
// ============================================================

import { NextResponse } from 'next/server';
// ws is NOT imported at the top level — it uses a native C addon (bufferUtil)
// that breaks when bundled by webpack AND is unavailable in CF Workers.
// We use require() inside connect() so the module loads cleanly in any runtime.

export const revalidate = 0;
export const dynamic = 'force-dynamic';

// ── Strait of Hormuz bounding box ────────────────────────────
const BBOX: [[number, number], [number, number]] = [[25.2, 54.6], [27.8, 58.4]];

// ── Ship type lookup ──────────────────────────────────────────
const SHIP_TYPES: Record<number, string> = {
  30: 'Fishing', 31: 'Towing', 32: 'Towing',
  35: 'Military', 36: 'Sailing', 37: 'Pleasure craft', 40: 'HSC',
  50: 'Pilot', 51: 'SAR', 52: 'Tug', 53: 'Port tender',
  54: 'AntiPollution', 55: 'LawEnforcement',
};
for (let c = 60; c < 70; c++) SHIP_TYPES[c] = 'Passenger';
for (let c = 70; c < 80; c++) SHIP_TYPES[c] = 'Cargo';
for (let c = 80; c < 90; c++) SHIP_TYPES[c] = 'Tanker';

function classifyType(code: number | undefined): string {
  if (!code) return 'Unknown';
  return (
    SHIP_TYPES[code] ??
    (code >= 70 && code < 80 ? 'Cargo' :
     code >= 80 && code < 90 ? 'Tanker' :
     code >= 60 && code < 70 ? 'Passenger' : 'Other')
  );
}

// ── Module-level collector state ──────────────────────────────
type VesselEntry = {
  mmsi: number; name: string; type: string;
  lat: number; lon: number;
  sog: number | null; cog: number | null;
  heading: number | null; navStatus: number | null;
  asOf: string; asOfMs: number;
};

const vessels = new Map<number, VesselEntry>();
let messagesReceived = 0;
let collectorState: 'idle' | 'connecting' | 'connected' | 'error' = 'idle';
let collectorStartedAt: number | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wsConn: any | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let backoff = 1000;

function pruneStale() {
  const cutoff = Date.now() - 30 * 60_000;
  Array.from(vessels.entries()).forEach(([mmsi, v]) => {
    if (v.asOfMs < cutoff) vessels.delete(mmsi);
  });
}

function connect(apiKey: string) {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  collectorState = 'connecting';

  if (typeof WebSocket === 'undefined') {
    console.warn('[ais-embedded] WebSocket API unavailable. Please use Node >= 21 or Cloudflare Edge.');
    collectorState = 'error';
    return;
  }

  console.log('[ais-embedded] connecting to wss://stream.aisstream.io/v0/stream …');
  try {
    wsConn = new WebSocket('wss://stream.aisstream.io/v0/stream');
  } catch (err) {
    console.warn('[ais-embedded] WebSocket creation failed:', err);
    collectorState = 'error';
    return;
  }

  const handleOpen = () => {
    backoff = 1000;
    collectorState = 'connected';
    const sub = {
      APIKey: apiKey,
      BoundingBoxes: [BBOX],
      FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
    };
    wsConn!.send(JSON.stringify(sub));
    console.log('[ais-embedded] subscribed — Strait of Hormuz bbox');
  };

  const handleMessage = (event: any) => {
    messagesReceived++;
    let msg: any;
    try { 
      // ws package uses raw, native WebSocket uses event.data
      const raw = event.data || event;
      msg = JSON.parse(raw.toString()); 
    } catch { return; }
    const meta = msg.MetaData;
    if (!meta?.MMSI) return;
    const mmsi = Number(meta.MMSI);
    const existing = vessels.get(mmsi) ?? { mmsi, name: '', type: 'Unknown', lat: 0, lon: 0, sog: null, cog: null, heading: null, navStatus: null, asOf: '', asOfMs: 0 };

    if (msg.MessageType === 'PositionReport') {
      const pr = msg.Message?.PositionReport;
      if (!pr) return;
      vessels.set(mmsi, {
        ...existing,
        mmsi,
        name: existing.name || (meta.ShipName?.trim() ?? ''),
        lat: Number(meta.latitude),
        lon: Number(meta.longitude),
        sog: pr.Sog ?? null,
        cog: pr.Cog ?? null,
        heading: pr.TrueHeading !== 511 ? pr.TrueHeading : null,
        navStatus: pr.NavigationalStatus ?? null,
        asOf: new Date().toISOString(),
        asOfMs: Date.now(),
      });
    } else if (msg.MessageType === 'ShipStaticData') {
      const sd = msg.Message?.ShipStaticData;
      if (!sd) return;
      vessels.set(mmsi, {
        ...existing,
        name: sd.Name?.trim() || existing.name,
        type: classifyType(sd.Type),
      });
    }
  };

  const handleClose = () => {
    collectorState = 'error';
    console.warn(`[ais-embedded] socket closed, reconnecting in ${backoff} ms`);
    reconnectTimer = setTimeout(() => connect(apiKey), backoff);
    backoff = Math.min(backoff * 2, 30_000);
  };

  const handleError = (err: any) => {
    console.error('[ais-embedded] socket error:', err.message || err);
  };

  // Attach event listeners for native WebSocket
  wsConn.addEventListener('open', handleOpen);
  wsConn.addEventListener('message', handleMessage);
  wsConn.addEventListener('close', handleClose);
  wsConn.addEventListener('error', handleError);
}

function ensureCollector() {
  const key = process.env.AISSTREAM_KEY;
  if (!key || collectorState !== 'idle') return;
  collectorStartedAt = Date.now();
  connect(key);
}

// ── Route handler ─────────────────────────────────────────────
export async function GET() {
  ensureCollector();
  pruneStale();

  const hasKey = Boolean(process.env.AISSTREAM_KEY);
  // Within the first 10 s the socket is still connecting / filling up
  const warmUp = collectorStartedAt !== null && Date.now() - collectorStartedAt < 10_000;

  const vesselList = Array.from(vessels.values()).map((v) => ({
    mmsi: v.mmsi,
    name: v.name,
    type: v.type,
    lat: Number(v.lat.toFixed(5)),
    lon: Number(v.lon.toFixed(5)),
    sog: v.sog != null ? Number(v.sog.toFixed(1)) : null,
    cog: v.cog != null ? Number(v.cog.toFixed(0)) : null,
    heading: v.heading ?? null,
    navStatus: v.navStatus ?? null,
    asOf: v.asOf,
  }));

  // "running" means: key exists, collector not idle/error, and either we
  // have vessels OR we're still in warm-up (don't show "simulation" too early)
  const running = hasKey && collectorState !== 'idle' && (vesselList.length > 0 || warmUp);

  return NextResponse.json(
    {
      running,
      stale: false,
      ageSec: 0,
      source: 'AISStream.io (embedded)',
      bbox: BBOX,
      count: vesselList.length,
      messagesReceived,
      collectorState,
      warmUp,
      generatedAt: new Date().toISOString(),
      vessels: vesselList,
      ...(!hasKey && {
        instructions: 'Set AISSTREAM_KEY in .env.local to enable live AIS data.',
      }),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30' } }
  );
}
