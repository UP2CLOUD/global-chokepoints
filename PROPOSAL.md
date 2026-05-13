# IsHormuzOpen — Production Redesign & Data Architecture Proposal

**Author voice:** senior product designer + staff platform architect + geopolitical-intelligence consultant.
**Status target:** trusted public intelligence dashboard, journalist- and trader-grade.
**Codename:** **STRAITWATCH** (working internal name for the redesigned platform).

---

## 0. Executive Summary

The current site reads like a portfolio concept: striking visuals, mock data, decorative motion. To become a credible operational platform — the kind a Reuters desk, a P&I underwriter, or a shipping ops manager will leave open on a second monitor — three things must change in this order:

1. **Truth in data.** Every visible number must be sourced, timestamped, and refresh-able. No silent fallbacks to fixtures. When a feed is down, the UI says so.
2. **Density without noise.** Move from "hero card art" to a Bloomberg/Palantir grid: information per square inch, restrained motion, monospaced numerics, scannable hierarchy.
3. **An aggregation backbone.** A small ingestion service that normalizes AIS, market, news, and weather data into one schema (events, metrics, vessels, conditions), with confidence scores and provenance attached to every datum.

The current Next.js Pages app is fine as the rendering surface but cannot be the source of truth. The proposal below decouples a **public read-API + WebSocket fan-out** from the rendering app, sets up source attribution end-to-end, and gives a phased path from MVP → V2 → enterprise.

---

## 1. Audit of the Current Implementation

| Area | Today | Verdict |
|---|---|---|
| Hero status (OPEN / ELEVATED) | Hard-coded; no derivation logic | Now wired to RSS-derived signals; confidence still heuristic |
| Brent price card | Was static; now live Yahoo Finance (`BZ=F`) via `/api/brent` | OK as MVP, replace with ICE/EIA in V2 |
| "Vessels in Strait: 47" | Pure fabrication | Removed; replaced with `Events (24h)` from RSS |
| Maritime traffic canvas | Decorative random walk that diverged into chaos | Now calm two-lane shipping animation, but still **simulated** — clearly labelled |
| News feed | GDELT-only, single sentiment lexicon | OK; add Reuters/AP/AJ/BBC commercial feeds in V2 |
| Timeline | Static `mockData` array | Now aggregates CNN, BBC (World + Middle East), Al Jazeera, Reuters via Google News, Google News topic — refreshed every 60s |
| Loading states | Single full-screen splash | Need per-card skeletons + stale indicators |
| Empty / error states | None — falls back silently to mock | Need explicit "feed down" + "last successful update" UI |
| Accessibility | Decorative-only contrast; no aria for the chart/canvas | Needs WCAG 2.1 AA pass |
| SEO | Static OG, no schema.org | Add NewsArticle/Dataset schemas, OG image generator |
| Trust indicators | Marketing copy only | Need: methodology page, source registry, status page, RSS-of-events for journalists |

**Bottom line:** the wireframe is competent; what's missing is the operational discipline that turns a dashboard into a system of record.

---

## 2. Visual & Product Direction

### 2.1 Reference points

- **Bloomberg Terminal** — black background, monospaced numerics, single chromatic accent for live deltas, no decorative motion.
- **Palantir Gotham / Foundry** — heavy reliance on graph + table, neutral palette, color reserved exclusively for semantics (severity, trend).
- **TradingView / FRED** — clean charts, prominent timestamps, "data as of" line on every figure.
- **AISHub / VesselFinder / Windy** — map-centric, dense overlays toggled on demand, no "intro animation" cruft.
- **ACLED Conflict Dashboard** — explicit methodology page, every event clickable to source.

### 2.2 What the dashboard must **not** look like

- Crypto-meme aesthetics: glowing animated borders, neon gradients on every surface.
- Sci-fi HUD: oversized rotating rings, target reticles, fake "scanning" lasers.
- "Hacker dashboard": Matrix rain, glitch text, FBI-style maps.
- Cinematic war-room theatrics: animated rockets, military typefaces, sirens.

### 2.3 What it must feel like

- **Institutional.** A Reuters subeditor would trust putting an embed of this in a live blog.
- **Analytical.** Every figure has a date, a source, and a way to drill down.
- **Reliable.** When something is unknown, the UI says "unknown" rather than guessing.
- **Quiet.** Motion only conveys change (a new event arriving, a price tick). No idle motion.

