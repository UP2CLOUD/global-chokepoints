// ============================================================
// /feed.xml — Public RSS feed of timeline events
// Journalists can subscribe to be alerted to incidents.
// ============================================================
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 60;
export const dynamic = 'force-dynamic';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.pages.dev').replace(/\/$/, '');
  let events: any[] = [];
  try {
    const res = await fetch(`${base}/api/timeline`);
    const json = await res.json();
    events = Array.isArray(json.events) ? json.events : [];
  } catch {
    /* feed remains empty on failure */
  }

  const items = events
    .slice(0, 30)
    .map((e) => {
      const guid = e.url || `${origin}/event/${e.id}`;
      return `
    <item>
      <title>${esc(e.title || '')}</title>
      <link>${esc(e.url || origin)}</link>
      <guid isPermaLink="${e.url ? 'true' : 'false'}">${esc(guid)}</guid>
      <pubDate>${new Date(e.date).toUTCString()}</pubDate>
      <category>${esc(e.category || 'incident')}</category>
      <source url="${esc(origin)}">${esc(e.source || 'Global Chokepoints Alerts')}</source>
      <description>${esc(e.description || '')}</description>
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Global Chokepoints Alerts — Strait of Hormuz event feed</title>
    <link>${origin}</link>
    <atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Aggregated geopolitical and maritime events affecting the Strait of Hormuz. Sourced from CNN, BBC, Al Jazeera, Reuters and others.</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>1</ttl>${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}
