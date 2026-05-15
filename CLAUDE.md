# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Next.js dev server on port 3000
npm run lint           # ESLint
npm run type-check     # tsc --noEmit (no build output)
npm run build          # Standard Next.js build (for Node hosting)
npm run build:cf       # Cloudflare Pages build via @cloudflare/next-on-pages; removes .next afterward
npm run preview:cf     # Build + run locally with wrangler
npm run deploy:cf      # Build + wrangler pages deploy
npm run db:migrate     # Apply D1 migration to remote CF database
npm run db:migrate:local  # Apply D1 migration locally
npm run ais            # Start AIS WebSocket collector sidecar (writes data/vessels.json)
```

CI runs `type-check` + `lint` on every PR and non-main push.

## Architecture Overview

**Next.js 15 App Router, deployed to Cloudflare Pages via `@cloudflare/next-on-pages`.** All API routes use `export const runtime = 'edge'` and are executed as Cloudflare Workers.

### Data Flow

The dashboard is entirely client-rendered (`'use client'`). On load, `app/page.tsx` renders immediately with `mockData` as seed state, then progressively replaces it with live data:

1. `useDashboardData()` hook (`app/hooks/useDashboardData.ts`) manages all polling — calls `fetchDashboardData()` which fans out to `/api/brent` + `/api/timeline`
2. `useAisVessels()` hook (`app/hooks/useAisVessels.ts`) polls `/api/vessels` every 15 s
3. `deriveStatus()` (`app/lib/api.ts`) computes `StraitStatus` + `tensionIndex` client-side — **there is no dedicated status API endpoint**
4. Components receive data via props drilled from `DashboardContent`

### Project Structure

```
app/
  api/               # Edge API routes
    brent/           # Brent crude price (Yahoo → Stooq → EIA → cache)
    markets/         # Brent + WTI + Henry Hub
    timeline/        # RSS aggregator (7 feeds, 60 s)
    news/            # GDELT news
    vessels/         # AIS vessel positions
    portwatch/       # IMF PortWatch transit counts
    weather/         # Open-Meteo marine conditions
    health/          # Feed health probes
    alert-check/     # Status change detector + email dispatch
    subscribe/       # Email subscription opt-in
    confirm/         # Subscription confirmation
    unsubscribe/     # One-click unsubscribe
    openapi/         # OpenAPI 3.0 JSON spec (served at /api/openapi)
    og/              # Open Graph image generator
  hooks/             # Custom React hooks (extracted from page.tsx)
    useAisVessels.ts    # 15 s AIS polling
    useDashboardData.ts # Dashboard data, news, and timeline polling + state
  components/        # React UI components
  docs/              # API documentation page (/docs)
    page.tsx            # Full API reference (server component)
    CopyButton.tsx      # 'use client' copy-to-clipboard button
  lib/               # Shared utilities
    types.ts            # All TypeScript interfaces and union types
    constants.ts        # Thresholds, TTLs, geography — single source of truth
    api.ts              # Client-side fetch helpers + deriveStatus()
    mockData.ts         # Seed data (EN + PT) with static SEED_DATE
    kv.ts               # Cloudflare KV helper (returns null in local dev)
    db.ts               # Cloudflare D1 helper + token utilities
    email.ts            # Resend email dispatch
    eia.ts              # EIA API client
    translations.ts     # EN/PT translation strings
    utils.ts            # Misc utilities
  methodology/       # /methodology static page
  embed/             # /embed lightweight iframe widget
  page.tsx           # Main dashboard (uses hooks, not inline state)
  layout.tsx         # Root layout + metadata
scripts/
  ais-collector.mjs  # Standalone AIS WebSocket sidecar
migrations/
  0001_subscriptions.sql
