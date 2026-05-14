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

The dashboard is entirely client-rendered (`'use client'`). On load, `app/page.tsx` renders immediately with `mockData` as seed state, then progressively replaces it with live data fetched from internal API routes:

1. `fetchDashboardData()` in `app/lib/api.ts` fan-outs to `/api/brent` + `/api/timeline`
2. `deriveStatus()` (also in `api.ts`) computes `StraitStatus` + `tensionIndex` locally from timeline events + Brent Δ% — **there is no dedicated status API endpoint**
3. Components receive data via props drilled from the single top-level `DashboardContent` component

### API Routes (`app/api/`)

Each route implements a **multi-source fallback chain**, never returning 502 when any data exists:

| Route | Sources (in priority order) |
|---|---|
| `/api/brent` | Yahoo Finance → Stooq → EIA → module-level cache → KV cache |
| `/api/markets` | Yahoo Finance → EIA → Alpha Vantage fallback |
| `/api/timeline` | 7 RSS feeds (CNN, BBC, Al Jazeera, Google News) → KV cache |
| `/api/news` | GDELT Project API |
| `/api/vessels` | Reads `data/vessels.json` written by AIS sidecar |
| `/api/portwatch` | IMF PortWatch vessel transit counts |
| `/api/weather` | Open-Meteo (Bandar Abbas coordinates) |
| `/api/alert-check` | Derives status, compares with KV-stored previous state, sends email via Resend if changed |
| `/api/subscribe` + `/api/confirm` + `/api/unsubscribe` | D1 subscription management with Cloudflare Turnstile validation |

### Cloudflare Bindings

Obtained from `getRequestContext().env` (via `@cloudflare/next-on-pages`). Helpers in `app/lib/kv.ts` and `app/lib/db.ts` both return `null` gracefully in local dev where no bindings exist.

- **`HORMUZ_KV`** (`KVNamespace`) — API response caching (Brent payload, timeline events, previous alert state)
- **`DB`** (`D1Database`) — email subscriptions table; schema in `migrations/0001_subscriptions.sql`

### Status Algorithm

`deriveStatus()` in `app/lib/api.ts` blends two equal signals into a 0–100 `tensionIndex`:
- **Timeline severity (50%)** — sum of weights (`low=1, medium=2, high=4, critical=7`) from last-24h events, normalized against a ceiling of 35 raw points
- **Market volatility (50%)** — Brent Δ% above +2% linearly scaled to 100 at +5%

State thresholds: `tensionIndex ≥ 80` → `CRITICAL`/`CLOSED`; `≥ 40` → `ELEVATED`/`PARTIALLY_CLOSED`; `< 40` → `NORMAL`/`OPEN`. Pure market spikes never escalate state without corroborating timeline events.

### Internationalisation

`LangContext` (`app/components/LangContext.tsx`) provides `lang` (`'en' | 'pt'`) and `t` (typed translation accessor) to all components via `useLang()`. `mockData` also ships in both languages. The `deriveStatus()` function accepts a `lang` parameter to localise the reason string.

### AIS Vessel Sidecar

`scripts/ais-collector.mjs` is a standalone Node process (not a Next.js route) that maintains a persistent WebSocket to AISStream.io, filters vessels in the Strait of Hormuz bounding box, and writes `data/vessels.json`. `/api/vessels` reads that file; if the file is absent or >2 min old, the map shows a simulated lane animation. **This file-based approach does not work on Cloudflare Pages** — the PROPOSAL.md describes a Redis-backed V2.

### Key Conventions

- All API routes export `runtime = 'edge'` and `dynamic = 'force-dynamic'`
- Never use `new Date()` in module-level code or `useState` initializers — use static ISO strings as seeds to avoid SSR/client hydration mismatches (see `SEED_DATE` in `mockData.ts`)
- Leaflet and Three.js components are `dynamic(() => import(...), { ssr: false })` — they cannot run in SSR/edge context
- TypeScript strict mode is enabled; `types/cloudflare.d.ts` contains manual stubs for D1/KV that keep `tsc` happy before wrangler installs its own types
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
| `V1_API_KEY` | If set, gates all `/v1/*` routes behind Bearer auth (see `middleware.ts`) |

Cloudflare secrets (set via `wrangler pages secret put`): `RESEND_API_KEY`, `ALERT_CRON_SECRET`, `AISSTREAM_KEY`, `EIA_API_KEY`, `RESEND_FROM_EMAIL`.

## GitHub Actions

- **`ci.yml`** — type-check + lint on all PRs and non-main pushes
- **`deploy.yml`** — deploys to Cloudflare Pages on push to `main`
- **`alert-check.yml`** — hourly cron that POSTs to `/api/alert-check` as a backup for the Cloudflare Cron Trigger; requires `ALERT_CRON_SECRET` and `SITE_URL` secrets
