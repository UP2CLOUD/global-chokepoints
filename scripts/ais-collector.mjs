#!/usr/bin/env node
// ============================================================
// AIS Collector — long-running sidecar that maintains a WebSocket
// to aisstream.io and writes the latest vessel positions inside
// the Strait of Hormuz bounding box to data/vessels.json.
//
// Run with:   npm run ais
// Prereqs:    AISSTREAM_KEY set in .env.local (or environment)
//             `npm install` once after pulling these changes
// ============================================================

import WebSocket from 'ws';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(PROJECT_ROOT, '.env.local');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const OUT_FILE = path.join(DATA_DIR, 'vessels.json');

// --- Minimal .env.local loader (no dependency on dotenv) -------
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv(ENV_FILE);

const API_KEY = process.env.AISSTREAM_KEY;
if (!API_KEY) {
  console.error('\x1b[31mAISSTREAM_KEY is not set.\x1b[0m');
  console.error('Register at https://aisstream.io/authenticate, then add the key to .env.local:');
  console.error('  AISSTREAM_KEY=your-key-here');
  process.exit(1);
}

// Strait of Hormuz + approaches — SW corner to NE corner
// (south-west of Larak Island to north-east of Khor Fakkan)
const BBOX = [[[25.2, 54.6], [27.8, 58.4]]];

const SHIP_TYPES = {
  // AIS ship-type categories (rough buckets)
  20: 'WIG', 30: 'Fishing', 31: 'Towing', 32: 'Towing',
  35: 'Military', 36: 'Sailing', 37: 'Pleasure craft',
  40: 'HSC',
  50: 'Pilot', 51: 'SAR', 52: 'Tug', 53: 'Port tender', 54: 'AntiPollution', 55: 'LawEnforcement',
  60: 'Passenger', 61: 'Passenger', 62: 'Passenger', 63: 'Passenger', 64: 'Passenger', 65: 'Passenger', 66: 'Passenger', 67: 'Passenger', 68: 'Passenger', 69: 'Passenger',
  70: 'Cargo',    71: 'Cargo',    72: 'Cargo',    73: 'Cargo',    74: 'Cargo',    75: 'Cargo',    76: 'Cargo',    77: 'Cargo',    78: 'Cargo',    79: 'Cargo',
  80: 'Tanker',   81: 'Tanker',   82: 'Tanker',   83: 'Tanker',   84: 'Tanker',   85: 'Tanker',   86: 'Tanker',   87: 'Tanker',   88: 'Tanker',   89: 'Tanker',
  90: 'Other',    91: 'Other',    92: 'Other',    93: 'Other',    94: 'Other',    95: 'Other',    96: 'Other',    97: 'Other',    98: 'Other',    99: 'Other',
};

function classifyType(code) {
  if (!code) return 'Unknown';
  const exact = SHIP_TYPES[code];
  if (exact) return exact;
  if (code >= 70 && code < 80) return 'Cargo';
  if (code >= 80 && code < 90) return 'Tanker';
  if (code >= 60 && code < 70) return 'Passenger';
  return 'Other';
}

// In-memory store: MMSI → snapshot
const vessels = new Map();
let messagesReceived = 0;
let lastWriteAt = 0;

function snapshot() {
  // Drop stale entries (>30 min old)
  const cutoff = Date.now() - 30 * 60_000;
  for (const [mmsi, v] of vessels) {
    if (v.asOfMs < cutoff) vessels.delete(mmsi);
  }

  return {
    source: 'AISStream.io',
    bbox: BBOX[0],
    count: vessels.size,
    messagesReceived,
    generatedAt: new Date().toISOString(),
    vessels: [...vessels.values()].map((v) => ({
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
    })),
  };
}

function writeOut() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(snapshot(), null, 2));
    lastWriteAt = Date.now();
  } catch (err) {
    console.error('[ais] write failed:', err);
  }
}

// Write every 5s if there's been activity since last write
setInterval(() => {
  if (lastWriteAt < Date.now() - 60_000) writeOut(); // heartbeat write
}, 60_000);

let ws = null;
let backoff = 1000;

function connect() {
  console.log('[ais] connecting to wss://stream.aisstream.io/v0/stream …');
  ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

  ws.on('open', () => {
    backoff = 1000;
    const sub = {
      APIKey: API_KEY,
      BoundingBoxes: BBOX,
      FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
    };
    ws.send(JSON.stringify(sub));
    console.log('[ais] subscribed for', BBOX);
  });

  ws.on('message', (raw) => {
    messagesReceived++;
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    const meta = msg.MetaData;
    if (!meta || !meta.MMSI) return;
    const mmsi = meta.MMSI;
    const existing = vessels.get(mmsi) ?? { mmsi, name: '', type: 'Unknown', lat: 0, lon: 0 };

    if (msg.MessageType === 'PositionReport') {
      const pr = msg.Message?.PositionReport;
      if (!pr) return;
      vessels.set(mmsi, {
        ...existing,
        mmsi,
        name: existing.name || meta.ShipName?.trim() || '',
        lat: Number(meta.latitude),
        lon: Number(meta.longitude),
        sog: pr.Sog,
        cog: pr.Cog,
        heading: pr.TrueHeading !== 511 ? pr.TrueHeading : null,
        navStatus: pr.NavigationalStatus,
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

    // Debounced write — at most every 5 seconds
    if (Date.now() - lastWriteAt > 5000) writeOut();
  });

  ws.on('close', () => {
    console.warn('[ais] socket closed, reconnecting in', backoff, 'ms');
    setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 30_000);
  });

  ws.on('error', (err) => {
    console.error('[ais] socket error:', err.message);
  });
}

// Live status line
setInterval(() => {
  const out = snapshot();
  process.stdout.write(
    `\r[ais] tracking ${String(out.count).padStart(4)} vessels · ${messagesReceived} msgs · last write ${new Date(lastWriteAt).toISOString().slice(11, 19)} `,
  );
}, 2000);

process.on('SIGINT', () => {
  console.log('\n[ais] shutting down …');
  writeOut();
  if (ws) ws.close();
  process.exit(0);
});

// Initial empty snapshot so /api/vessels has something to read immediately
writeOut();
connect();