```

### API Routes (`app/api/`)

Each route implements a **multi-source fallback chain**, never returning 502 when any data exists:

| Route | Sources (in priority order) |
|---|---|
| `/api/brent` | Yahoo Finance → Stooq → EIA → module-level cache → KV cache |
| `/api/markets` | EIA + FRED primary → Yahoo Finance fallback |
| `/api/timeline` | 7 RSS feeds (CNN, BBC, Al Jazeera, Google News) → KV cache |
| `/api/news` | GDELT Project API → KV fallback |
| `/api/vessels` | Reads `data/vessels.json` written by AIS sidecar |
| `/api/portwatch` | IMF PortWatch vessel transit counts |
| `/api/weather` | Open-Meteo (Bandar Abbas coordinates) |
| `/api/openapi` | Serves OpenAPI 3.0 JSON spec (1 h cache) |
| `/api/alert-check` | Derives status, compares with KV state, sends email via Resend if changed |
| `/api/subscribe` + `/api/confirm` + `/api/unsubscribe` | D1 subscription management with Cloudflare Turnstile validation |

### Public API (`/v1/*`)

Three CORS-open, CC-BY-4.0 endpoints for partner embeds:

| Route | Cache | Description |
|---|---|---|
| `GET /v1/status` | 30 s | Strait state, tension level, threat score, confidence |
| `GET /v1/events?limit&since` | 60 s | Classified timeline events; supports incremental polling via `since` |
| `GET /v1/metrics` | 60 s | Markets (Brent/WTI/NG), weather, 24 h event delta |

Full interactive reference at `/docs`. Machine-readable spec at `/api/openapi`.

### Cloudflare Bindings

Obtained from `getRequestContext().env` (via `@cloudflare/next-on-pages`). Helpers in `app/lib/kv.ts` and `app/lib/db.ts` return `null` gracefully in local dev where no bindings exist.

- **`HORMUZ_KV`** (`KVNamespace`) — API response caching (Brent, timeline, previous alert state)
- **`DB`** (`D1Database`) — email subscriptions; schema in `migrations/0001_subscriptions.sql`

### Status Algorithm

`deriveStatus()` in `app/lib/api.ts` blends two equal signals into a 0–100 `tensionIndex`. Thresholds live in `app/lib/constants.ts`:

- **Timeline severity (50%)** — sum of `SEVERITY_WEIGHTS` from last-24h events, normalised against `TIMELINE_SCORE_CEILING = 35`
- **Market volatility (50%)** — Brent Δ% above `BRENT_SPIKE_LOW_PCT = 2` scaled to 100 at `BRENT_SPIKE_HIGH_PCT = 5`

Thresholds: `tensionIndex ≥ THREAT_CRITICAL_THRESHOLD (80)` → `CRITICAL/CLOSED`; `≥ THREAT_ELEVATED_THRESHOLD (40)` → `ELEVATED/PARTIALLY_CLOSED`. Pure market spikes never escalate state without corroborating timeline events.

### Internationalisation

`LangContext` (`app/components/LangContext.tsx`) provides `lang` (`'en' | 'pt'`) and `t` (typed accessor) to all components via `useLang()`. `mockData` ships in both languages. `deriveStatus()` accepts a `lang` parameter to localise the reason string.

### AIS Vessel Sidecar

`scripts/ais-collector.mjs` is a standalone Node process that maintains a persistent WebSocket to AISStream.io, filters vessels in the Strait of Hormuz bounding box, and writes `data/vessels.json`. `/api/vessels` reads that file; if absent or >2 min old, the map shows a simulated lane animation. **This file-based approach does not work on Cloudflare Pages** — PROPOSAL.md describes a Redis-backed V2.

### Key Conventions

- All API routes export `runtime = 'edge'` and `dynamic = 'force-dynamic'`
- Never use `new Date()` in module-level code or `useState` initializers — use static ISO strings to avoid SSR/client hydration mismatches (see `SEED_DATE` in `mockData.ts`)
- Leaflet and Three.js components are `dynamic(() => import(...), { ssr: false })` — they cannot run in SSR/edge context
- TypeScript strict mode is on; `types/cloudflare.d.ts` stubs D1/KV to keep `tsc` happy without wrangler
- All magic numbers (thresholds, TTLs, geography) live in `app/lib/constants.ts`
- The `build:cf` script deletes `.next` after the Cloudflare build to prevent dev server corruption

## Environment Variables

Copy `.env.local.example` to `.env.local`. All keys are optional; the app degrades gracefully:

| Variable | Effect when set |
|---|---|
| `EIA_API_KEY` | `/api/brent` and `/api/markets` prefer EIA over Yahoo Finance |
| `AISSTREAM_KEY` | AIS sidecar connects to live WebSocket (required by `npm run ais`) |
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` | Alert emails sent on status change |
| `CRON_SECRET` | Authenticates internal cron calls to `/api/alert-check` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | Spam protection on `/api/subscribe` |
| `V1_API_KEY` | If set, gates non-GET methods on `/v1/*` behind Bearer auth (see `middleware.ts`). GET/HEAD/OPTIONS are always public. |

Cloudflare secrets (set via `wrangler pages secret put`): `RESEND_API_KEY`, `ALERT_CRON_SECRET`, `AISSTREAM_KEY`, `EIA_API_KEY`, `RESEND_FROM_EMAIL`.

## GitHub Actions

- **`ci.yml`** — type-check + lint on all PRs and non-main pushes
- **`deploy.yml`** — deploys to Cloudflare Pages on push to `main`
- **`alert-check.yml`** — hourly cron that POSTs to `/api/alert-check` as a backup for the Cloudflare Cron Trigger; requires `ALERT_CRON_SECRET` and `SITE_URL` secrets
