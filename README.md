# IsStraitHormuzOpen?

**Live:** [strait-of-hormuz-monitor.pages.dev](https://strait-of-hormuz-monitor.pages.dev/)

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
| DB | Cloudflare D1 (newsletter subscriptions) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Map | React-Leaflet + Leaflet |
| 3D globe | Three.js + React Three Fiber |
| Animations | GSAP + ScrollTrigger |

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
| `SITE_URL` | e.g. `https://strait-of-hormuz-monitor.pages.dev` |

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
