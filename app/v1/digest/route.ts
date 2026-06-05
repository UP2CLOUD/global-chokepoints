// ============================================================
// /v1/digest — Single-fetch convenience endpoint.
// Returns status + top events + markets in one payload.
// Designed for embed widgets that can't afford multiple requests.
// Cache TTL: 60 s. CORS: allow-all. License: CC-BY-4.0.
// ============================================================
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 60;

import { NextRequest, NextResponse } from 'next/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.pages.dev').replace(/\/$/, '');

  // ?events — number of recent events to include (1–20, default 5)
  const eventCount = Math.min(20, Math.max(1, parseInt(req.nextUrl.searchParams.get('events') ?? '5', 10) || 5));

  // Fan out to internal APIs in parallel — each has its own cache layer
  const [statusRes, eventsRes, metricsRes] = await Promise.allSettled([
    fetch(`${base}/v1/status`,                        { signal: AbortSignal.timeout(8_000) }),
    fetch(`${base}/v1/events?limit=${eventCount}`,    { signal: AbortSignal.timeout(8_000) }),
    fetch(`${base}/v1/metrics`,                       { signal: AbortSignal.timeout(8_000) }),
  ]);

  const status  = statusRes.status  === 'fulfilled' && statusRes.value.ok  ? await statusRes.value.json()  : null;
  const events  = eventsRes.status  === 'fulfilled' && eventsRes.value.ok  ? await eventsRes.value.json()  : null;
  const metrics = metricsRes.status === 'fulfilled' && metricsRes.value.ok ? await metricsRes.value.json() : null;

  // At minimum we need status data to return a useful response
  if (!status) {
    return NextResponse.json(
      { error: 'Status data temporarily unavailable' },
      { status: 503, headers: { ...CORS, 'Retry-After': '30' } },
    );
  }

  const payload = {
    // ── Status ─────────────────────────────────────────────
    state:        status.state,
    tensionLevel: status.tensionLevel,
    tensionIndex: status.tensionIndex,
    confidence:   status.confidence,
    reason:       status.reason,
    reasonUrl:    status.reasonUrl ?? null,
    asOf:         status.asOf,

    // ── Recent events ──────────────────────────────────────
    events: events?.events ?? [],
    eventCount: events?.count ?? 0,

    // ── Markets ────────────────────────────────────────────
    brent:  status.brent ?? metrics?.markets?.brent ?? null,
    markets: metrics?.markets ?? null,

    // ── Weather (brief summary) ────────────────────────────
    weather: metrics?.weather
      ? {
          temperatureC:  metrics.weather.temperatureC,
          wind:          metrics.weather.wind,
          sea:           metrics.weather.sea,
          navRisk:       metrics.weather.navRisk,
          navRiskLabel:  metrics.weather.navRiskLabel,
        }
      : null,

    // ── 24-hour event delta ────────────────────────────────
    eventDelta: metrics?.events ?? null,

    // ── Metadata ───────────────────────────────────────────
    generatedAt: new Date().toISOString(),
    sources:     status.sources ?? [],
    license:     'CC-BY-4.0 (attribution required: "Global Chokepoints Alerts")',
  };

  return NextResponse.json(payload, {
    headers: {
      ...CORS,
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120, stale-if-error=3600',
    },
  });
}
