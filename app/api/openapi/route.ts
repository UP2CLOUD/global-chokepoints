// Serves the OpenAPI 3.0 specification for this API.
// Consumed by /docs for the interactive API reference.
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { SITE_URL, CONTACT_EMAIL } from '@/app/lib/constants';

// ── Shared schema fragments ────────────────────────────────────────────────────
const TimelineEvent = {
  type: 'object',
  properties: {
    id:          { type: 'string' },
    date:        { type: 'string', format: 'date-time' },
    title:       { type: 'string' },
    description: { type: 'string' },
    category:    { type: 'string', enum: ['incident', 'military', 'diplomatic', 'economic'] },
    severity:    { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    source:      { type: 'string' },
    url:         { type: 'string', format: 'uri' },
  },
  required: ['id', 'date', 'title', 'severity', 'category', 'source'],
};

const Ticker = {
  type: 'object',
  properties: {
    price:         { type: 'number' },
    change:        { type: 'number' },
    changePercent: { type: 'number' },
    history: {
      type: 'array',
      items: {
        type: 'object',
        properties: { date: { type: 'string' }, price: { type: 'number' } },
      },
    },
    asOf:     { type: 'string', format: 'date-time' },
    label:    { type: 'string' },
    symbol:   { type: 'string' },
    unit:     { type: 'string' },
    provider: { type: 'string' },
    stale:    { type: 'boolean' },
    error:    { type: 'string' },
  },
};

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Global Chokepoints Alerts API',
    version: '1.0.0',
    description:
      'Real-time public intelligence API for the operational status of global maritime chokepoints. ' +
      'All `/v1` endpoints are free, CORS-open, and CC-BY-4.0 licensed. ' +
      'Authentication via `x-api-key` header is only enforced when `V1_API_KEY` is set in the deployment environment.',
    license: { name: 'CC-BY-4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    contact: {
      url: `${SITE_URL}/docs`,
      email: CONTACT_EMAIL,
    },
  },
  servers: [{ url: SITE_URL, description: 'Production (Cloudflare Pages Edge)' }],
  tags: [
    { name: 'Public v1', description: 'CC-BY-4.0 licensed, CORS-open endpoints for partners and embeds' },
    { name: 'Data feeds', description: 'Internal feed routes polled by the dashboard' },
    { name: 'Subscriptions', description: 'Email alert opt-in / opt-out' },
    { name: 'Webhooks', description: 'Register HTTPS endpoints for status change push notifications' },
    { name: 'API Keys', description: 'Self-serve gca_* key issuance' },
  ],
  paths: {
    '/v1/status': {
      get: {
        operationId: 'getStatus',
        tags: ['Public v1'],
        summary: 'Current chokepoint status',
        description:
          'Returns the computed operational state, tension level (0–100 threat score), ' +
          'confidence, and the driving reason string. Refreshed every 30 s at the edge.',
        security: [{}],
        parameters: [
          {
            name: 'history',
            in: 'query',
            schema: { type: 'string', example: '7d' },
            description: 'Return up to N days of status history (e.g. 7d, 30d). Adds a history[] array to the response.',
          },
        ],
        responses: {
          '200': {
            description: 'Chokepoint status',
            headers: {
              'Cache-Control': { schema: { type: 'string', example: 'public, s-maxage=30, stale-while-revalidate=60, stale-if-error=3600' } },
              'Access-Control-Allow-Origin': { schema: { type: 'string', example: '*' } },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StatusResponse' },
                example: {
                  state: 'OPEN',
                  tensionLevel: 'ELEVATED',
                  tensionIndex: 42,
                  confidence: 0.73,
                  reason: 'Maritime traffic operational. 3 relevant items in the past 24h across 2 sources.',
                  brent: { price: 78.45, change: 1.23, changePercent: 1.59 },
                  events24h: 3,
                  asOf: '2026-05-14T12:00:00.000Z',
                  sources: ['CNN', 'BBC'],
                  docs: '/methodology',
                  license: 'CC-BY-4.0 (attribution required)',
                },
              },
            },
          },
        },
      },
    },

    '/v1/events': {
      get: {
        operationId: 'getEvents',
        tags: ['Public v1'],
        summary: 'Geopolitical event timeline',
        description:
          'Returns classified events aggregated from CNN, BBC, Al Jazeera, and Google News RSS feeds. ' +
          'Use `since` for incremental polling. Cache TTL: 60 s.',
        security: [{}],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum events to return (1–100)',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 30 },
          },
          {
            name: 'since',
            in: 'query',
            description: 'Return only events at or after this ISO 8601 timestamp',
            schema: { type: 'string', format: 'date-time', example: '2026-05-13T00:00:00Z' },
          },
          {
            name: 'severity',
            in: 'query',
            description: 'Comma-separated severity filter (low, medium, high, critical)',
            schema: { type: 'string', example: 'high,critical' },
          },
          {
            name: 'category',
            in: 'query',
            description: 'Comma-separated category filter (incident, military, diplomatic, economic)',
            schema: { type: 'string', example: 'military,incident' },
          },
          {
            name: 'before',
            in: 'query',
            description: 'Return only events strictly before this ISO 8601 timestamp — use nextCursor from a prior response to page backward',
            schema: { type: 'string', format: 'date-time', example: '2026-05-30T00:00:00Z' },
          },
          {
            name: 'chokepoint',
            in: 'query',
            description: 'Filter events by chokepoint keywords (hormuz, redsea, suez, panama, taiwan)',
            schema: { type: 'string', enum: ['hormuz', 'redsea', 'suez', 'panama', 'taiwan'] },
          },
        ],
        responses: {
          '200': {
            description: 'Timeline events',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EventsResponse' },
              },
            },
          },
          '400': { description: 'Invalid parameter — ?since or ?before is not a valid ISO 8601 timestamp' },
        },
      },
    },

    '/v1/chokepoints': {
      get: {
        operationId: 'getChokepoints',
        tags: ['Public v1'],
        summary: 'All five strategic chokepoints — status, risk, and vessel counts',
        description:
          'Returns risk index, operational status, daily vessel counts (live from IMF PortWatch where available), ' +
          'and trade flow data for Hormuz, Red Sea/BEB, Suez, Panama Canal, and Taiwan Strait. Cache TTL: 60 s.',
        security: [{}],
        responses: {
          '200': {
            description: 'Chokepoint snapshot',
            headers: {
              'Cache-Control': { schema: { type: 'string', example: 'public, s-maxage=60, stale-while-revalidate=120, stale-if-error=3600' } },
              'Access-Control-Allow-Origin': { schema: { type: 'string', example: '*' } },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok:          { type: 'boolean' },
                    generatedAt: { type: 'string', format: 'date-time' },
                    count:       { type: 'integer', example: 5 },
                    chokepoints: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          key:          { type: 'string', enum: ['hormuz', 'redsea', 'suez', 'panama', 'taiwan'] },
                          name:         { type: 'string', example: 'Strait of Hormuz' },
                          region:       { type: 'string', example: 'Persian Gulf' },
                          codes:        { type: 'string', example: 'IR/OM' },
                          status:       { type: 'string', enum: ['critical', 'degraded', 'elevated', 'normal'] },
                          riskIndex:    { type: 'integer', minimum: 0, maximum: 100 },
                          oilMbd:       { type: 'number', nullable: true, description: 'Oil throughput in million barrels/day' },
                          tradePerDayB: { type: 'number', description: 'Trade flow in billions USD/day' },
                          vessels24h:   { type: 'integer', description: 'Vessel transits in the latest 24 h (IMF PortWatch or static estimate)' },
                          vsBaseline:   { type: 'number', description: '% deviation from pre-2026 daily baseline' },
                          trend:        { type: 'string', enum: ['up', 'stable', 'down'] },
                        },
                      },
                    },
                    license: { type: 'string' },
                    docs:    { type: 'string', format: 'uri' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/v1/history': {
      get: {
        operationId: 'getHistory',
        tags: ['Public v1'],
        summary: 'Paginated log of chokepoint status changes',
        description:
          'Returns a reverse-chronological list of recorded state transitions written by the alert-check cron ' +
          'whenever the chokepoint status changes. Supports filtering by state and ISO timestamp. Cache TTL: 60 s.',
        security: [{}],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
            description: 'Maximum number of records to return (1–200).',
          },
          {
            name: 'since',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Return only records after this ISO 8601 timestamp (exclusive).',
          },
          {
            name: 'before',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Return only records before this ISO 8601 timestamp — use the nextCursor value from a previous response to page backward through history.',
          },
          {
            name: 'state',
            in: 'query',
            schema: { type: 'string', enum: ['OPEN', 'CLOSED', 'PARTIALLY_CLOSED', 'DISRUPTED'] },
            description: 'Filter to a specific chokepoint state.',
          },
        ],
        responses: {
          '200': {
            description: 'Status history records',
            headers: {
              'Cache-Control': { schema: { type: 'string', example: 'public, s-maxage=60, stale-while-revalidate=120, stale-if-error=3600' } },
              'Access-Control-Allow-Origin': { schema: { type: 'string', example: '*' } },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok:          { type: 'boolean' },
                    count:       { type: 'integer' },
                    limit:       { type: 'integer' },
                    since:       { type: 'string', format: 'date-time' },
                    before:      { type: 'string', format: 'date-time' },
                    stateFilter: { type: 'string' },
                    nextCursor:  { type: 'string', format: 'date-time', nullable: true, description: 'Pass as ?before= to fetch the next (older) page. Null when no further records exist.' },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id:            { type: 'string' },
                          state:         { type: 'string', enum: ['OPEN', 'CLOSED', 'PARTIALLY_CLOSED', 'DISRUPTED'] },
                          previousState: { type: 'string', nullable: true },
                          tension:       { type: 'integer', nullable: true, minimum: 0, maximum: 100 },
                          confidence:    { type: 'number', nullable: true, minimum: 0, maximum: 1 },
                          reason:        { type: 'string', nullable: true },
                          timestamp:     { type: 'string', format: 'date-time' },
                        },
                        required: ['id', 'state', 'timestamp'],
                      },
                    },
                    license: { type: 'string' },
                  },
                },
                example: {
                  ok: true,
                  count: 50,
                  limit: 50,
                  nextCursor: '2026-05-29T08:15:00Z',
                  items: [
                    { id: 'hist_abc123', state: 'OPEN', previousState: 'PARTIALLY_CLOSED', tension: 34, confidence: 0.88, reason: 'Tensions eased following diplomatic talks.', timestamp: '2026-05-30T12:00:00Z' },
                    { id: 'hist_def456', state: 'PARTIALLY_CLOSED', previousState: 'OPEN', tension: 67, confidence: 0.72, reason: 'IRGC exercises reported near Strait entrance.', timestamp: '2026-05-29T08:15:00Z' },
                  ],
                  license: 'CC-BY-4.0 (attribution required: "Global Chokepoints Alerts")',
                },
              },
            },
          },
          '400': { description: 'Invalid parameter — ?state is not a recognised state, or ?since/?before is not a valid ISO 8601 timestamp' },
          '500': { description: 'Database query error' },
        },
      },
    },

    '/v1/digest': {
      get: {
        operationId: 'getDigest',
        tags: ['Public v1'],
        summary: 'Single-fetch snapshot — status, events, and markets',
        description:
          'Convenience endpoint that fans out to /v1/status, /v1/events, and /v1/metrics in parallel ' +
          'and returns a combined payload. Designed for embed widgets that cannot afford multiple requests. ' +
          'Cache TTL: 60 s.',
        security: [{}],
        parameters: [
          {
            name: 'events',
            in: 'query',
            description: 'Number of recent events to include (1–20, default 5)',
            schema: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
          },
        ],
        responses: {
          '200': {
            description: 'Combined digest payload',
            headers: {
              'Cache-Control': { schema: { type: 'string', example: 'public, s-maxage=60, stale-while-revalidate=120, stale-if-error=3600' } },
              'Access-Control-Allow-Origin': { schema: { type: 'string', example: '*' } },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    state:        { type: 'string', enum: ['OPEN', 'PARTIALLY_CLOSED', 'CLOSED'] },
                    tensionLevel: { type: 'string', enum: ['NORMAL', 'ELEVATED', 'CRITICAL'] },
                    tensionIndex: { type: 'integer', minimum: 0, maximum: 100 },
                    confidence:   { type: 'number', minimum: 0, maximum: 1 },
                    reason:       { type: 'string' },
                    reasonUrl:    { type: 'string', format: 'uri', nullable: true },
                    asOf:         { type: 'string', format: 'date-time' },
                    events:       { type: 'array', items: { $ref: '#/components/schemas/TimelineEvent' } },
                    eventCount:   { type: 'integer' },
                    brent: {
                      nullable: true,
                      type: 'object',
                      properties: {
                        price:         { type: 'number' },
                        change:        { type: 'number' },
                        changePercent: { type: 'number' },
                      },
                    },
                    markets: {
                      nullable: true,
                      type: 'object',
                      properties: {
                        brent:  { $ref: '#/components/schemas/Ticker' },
                        wti:    { $ref: '#/components/schemas/Ticker' },
                        natgas: { $ref: '#/components/schemas/Ticker' },
                      },
                    },
                    weather: {
                      nullable: true,
                      type: 'object',
                      properties: {
                        temperatureC:  { type: 'number' },
                        wind:          { type: 'object', properties: { speedKn: { type: 'number' }, direction: { type: 'string' } } },
                        sea:           { type: 'object', properties: { waveHeightM: { type: 'number' } } },
                        navRisk:       { type: 'number', minimum: 0, maximum: 100 },
                        navRiskLabel:  { type: 'string', enum: ['CALM', 'MODERATE', 'ROUGH', 'SEVERE'] },
                      },
                    },
                    eventDelta:  {
                      nullable: true,
                      type: 'object',
                      properties: {
                        last24h: { type: 'integer' },
                        prev24h: { type: 'integer' },
                        delta:   { type: 'integer' },
                      },
                    },
                    generatedAt: { type: 'string', format: 'date-time' },
                    sources:     { type: 'array', items: { type: 'string' } },
                    license:     { type: 'string' },
                  },
                },
              },
            },
          },
          '503': {
            description: 'Status data temporarily unavailable',
            headers: { 'Retry-After': { schema: { type: 'integer', example: 30 }, description: 'Seconds to wait before retrying' } },
          },
        },
      },
    },

    '/v1/weather': {
      get: {
        operationId: 'getWeatherPublic',
        tags: ['Public v1'],
        summary: 'Marine weather at the Strait of Hormuz',
        description:
          'Returns current marine weather conditions at Bandar Abbas approach (26.5°N 56.4°E): ' +
          'wind speed/direction, wave height/period, visibility, and navigational risk score. ' +
          'Sourced from Open-Meteo (no API key required). Cache TTL: 15 min.',
        security: [{}],
        responses: {
          '200': {
            description: 'Marine weather snapshot',
            headers: {
              'Cache-Control': { schema: { type: 'string', example: 'public, s-maxage=900, stale-while-revalidate=1800, stale-if-error=86400' } },
              'Access-Control-Allow-Origin': { schema: { type: 'string', example: '*' } },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WeatherPayload' },
              },
            },
          },
          '502': { description: 'Upstream Open-Meteo returned an error' },
          '503': { description: 'Weather data temporarily unavailable' },
        },
      },
    },

    '/v1/news': {
      get: {
        operationId: 'getNewsPublic',
        tags: ['Public v1'],
        summary: 'GDELT news articles about global chokepoints',
        description:
          'Returns recent news articles covering all five tracked chokepoints — Strait of Hormuz, ' +
          'Red Sea / Houthi / Bab-el-Mandeb, Suez Canal, Panama Canal, and Taiwan Strait — ' +
          'from the GDELT v2 Doc API with sentiment scoring. Cache TTL: 5 min.',
        security: [{}],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum articles to return (1–50)',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
          },
          {
            name: 'sentiment',
            in: 'query',
            description: 'Filter articles by sentiment',
            schema: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
          },
        ],
        responses: {
          '200': {
            description: 'News articles',
            headers: {
              'Cache-Control': { schema: { type: 'string', example: 'public, s-maxage=300, stale-while-revalidate=600, stale-if-error=86400' } },
              'Access-Control-Allow-Origin': { schema: { type: 'string', example: '*' } },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    count:           { type: 'integer' },
                    total:           { type: 'integer' },
                    limit:           { type: 'integer' },
                    sentimentFilter: { type: 'string', nullable: true },
                    source:          { type: 'string', example: 'GDELT' },
                    news: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/NewsItem' },
                    },
                    license: { type: 'string' },
                  },
                },
                example: {
                  count: 5,
                  total: 20,
                  limit: 5,
                  source: 'GDELT',
                  news: [
                    { id: 'gdelt_abc123', title: 'Iran navy conducts exercises near Hormuz', source: 'Reuters', publishedAt: '2026-06-01T09:00:00Z', url: 'https://reuters.com/example', sentiment: 'negative', relevance: 0.92 },
                  ],
                  license: 'CC-BY-4.0 (attribution required: "Global Chokepoints Alerts")',
                },
              },
            },
          },
          '400': { description: 'Invalid sentiment filter value' },
          '502': { description: 'Upstream news API returned an error' },
          '503': {
            description: 'News data temporarily unavailable',
            headers: { 'Retry-After': { schema: { type: 'integer', example: 30 }, description: 'Seconds to wait before retrying' } },
          },
        },
      },
    },

    '/v1/metrics': {
      get: {
        operationId: 'getMetrics',
        tags: ['Public v1'],
        summary: 'Markets, weather, and event metrics',
        description:
          'Returns Brent crude, WTI, Henry Hub prices, marine weather at Bandar Abbas, and 24-hour event delta. ' +
          'Cache TTL: 60 s.',
        security: [{}],
        responses: {
          '200': {
            description: 'Aggregated metrics',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/MetricsResponse' } },
            },
          },
        },
      },
    },

    '/status-feed.xml': {
      get: {
        operationId: 'getStatusFeed',
        tags: ['Public v1'],
        summary: 'RSS 2.0 status-change feed',
        description:
          'Returns an RSS 2.0 feed of recorded chokepoint status transitions. ' +
          'Each item represents a state change recorded by the alert-check cron ' +
          '(e.g. OPEN → PARTIALLY_CLOSED), with the transition reason as the description. ' +
          'Sourced from D1 status_history table. ' +
          'Supports conditional GET via ETag / If-None-Match (returns 304 when unchanged). ' +
          'Cache TTL: 5 min.',
        security: [{}],
        responses: {
          '200': {
            description: 'RSS 2.0 XML status-change feed',
            headers: {
              'Cache-Control': { schema: { type: 'string', example: 'public, s-maxage=300, stale-while-revalidate=600, stale-if-error=86400' } },
              'Access-Control-Allow-Origin': { schema: { type: 'string', example: '*' } },
              'ETag': { schema: { type: 'string', example: '"a3f8c2d1e4b5"' }, description: 'Use with If-None-Match for conditional GET (304 Not Modified)' },
            },
            content: {
              'application/rss+xml': {
                schema: { type: 'string', format: 'xml' },
              },
            },
          },
        },
      },
    },

    '/feed.xml': {
      get: {
        operationId: 'getFeed',
        tags: ['Public v1'],
        summary: 'RSS 2.0 event feed',
        description:
          'Returns an RSS 2.0 feed of the latest global chokepoint timeline events, ' +
          'sourced from CNN, BBC, Al Jazeera, Reuters, and Google News (9 feeds). ' +
          'The channel description includes the current status and tension index. ' +
          'Each item contains the event title, description, category, severity, and source article link. ' +
          'Supports conditional GET via ETag / If-None-Match (returns 304 when unchanged). ' +
          'Cache TTL: 5 min.',
        security: [{}],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum events to include (1–50, default 20)',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'RSS 2.0 XML feed',
            headers: {
              'Cache-Control': { schema: { type: 'string', example: 'public, s-maxage=300, stale-while-revalidate=600, stale-if-error=86400' } },
              'Access-Control-Allow-Origin': { schema: { type: 'string', example: '*' } },
              'ETag': { schema: { type: 'string', example: '"a3f8c2d1e4b5"' }, description: 'Use with If-None-Match for conditional GET (304 Not Modified)' },
            },
            content: {
              'application/rss+xml': {
                schema: { type: 'string', format: 'xml' },
                example: '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>...</channel>\n</rss>',
              },
            },
          },
        },
      },
    },

    '/api/brent': {
      get: {
        operationId: 'getBrent',
        tags: ['Data feeds'],
        summary: 'Brent crude price + 7-day history',
        description: 'Fallback chain: Yahoo Finance → Stooq CSV → EIA → module cache → KV. Never returns 502 while stale data exists. Response includes X-Cache: HIT | MISS | STALE.',
        responses: {
          '200': {
            description: 'Brent payload',
            headers: {
              'X-Cache': { schema: { type: 'string', enum: ['HIT', 'MISS', 'STALE'] }, description: 'HIT = served from KV cache; MISS = live upstream fetch; STALE = stale fallback' },
            },
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/BrentPayload' } },
            },
          },
          '502': { description: 'All upstream sources simultaneously unavailable' },
        },
      },
    },

    '/api/markets': {
      get: {
        operationId: 'getMarkets',
        tags: ['Data feeds'],
        summary: 'Brent, WTI, and Henry Hub tickers',
        description: 'Fallback chain per commodity: EIA/FRED primary → Yahoo Finance secondary. Cache TTL: 5 min. Response includes X-Cache: MISS | STALE.',
        responses: {
          '200': {
            description: 'Commodity tickers',
            headers: {
              'X-Cache': { schema: { type: 'string', enum: ['MISS', 'STALE'] }, description: 'MISS = live upstream fetch; STALE = at least one symbol served from cache' },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    markets: {
                      type: 'object',
                      properties: {
                        brent:  { $ref: '#/components/schemas/Ticker' },
                        wti:    { $ref: '#/components/schemas/Ticker' },
                        natgas: { $ref: '#/components/schemas/Ticker' },
                      },
                    },
                    source:      { type: 'string' },
                    generatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/timeline': {
      get: {
        operationId: 'getTimeline',
        tags: ['Data feeds'],
        summary: 'Raw RSS event timeline (60 s cache)',
        description: 'Aggregates events from 7 RSS feeds. Response includes X-Cache: HIT | MISS.',
        responses: {
          '200': {
            description: 'Timeline with source metadata',
            headers: {
              'X-Cache': { schema: { type: 'string', enum: ['HIT', 'MISS'] }, description: 'HIT = served from KV cache; MISS = live upstream fetch' },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    events:      { type: 'array', items: { $ref: '#/components/schemas/TimelineEvent' } },
                    sources:     { type: 'array', items: { type: 'string' } },
                    generatedAt: { type: 'string', format: 'date-time' },
                    fetchMs:     { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/news': {
      get: {
        operationId: 'getNews',
        tags: ['Data feeds'],
        summary: 'GDELT news articles',
        description: 'Returns articles covering all five chokepoints (Hormuz, Red Sea, Suez, Panama, Taiwan Strait) from the GDELT v2 Doc API with sentiment scoring. Cache TTL: 5 min. Response includes X-Cache: HIT | MISS | STALE.',
        responses: {
          '200': {
            description: 'News articles',
            headers: {
              'X-Cache': { schema: { type: 'string', enum: ['HIT', 'MISS', 'STALE'] }, description: 'HIT = KV cache hit; MISS = live GDELT fetch; STALE = fallback from module/KV cache' },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    news: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/NewsItem' },
                    },
                    source: { type: 'string' },
                    count:  { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/weather': {
      get: {
        operationId: 'getWeather',
        tags: ['Data feeds'],
        summary: 'Marine weather at 26.5°N 56.4°E (Bandar Abbas approach)',
        description: 'Open-Meteo Forecast + Marine APIs. No API key required. Cache TTL: 15 min. Response includes X-Cache: HIT | MISS.',
        responses: {
          '200': {
            description: 'Weather and navigational risk',
            headers: {
              'X-Cache': { schema: { type: 'string', enum: ['HIT', 'MISS'] }, description: 'HIT = served from KV cache; MISS = live upstream fetch' },
            },
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/WeatherPayload' } },
            },
          },
        },
      },
    },

    '/api/vessels': {
      get: {
        operationId: 'getVessels',
        tags: ['Data feeds'],
        summary: 'Live AIS vessel positions',
        description: 'Real-time vessel positions from AISStream.io when the sidecar collector is active. Falls back to empty list with `running: false`.',
        responses: {
          '200': {
            description: 'Vessel positions',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/VesselsResponse' } },
            },
          },
        },
      },
    },

    '/api/portwatch': {
      get: {
        operationId: 'getPortwatch',
        tags: ['Data feeds'],
        summary: 'IMF PortWatch daily transit counts — all chokepoints',
        description:
          'Daily vessel transit counts for Hormuz, Red Sea (Bab-el-Mandeb), Suez Canal, and Panama Canal ' +
          'from IMF PortWatch. Data has a 2–3 day lag; updates weekly on Tuesdays. Cache TTL: 6 h. ' +
          'Root-level `days`/`todayTotal`/etc. are Hormuz (backward-compatible); ' +
          'per-chokepoint data is in the `chokepoints` map. Response includes X-Cache: HIT | MISS.',
        responses: {
          '200': {
            description: 'Transit counts',
            headers: {
              'X-Cache': { schema: { type: 'string', enum: ['HIT', 'MISS'] }, description: 'HIT = served from KV cache; MISS = live upstream fetch' },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok:            { type: 'boolean' },
                    days:          { type: 'array', items: { $ref: '#/components/schemas/PortWatchDay' } },
                    todayTotal:    { type: 'integer', description: 'Hormuz (backward-compat)' },
                    sevenDayAvg:   { type: 'number' },
                    baselineDaily: { type: 'integer', example: 34 },
                    vsBaseline:    { type: 'number', description: '% deviation from historical baseline' },
                    source:        { type: 'string' },
                    cached:        { type: 'boolean' },
                    chokepoints: {
                      type: 'object',
                      description: 'Per-chokepoint stats keyed by "hormuz" | "redsea" | "suez" | "panama"',
                      additionalProperties: {
                        type: 'object',
                        properties: {
                          days:          { type: 'array', items: { $ref: '#/components/schemas/PortWatchDay' } },
                          todayTotal:    { type: 'integer' },
                          sevenDayAvg:   { type: 'number' },
                          baselineDaily: { type: 'integer' },
                          vsBaseline:    { type: 'number' },
                          latestDate:    { type: 'string', format: 'date' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/ping': {
      get: {
        operationId: 'ping',
        tags: ['Data feeds'],
        summary: 'Fast liveness check — no upstream fetches',
        description:
          'Returns `{"ok":true}` in under 5 ms with no external network calls. ' +
          'Use this URL for uptime monitors (UptimeRobot, Pingdom, etc.) instead of ' +
          '/api/health which probes 8 external services and takes 2–5 s. ' +
          'Also responds to HEAD requests for minimal-overhead checks.',
        security: [{}],
        responses: {
          '200': {
            description: 'Service is alive',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok:      { type: 'boolean', example: true },
                    ts:      { type: 'string', format: 'date-time' },
                    service: { type: 'string', example: 'global-chokepoints-alerts' },
                  },
                },
                example: { ok: true, ts: '2026-06-04T12:00:00.000Z', service: 'global-chokepoints-alerts' },
              },
            },
          },
        },
      },
    },

    '/api/health': {
      get: {
        operationId: 'getHealth',
        tags: ['Data feeds'],
        summary: 'Upstream feed health probes',
        description: 'Probes Yahoo Finance, Stooq, GDELT, CNN/BBC/Al Jazeera RSS, Open-Meteo, and IMF PortWatch. Returns per-probe latency and D1/KV binding status. Cache TTL: 30 s.',
        responses: {
          '200': {
            description: 'Health probe results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    overall: { type: 'string', enum: ['ok', 'degraded', 'down'] },
                    probes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          key:        { type: 'string' },
                          label:      { type: 'string' },
                          status:     { type: 'string', enum: ['ok', 'degraded', 'down'] },
                          latencyMs:  { type: 'number' },
                          httpStatus: { type: 'integer', nullable: true },
                        },
                      },
                    },
                    generatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/webhooks': {
      post: {
        operationId: 'registerWebhook',
        summary: 'Register a webhook',
        description: 'Register an HTTPS endpoint to receive HMAC-SHA256-signed status change notifications.',
        tags: ['Webhooks'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url:    { type: 'string', format: 'uri', description: 'HTTPS endpoint URL' },
                  events: { type: 'string', default: 'status_change', description: 'Comma-separated event types' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Webhook registered. Store the returned secret — it is used to verify HMAC-SHA256 signatures.' },
          '400': { description: 'Invalid URL or missing required fields' },
          '503': { description: 'D1 database not available' },
        },
      },
    },

    '/api/keys': {
      post: {
        operationId: 'issueApiKey',
        summary: 'Issue an API key',
        description: 'Issue a self-serve gca_* API key with configurable daily rate limit. Key is shown once.',
        tags: ['API Keys'],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  label:     { type: 'string', maxLength: 80 },
                  rateLimit: { type: 'integer', minimum: 100, maximum: 10000, default: 1000, description: 'Daily request quota' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Key issued. The key field is shown once — store it securely.' },
          '503': { description: 'D1 database not available' },
        },
      },
    },

    '/api/subscribe': {
      post: {
        operationId: 'subscribe',
        tags: ['Subscriptions'],
        summary: 'Subscribe to chokepoint status alerts',
        description: 'Inserts an unconfirmed subscription in D1 and sends a confirmation email via Resend. Idempotent for unconfirmed addresses.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email:          { type: 'string', format: 'email' },
                  turnstileToken: { type: 'string', description: 'Cloudflare Turnstile token (required when TURNSTILE_SECRET_KEY is set)' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Subscription result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok:               { type: 'boolean' },
                    message:          { type: 'string' },
                    alreadyConfirmed: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  components: {
    schemas: {
      PortWatchDay: {
        type: 'object',
        properties: {
          date:      { type: 'string', format: 'date' },
          total:     { type: 'integer' },
          tanker:    { type: 'integer' },
          cargo:     { type: 'integer' },
          container: { type: 'integer' },
          dryBulk:   { type: 'integer' },
        },
      },
      StatusResponse: {
        type: 'object',
        properties: {
          state:        { type: 'string', enum: ['OPEN', 'PARTIALLY_CLOSED', 'CLOSED'] },
          tensionLevel: { type: 'string', enum: ['NORMAL', 'ELEVATED', 'CRITICAL'] },
          tensionIndex: { type: 'integer', minimum: 0, maximum: 100, description: 'Composite 0–100 threat score' },
          confidence:   { type: 'number', minimum: 0, maximum: 1, description: 'Algorithm confidence based on source diversity' },
          reason:       { type: 'string' },
          reasonUrl:    { type: 'string', format: 'uri', nullable: true },
          reasonSource: { type: 'string', nullable: true },
          brent: {
            nullable: true,
            type: 'object',
            properties: {
              price:         { type: 'number' },
              change:        { type: 'number' },
              changePercent: { type: 'number' },
            },
          },
          events24h: { type: 'integer' },
          asOf:      { type: 'string', format: 'date-time' },
          sources:   { type: 'array', items: { type: 'string' } },
          docs:      { type: 'string', example: '/methodology' },
          license:   { type: 'string', example: 'CC-BY-4.0 (attribution required)' },
        },
      },
      TimelineEvent,
      NewsItem: {
        type: 'object',
        properties: {
          id:          { type: 'string' },
          title:       { type: 'string' },
          source:      { type: 'string' },
          publishedAt: { type: 'string', format: 'date-time' },
          url:         { type: 'string', format: 'uri' },
          sentiment:   { type: 'string', enum: ['positive', 'negative', 'neutral'] },
          relevance:   { type: 'number', minimum: 0, maximum: 1 },
        },
      },
      EventsResponse: {
        type: 'object',
        properties: {
          events:     { type: 'array', items: { $ref: '#/components/schemas/TimelineEvent' } },
          count:      { type: 'integer' },
          nextCursor: {
            type: 'string', format: 'date-time', nullable: true,
            description: 'Pass as ?before= to fetch the next (older) page. Null when no further events exist.',
          },
          filters: {
            type: 'object',
            properties: {
              since:      { type: 'string', format: 'date-time', nullable: true },
              before:     { type: 'string', format: 'date-time', nullable: true },
              severity:   { type: 'string', nullable: true },
              category:   { type: 'string', nullable: true },
              chokepoint: { type: 'string', nullable: true },
            },
          },
          generatedAt: { type: 'string', format: 'date-time' },
          docs:        { type: 'string' },
          license:     { type: 'string' },
        },
      },
      MetricsResponse: {
        type: 'object',
        properties: {
          markets: {
            nullable: true,
            type: 'object',
            properties: {
              brent:  { $ref: '#/components/schemas/Ticker' },
              wti:    { $ref: '#/components/schemas/Ticker' },
              natgas: { $ref: '#/components/schemas/Ticker' },
            },
          },
          weather: {
            nullable: true,
            type: 'object',
            properties: {
              location:     { type: 'object', properties: { lat: { type: 'number' }, lon: { type: 'number' }, label: { type: 'string' } } },
              temperatureC: { type: 'number' },
              wind:         { type: 'object', properties: { speedKn: { type: 'number' }, direction: { type: 'string' }, directionDeg: { type: 'number' } } },
              visibilityM:  { type: 'number' },
              weather:      { type: 'string' },
              sea:          { type: 'object', properties: { waveHeightM: { type: 'number' }, wavePeriodS: { type: 'number', nullable: true } } },
              navRisk:      { type: 'number', minimum: 0, maximum: 100 },
              navRiskLabel: { type: 'string', enum: ['CALM', 'MODERATE', 'ROUGH', 'SEVERE'] },
            },
          },
          events: {
            type: 'object',
            properties: {
              last24h: { type: 'integer' },
              prev24h: { type: 'integer' },
              delta:   { type: 'integer' },
            },
          },
          generatedAt: { type: 'string', format: 'date-time' },
          docs:        { type: 'string' },
          license:     { type: 'string' },
        },
      },
      Ticker,
      BrentPayload: {
        type: 'object',
        properties: {
          price:         { type: 'number' },
          change:        { type: 'number' },
          changePercent: { type: 'number' },
          history: {
            type: 'array',
            items: { type: 'object', properties: { date: { type: 'string' }, price: { type: 'number' } } },
          },
          asOf:   { type: 'string', format: 'date-time' },
          source: { type: 'string' },
          stale:  { type: 'boolean' },
        },
      },
      WeatherPayload: {
        type: 'object',
        properties: {
          location:     { type: 'object', properties: { lat: { type: 'number' }, lon: { type: 'number' }, label: { type: 'string' } } },
          temperatureC: { type: 'number' },
          wind:         { type: 'object', properties: { speedKn: { type: 'number' }, direction: { type: 'string' }, directionDeg: { type: 'number' } } },
          visibilityM:  { type: 'number' },
          weather:      { type: 'string' },
          weatherCode:  { type: 'integer' },
          sea: {
            type: 'object',
            properties: {
              waveHeightM: { type: 'number' },
              wavePeriodS: { type: 'number', nullable: true },
              windWaveM:   { type: 'number', nullable: true },
              swellM:      { type: 'number', nullable: true },
            },
          },
          navRisk:      { type: 'number', minimum: 0, maximum: 100 },
          navRiskLabel: { type: 'string', enum: ['CALM', 'MODERATE', 'ROUGH', 'SEVERE'] },
          source:       { type: 'string' },
          generatedAt:  { type: 'string', format: 'date-time' },
        },
      },
      VesselsResponse: {
        type: 'object',
        properties: {
          running:  { type: 'boolean' },
          stale:    { type: 'boolean' },
          ageSec:   { type: 'number' },
          count:    { type: 'integer' },
          vessels: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                mmsi:    { type: 'integer' },
                name:    { type: 'string' },
                type:    { type: 'string' },
                lat:     { type: 'number' },
                lon:     { type: 'number' },
                sog:     { type: 'number', nullable: true },
                cog:     { type: 'number', nullable: true },
                heading: { type: 'number', nullable: true },
              },
            },
          },
          source:      { type: 'string', enum: ['AISStream.io', 'none'] },
          generatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid API key',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { error: { type: 'string' } },
              example: { error: 'Unauthorized. Provide x-api-key or Authorization: Bearer <key>' },
            },
          },
        },
      },
    },
    securitySchemes: {
      ApiKeyHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'Optional. Only enforced when `V1_API_KEY` is set in the Cloudflare Pages environment.',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Alternative to x-api-key: `Authorization: Bearer <key>`',
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