---

## 3. Information Architecture

Four canonical entities — everything else is a view on top of these:

```
Event       — a discrete piece of news/intel (RSS item, GDELT article, ACLED record)
Metric      — a numeric time-series point (Brent, freight rate, vessel count)
Vessel      — a tracked ship snapshot (AIS position, type, flag, draught)
Condition   — environmental reading (wind, wave, visibility, sea state)
```

A single derived object — `StraitState` — is computed minute-by-minute from these inputs and is what powers the hero card.

### 3.1 Top-level navigation

```
LIVE          ← default; the dashboard
MAP           ← full-screen world+regional map with layers
TIMELINE      ← chronological feed; replay slider
MARKETS       ← oil, freight, insurance, futures spreads
METHODOLOGY   ← how status is computed, source list, change log
API           ← public read-only docs (V2)
```

### 3.2 Default page hierarchy (LIVE)

```
┌──────────────────────────────────────────────────────────────┐
│ STATUSBAR  ·  data-freshness · feeds healthy · last update  │
├──────────────────────────────────────────────────────────────┤
│ HERO        Strait State  ·  Tension Bar  ·  Confidence      │
│             Most recent driving signal (with link)           │
├────────────┬─────────────┬────────────┬──────────────────────┤
│ Brent      │ Events 24h  │ Freight    │ Last critical event  │
│ Brent Δ%   │ Vessel cnt  │ Insurance  │ AI summary (V2)      │
├────────────┴─────────────┴────────────┴──────────────────────┤
│ MAP (left, 60%)                  │ NEWS FEED (right, 40%)    │
│  AIS density · queues · weather  │  filterable · sourced     │
├──────────────────────────────────┴───────────────────────────┤
│ TIMELINE (full width)                                        │
│  filter by category, severity, region, source                │
├──────────────────────────────────────────────────────────────┤
│ MARKETS rail (Brent, WTI, LNG TTF, BDIY, freight rates)      │
├──────────────────────────────────────────────────────────────┤
│ METHODOLOGY ribbon (one-line link)                           │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 KPI prioritization (which numbers earn the largest cards)

A scoreboard tile is real estate; only put live, falsifiable numbers there.

| Rank | KPI | Why it earns the top row |
|---|---|---|
| 1 | **Strait State** (OPEN / DISRUPTED / CLOSED) | The whole product question |
| 2 | **Tension index** (0–100) | Aggregates news + market + military signals |
| 3 | **Brent Δ%** | Fastest market reaction to closure risk |
| 4 | **Events 24h** | Direct measure of news intensity |
| 5 | Insurance war-risk premium for Gulf hulls | Direct economic signal of perceived risk |
| 6 | Tanker queue length / avg transit time | Direct operational signal |

Tiles 5 and 6 require V2 data partners (Lloyd's List Intelligence, Spire, Windward) — see §6.

---

## 4. Design System

### 4.1 Color palette (semantic, dark-first)

```
Surface
  bg-0       #07090F   page
  bg-1       #0B0F18   panel
  bg-2       #131826   raised card
  divider    #1E2533   1px lines

Text
  text-0     #E6ECF3   primary
  text-1     #A9B4C2   secondary
  text-2     #6B7787   tertiary / metadata
  text-3     #404B5A   placeholder / disabled

Semantic (use only for state, never as decoration)
  ok         #10B981   green
  caution    #F59E0B   amber
  warn       #F97316   orange
  danger     #EF4444   red
  info       #38BDF8   cyan (data accent)

Brand accent (sparing — links, focus rings, active filters)
  accent     #06B6D4
  accent-hi  #67E8F9
