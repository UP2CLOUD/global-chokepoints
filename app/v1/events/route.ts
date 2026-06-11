// ============================================================
// /v1/events — Public stream of timeline events
// Supports ?chokepoint= for per-CP filtering (hormuz|redsea|suez|panama|taiwan)
// Supports ?before= for cursor-based backward pagination
// ============================================================
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 60;
export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
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
  const before     = u.searchParams.get('before');
  const chokepoint = u.searchParams.get('chokepoint');
  const sinceMs    = since  ? +new Date(since)  : 0;
  const beforeMs   = before ? +new Date(before) : 0;
  if (since  && isNaN(sinceMs))  return NextResponse.json({ error: 'Invalid since: must be an ISO 8601 timestamp'  }, { status: 400, headers: CORS });
  if (before && isNaN(beforeMs)) return NextResponse.json({ error: 'Invalid before: must be an ISO 8601 timestamp' }, { status: 400, headers: CORS });

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
  const res = await fetch(`${base}/api/timeline`, { signal: AbortSignal.timeout(10_000) });
  const json = res.ok ? await res.json() : { events: [] };
  let events: any[] = Array.isArray(json.events) ? json.events : [];

  // Pre-parse timestamps once to avoid O(N log N) Date instantiations in sort/filter
  let stamped = events.map(e => ({ e, time: +new Date(e.date) }));
  stamped.sort((a, b) => b.time - a.time);
  if (sinceMs)  stamped = stamped.filter(x => x.time >= sinceMs);
  if (beforeMs) stamped = stamped.filter(x => x.time < beforeMs);
  events = stamped.map(x => x.e);

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

  const total = events.length;
  events = events.slice(0, limit);

  // nextCursor is the oldest event's date — pass as ?before= to fetch the next page
  const nextCursor = total > limit ? events[events.length - 1]?.date ?? null : null;

  return NextResponse.json(
    {
      events,
      count:       events.length,
      nextCursor,
      filters: {
        chokepoint:  chokepoint ?? null,
        severity:    severityRaw ?? null,
        category:    categoryRaw ?? null,
        since:       since ?? null,
        before:      before ?? null,
      },
      generatedAt: new Date().toISOString(),
      docs:        `${origin}/docs`,
      license:     'CC-BY-4.0',
    },
    {
      headers: {
        ...CORS,
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120, stale-if-error=86400',
      },
    }
  );
}
