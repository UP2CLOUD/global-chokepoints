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
      'Real-time public intelligence API for the operational status of the Strait of Hormuz. ' +
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
  ],
  paths: {
    '/v1/status': {
      get: {
        operationId: 'getStatus',
        tags: ['Public v1'],
        summary: 'Current strait status',
        description:
          'Returns the computed operational state, tension level (0–100 threat score), ' +
          'confidence, and the driving reason string. Refreshed every 30 s at the edge.',
        security: [{}],
        responses: {
          '200': {
            description: 'Strait status',
            headers: {
              'Cache-Control': { schema: { type: 'string', example: 'public, s-maxage=30' } },
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
              'Cache-Control': { schema: { type: 'string', example: 'public, s-maxage=60' } },
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

    '/api/brent': {
      get: {
        operationId: 'getBrent',
        tags: ['Data feeds'],
        summary: 'Brent crude price + 7-day history',
        description: 'Fallback chain: Yahoo Finance → Stooq CSV → EIA → module cache → KV. Never returns 502 while stale data exists.',
        responses: {
          '200': {
            description: 'Brent payload',
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
        description: 'Fallback chain per commodity: EIA/FRED primary → Yahoo Finance secondary. Cache TTL: 5 min.',
        responses: {
          '200': {
            description: 'Commodity tickers',
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
        responses: {
          '200': {
            description: 'Timeline with source metadata',
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
        description: 'Returns Hormuz/Iran-relevant articles from the GDELT v2 Doc API with sentiment scoring. Cache TTL: 5 min.',
        responses: {
          '200': {
            description: 'News articles',
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
        description: 'Open-Meteo Forecast + Marine APIs. No API key required. Cache TTL: 15 min.',
        responses: {
          '200': {
            description: 'Weather and navigational risk',
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
          'per-chokepoint data is in the `chokepoints` map.',
        responses: {
          '200': {
            description: 'Transit counts',
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

    '/api/health': {
      get: {
        operationId: 'getHealth',
        tags: ['Data feeds'],
        summary: 'Upstream feed health probes',
        description: 'Probes Yahoo Finance, GDELT, CNN/BBC/Al Jazeera RSS, and Open-Meteo. Cache TTL: 30 s.',
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

    '/api/subscribe': {
      post: {
        operationId: 'subscribe',
        tags: ['Subscriptions'],
        summary: 'Subscribe to strait status alerts',
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
          events:      { type: 'array', items: { $ref: '#/components/schemas/TimelineEvent' } },
          count:       { type: 'integer' },
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
