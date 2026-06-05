// ============================================================
// /api/timeline — Live event timeline aggregated from RSS feeds
// Sources: CNN, BBC, Al Jazeera, Reuters (via Google News mirror),
// plus GDELT as a real-time supplement.
// Refreshes every 60 seconds; clients should poll at the same cadence.
// ============================================================
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getKV } from '@/app/lib/kv';

const KV_TIMELINE_KEY = 'timeline:cache';
const KV_TIMELINE_TTL = 60; // 1 min

export const revalidate = 60; // 1 minute
export const dynamic = 'force-dynamic';

type Severity = 'low' | 'medium' | 'high' | 'critical';
type Category = 'incident' | 'military' | 'diplomatic' | 'economic';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  category: Category;
  severity: Severity;
  source: string;
  url: string;
}

// Feeds to aggregate. All are public RSS. Reuters killed their official
// RSS feeds in 2020, so we use Google News scoped to reuters.com.
const FEEDS: { name: string; url: string }[] = [
  { name: 'CNN', url: 'http://rss.cnn.com/rss/edition_world.rss' },
  { name: 'CNN Middle East', url: 'http://rss.cnn.com/rss/edition_meast.rss' },
  { name: 'BBC', url: 'http://feeds.bbci.co.uk/news/world/rss.xml' },
  {
    name: 'BBC Middle East',
    url: 'http://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
  },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  {
    name: 'Reuters Hormuz',
    url: 'https://news.google.com/rss/search?q=site:reuters.com+(Hormuz+OR+Iran+OR+%22oil+tanker%22)&hl=en-US&gl=US&ceid=US:en',
  },
  {
    name: 'Reuters Red Sea',
    url: 'https://news.google.com/rss/search?q=site:reuters.com+(%22Red+Sea%22+OR+Houthi+OR+%22Bab+el-Mandeb%22+OR+%22Suez+Canal%22+OR+%22Panama+Canal%22)&hl=en-US&gl=US&ceid=US:en',
  },
  {
    name: 'Google News Hormuz',
    url: 'https://news.google.com/rss/search?q=%22Strait+of+Hormuz%22+OR+%22Iran+navy%22+OR+%22oil+tanker%22&hl=en-US&gl=US&ceid=US:en',
  },
  {
    name: 'Google News Chokepoints',
    url: 'https://news.google.com/rss/search?q=(%22Red+Sea%22+OR+Houthi+OR+%22Suez+Canal%22+OR+%22Panama+Canal%22+OR+%22Taiwan+Strait%22)+shipping&hl=en-US&gl=US&ceid=US:en',
  },
];

// Keyword filter — only keep articles mentioning the region/topic.
const _KEYWORDS = [
  'hormuz', 'iran', 'iranian', 'persian gulf', 'gulf of oman',
  'oil tanker', 'crude tanker', 'opec', 'brent', 'tehran',
  'revolutionary guard', 'irgc', 'houthi', 'red sea', 'strait',
  'ship', 'vessel', 'maritime', 'naval', 'navy',
];

const NEGATIVE_WORDS = [
  'attack', 'seizure', 'seized', 'sanctions', 'tension', 'conflict',
  'war', 'drone', 'strike', 'closure', 'blocked', 'threat', 'missile',
  'hostile', 'killed', 'wounded', 'crisis', 'fire', 'protest', 'detain',
  'detained', 'explosion', 'raid', 'clash',
];

const CRITICAL_WORDS = [
  'attack', 'killed', 'missile', 'strike', 'explosion', 'war',
  'closure', 'blocked', 'seizure', 'seized',
];

const MILITARY_WORDS = [
  'navy', 'naval', 'military', 'exercise', 'drill', 'fleet',
  'warship', 'irgc', 'revolutionary guard',
];

const DIPLOMATIC_WORDS = [
  'talks', 'diplomatic', 'negotiation', 'summit', 'council',
  'agreement', 'ambassador', 'foreign minister', 'sanction',
];

const ECONOMIC_WORDS = [
  'oil', 'brent', 'crude', 'opec', 'export', 'price', 'market',
  'barrel', 'shipment',
];

function classify(text: string): { category: Category; severity: Severity } {
  const t = text.toLowerCase();
  let category: Category = 'incident';
  if (MILITARY_WORDS.some((w) => t.includes(w))) category = 'military';
  else if (DIPLOMATIC_WORDS.some((w) => t.includes(w))) category = 'diplomatic';
  else if (ECONOMIC_WORDS.some((w) => t.includes(w))) category = 'economic';

  let severity: Severity = 'low';
  const negHits = NEGATIVE_WORDS.filter((w) => t.includes(w)).length;
  const critHit = CRITICAL_WORDS.some((w) => t.includes(w));
  if (critHit) severity = 'critical';
  else if (negHits >= 2) severity = 'high';
  else if (negHits === 1) severity = 'medium';

  return { category, severity };
}

