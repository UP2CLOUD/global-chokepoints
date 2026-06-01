// ============================================================
// /v1/status — Public, stable API for the headline strait state.
// CORS allow-all; cache 30s; partner embeds friendly.
// ============================================================
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { deriveStatus } from '@/app/lib/api';
import { getD1 } from '@/app/lib/db';

export const revalidate = 30;
export const dynamic = 'force-dynamic';

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
  const origin = new URL(req.url).origin;
  // Subrequests must use the canonical public URL — req.url origin inside CF Pages
  // is an internal address that can't reach sibling functions.
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.pages.dev').replace(/\/$/, '');
  const [timelineRes, brentRes] = await Promise.all([
    fetch(`${base}/api/timeline`),
    fetch(`${base}/api/brent`),
  ]);

  const timeline = timelineRes.ok ? (await timelineRes.json()).events ?? [] : [];
  const brent = brentRes.ok ? await brentRes.json() : null;
  const brentPct = brent?.changePercent ?? null;

  const status = deriveStatus(timeline, brentPct, 'en');

  // Optional history query: ?history=7d (1–30 days)
  const historyParam = req.nextUrl.searchParams.get('history');
  let history: { state: string; tension: number | null; reason: string | null; timestamp: string }[] = [];
  if (historyParam) {
    const days  = Math.min(30, Math.max(1, parseInt(historyParam) || 7));
    const since = Math.floor(Date.now() / 1000) - days * 86400;
    const db    = getD1();
    if (db) {
      try {
        const { results } = await db
          .prepare('SELECT state, tension, reason, created_at FROM status_history WHERE created_at >= ? ORDER BY created_at DESC')
          .bind(since)
          .all<{ state: string; tension: number | null; reason: string | null; created_at: number }>();
        history = (results ?? []).map(r => ({
          state: r.state,
          tension: r.tension,
          reason: r.reason,
          timestamp: new Date(r.created_at * 1000).toISOString(),
        }));
      } catch { /* table may not exist yet */ }
    }
  }

  const payload = {
    state: status.state,
    tensionLevel: status.tensionLevel,
    tensionIndex: Math.round(status.tensionIndex ?? 0),
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
    license: 'CC-BY-4.0 (attribution required: "Global Chokepoints Alerts")',
    ...(historyParam ? { history } : {}),
  };

  return NextResponse.json(payload, {
    headers: {
      ...CORS,
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  });
}
