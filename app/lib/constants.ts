// ── Active event tracking ─────────────────────────────────────────────────────
/**
 * ISO timestamp of the current closure/disruption event start.
 * Update this when a new blocking event begins.
 * Displayed as a live elapsed counter in the HeroStatus widget when the
 * strait is not OPEN. Set to '' to hide the counter entirely.
 *
 * Last verified: IRGC strait restrictions confirmed active from ~06:00 UTC on
 * 04 March 2026 (UKMTO advisory MTN-2026-003).
 */
export const BLOCKAGE_START_ISO = '2026-03-04T06:00:00.000Z';

// ── Status algorithm thresholds ───────────────────────────────────────────────
/** Threat score at or above which tensionLevel becomes CRITICAL */
export const THREAT_CRITICAL_THRESHOLD = 80;
/** Threat score at or above which tensionLevel becomes ELEVATED */
export const THREAT_ELEVATED_THRESHOLD = 40;
/** Threat score above which a bare market spike overrides state to PARTIALLY_CLOSED (only with events present) */
export const THREAT_STATE_OVERRIDE = 85;

/** Raw timeline severity ceiling that maps to a normalised score of 100 */
export const TIMELINE_SCORE_CEILING = 35;
/** Severity weights for threat scoring */
export const SEVERITY_WEIGHTS = { low: 1, medium: 2, high: 4, critical: 7 } as const;

/** Brent Δ% below which market signal contributes 0 */
export const BRENT_SPIKE_LOW_PCT = 2;
/** Brent Δ% at which market signal saturates at 100 */
export const BRENT_SPIKE_HIGH_PCT = 5;

/** Signal weights for the composite threat score (must sum to 1.0) */
export const THREAT_WEIGHT_TIMELINE = 0.40;
export const THREAT_WEIGHT_MARKET   = 0.30;
export const THREAT_WEIGHT_PRICE    = 0.30;

/**
 * Absolute Brent price thresholds for the price-level signal.
 * Listed in descending order so the first match wins (used with Array.find).
 */
export const BRENT_PRICE_LEVEL_THRESHOLDS: ReadonlyArray<{ min: number; score: number }> = [
  { min: 120, score: 100 },
  { min: 110, score: 80  },
  { min: 100, score: 65  },
  { min: 90,  score: 45  },
  { min: 80,  score: 25  },
  { min: 70,  score: 10  },
] as const;

/** Confidence algorithm constants */
export const CONFIDENCE_BASE       = 0.55;
export const CONFIDENCE_PER_SOURCE = 0.06;
export const CONFIDENCE_PER_EVENT  = 0.02;
export const CONFIDENCE_MAX_EVENTS = 6;

/**
 * Minimum confidence required to send a CLOSED/DISRUPTED → OPEN alert.
 * Reopening must be supported by multiple corroborating sources before
 * subscribers are notified. Closure alerts use the standard threshold.
 */
export const REOPEN_CONFIDENCE_THRESHOLD = 0.85;

/** Sliding windows for state detection and scoring (hours) */
export const STATE_WINDOW_H = 72;
export const SCORE_WINDOW_H = 24;

// ── API cache TTLs (seconds) ───────────────────────────────────────────────────
export const CACHE_TTL_BRENT     = 300;
export const CACHE_TTL_TIMELINE  = 60;
export const CACHE_TTL_NEWS      = 300;
export const CACHE_TTL_WEATHER   = 900;
export const CACHE_TTL_PORTWATCH = 6 * 3600;
export const CACHE_TTL_MARKETS   = 300;
export const CACHE_TTL_HEALTH    = 30;
export const CACHE_TTL_V1_STATUS = 30;
export const CACHE_TTL_V1_EVENTS = 60;

/** Maximum age of in-process module cache before it is considered too stale to serve */
export const STALE_MODULE_CACHE_MS = 6 * 60 * 60 * 1000;

// ── Geography ─────────────────────────────────────────────────────────────────
export const HORMUZ_LAT               = 26.5;
export const HORMUZ_LON               = 56.4;
export const PORTWATCH_CHOKEPOINT_ID  = 'chokepoint6';
export const PORTWATCH_BASELINE_DAILY = 34;

// ── Public deployment identity ────────────────────────────────────────────────
/** Canonical site URL — overridden by NEXT_PUBLIC_SITE_URL at build time */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://strait-of-hormuz-monitor.pages.dev';

/** Contact email surfaced in docs/methodology/OpenAPI spec */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'contact@ishormuzopen.example';

/**
 * Static ISO date used to seed UI state before live data arrives.
 *
 * Must be a constant string — using new Date() at module level or in useState
 * initialisers produces different values on server vs client and triggers a
 * React hydration mismatch. The value is replaced as soon as the first /api
 * fetch resolves (within ~1s of page load), so it is never user-visible.
 */
export const LOADING_SEED_DATE = '2026-05-14T00:00:00.000Z';
