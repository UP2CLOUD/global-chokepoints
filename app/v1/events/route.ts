// ============================================================
// /v1/events — Public stream of timeline events
// ============================================================
import { NextRequest, NextResponse } from 'next/server';

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
  const u = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(u.searchParams.get('limit') ?? '30', 10)));
  const since = u.searchParams.get('since');
  const sinceMs = since ? +new Date(since) : 0;

  const origin = u.origin;
  const res = await fetch(`${origin}/api/timeline`, { cache: 'no-store' });
  const json = res.ok ? await res.json() : { events: [] };
  let events: any[] = Array.isArray(json.events) ? json.events : [];

  if (sinceMs) events = events.filter((e) => +new Date(e.date) >= sinceMs);
  events = events.slice(0, limit);

  return NextResponse.json(
    {
      events,
      count: events.length,
      generatedAt: new Date().toISOString(),
      docs: `${origin}/methodology`,
      license: 'CC-BY-4.0',
    },
    {
      headers: {
        ...CORS,
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    }
  );
}
