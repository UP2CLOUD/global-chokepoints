// ============================================================
// /api/health — Feed health probe used by the StatusBar
// Probes each upstream and returns (ok|degraded|down) + age.
// ============================================================
export const runtime = 'edge';
import { NextResponse } from 'next/server';

export const revalidate = 30;
export const dynamic = 'force-dynamic';

type Status = 'ok' | 'degraded' | 'down';
type Probe = {
  key: string;
  label: string;
  url: string;
  expectedRefreshMs: number;
  /** Latency above which the probe is considered degraded (default 2500 ms) */
  degradedThresholdMs?: number;
  /** Timeout for the probe fetch (default 5000 ms) */
  timeoutMs?: number;
};

const PROBES: Probe[] = [
  { key: 'brent', label: 'Markets (Yahoo)',
    url: 'https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=2d',
    expectedRefreshMs: 5 * 60_000 },
  // GDELT DocSearch often responds in 3-6 s; raise threshold so a slow-but-working
  // response isn't misreported as degraded. Must include mode=ArtList or GDELT returns
  // a non-standard response format that could appear as an error.
  { key: 'gdelt', label: 'News (GDELT)',
    url: 'https://api.gdeltproject.org/api/v2/doc/doc?query=hormuz&mode=ArtList&maxrecords=1&format=json',
    expectedRefreshMs: 5 * 60_000,
    degradedThresholdMs: 7000,
    timeoutMs: 10000 },
  { key: 'cnn', label: 'RSS CNN',
    url: 'http://rss.cnn.com/rss/edition_world.rss',
    expectedRefreshMs: 60_000 },
  { key: 'bbc', label: 'RSS BBC',
    url: 'http://feeds.bbci.co.uk/news/world/rss.xml',
    expectedRefreshMs: 60_000 },
  { key: 'aljazeera', label: 'RSS Al Jazeera',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    expectedRefreshMs: 60_000 },
  { key: 'weather', label: 'Weather (Open-Meteo)',
    url: 'https://api.open-meteo.com/v1/forecast?latitude=26.5&longitude=56.4&current=temperature_2m',
    expectedRefreshMs: 15 * 60_000 },
];

async function probe(p: Probe): Promise<{ key: string; label: string; status: Status; latencyMs: number; httpStatus: number | null }> {
  const start = Date.now();
  const timeout = p.timeoutMs ?? 5000;
  const degradedAt = p.degradedThresholdMs ?? 2500;
  try {
    const res = await fetch(p.url, {
      method: 'GET',
      headers: { 'User-Agent': 'IsHormuzOpen/health' },
      signal: AbortSignal.timeout(timeout),
    });
    const latencyMs = Date.now() - start;
    const ok = res.ok;
    let status: Status = ok ? 'ok' : 'down';
    if (ok && latencyMs > degradedAt) status = 'degraded';
    return { key: p.key, label: p.label, status, latencyMs, httpStatus: res.status };
  } catch (err) {
    return { key: p.key, label: p.label, status: 'down', latencyMs: Date.now() - start, httpStatus: null };
  }
}

export async function GET() {
  const results = await Promise.all(PROBES.map(probe));
  const overall: Status = results.some(r => r.status === 'down')
    ? 'degraded'
    : results.some(r => r.status === 'degraded')
      ? 'degraded'
      : 'ok';
  return NextResponse.json(
    { overall, probes: results, generatedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
  );
}