```

**Rules.** Never use the brand accent and the semantic colors interchangeably. Severity is red/orange/amber/blue — period. A "live" pulse is `info`. A successful action is `ok`. This stops the page from looking like a Christmas tree.

### 4.2 Typography

```
Display / numerics    Geist Mono  (or JetBrains Mono fallback)
UI sans               Inter, with tabular-nums on numbers
Long-form text        Inter, optical sizes
```

Why mono for numbers: it stops cards from shifting width as values tick (which silently shouts "this is live data we trust"). Tabular numerals in any sans font are an acceptable alternative.

**Type scale** (8/12/14/16/18/24/32/48/64). Use 14px as body, 12px as metadata, 64px reserved for the single hero word (OPEN / DISRUPTED / CLOSED).

### 4.3 Spacing & density

- 4px base unit. Card padding 16/20/24 only.
- Grid: 12-column at ≥1024px, 8-column tablet, 4-column mobile. Gutters 16/20/24.
- **Information density target:** ≥7 distinct data points visible without scrolling on a 13" laptop. The current MVP is at ~5.

### 4.4 Motion

- Default duration **120–180ms**, ease `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- **Allowed motion:** numeric counter on update (no roll, just a 200ms color flash), severity dot pulse (single ring, 2s cycle), incoming-event slide-in (16px, 200ms).
- **Banned motion:** parallax, decorative shimmer on every panel, ambient particle systems, animated borders. The vessel map's "radar ping" should be reduced to a single faint stroke that fades over 800ms when a new vessel point arrives — not continuous.
- Respect `prefers-reduced-motion`: kill all decorative pulses, keep state transitions.

### 4.5 Iconography

Single family: **Lucide** (already in use) at 16/20/24. Drop emoji from the timeline severity tags — emoji break visual cohesion in dark UIs and don't render consistently on Windows.

---

## 5. Section-by-section redesign

### 5.1 Status bar (new, top of page)

A thin (28px) bar above the header with:

- A green dot + "All feeds healthy" — or a red dot + "AIS feed degraded · last vessel update 14m ago".
- Time since last successful refresh of each subsystem (`Brent · 2m`, `RSS · 32s`, `AIS · live`).
- "Methodology" + "Sources" links.

**Why.** This is the single biggest trust upgrade. Operators trust dashboards that tell them what's broken.

### 5.2 Hero — Strait State

- 64px monospace word: OPEN / DISRUPTED / CLOSED. No "PARTIALLY CLOSED" — that's a UX trap; use DISRUPTED.
- Underneath: single-sentence reason **with the source name and a link** (e.g. "Reuters · Iranian Navy seized a tanker near Larak Island · 14:22 UTC").
- Tension bar becomes a horizontal **0–100 index** (replaces NORMAL/ELEVATED/CRITICAL). Index is documented in /methodology; reproducible from raw inputs.
- Confidence stays, but with a hover-explainer: "Backed by 4 sources, 7 events in past 24h, market move ±2.1%."

### 5.3 Scoreboard row

Six tiles (not four) in a single 12-col row that wraps to 2×3 on tablet, 6×1 on mobile.