function isRelevant(title: string, description: string): boolean {
  const haystack = `${title} ${description}`.toLowerCase();
  // Require region/maritime context across all tracked chokepoints
  const hasRegion = /\b(hormuz|persian gulf|gulf of oman|iran|iranian|tehran|red sea|houthi|bab.?el.?mandeb|gulf of aden|suez|suez canal|panama canal|taiwan strait|pla navy)\b/.test(
    haystack
  );
  const hasTopic = /\b(oil|tanker|navy|naval|vessel|ship|maritime|strait|missile|drone|sanction|shipping|attack|seized|closure|transit|chokepoint)\b/.test(
    haystack
  );
  return hasRegion && hasTopic;
}

// Minimal RSS / Atom parser — extracts <item> or <entry> blocks.
function parseFeed(xml: string, sourceName: string): TimelineEvent[] {
  const items: TimelineEvent[] = [];

  // Try RSS <item> first, then Atom <entry>
  const blockRegex = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;

  while ((m = blockRegex.exec(xml)) !== null) {
    const block = m[2];

    const title = stripTags(pick(block, 'title')).trim();
    const link =
      stripTags(pick(block, 'link')).trim() ||
      (block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ?? '');
    const desc = stripTags(
      pick(block, 'description') || pick(block, 'summary') || pick(block, 'content')
    ).trim();
    const dateRaw =
      pick(block, 'pubDate') ||
      pick(block, 'published') ||
      pick(block, 'updated') ||
      pick(block, 'dc:date');
    const date = parseDate(stripTags(dateRaw).trim());

    if (!title) continue;
    if (!isRelevant(title, desc)) continue;

    const { category, severity } = classify(`${title} ${desc}`);

    items.push({
      id: `${sourceName}-${hash(link || title)}`,
      title,
      description: desc.slice(0, 320),
      date,
      category,
      severity,
      source: sourceName,
      url: link || '#',
    });
  }
  return items;
}

function pick(block: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  return block.match(re)?.[1] ?? '';
}

function stripTags(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function parseDate(s: string): string {
  if (!s) return new Date().toISOString();
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

// Strip common publisher suffixes from titles before dedup comparison.
// The same Reuters story can appear as "Iran seizes tanker - Reuters" in
// one feed and "Iran seizes tanker | CNN" in another.
function normalizeTitle(title: string): string {
  return title
    .replace(/\s*[-|–]\s*(Reuters|BBC|CNN|Al Jazeera|Guardian|Bloomberg|WSJ|NYT|FT|AP|AFP)\s*$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 72);
}

async function fetchFeed(
  name: string,
  url: string
): Promise<{ events: TimelineEvent[]; ok: boolean }> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; GlobalChokepointsAlerts/1.0; +https://global-chokepoints.pages.dev)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { events: [], ok: false };
    const xml = await res.text();
    return { events: parseFeed(xml, name), ok: true };
  } catch (err) {
    console.warn(`[timeline] ${name} failed:`, err);
    return { events: [], ok: false };
  }
}

export async function GET() {
  const kv = getKV();
  if (kv) {
    try {
      const cached = await kv.get(KV_TIMELINE_KEY, 'json') as { events: TimelineEvent[]; sources: string[]; feedsOk: number; feedsFailed: number; generatedAt: string; fetchMs: number } | null;
      if (cached) return NextResponse.json(cached, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120, stale-if-error=86400', 'X-Cache': 'HIT' } });
    } catch { /* fall through */ }
  }

  const startedAt = Date.now();
  const results = await Promise.all(
    FEEDS.map((f) => fetchFeed(f.name, f.url))
  );

  const feedsOk     = results.filter(r => r.ok).length;
  const feedsFailed = results.length - feedsOk;

  // Pass 1: dedupe by canonical URL
  const seenUrl = new Set<string>();
  const pass1: TimelineEvent[] = [];
  for (const { events } of results) {
    for (const ev of events) {
      const key = ev.url !== '#' ? ev.url : `__title__${ev.title.toLowerCase()}`;
      if (seenUrl.has(key)) continue;
      seenUrl.add(key);
      pass1.push(ev);
    }
  }

  // Pass 2: dedupe by normalized title — catches the same story syndicated
  // across multiple Google News feeds with slightly different URLs
  const seenTitle = new Set<string>();
  const merged: TimelineEvent[] = [];
  for (const ev of pass1) {
    const titleKey = normalizeTitle(ev.title);
    if (seenTitle.has(titleKey)) continue;
    seenTitle.add(titleKey);
    merged.push(ev);
  }

  // Sort newest first, cap at 50 to cover multiple chokepoints
  merged.sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const events = merged.slice(0, 50);

  const payload = {
    events,
    sources: FEEDS.map((f) => f.name),
    feedsOk,
    feedsFailed,
    generatedAt: new Date().toISOString(),
    fetchMs: Date.now() - startedAt,
  };

  if (kv) kv.put(KV_TIMELINE_KEY, JSON.stringify(payload), { expirationTtl: KV_TIMELINE_TTL }).catch(() => {});

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120, stale-if-error=86400', 'X-Cache': 'MISS' },
  });
}
