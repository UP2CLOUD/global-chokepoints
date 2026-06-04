// ============================================================
// /api/ping — Lightweight health check for uptime monitors.
// Returns 200 {"ok":true} in <5ms with no upstream fetches.
// Use this for UptimeRobot, Pingdom, etc. — not /api/health
// (which probes 6 external services and takes 2–5 s).
// ============================================================
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const NO_CACHE = 'no-cache, no-store, must-revalidate';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: { ...CORS, 'Cache-Control': NO_CACHE },
  });
}

export async function GET() {
  return NextResponse.json(
    { ok: true, ts: new Date().toISOString(), service: 'global-chokepoints-alerts' },
    { headers: { ...CORS, 'Cache-Control': NO_CACHE } },
  );
}
