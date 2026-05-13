// ============================================================
// /api/news — Live news via GDELT (free, no key)
// Returns articles mentioning Strait of Hormuz / Iran navy / oil tankers.
// GDELT v2 DocSearch can be slow (2-6 s) or occasionally return errors.
// We retry up to 2 times with a short delay and serve a module-level
// stale cache (up to 1 h) when GDELT is fully unavailable.
// ============================================================
import { NextResponse } from 'next/server';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

const QUERY =
  '("Strait of Hormuz" OR "Hormuz Strait" OR "Iranian navy" OR ' +
  '"Iran navy" OR "oil tanker" OR "Persian Gulf")';

const GDELT_URL =
  `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(QUERY)}` +
  `&mode=ArtList&maxrecords=20&format=json&sort=datedesc&sourcelang=eng`;

// Module-level stale cache — survives within a single server process so a
// flaky GDELT doesn't serve an empty list to every visitor.
let gdeltCache: { ts: number; news: ReturnType<typeof buildNews> } | null = null;
const CACHE_STALE_MS = 60 * 60 * 1000; // 1 hour

// Fetch GDELT with retries (exponential back-off: 0 ms, 1 s, 2 s).
async function fetchGdelt(retries = 2): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 1000));
    try {
      const res = await fetch(GDELT_URL, {
        headers: { 'User-Agent': 'IsStraitHormuzOpen/1.0' },
        cache: 'no-store',
        signal: AbortSignal.timeout(9000), // GDELT can be slow; give 9 s
      });
      if (!res.ok) throw new Error(`GDELT HTTP ${res.status}`);
      const text = await res.text();
      try { return JSON.parse(text); } catch { return { articles: [] }; }
    } catch (err) {
      lastErr = err;
      console.warn(`[api/news] GDELT attempt ${attempt + 1} failed:`, (err as Error).message);
    }
  }
  throw lastErr;
}

function analyzeSentiment(
  title: string
): 'positive' | 'negative' | 'neutral' {
  const t = title.toLowerCase();
  const negative = [
    'attack', 'seizure', 'sanctions', 'tension', 'conflict', 'war',
    'drone', 'strike', 'closure', 'blocked', 'threat', 'missile',
    'hostile', 'seized', 'killed', 'wounded', 'crisis', 'fire',
    'detained', 'protest',
  ];
  const positive = [
    'open', 'safe', 'passage', 'agreement', 'peace', 'deal',
    'cooperation', 'resolved', 'stable', 'eased', 'truce', 'release',
  ];
  if (negative.some((w) => t.includes(w))) return 'negative';
  if (positive.some((w) => t.includes(w))) return 'positive';
  return 'neutral';
}

// GDELT date format: 20260512T143000Z → ISO
function parseGdeltDate(d?: string): string {
  if (!d) return new Date().toISOString();
  const m = d.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return new Date().toISOString();
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
}

// Tiny non-crypto string hash — stable across runs, base36 for compactness.
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function buildNews(articles: any[]) {
  const seen = new Set<string>();
  return articles
    .filter((art) => {
      const k = (art.url || '').toLowerCase();
      if (!k) return true;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 8)
    .map((art, i) => ({
      id: `gdelt-${i}-${djb2(art.url || art.title || String(i))}`,
      title: art.title || 'Untitled',
      source: art.sourcecommonname || art.domain || 'GDELT',
      publishedAt: parseGdeltDate(art.seendate),
      url: art.url || '#',
      sentiment: analyzeSentiment(art.title || ''),
      relevance:
        typeof art.tone === 'string'
          ? Math.min(1, 0.6 + Math.abs(parseFloat(art.tone) / 20))
          : 0.75,
    }));
}

export async function GET() {
  try {
    const data = await fetchGdelt();
    const articles: any[] = data.articles ?? [];
    const news = buildNews(articles);

    // Update module-level cache on success
    if (news.length > 0) gdeltCache = { ts: Date.now(), news };

    return NextResponse.json(
      { news, source: 'GDELT', count: news.length },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (err) {
    console.error('[api/news] all GDELT attempts failed:', err);

    // Serve stale cache rather than an empty list
    if (gdeltCache && Date.now() - gdeltCache.ts < CACHE_STALE_MS) {
      console.warn('[api/news] serving stale GDELT cache');
      return NextResponse.json(
        { news: gdeltCache.news, source: 'GDELT (cached)', count: gdeltCache.news.length, stale: true },
        { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
      );
    }

    return NextResponse.json(
      { error: String(err), news: [] },
      { status: 502 }
    );
  }
}
