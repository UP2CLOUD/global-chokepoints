// ============================================================
// /api/health — Feed health probe used by the StatusBar
// Probes each upstream and returns (ok|degraded|down) + age.
// Also reports D1 and KV binding availability.
// ============================================================
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getD1 } from '@/app/lib/db';
import { getKV } from '@/app/lib/kv';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

// Keys of probes that must be reachable for the system to be considered up
const CRITICAL_KEYS = new Set(['brent', 'cnn', 'bbc']);

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
  { key: 'stooq', label: 'Markets (Stooq)',
    url: 'https://stooq.com/q/d/l/?s=BZ.F&i=d',
    expectedRefreshMs: 5 * 60_000,
    degradedThresholdMs: 4000,
    timeoutMs: 6000 },
  { key: 'portwatch', label: 'Data (IMF PortWatch)',
    url: 'https://portwatch.imf.org/datasets/portwatch-data/api/explore/v2.1/catalog/datasets/port_statistics_public_v2/records?limit=1',
    expectedRefreshMs: 6 * 60 * 60_000,
    degradedThresholdMs: 6000,
    timeoutMs: 10000 },
];

async function probeUpstream(p: Probe): Promise<{ key: string; label: string; status: Status; latencyMs: number; httpStatus: number | null }> {
  const start = Date.now();
  const timeout = p.timeoutMs ?? 5000;
  const degradedAt = p.degradedThresholdMs ?? 2500;
  try {
    const res = await fetch(p.url, {
      method: 'GET',
      headers: { 'User-Agent': 'GlobalChokepointsAlerts/health' },
      signal: AbortSignal.timeout(timeout),
    });
    const latencyMs = Date.now() - start;
    const ok = res.ok;
    let status: Status = ok ? 'ok' : 'down';
    if (ok && latencyMs > degradedAt) status = 'degraded';
    return { key: p.key, label: p.label, status, latencyMs, httpStatus: res.status };
  } catch {
    return { key: p.key, label: p.label, status: 'down', latencyMs: Date.now() - start, httpStatus: null };
  }
}

async function probeD1(): Promise<{ available: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  const db = getD1();
  if (!db) return { available: false, latencyMs: 0, error: 'binding not configured' };
  try {
    await db.prepare('SELECT 1').first();
    return { available: true, latencyMs: Date.now() - start };
  } catch (e) {
    return { available: false, latencyMs: Date.now() - start, error: String(e) };
  }
}

async function probeKV(): Promise<{ available: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  const kv = getKV();
  if (!kv) return { available: false, latencyMs: 0, error: 'binding not configured' };
  try {
    await kv.get('health:ping');
    return { available: true, latencyMs: Date.now() - start };
  } catch (e) {
    return { available: false, latencyMs: Date.now() - start, error: String(e) };
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  const [upstreamResults, d1, kv] = await Promise.all([
    Promise.all(PROBES.map(probeUpstream)),
    probeD1(),
    probeKV(),
  ]);

  const criticalResults = upstreamResults.filter(r => CRITICAL_KEYS.has(r.key));
  const criticalDown = criticalResults.length > 0 && criticalResults.every(r => r.status === 'down');

  const anyDown      = upstreamResults.some(r => r.status === 'down');
  const anyDegraded  = upstreamResults.some(r => r.status === 'degraded');

  // 'down' only when ALL critical feeds fail simultaneously
  const overall: Status = criticalDown ? 'down' : anyDown || anyDegraded ? 'degraded' : 'ok';
  const httpStatus = overall === 'down' ? 503 : 200;

  return NextResponse.json(
    {
      overall,
      probes: upstreamResults,
      bindings: { d1, kv },
      generatedAt: new Date().toISOString(),
    },
    {
      status: httpStatus,
      headers: {
        ...CORS,
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    }
  );
}
