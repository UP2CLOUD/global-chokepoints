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

/** Confidence algorithm constants */
export const CONFIDENCE_BASE       = 0.55;
export const CONFIDENCE_PER_SOURCE = 0.06;
export const CONFIDENCE_PER_EVENT  = 0.02;
export const CONFIDENCE_MAX_EVENTS = 6;

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
