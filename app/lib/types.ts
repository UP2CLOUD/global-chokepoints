export type StraitStatus = 'OPEN' | 'PARTIALLY_CLOSED' | 'CLOSED';
export type TensionLevel = 'NORMAL' | 'ELEVATED' | 'CRITICAL';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Category = 'incident' | 'military' | 'diplomatic' | 'economic';
export type Sentiment = 'positive' | 'negative' | 'neutral';
export type Lang = 'en' | 'pt';

export interface StatusData {
  state: StraitStatus;
  tensionLevel: TensionLevel;
  /** 0..100 numeric tension index; documented in /methodology */
  tensionIndex?: number;
  lastUpdated: string;
  confidence: number;
  reason: string;
  /** URL of the source article that drove the current state, if any */
  reasonUrl?: string;
  reasonSource?: string;
}

export interface MetricsData {
  brentPrice: number;
  brentChange: number;
  brentChangePercent: number;
  /** ISO timestamp of the latest Brent reading */
  brentAsOf?: string;
  /** 7-point spark for the Brent tile */
  brentHistory?: { date: string; price: number }[];
  /** True when /api/brent failed on the latest refresh */
  brentDown?: boolean;

  /** Distinct articles in the past 24h matching Hormuz keywords (live). */
  eventsLast24h: number;
  /** Delta vs. previous 24h window. */
  eventsChange: number;
  eventsAsOf?: string;
  eventsDown?: boolean;
  /** Highest-severity event in the past 24h, or null. */
  lastIncident: string | null;
  /** Free-form note shown under the events metric (e.g. "via RSS"). */
  eventsSourceLabel?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  sentiment: Sentiment;
  relevance: number;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  category: Category;
  severity: Severity;
  source: string;
  url?: string;
}

export interface DashboardData {
  status: StatusData;
  metrics: MetricsData;
  news: NewsItem[];
  timeline: TimelineEvent[];
}

export interface Translations {
  [key: string]: string | Translations;
}
