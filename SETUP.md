# IsHormuzOpen — Local Setup

Three pieces:

1. **Run the dashboard** (works with zero keys, will gracefully degrade).
2. **Plug in EIA** (real government oil prices, free).
3. **Plug in AISStream** (real vessel positions on the map, free).

The dashboard is fully functional with **none** of these keys — it falls back to Yahoo Finance for prices and a simulated lane animation for the map. Adding the keys upgrades each subsystem to its production source.

---

## 0. Prerequisites

- Node.js 18.17+ (Node 20 LTS recommended)
- A terminal

```bash
cd ~/Desktop/ishormuzopen-nextjs
npm install        # installs all deps, including `ws` for the AIS collector
npm run dev
# open http://localhost:3000
```

When you see the dashboard load, you're set. Now upgrade the data sources.

---

## 1. EIA — real Brent + WTI prices

The U.S. Energy Information Administration publishes Brent (`RBRTE`) and WTI (`RWTC`) spot prices via a free, key-gated API. When `EIA_API_KEY` is set in `.env.local`, the dashboard switches `/api/brent` and `/api/markets` from Yahoo Finance to EIA, with Yahoo as a graceful fallback if EIA ever 5xx's.

### Steps

1. Open [https://www.eia.gov/opendata/register.php](https://www.eia.gov/opendata/register.php).
2. Fill the form — first name, last name, email, intended use. Submit.
3. EIA emails the API key within a minute. Copy it.
4. Create `.env.local` in the project root if you haven't already:
   ```bash
   cp .env.local.example .env.local
   ```
5. Paste the key:
   ```
   EIA_API_KEY=paste-your-eia-key-here
   ```
6. Restart the dev server (`Ctrl+C` then `npm run dev`).
7. Sanity check:
   ```bash
   curl -s http://localhost:3000/api/brent | jq '.source, .price, .asOf'
   ```
   Should print `"EIA (PET.RBRTE.D)"`, a number, and an ISO date.

The "via …" label under the Brent tile in the UI flips from `Yahoo Finance` to `EIA` once this is wired.

**License + attribution.** EIA data is in the public domain (U.S. Government). No attribution legally required, but the methodology page already credits them.

---

## 2. AISStream — real vessel positions on the map

The map currently shows a simulated lane animation and is labelled as such. To get real AIS positions in the Strait of Hormuz, you need:

- A free AISStream.io account (no payment, no card)
- The collector script (`scripts/ais-collector.mjs`) running in a second terminal
- That script writes `data/vessels.json` every few seconds
- `/api/vessels` reads that file
- `<VesselMap>` polls `/api/vessels` and switches to live mode when there's data

### Why a sidecar script and not an API route

The AIS feed is a long-lived WebSocket, not an HTTP endpoint. Next.js API routes are request-scoped — they can't keep a connection open. A separate Node process that *does* keep the connection open, writes a snapshot file, and lets the dashboard read it, is the simplest reliable architecture. (Production: replace with a Cloud Run / Fly.io worker and Redis snapshot. See PROPOSAL.md §9.)

### Steps

1. Go to **[https://aisstream.io/authenticate](https://aisstream.io/authenticate)**.
2. Click "Sign up" — email + password is all it asks for. Confirm via the email it sends.
3. Once logged in, you land on the dashboard at `https://aisstream.io/apikeys`. Click **"Generate new API key"**.
4. Copy the key (it's a UUID-ish string).
5. Add it to `.env.local`:
   ```
   AISSTREAM_KEY=paste-your-aisstream-key-here
   ```
6. In a **second terminal**, start the collector:
   ```bash
   cd ~/Desktop/ishormuzopen-nextjs
   npm run ais
   ```
   Within a few seconds you'll see:
   ```
   [ais] connecting to wss://stream.aisstream.io/v0/stream …
   [ais] subscribed for [[[25.2, 54.6], [27.8, 58.4]]]
   [ais] tracking   23 vessels · 142 msgs · last write 14:22:07
   ```
7. Reload the dashboard (or wait 6 s) — the map header changes from `SIMULATED · no AIS key` to `LIVE · N ships`, dots colored by vessel type.

Leave the collector running for as long as you want live data. Stopping it (`Ctrl+C`) flushes one last snapshot to disk; the map falls back to the simulated lane animation after `data/vessels.json` ages past 2 minutes.

### Notes

- AISStream is free with **fair use** — they ask you don't spam reconnects. The collector backs off exponentially up to 30 s on disconnect.
- Coverage is good for the Persian Gulf because there are coastal receivers in Oman + UAE. Vessels mid-ocean may not show up (you need satellite AIS for that — paid Spire).
- The data is rate-limited from their side; expect ~20–50 distinct vessels in the strait at any time, with positions refreshing every 30–180 s per vessel.

### Production note

For a public deployment, **don't** ship `data/vessels.json` to the user's browser — that exposes the AIS data unmoderated, plus filesystem reads don't work on Cloudflare Pages. The V2 move is: collector writes to Upstash Redis, `/api/vessels` reads from Redis with edge cache. See PROPOSAL.md §9 for the full plan.

---

## 3. What you should see when everything is wired

| Subsystem | No keys | With EIA | With AISStream | With both |
|---|---|---|---|---|
| Brent / WTI tiles | Yahoo Finance | EIA | Yahoo Finance | EIA |
| Markets rail | Yahoo Finance | EIA + Yahoo (NG) | Yahoo Finance | EIA + Yahoo (NG) |
| News + timeline | GDELT + RSS | same | same | same |
| Weather | Open-Meteo | same | same | same |
| Map | Simulated lanes | Simulated lanes | Live AIS | Live AIS |
| Headline state | Live (from RSS) | same | same | same |

The status bar at the top of the page tells you exactly which subsystems are healthy at any moment — green dot, amber latency, red is down. Click it to see the per-feed breakdown.

---

## 4. Troubleshooting

**`npm run ais` exits with "AISSTREAM_KEY is not set"** — you haven't added the key to `.env.local`, or you typoed the variable name. The collector reads the file at start; it doesn't watch for changes.

**Map still says SIMULATED with the collector running** — check the second terminal: is the collector receiving messages? If yes, hit `http://localhost:3000/api/vessels` directly in a browser — `running` should be `true`, `count` > 0. If yes but UI still simulated, hard-reload the browser (the page polls every 6 s).

**EIA still says `Yahoo Finance` in the source label** — restart `npm run dev` after editing `.env.local`. Next.js only reads env at boot.

**`curl /api/brent` returns 502** — both EIA and Yahoo failed in the same call. Check your network, then retry.

**EIA returns "Invalid api_key"** — copy/paste error. The key is case-sensitive and has no trailing whitespace.

---

## 5. Cleaning up

`.env.local` is gitignored. `data/vessels.json` is gitignored. Nothing sensitive should ever end up in a commit; if you're not sure, run `git status` before pushing.

If you want to share the dashboard publicly, follow the deploy section of PROPOSAL.md §10 (Cloudflare Pages + `@cloudflare/next-on-pages`, or any Node host with `npm start`).
