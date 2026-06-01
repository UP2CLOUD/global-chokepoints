// ============================================================
// /feed.xml — RSS 2.0 feed of Strait of Hormuz timeline events.
// CORS allow-all; cache 5 min; suitable for RSS readers and bots.
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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  source: string;
  url?: string;
}

const SEVERITY_LABEL: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export async function GET(req: NextRequest) {
  // Use canonical public URL — CF Pages internal origin can't reach sibling functions
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.pages.dev').replace(/\/$/, '');

  const limitParam = req.nextUrl.searchParams.get('limit');
  const limit = Math.min(50, Math.max(1, parseInt(limitParam ?? '20') || 20));

  let events: TimelineEvent[] = [];
  let state = 'OPEN';
  let tensionIndex = 0;

  try {
    const [timelineRes, statusRes] = await Promise.all([
      fetch(`${base}/api/timeline`, { signal: AbortSignal.timeout(5000) }),
      fetch(`${base}/v1/status`, { signal: AbortSignal.timeout(5000) }),
    ]);
    if (timelineRes.ok) {
      const j = await timelineRes.json() as { events?: TimelineEvent[] };
      events = (j.events ?? []).slice(0, limit);
    }
    if (statusRes.ok) {
      const j = await statusRes.json() as { state?: string; tensionIndex?: number };
      if (j.state) state = j.state;
      if (j.tensionIndex != null) tensionIndex = j.tensionIndex;
    }
  } catch { /* feed remains empty on failure */ }

  const stateLabel = state.replace(/_/g, ' ');
  const now = new Date().toUTCString();
  const lastPub = events.length > 0 ? new Date(events[0].date).toUTCString() : now;

  const items = events.map(ev => {
    const link = ev.url ? esc(ev.url) : `${base}/`;
    const sevLabel = SEVERITY_LABEL[ev.severity] ?? ev.severity;
    const category = `${ev.category.charAt(0).toUpperCase()}${ev.category.slice(1)}`;
    return `
    <item>
      <title>${esc(ev.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="${ev.url ? 'true' : 'false'}">${ev.url ? esc(ev.url) : `gc-event-${esc(ev.id)}`}</guid>
      <pubDate>${new Date(ev.date).toUTCString()}</pubDate>
      <category>${esc(category)}</category>
      <source url="${base}/v1/events">${esc('Global Chokepoints Alerts')}</source>
      <description>${esc(ev.description)} [${esc(sevLabel)} severity]</description>
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Global Chokepoints Alerts — Strait of Hormuz</title>
    <link>${base}/</link>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Live geopolitical and maritime events affecting the Strait of Hormuz. Current status: ${esc(stateLabel)} (tension ${Math.round(tensionIndex)}/100). Sourced from CNN, BBC, Al Jazeera, Reuters and others.</description>
    <language>en-us</language>
    <pubDate>${lastPub}</pubDate>
    <lastBuildDate>${now}</lastBuildDate>
    <ttl>5</ttl>
    <image>
      <url>${base}/favicon-32x32.png</url>
      <title>Global Chokepoints Alerts</title>
      <link>${base}/</link>
    </image>${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      ...CORS,
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  });
}
