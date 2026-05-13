// ============================================================
// /v1/metrics — Public read-only metrics endpoint
// ============================================================
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 60;
export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;

  const [markets, weather, timeline] = await Promise.all([
    fetch(`${origin}/api/markets`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`${origin}/api/weather`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`${origin}/api/timeline`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  const events: any[] = timeline?.events ?? [];
  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const events24h = events.filter(e => now - +new Date(e.date) < day).length;
  const eventsPrev24h = events.filter(e => {
    const t = now - +new Date(e.date);
    return t >= day && t < 2 * day;
  }).length;

  return NextResponse.json(
    {
      markets: markets?.markets ?? null,
      weather: weather && !weather.error ? weather : null,
      events: { last24h: events24h, prev24h: eventsPrev24h, delta: events24h - eventsPrev24h },
      generatedAt: new Date().toISOString(),
      docs: `${origin}/methodology`,
      license: 'CC-BY-4.0',
    },
    { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
  );
}
