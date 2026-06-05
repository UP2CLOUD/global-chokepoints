export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 300;

import { NextRequest, NextResponse } from 'next/server';
import { getD1 } from '@/app/lib/db';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

type HistoryRow = {
  id: string;
  state: string;
  previous_state: string | null;
  reason: string | null;
  created_at: number;
};

function stateLabel(s: string) {
  if (s === 'OPEN')   return 'OPEN — Traffic Flowing Normally';
  if (s === 'CLOSED') return 'CLOSED — Strait Blocked';
  return 'DISRUPTED — Traffic Partially Disrupted';
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function etag(content: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(content));
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  return `"${hex}"`;
}

export async function GET(req: NextRequest) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.pages.dev').replace(/\/$/, '');
  let items: HistoryRow[] = [];

  const db = getD1();
  if (db) {
    try {
      const { results } = await db
        .prepare('SELECT id, state, previous_state, reason, created_at FROM status_history ORDER BY created_at DESC LIMIT 50')
        .all<HistoryRow>();
      items = results ?? [];
    } catch { /* table not yet created */ }
  }

  const entries = items.map(item => {
    const date = new Date(item.created_at * 1000).toUTCString();
    const prev  = item.previous_state ? ` (was ${item.previous_state})` : '';
    const title = `${stateLabel(item.state)}${prev}`;
    const desc  = item.reason ? esc(item.reason) : 'Status changed.';
    return `  <item>
    <title>${title}</title>
    <link>${base}</link>
    <description>${desc}</description>
    <pubDate>${date}</pubDate>
    <guid isPermaLink="false">${item.id}</guid>
  </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Global Chokepoints Alerts — Status Feed</title>
    <link>${base}</link>
    <description>Real-time maritime chokepoint status change history</description>
    <language>en</language>
    <ttl>5</ttl>
    <atom:link href="${base}/status-feed.xml" rel="self" type="application/rss+xml"/>
${entries}
  </channel>
</rss>`;

  const tag = await etag(xml);
  if (req.headers.get('if-none-match') === tag) {
    return new NextResponse(null, { status: 304, headers: { ...CORS, ETag: tag } });
  }

  return new NextResponse(xml, {
    headers: {
      ...CORS,
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      ETag: tag,
    },
  });
}
