// ============================================================
// CLIENT-SIDE API HELPERS — IsHormuzOpen
// ============================================================
// All real-data calls go through our own /api/* routes:
//   - /api/brent     — Brent crude from Yahoo Finance
//   - /api/news      — news from GDELT
//   - /api/timeline  — aggregated RSS (CNN, BBC, Al Jazeera, Reuters,
//                       Google News) refreshed every minute
// Server-side fetch lets us avoid CORS and (later) hide API keys.
// ============================================================

import {
  NewsItem,
  TimelineEvent,
  DashboardData,
  StatusData,
  StraitStatus,
  TensionLevel,
} from './types';

export interface BrentPayload {
  price: number;
  change: number;
  changePercent: number;
  history: { date: string; price: number }[];
  asOf: string;
}

export async function fetchBrent(): Promise<BrentPayload | null> {
  try {
    const res = await fetch('/api/brent', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as BrentPayload;
  } catch (err) {
    console.warn('[fetchBrent] failed:', err);
    return null;
  }
}

export async function fetchNews(): Promise<NewsItem[] | null> {
  try {
    const res = await fetch('/api/news', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json.news) && json.news.length > 0 ? json.news : null;
  } catch (err) {
    console.warn('[fetchNews] failed:', err);
    return null;
  }
}

export async function fetchTimeline(): Promise<TimelineEvent[] | null> {
  try {
    const res = await fetch('/api/timeline', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json.events) && json.events.length > 0
      ? json.events
      : null;
  } catch (err) {
    console.warn('[fetchTimeline] failed:', err);
    return null;
  }
}

// ============================================================
// Derive strait status from real signals (timeline + Brent move)
// ============================================================
const CLOSURE_PATTERNS = [
  /\bclosed\b/i,
  /\bclosure\b/i,
  /\bshut(\s+down)?\b/i,
  /\bblocked\b/i,
  /\bblockade\b/i,
  /\bsuspended\b/i,
  /halt(?:ed|s|ing)?\s+(traffic|shipping|transit)/i,
];

const PARTIAL_PATTERNS = [
  /\bdiverted\b/i,
  /\brerouted\b/i,
  /\bdelayed\b/i,
  /\bevacuat(ed|ion|ing)\b/i,
  /traffic\s+(disrupt|restrict)/i,
];

export function deriveStatus(
  timeline: TimelineEvent[],
  brentChangePercent: number | null,
  lang: import('@/app/lib/types').Lang = 'en'
): StatusData {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const threeDay = 3 * day;

  const recent = timeline.filter((e) => {
    const t = +new Date(e.date);
    return !isNaN(t) && now - t < threeDay;
  });

  // 1) State (OPEN / PARTIALLY_CLOSED / CLOSED)
  let state: StraitStatus = 'OPEN';
  let closureHit: TimelineEvent | null = null;
  let partialHit: TimelineEvent | null = null;
  for (const e of recent) {
    const txt = `${e.title} ${e.description}`;
    if (CLOSURE_PATTERNS.some((re) => re.test(txt))) {
      closureHit = e;
      break;
    }
    if (!partialHit && PARTIAL_PATTERNS.some((re) => re.test(txt))) {
      partialHit = e;
    }
  }
  if (closureHit) state = 'CLOSED';
  else if (partialHit) state = 'PARTIALLY_CLOSED';

  // 2) Smarter Multi-Signal Threat Score (0-100)
  // We combine:
  // - Timeline Severity Score
  // - Market Volatility (Brent crude spikes)
  // - Sentiment Analysis (future-ready for Cloudflare Workers AI)
  //
  // threatScore = (Timeline_Severity * 0.5) + (Market_Volatility * 0.5)
  const last24 = recent.filter((e) => now - +new Date(e.date) < day);
  const weight = { low: 1, medium: 2, high: 4, critical: 7 } as const;
  
  // Calculate Timeline Severity Score (maxes out around 35 points, scaled to 100)
  const rawTimelineScore = last24.reduce((s, e) => s + weight[e.severity], 0);
  const normalizedTimelineScore = Math.min(100, rawTimelineScore * (100 / 35));

  // Calculate Market Volatility Score (spike over 2% starts triggering, 5% is 100)
  let marketVolatilityScore = 0;
  if (brentChangePercent != null) {
    if (brentChangePercent > 2) {
      marketVolatilityScore = Math.min(100, (brentChangePercent - 2) * 33.3);
    }
  }

  // Final Threat Score formulation
  const threatScore = Math.round((normalizedTimelineScore * 0.5) + (marketVolatilityScore * 0.5));

  let tensionLevel: TensionLevel = 'NORMAL';
  if (threatScore >= 80 || state === 'CLOSED') tensionLevel = 'CRITICAL';
  else if (threatScore >= 40 || state === 'PARTIALLY_CLOSED') tensionLevel = 'ELEVATED';

  // Override rule-based state only when timeline events corroborate high market volatility.
  // Pure Brent spike without timeline events never escalates state — prevents false positives.
  if (state === 'OPEN' && last24.length > 0) {
    if (threatScore > 85) state = 'PARTIALLY_CLOSED';
  }

  // 3) Confidence — diversity of sources backing recent events
  const sources = new Set(last24.map((e) => e.source));
  const confidence = Math.min(
    0.99,
    0.55 + sources.size * 0.06 + Math.min(last24.length, 6) * 0.02
  );

  // 4) Reason — pick the highest-severity recent event title, or a calm default
  const sevOrder: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  const top =
    [...recent].sort(
      (a, b) =>
        sevOrder[b.severity] - sevOrder[a.severity] ||
        +new Date(b.date) - +new Date(a.date)
    )[0] ?? null;

  let reason: string;
  let driver: TimelineEvent | null = null;
  if (state === 'CLOSED' && closureHit) {
    driver = closureHit;
    reason =
      lang !== 'pt'
        ? `Closure signal detected: ${closureHit.title}`
        : `Sinal de fechamento detectado: ${closureHit.title}`;
  } else if (state === 'PARTIALLY_CLOSED' && partialHit) {
    driver = partialHit;
    reason =
      lang !== 'pt'
        ? `Partial disruption reported: ${partialHit.title}`
        : `Interrupção parcial reportada: ${partialHit.title}`;
  } else if (top && (top.severity === 'critical' || top.severity === 'high')) {
    driver = top;
    reason =
      lang !== 'pt'
        ? `Maritime traffic operational. Latest flag: ${top.title}`
        : `Tráfego marítimo operacional. Alerta recente: ${top.title}`;
  } else if (last24.length === 0) {
    reason =
      lang !== 'pt'
        ? 'Maritime traffic operational. No notable incidents in the past 24 hours.'
        : 'Tráfego marítimo operacional. Sem incidentes notáveis nas últimas 24 horas.';
  } else {
    reason =
      lang !== 'pt'
        ? `Maritime traffic operational. ${last24.length} relevant items in the past 24h across ${sources.size} sources.`
        : `Tráfego marítimo operacional. ${last24.length} itens relevantes nas últimas 24h em ${sources.size} fontes.`;
  }

  // 5) Numeric tension index 0..100 maps directly to our threatScore
  const tensionIndex = threatScore;

  return {
    state,
    tensionLevel,
    tensionIndex,
    confidence: Number(confidence.toFixed(2)),
    reason,
    reasonUrl: driver?.url && driver.url !== '#' ? driver.url : undefined,
    reasonSource: driver?.source,
    lastUpdated: new Date().toISOString(),
  };
}

function countLast24h(timeline: TimelineEvent[]): {
  last: number;
  prev: number;
} {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  let last = 0;
  let prev = 0;
  for (const e of timeline) {
    const t = +new Date(e.date);
    if (isNaN(t)) continue;
    const age = now - t;
    if (age >= 0 && age < day) last++;
    else if (age >= day && age < 2 * day) prev++;
  }
  return { last, prev };
}

// --- Combined fetcher used on page load + auto-refresh ---------------
export async function fetchDashboardData(): Promise<Partial<DashboardData>> {
  const [brent, timeline] = await Promise.all([
    fetchBrent(),
    fetchTimeline(),
  ]);

  const updates: Partial<DashboardData> = {};

  // Always compute event metrics if we have *any* live source.
  const eventsList: TimelineEvent[] = timeline ?? [];
  const { last: eventsLast24h, prev: eventsPrev24h } =
    countLast24h(eventsList);
  const eventsChange = eventsLast24h - eventsPrev24h;
  const latestIncident = eventsList.find(
    (e) => e.severity === 'high' || e.severity === 'critical'
  );

  if (brent) {
    updates.metrics = {
      brentPrice: brent.price,
      brentChange: brent.change,
      brentChangePercent: brent.changePercent,
      brentAsOf: brent.asOf,
      brentHistory: brent.history,
      brentDown: false,
      eventsLast24h,
      eventsChange,
      eventsAsOf: timeline ? new Date().toISOString() : undefined,
      eventsDown: !timeline,
      lastIncident: latestIncident ? latestIncident.date : null,
      eventsSourceLabel: 'RSS',
    };
  } else {
    // Brent failed — mark the tile as feed-down, but still surface
    // event metrics from RSS if we have them.
    updates.metrics = {
      brentPrice: 0,
      brentChange: 0,
      brentChangePercent: 0,
      brentDown: true,
      eventsLast24h,
      eventsChange,
      eventsAsOf: timeline ? new Date().toISOString() : undefined,
      eventsDown: !timeline,
      lastIncident: latestIncident ? latestIncident.date : null,
      eventsSourceLabel: 'RSS',
    };
  }

  if (timeline && timeline.length > 0) updates.timeline = timeline;

  return updates;
}
