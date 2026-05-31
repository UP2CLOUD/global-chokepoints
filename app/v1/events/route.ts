// ============================================================
// /v1/events — Public stream of timeline events
// Supports ?chokepoint= for per-CP filtering (hormuz|redsea|suez|panama|taiwan)
// ============================================================
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 60;
export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const CP_KEYWORDS: Record<string, string[]> = {
  hormuz: ['hormuz', 'irgc', 'persian gulf', 'gulf of oman', 'iran navy', 'iranian navy'],
  redsea: ['red sea', 'houthi', 'bab el-mandeb', 'bab-el-mandeb', 'aden', 'yemen', 'gulf of aden'],
  suez:   ['suez', 'suez canal', 'egypt maritime'],
  panama: ['panama canal', 'panama locks', 'canal authority'],
  taiwan: ['taiwan strait', 'taiwan channel', 'pla navy', 'south china sea pla'],
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

const VALID_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
const VALID_CATEGORIES = new Set(['incident', 'military', 'diplomatic', 'economic']);

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const limit      = Math.min(100, Math.max(1, parseInt(u.searchParams.get('limit') ?? '30', 10)));
  const since      = u.searchParams.get('since');
  const chokepoint = u.searchParams.get('chokepoint');
  const sinceMs    = since ? +new Date(since) : 0;

  // ?severity=high,critical  — comma-separated; unknown values ignored
  const severityRaw  = u.searchParams.get('severity');
  const severitySet  = severityRaw
    ? new Set(severityRaw.split(',').map(s => s.trim()).filter(s => VALID_SEVERITIES.has(s)))
    : null;

  // ?category=military,incident
  const categoryRaw  = u.searchParams.get('category');
  const categorySet  = categoryRaw
    ? new Set(categoryRaw.split(',').map(c => c.trim()).filter(c => VALID_CATEGORIES.has(c)))
    : null;

  const origin = u.origin;
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.pages.dev').replace(/\/$/, '');
  const res = await fetch(`${base}/api/timeline`);
  const json = res.ok ? await res.json() : { events: [] };
  let events: any[] = Array.isArray(json.events) ? json.events : [];

  if (sinceMs)     events = events.filter((e) => +new Date(e.date) >= sinceMs);
  if (severitySet?.size) events = events.filter(e => severitySet.has(e.severity));
  if (categorySet?.size) events = events.filter(e => categorySet.has(e.category));

  // Filter by chokepoint keyword set when ?chokepoint= is provided
  const cpKws = chokepoint ? CP_KEYWORDS[chokepoint] : null;
  if (cpKws) {
    events = events.filter(e => {
      const hay = `${e.title ?? ''} ${e.description ?? ''}`.toLowerCase();
      return cpKws.some(kw => hay.includes(kw));
    });
  }

  events = events.slice(0, limit);

  return NextResponse.json(
    {
      events,
      count:       events.length,
      filters: {
        chokepoint:  chokepoint ?? null,
        severity:    severityRaw ?? null,
        category:    categoryRaw ?? null,
        since:       since ?? null,
      },
      generatedAt: new Date().toISOString(),
      docs:        `${origin}/docs`,
      license:     'CC-BY-4.0',
    },
    {
      headers: {
        ...CORS,
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    }
  );
}
