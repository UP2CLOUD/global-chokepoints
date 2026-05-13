// ============================================================
// /v1/status — Public, stable API for the headline strait state.
// CORS allow-all; cache 30s; partner embeds friendly.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { deriveStatus } from '@/app/lib/api';

export const revalidate = 30;
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
  const [timelineRes, brentRes] = await Promise.all([
    fetch(`${origin}/api/timeline`, { cache: 'no-store' }),
    fetch(`${origin}/api/brent`, { cache: 'no-store' }),
  ]);

  const timeline = timelineRes.ok ? (await timelineRes.json()).events ?? [] : [];
  const brent = brentRes.ok ? await brentRes.json() : null;
  const brentPct = brent?.changePercent ?? null;

  const status = deriveStatus(timeline, brentPct, 'en');
  const payload = {
    state: status.state,
    tensionLevel: status.tensionLevel,
    confidence: status.confidence,
    reason: status.reason,
    brent: brent
      ? { price: brent.price, change: brent.change, changePercent: brent.changePercent }
      : null,
    events24h: timeline.filter((e: any) => {
      const t = +new Date(e.date);
      return !isNaN(t) && Date.now() - t < 24 * 3600 * 1000;
    }).length,
    asOf: status.lastUpdated,
    sources: ['Yahoo Finance', 'GDELT', 'CNN', 'BBC', 'Al Jazeera', 'Reuters'],
    docs: `${origin}/methodology`,
    license: 'CC-BY-4.0 (attribution required: "IsStraitHormuzOpen?")',
  };

  return NextResponse.json(payload, {
    headers: {
      ...CORS,
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  });
}
