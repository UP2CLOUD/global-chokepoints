// ============================================================
// /v1/news — Public news feed from GDELT via /api/news.
// CORS allow-all; cache 5 min; CC-BY-4.0.
// ============================================================
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 300;

import { NextRequest, NextResponse } from 'next/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const VALID_SENTIMENTS = new Set(['positive', 'negative', 'neutral']);

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl;
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.pages.dev').replace(/\/$/, '');

  // ?limit — clamp 1–50, default 20
  const limit = Math.min(50, Math.max(1, parseInt(u.searchParams.get('limit') ?? '20', 10) || 20));

  // ?sentiment — optional filter: positive | negative | neutral
  const sentimentParam = u.searchParams.get('sentiment')?.toLowerCase() ?? null;
  if (sentimentParam && !VALID_SENTIMENTS.has(sentimentParam)) {
    return NextResponse.json(
      { error: `Invalid sentiment. Valid values: ${[...VALID_SENTIMENTS].join(', ')}` },
      { status: 400, headers: CORS },
    );
  }

  let news: any[] = [];
  let source = 'GDELT';
  try {
    const upstream = await fetch(`${base}/api/news`, { signal: AbortSignal.timeout(12_000), headers: { 'User-Agent': 'GlobalChokepointsAlerts/v1' } });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream HTTP ${upstream.status}` },
        { status: 502, headers: CORS },
      );
    }
    const data = await upstream.json();
    news = Array.isArray(data.news) ? data.news : [];
    source = data.source ?? 'GDELT';
  } catch {
    return NextResponse.json(
      { error: 'News data temporarily unavailable' },
      { status: 503, headers: { ...CORS, 'Retry-After': '30' } },
    );
  }

  if (sentimentParam) {
    news = news.filter((item: any) => item.sentiment === sentimentParam);
  }
  const total = news.length;
  news = news.slice(0, limit);

  return NextResponse.json(
    {
      count: news.length,
      total,
      limit,
      ...(sentimentParam ? { sentimentFilter: sentimentParam } : {}),
      source,
      news,
      license: 'CC-BY-4.0 (attribution required: "Global Chokepoints Alerts")',
    },
    {
      headers: {
        ...CORS,
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600, stale-if-error=86400',
      },
    },
  );
}
