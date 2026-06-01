// ============================================================
// GET /v1/weather — Public marine conditions at the Strait of Hormuz
// Source: Open-Meteo via /api/weather (CC-BY-4.0)
// ============================================================
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 900;

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

export async function GET(_req: NextRequest) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.pages.dev').replace(/\/$/, '');

  try {
    const upstream = await fetch(`${base}/api/weather`, {
      headers: { 'User-Agent': 'GlobalChokepointsAlerts/v1' },
      signal: AbortSignal.timeout(12_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream weather fetch failed (HTTP ${upstream.status})` },
        { status: 502, headers: CORS },
      );
    }

    const data = await upstream.json();

    return NextResponse.json(
      { ...data, license: 'CC-BY-4.0 (attribution required: "Global Chokepoints Alerts")' },
      {
        headers: {
          ...CORS,
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        },
      },
    );
  } catch (err) {
    console.error('[v1/weather]', err);
    return NextResponse.json(
      { error: 'Weather data temporarily unavailable' },
      { status: 503, headers: CORS },
    );
  }
}
