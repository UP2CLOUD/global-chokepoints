# Global Chokepoints Alerts

**Live:** [global-chokepoints.pages.dev](https://global-chokepoints.pages.dev/)
![Status](https://global-chokepoints.pages.dev/api/badge)

Real-time public intelligence dashboard tracking the operational status of the Strait of Hormuz — maritime traffic, oil markets, geopolitical events, and marine weather.

## Signals Monitored

| Signal | Source | Update Freq |
|--------|--------|-------------|
| Strait status (OPEN / DISRUPTED / CLOSED) | Derived from Brent Δ% + news threat score | 5 min |
| Vessel transits (daily count) | IMF PortWatch | Daily |
| AIS vessel positions | AISStream.io WebSocket | 15 s |
| Brent crude price + 7-day chart | Yahoo Finance → Stooq → EIA fallback | 5 min |
| WTI, Natural Gas, Gold, DXY, S&P 500 | Yahoo Finance (MarketsRail) | 5 min |
| Weather (Bandar Abbas) | Open-Meteo | 30 min |
| Geopolitical news | GDELT Project | 10 min |
| Event timeline | GDELT + curated | 1 min |

## Status Algorithm

Threat score blends two equal signals:

1. **Market signal (50%)** — Brent Δ% mapped to 0–100 (≥+5 % → 100, ≤−2 % → 0)
2. **News signal (50%)** — GDELT article count weighted by keywords (`attack`, `seized`, `closure`, …)

| Score | State | Label |
|-------|-------|-------|
| ≥ 60 | CLOSED | danger |
| 30–59 | PARTIALLY\_CLOSED | caution |
| < 30 | OPEN | ok |

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router, Edge Runtime) |
| Deploy | Cloudflare Pages + Workers |
| KV cache | Cloudflare KV (Brent, FRED/NG, transits) |
| DB | Cloudflare D1 (subscriptions, webhooks, API keys, status history) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Map | React-Leaflet + Leaflet |
| 3D globe | Three.js + React Three Fiber |
| Animations | GSAP + ScrollTrigger |

## Public API

Three CORS-open endpoints under `/v1/*` (CC-BY-4.0):

| Endpoint | Cache | Description |
|----------|-------|-------------|
| `GET /v1/status` | 30 s | Strait state, tension level, confidence score |
| `GET /v1/status?history=7d` | 30 s | Same + up to 30 days of status history from D1 |
| `GET /v1/events?limit&since` | 60 s | Classified timeline events |
| `GET /v1/metrics` | 60 s | Markets, weather, 24 h event delta |
| `GET /v1/chokepoints` | 60 s | All 5 chokepoint risk indices |

Full reference: [/docs](https://global-chokepoints.pages.dev/docs) · Machine-readable: [/api/openapi](https://global-chokepoints.pages.dev/api/openapi)

### API Keys (optional)

```bash
# Issue a free key at /keys or via API:
curl -X POST https://global-chokepoints.pages.dev/api/keys \
  -H 'Content-Type: application/json' \
  -d '{"label":"my-app","rateLimit":1000}'

# Use it:
curl https://global-chokepoints.pages.dev/v1/status \
  -H 'X-API-Key: gca_your_key'
```

### Webhooks

```bash
# Register a webhook:
curl -X POST https://global-chokepoints.pages.dev/api/webhooks \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://your-server.com/hook"}'

# Test delivery:
curl -X POST https://global-chokepoints.pages.dev/api/webhooks/{id}/test \
  -H 'x-webhook-secret: your_secret'
```

Deliveries are signed with `X-Signature-256: sha256=<hmac-sha256-hex>`.

### Embed widget

```html
<iframe src="https://global-chokepoints.pages.dev/embed" width="100%" height="440" frameborder="0"></iframe>
```

Configure at [/embed/configure](https://global-chokepoints.pages.dev/embed/configure).

### Status badge

```markdown
![Strait Status](https://global-chokepoints.pages.dev/api/badge)
```

## Environment Variables

```bash
# Required for full functionality
EIA_API_KEY=                        # EIA.gov — Brent/WTI/NG fallback prices
FRED_API_KEY=                       # St. Louis Fed — Henry Hub natural gas
AISSTREAM_API_KEY=                  # AISStream.io — live vessel WebSocket
CRON_SECRET=                        # Internal cron auth (any random string)
ALERT_CRON_SECRET=                  # GitHub Actions alert check auth

# Cloudflare (set in wrangler.toml or Pages dashboard)
# KV namespace: STRAIT_KV
# D1 database: strait-subscriptions
```

## GitHub Actions Secrets

| Secret | Purpose |
|--------|---------|
| `ALERT_CRON_SECRET` | Must match Cloudflare Pages secret exactly |
| `SITE_URL` | e.g. `https://global-chokepoints.pages.dev` |

## Getting Started

```bash
npm install

# Dev server (Next.js, port 3000)
npm run dev

# Cloudflare Pages build
npm run build:cf

# Preview CF build locally
npm run preview:cf

# D1 migration
npm run db:migrate
```

> **Note:** `build:cf` cleans `.next` after the Cloudflare build to prevent dev server corruption on subsequent `npm run dev`.

## Project Structure

```
app/
  api/                    # Edge API routes (brent, ng, vessels, timeline, news, og, alert-check, subscribe)
  components/             # React UI components
  lib/                    # Types, translations, API fetchers, EIA/FRED clients, KV helpers
  page.tsx                # Main dashboard
  layout.tsx              # Root layout + metadata + AdSense
scripts/
  ais-collector.mjs       # Standalone AIS WebSocket collector
.github/workflows/
  alert-check.yml         # Hourly threat-level check via GitHub Actions
```

## License

MIT — For informational purposes only. Data accuracy depends on third-party APIs and may be delayed.