Each tile must show:
1. Title.
2. Big value (mono, tabular).
3. Delta vs. a defined window (`Δ 24h`, `Δ since open`).
4. Sparkline (40px high, 7-day, recharts inline).
5. Tiny source attribution badge (Yahoo / GDELT / EIA / Lloyd's).
6. "Stale" indicator if the data point is older than 2× its expected refresh interval.

### 5.4 Map panel

The current canvas placeholder is fine for MVP but **must be replaced** in V2 with a real map. Recommendation:

- **Library:** `deck.gl` over Mapbox GL JS (or MapLibre + free OSM tiles for licensing flexibility).
- **Base layer:** dark Mapbox style, no labels at far zoom — labels on at z≥7.
- **Overlays (toggleable in a right rail):**
  - AIS dots (sized by deadweight, colored by ship type).
  - Heatmap of vessel density (decay 90s).
  - Traffic Separation Scheme corridors as faint polygons.
  - Sanctioned ports (US OFAC, UK OFSI, EU sanctions list).
  - Live weather (wind barbs, wave-height isolines from ECMWF).
- **Vessel popovers:** MMSI, name, flag, type, destination, speed, last update — every field with provenance.
- **No fake motion.** Vessels move when AIS reports a new position; no in-between interpolation unless explicitly marked as "interpolated".

### 5.5 News feed (right rail)

- Card per item with: source logo, headline, dek (~140 chars), published time, "via NewsAPI / GDELT / direct RSS" provenance.
- Sentiment chip stays but is computed **only** from a vetted list — display it as `tone: −0.6` rather than red/green arrows so we don't editorialize.
- Filters: source · region · keyword. Persist in localStorage.
- "Open original" is the entire card click target. No internal article view (avoids copyright + makes us a discovery layer, not a publisher).

### 5.6 Timeline

- The page-bottom timeline becomes the **system of record**.
- New events animate in with a single 200ms slide; nothing else moves.
- Each row: time · severity dot · category · title (linked to source) · sources count badge ("3 sources" when GDELT cluster + 2 RSS items refer to the same event).
- Filter chips: category, severity, region (Strait / Gulf / Red Sea / Bab-el-Mandeb), source.
- "Replay" mode (V2): a time slider scrubs the page back to a chosen moment; map + scoreboard rewind to that state.

### 5.7 Markets rail

Below the map: a horizontal rail of 5 mini-tickers (Brent, WTI, TTF LNG, BDIY, Worldscale TD3C tanker rate). Click expands to a full chart drawer.

### 5.8 Methodology page

A real page, not a tooltip. Sections:

1. **What we measure.** Plain-English definitions of the Strait State, Tension index, and each metric.
2. **Sources.** Table of every feed with name, provider, refresh cadence, license, contact.
3. **How status is computed.** Pseudocode for `deriveStatus()` (literally paste the function).
4. **Change log.** Versioned: "v1.2.0 — added ACLED feed, retired Twitter ingestion."
5. **Known limitations.** No paid AIS = no real vessel count; sentiment is heuristic.
6. **Contact.** Corrections inbox, security@, press@.

---

## 6. Data pipeline & sources

### 6.1 The pipeline (target architecture)

```
                ┌────────────────────────────────────────────────┐
                │ Ingestion workers (Cloudflare Workers + Cron) │
                │  one worker per source, scheduled cadence      │
                └───┬─────────────┬─────────────────┬────────────┘
                    │             │                 │
                    ▼             ▼                 ▼
                ┌─────────┐  ┌─────────┐      ┌──────────┐
                │ Brent   │  │ AIS     │      │ News/RSS │
                │ /WTI    │  │ stream  │      │ GDELT    │
                └────┬────┘  └────┬────┘      └────┬─────┘
                     │            │                │
                     ▼            ▼                ▼
        ┌──────────────────────────────────────────────────┐
        │ Normalizer  (TypeScript, Zod-validated schemas)  │
        │ — emits Event / Metric / Vessel / Condition      │
        └────────────────────────┬─────────────────────────┘
                                 ▼
                ┌─────────────────────────────────┐
                │ Event bus                       │
                │  GCP Pub/Sub  or  Kafka         │
                └───┬─────────────────────┬───────┘
                    │                     │
                    ▼                     ▼
        ┌──────────────────┐    ┌──────────────────┐
        │ Hot store        │    │ Cold store       │
        │ Redis (last 24h) │    │ TimescaleDB or   │
        │ + WebSocket fan  │    │ ClickHouse       │
        │   to clients     │    │ (history)        │
        └────────┬─────────┘    └────────┬─────────┘
                 │                       │
                 ▼                       ▼
        ┌──────────────────────────────────────────┐
        │ Public read-API  (Cloudflare Workers)    │
        │  REST /v1/status, /v1/events, /v1/metrics│
        │  WS  /v1/stream                          │
        └──────────────────────┬───────────────────┘
                               ▼
                    Next.js render layer
                    (the dashboard, plus partners' embeds)
```

Every record in the bus carries: `source`, `sourceUrl`, `fetchedAt`, `ingestVersion`, `confidence`. Nothing renders without these.

### 6.2 Source matrix

#### Maritime traffic

| Source | What you get | Cost | Notes |
|---|---|---|---|
| **MarineTraffic** | Live AIS positions + density | $$$ commercial | Best UX; rate-limited; non-redistribution clause to review |
| **VesselFinder** | Live AIS + voyage data | $$ commercial | Decent terms for embed-style use |
| **AISStream.io** | Live AIS WebSocket | Free w/ key | Coverage gaps mid-ocean; great for Strait/Gulf |
| **Spire Maritime** | Satellite AIS, S-AIS | $$$$ enterprise | Required for blue-water coverage; budget item for V2 |
| **exactEarth (now Spire)** | Same family | $$$$ | |
| **Orbcomm** | Satellite AIS | $$$$ | Alternative to Spire |
| **Global Fishing Watch** | Fishing-vessel patterns | Free academic | Useful for anomaly baseline |
| **OpenSky** | ADS-B (aviation) — overflight alerts | Free | Niche but cheap |

**MVP:** AISStream.io WebSocket, bounding box ≈ 25.5N–27.5N, 55E–58E. Replace with MarineTraffic or Spire in V2.

#### Oil & energy markets

| Source | What you get | Cost |
|---|---|---|
| **Yahoo Finance** unofficial (`BZ=F`, `CL=F`, `NG=F`) | EOD + intraday w/ delay | Free, ToS gray area |
| **EIA Open Data** | Daily/weekly official prices | Free w/ key |
| **AlphaVantage** | Real-time-ish, intraday | Free 25/day or paid |
| **TradingEconomics** | Forecasts, calendars | $$ |
| **ICE Connect** | LNG, freight, gasoline | $$$$ enterprise |
| **OPEC.org** | MOMR, daily basket | Free (HTML scraping) |
| **Baltic Exchange** (BDIY, BDTI, TD3C) | Freight indices | $$$$ |
| **Lloyd's List Intelligence** | Tanker freight, war-risk premia | $$$$$ |

**MVP:** Yahoo Finance + EIA for prices, manual placeholder for freight until BDTI license.

#### Geopolitical & security intelligence

| Source | Coverage |
|---|---|
| **GDELT v2** | Free; global news firehose with tone/themes |
| **NewsAPI / NewsAPI.ai (Event Registry)** | Free tier 100/day; commercial above |
| **Reuters Connect** | Premium, mandatory if you want to display Reuters content beyond headline + link |
| **AP News Hosted RSS** | Free RSS by topic |
| **Al Jazeera RSS** | Free |
| **BBC RSS** | Free |
| **CNN RSS** | Free |
| **ACLED** | Conflict events, structured, free with attribution |
| **Crisis24 / Garda World** | Travel risk advisories, commercial |
| **LiveUAmap** | Crowdsourced + verified events |
| **UN OCHA HDX / ReliefWeb** | Humanitarian dispatches |
| **NATO / US 5th Fleet** | Public releases — scrape sparingly |
| **OFAC / OFSI / EU sanctions lists** | Static refs for tanker flag/MMSI lookups |

**MVP today:** GDELT + 5 RSS feeds (CNN, BBC × 2, Al Jazeera, Reuters via Google News mirror). Next: NewsAPI for licensable summaries; ACLED for ground-truth conflict events.

#### Weather & ocean

| Source | What you get | Cost |
|---|---|---|
| **NOAA NDBC** | Buoy data, wave height | Free |
| **NOAA GFS** | Global forecast | Free |
| **ECMWF Open Data** | High-res forecast | Free for non-commercial |
| **OpenWeather** | Generalist; CORS-OK | Free 1000/day |
| **Windy API** | Embeddable maps | $$ |
| **Copernicus Marine** | Wave/wind reanalysis | Free w/ registration |

**MVP:** OpenWeather for marine conditions near 26.5°N 56.4°E. V2: ECMWF + NOAA fused.

#### Economic impact

| Indicator | Source | Notes |
|---|---|---|
| War-risk insurance premia (Joint War Committee listed areas) | Lloyd's market, IUMI | Commercial |
| Worldscale freight rates (TD3C) | Baltic Exchange | Commercial |
| Container throughput at proximal ports (Jebel Ali, Khor Fakkan, Sohar) | Port authority dashboards | Public, scrape-friendly |
| Country oil-export dependency on Hormuz | EIA, BP Statistical Review | Annual |
| Bunker prices Fujairah | Ship & Bunker | Free with attribution |

---

## 7. Data quality & trust mechanics

### 7.1 Provenance is non-negotiable

Every datum in the DB carries `(source, source_url, fetched_at, ingest_version)`. The render layer surfaces these in tooltips and on the methodology page.

### 7.2 Confidence scoring

Each derived value (Strait State, tension index, "this is the same event as that") publishes a confidence in [0, 1]. The score is a documented function — not a vibe. Example for "same event":

```
confidence = w1*title_similarity + w2*time_proximity + w3*entity_overlap
weights documented; threshold for clustering > 0.78
```

### 7.3 Freshness indicators

- Each tile shows a thin freshness bar that fills from green → amber → red as the value ages past its expected refresh interval × 1, ×2, ×4.
- The status bar aggregates: any tile in red bumps the global indicator.

### 7.4 Outage handling

- Per-source circuit breaker: 3 consecutive failures → mark source DOWN, set fall-through, expose on status page.
- **Never silently fall back to mock data in production.** UI shows the previous valid value + a "stale" badge with the last successful timestamp.

### 7.5 Anti-misinformation

- News items show the publication, not a synthesized summary, until clustering confidence > 0.85.
- AI-generated summaries (V2) must always carry a "generated" badge and a "compare sources" link.
- Disallow content from sources not in the registry; the registry is human-curated.
- Editorial corrections: a `corrections@` mailbox + public corrections log.

### 7.6 Caching & rate limiting

- Edge cache (Cloudflare) for `/v1/status` (TTL 30s, SWR 60s) and `/v1/events` (TTL 60s, SWR 120s).
- Origin token bucket: 60 req/min/IP for unauthenticated; 600 for keyed.
- WebSocket: max 200 concurrent / IP; broadcast model so server-side cost is independent of subscriber count.

### 7.7 Abuse / scraping

- Cloudflare WAF rules for obvious crawlers.
- Robots.txt allows indexing of `/` and `/methodology`; disallows `/api/*` for bots.
- Public API is rate-limited and requires a free key in V2.

---

## 8. Performance & accessibility

### 8.1 Performance budget

- LCP ≤ 1.8s on 4G mid-tier mobile.
- TTI ≤ 2.5s.
- JS bundle (initial) ≤ 180KB gz.
- Lazy-load `deck.gl` and Recharts; the page is usable without them.
- Use Next.js Server Components for everything except interactive widgets.
- HTTP/3 + brotli at the edge.

### 8.2 Accessibility (WCAG 2.1 AA)

- Color contrast: every text/state combo passes 4.5:1 (3:1 large text). The dark palette in §4.1 was picked to clear this against `bg-1` and `bg-2`.
- All severity colors paired with a glyph (●▲■◆) — never color alone.
- Map: keyboard-navigable; vessel list view as a parallel surface for screen readers.
- Charts: `<title>` + `aria-describedby` summary; `<table>` fallback per chart.
- Focus rings: 2px `accent`, always visible.
- Reduced motion: hard-disables all decorative motion.
- Language switching: `lang` attribute updates with the toggle; numbers and dates respect locale.

### 8.3 SEO

- `NewsArticle`, `Dataset`, and `LiveBlogPosting` schema.org on the page.
- OG image generated server-side from the current `Strait State` (Satori + @vercel/og or @cf-pages/og).
- `sitemap.xml` includes `/methodology` and `/timeline/yyyy/mm/dd` archive pages.
- Server-side rendered status text for the hero (so social previews aren't blank).

---

## 9. Real-time architecture

### 9.1 Why move past `setInterval` polling

The current client polls `/api/timeline` every 60s. That's fine for tens of users, terrible for thousands during a crisis (which is exactly when traffic spikes).

### 9.2 Recommended approach

- **Ingestion side:** Cloudflare Workers with Cron Triggers (1m/5m/15m cadence per source). Heavy AIS WebSocket consumers run on a small **Cloud Run** service so the connection is sticky.
- **Bus:** Pub/Sub topics per entity (`events`, `metrics`, `vessels`).
- **State:** Redis (Upstash) holds last 24h of events + most recent metric per (kind, region).
- **Fan-out:** Cloudflare Durable Objects implement the `/v1/stream` WebSocket — one object per region, sub-millisecond fan-out, with rate-limited per-IP slots.
- **Cold store:** TimescaleDB on Cloud SQL or ClickHouse Cloud for retention + replay.

### 9.3 Client protocol

```
WS /v1/stream?subscribe=status,events,brent
←  { type: "snapshot", state: {...} }       // hydrate on connect
←  { type: "event",    ts, id, ... }        // pushed thereafter
←  { type: "metric",   ts, key, value, ... }
←  { type: "heartbeat" } every 25s
```

Client reconnects with exponential backoff and re-asks for `snapshot`.

---

## 10. Tech stack recommendation

| Layer | Choice | Why |
|---|---|---|
| Render | **Next.js 14 / React 18 / TypeScript / Tailwind** | Already in place; Server Components reduce JS payload |
| State | **TanStack Query** for HTTP, native `WebSocket` + small zustand store for live | Already in deps |
| Map | **deck.gl + MapLibre GL** | Open licenses; no Mapbox lock-in |
| Charts | **Recharts** for cards, **uPlot** for big time series | uPlot scales to 50k points smoothly |
| Tables | **TanStack Table** | Headless, fast, accessible |
| Forms (alerts) | **react-hook-form + Zod** | Same Zod schemas as backend |
| Edge | **Cloudflare Workers + Pages** | Lowest p95, generous free tier |
| Sticky long-lived | **Cloud Run** (GCP) or **Fly.io Machines** | For WebSocket clients to AIS feeds |
| Bus | **Cloud Pub/Sub** (GCP) or **Kafka (Confluent Cloud)** | Pub/Sub cheaper to start |
| Hot store | **Upstash Redis** | Pay-per-request, edge-friendly |
| Cold store | **TimescaleDB on Cloud SQL** or **ClickHouse Cloud** | Hypertables = trivial time-series rollups |
| Search | **Typesense Cloud** | Cheap, good DX, for /events search |
| Auth (V2 API keys) | **Clerk** or **Supabase Auth** | If you decide to launch a public API |
| Observability | **Grafana Cloud + Loki + Tempo + Prometheus** | One vendor, generous free tier |
| Error monitoring | **Sentry** | Frontend + backend |
| Status page | **Better Stack** or **statuspage.io** | Public uptime page |
| CI/CD | **GitHub Actions** + Cloudflare/CF Pages deploy | Already aligned with current `pages.dev` URL |
| CDN | **Cloudflare** | Already implied by `pages.dev` |

---

## 11. Phased roadmap

### MVP (4–6 weeks)

Goal: a credible site you'd put behind a press release.

- [x] Replace static data with live `/api/brent`, `/api/news`, `/api/timeline` (done in this branch).
- [x] Fix the chaotic map animation; label it "simulated".
- [x] Derive Strait State from real timeline + Brent move.
- [ ] Status bar with feed-health indicators.
- [ ] Per-card freshness + "stale" badges (no silent mock fallback).
- [ ] Methodology page (sources, formulas, change log).
- [ ] Source provenance shown in news + timeline.
- [ ] OG image generator; schema.org metadata.
- [ ] AISStream.io free WebSocket → minimal real vessel dots over OSM tiles.
- [ ] Accessibility pass (axe-core in CI, contrast audit).
- [ ] Public RSS feed of dashboard events for journalists.
- [ ] Cloudflare deployment via `@cloudflare/next-on-pages`.

### V2 (next quarter)

Goal: data partners + interactive map.

- [ ] deck.gl-powered live map with density heat-map, TSS overlays, weather.
- [ ] NewsAPI / Event Registry license for richer clustering + summaries.
- [ ] ACLED ingestion for verified conflict events.
- [ ] AI summary line under the hero (LLM with cite-or-die prompt; sources only from the registry).
- [ ] Timeline replay (time slider).
- [ ] Markets rail: Brent + WTI + TTF + BDIY + TD3C.
- [ ] Weather layer (ECMWF Open Data ingest).
- [ ] Public read-only API + keys + docs at `/api`.
- [ ] Alert subscriptions: email, Webhook, Slack, RSS-per-region.
- [ ] Mobile-first redesign pass; PWA install.
- [ ] Cost optimization: SWR + edge cache tuning, image budget.

### Enterprise (year 1)

Goal: shipping companies, P&I, gov agencies as paying users.

- [ ] Spire / MarineTraffic commercial AIS contract.
- [ ] Lloyd's freight + insurance data.
- [ ] Multi-region: extend to Bab-el-Mandeb, Suez, Malacca, Bosphorus.
- [ ] Anomaly detection: dark vessels, AIS spoofing, atypical loitering.
- [ ] Event correlation engine: links incidents → price moves → vessel diversions.
- [ ] Replay & forecast: historical scenarios, Monte-Carlo closure-impact model.
- [ ] White-label embed widgets for partner sites.
- [ ] SLA / SOC 2 / GDPR DPA / data-processing terms.
- [ ] Government / NATO contact program.

---

## 12. Cost envelope (rough, USD)

### MVP (single region, ~10k DAU)

| Item | Monthly |
|---|---|
| Cloudflare Pages + Workers | $20–$50 |
| AISStream.io free | $0 |
| EIA / Yahoo / RSS | $0 |
| Upstash Redis | $20 |
| Sentry / Grafana Cloud free | $0 |
| Domain + email | $5 |
| **Total** | **~$50–$100** |

### V2 (100k DAU, real map, paid news)

| Item | Monthly |
|---|---|
| Cloudflare Workers Paid + R2 | $50 |
| Cloud Run (AIS WS workers) | $80 |
| Pub/Sub + Cloud SQL/Timescale | $150 |
| Mapbox/MapLibre tiles | $0–$200 (depends on tile provider) |
| NewsAPI / Event Registry | $250–$700 |
| OpenWeather / Windy paid | $100 |
| Sentry / Grafana paid | $100 |
| **Total** | **~$700–$1,400** |

### Enterprise (M-DAU, paid AIS, freight)

| Item | Monthly |
|---|---|
| Spire / MarineTraffic | $5,000–$25,000 |
| Lloyd's List Intelligence | $3,000–$15,000 |
| ClickHouse Cloud | $500–$2,000 |
| Confluent Cloud Kafka | $500–$2,000 |
| Multi-region infra | $2,000–$5,000 |
| SOC 2 audit (one-off) | $25,000 |
| **Total run-rate** | **~$15,000–$60,000** |

---

## 13. Engineering challenges to expect

1. **AIS data quality.** Coastal stations have gaps; satellite AIS is expensive but necessary outside coastal range. Expect duplicate MMSI, stale positions, AIS spoofing — all need detection.
2. **News deduping.** GDELT + RSS will surface the same story 5–10 times. The clustering function is the difference between a credible timeline and a slop feed.
3. **Sentiment / tone is noisy.** A keyword-based approach (current MVP) will mislabel. Move to a small, evaluated classifier; never invent a polarity arrow you can't defend.
4. **Time zones.** Mixing UTC and local times silently is the #1 cause of credibility loss; **store UTC, display with explicit zone**.
5. **Scaling under crisis traffic.** Traffic spikes 50–200× when something happens. Pre-warm Workers + cache aggressively + WebSocket fan-out (not polling) at the edge.
6. **Image / map license burns.** Tile provider switches are painful; abstract behind one component from day one.

---

## 14. Legal / compliance / sensitivity

- **Disclaimer.** Every page needs: *"For informational purposes only. Not navigational, financial, or operational advice. Always verify with official authorities (IMO, IRCC, NAVCENT, port authorities) before making decisions."* Show in footer + methodology + on any embed.
- **No predictions in absolute terms.** Always probabilistic: "elevated risk", "+12% above baseline" — never "the Strait will close on X".
- **Sanctions / embargoes.** When linking vessels to OFAC entries, include the OFAC entry number and date.
- **Press / quoting rules.** Headline + link is generally fair use; full-text reproduction needs license (NewsAPI, Reuters Connect, AP News).
- **GDPR / UK GDPR.** No personal data ingested. If you add alert subscriptions, you become a data controller — appoint a DPO (or contract one), publish privacy policy, DPA-able.
- **Export controls / dual-use.** If/when you publish vessel-tracking that could identify ships breaching sanctions, expect contact from regulators on either side. Document a legal-hold + takedown process before launch.
- **Geopolitical sensitivity.** Avoid editorial framing. "Iranian navy seizes tanker" — yes (factual, sourced). "Iranian aggression escalates" — no (editorial). The methodology page must explicitly disclaim political stance.
- **Accessibility law.** EU EAA + ADA Title III both attach reputational + legal risk if a popular dashboard isn't WCAG compliant.

---

## 15. Concrete next steps (this week)

1. **Wire the status bar** with per-feed health + last-fetch timestamps.
2. **Kill silent mock fallback** in production — show stale badges instead.
3. **Ship the methodology page** with the source list and `deriveStatus()` pseudocode.
4. **Sign up for AISStream.io** (free) and prototype the first real vessel layer on a Mapbox dark style.
5. **Move RSS aggregation off the request path** — a Worker Cron writes to KV/Redis every minute, the API just reads.
6. **Add freshness indicators** to every metric tile.
7. **OG image generator** so social previews show the live state.

These are the changes that move the product from "looks like it could be real" to "is real and we can defend every pixel".

---

*End of proposal.*
