import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Methodology — IsStraitHormuzOpen?',
  description:
    'How IsStraitHormuzOpen? computes the Strait of Hormuz state: data sources, threat-score formula, refresh cadence, public API, and change log.',
};

const SOURCES = [
  {
    name: 'EIA (US Energy Information Admin)',
    use: 'Brent crude spot price, WTI crude',
    cadence: '5 min',
    license: 'Public domain; official US government data.',
  },
  {
    name: 'FRED (St. Louis Fed)',
    use: 'Henry Hub natural gas front-month (NG=F fallback)',
    cadence: '5 min',
    license: 'Public domain; Federal Reserve Economic Data.',
  },
  {
    name: 'Yahoo Finance',
    use: 'Brent (BZ=F), WTI (CL=F), Henry Hub (NG=F) — fallback when EIA/FRED unavailable',
    cadence: '5 min',
    license: 'Unofficial endpoint; rate-limited. Used only as fallback.',
  },
  {
    name: 'IMF PortWatch',
    use: 'Daily vessel transit counts at Strait of Hormuz (chokepoint6) by type',
    cadence: '6 h (data updates weekly)',
    license: 'IMF Open Data. Chokepoint ID: chokepoint6.',
  },
  {
    name: 'GDELT v2 Doc API',
    use: 'Global news article discovery — Hormuz/Iran/shipping keywords',
    cadence: '5 min',
    license: 'Free; attribution requested.',
  },
  {
    name: 'CNN RSS',
    use: 'World + Middle East headlines',
    cadence: '60 s',
    license: 'Public RSS; headlines + links only.',
  },
  {
    name: 'BBC RSS',
    use: 'World + Middle East headlines',
    cadence: '60 s',
    license: 'Public RSS; headlines + links only.',
  },
  {
    name: 'Al Jazeera RSS',
    use: 'Headlines + summaries',
    cadence: '60 s',
    license: 'Public RSS.',
  },
  {
    name: 'Reuters (via Google News mirror)',
    use: 'Headlines + links',
    cadence: '60 s',
    license: 'Reuters direct RSS is paid; mirror is fair-use headline aggregation.',
  },
  {
    name: 'Open-Meteo',
    use: 'Wind speed/direction, visibility, wave height at 26.5°N 56.4°E',
    cadence: '15 min',
    license: 'CC-BY-4.0; no API key required.',
  },
  {
    name: 'AISStream.io',
    use: 'Real-time AIS vessel positions in the strait (when key configured)',
    cadence: 'Real-time WebSocket',
    license: 'Free tier; MMSI-level vessel positions.',
  },
];

const CHANGELOG = [
  {
    v: '0.5.0',
    date: '2026-05-14',
    notes:
      'Migrated to Cloudflare Pages (strait-of-hormuz-monitor.pages.dev). ' +
      'Added PortWatch animated vessels on map. KV caching on /api/timeline and /api/weather. ' +
      'Fixed confirmation email token bug. Tightened threat-score false-positive rule.',
  },
  {
    v: '0.4.0',
    date: '2026-05-13',
    notes:
      'Replaced Three.js 3D scene with live Leaflet map (CartoDB dark tiles, shipping lanes). ' +
      'Header z-index fix (z-1100 over Leaflet). News feed skeleton loading. ' +
      'Decoupled GDELT fetch from dashboard Promise.all.',
  },
  {
    v: '0.3.0',
    date: '2026-05-12',
    notes:
      'IMF PortWatch integration — real daily transit counts. ' +
      'FRED API for Henry Hub (permanent fix for Yahoo 429s). ' +
      'KV-persisted Yahoo cache. AIS binary Blob frame decoder.',
  },
  {
    v: '0.2.0',
    date: '2026-05-11',
    notes:
      'Live data architecture: API routes, RSS aggregator, multi-signal status derivation, ' +
      'public /v1 API, RSS feed, methodology page, Cloudflare KV + D1 bindings.',
  },
  {
    v: '0.1.0',
    date: '2026-05-10',
    notes: 'Initial Next.js dashboard; visual design + i18n (EN/PT-BR) only.',
  },
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[#07090F] text-[#E6ECF3]">
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <Link
          href="/"
          className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#06B6D4] hover:underline"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-6 text-3xl md:text-4xl font-semibold tracking-tight">
          Methodology
        </h1>
        <p className="mt-3 text-[#A9B4C2] leading-relaxed">
          IsStraitHormuzOpen? is a public intelligence dashboard monitoring the
          operational state of the Strait of Hormuz in near real-time. Every
          number on the page is computed from a documented source on a documented
          cadence. This page explains how.
        </p>

        <Section title="1. What we measure">
          <p>
            The headline output is the <strong>Strait State</strong>:{' '}
            <code>OPEN</code>, <code>DISRUPTED</code>, or <code>CLOSED</code>.
            Alongside the state we publish a <strong>Tension Level</strong>{' '}
            (NORMAL / ELEVATED / CRITICAL) and a <strong>Threat Score</strong>{' '}
            (0–100) that fuses timeline event severity with market volatility.
            An analyst <strong>confidence</strong> value in [0, 1] grows with
            source diversity and event density.
          </p>
          <p>
            The map shows live vessel positions from{' '}
            <strong>AISStream.io</strong> when available, plus{' '}
            <strong>representative vessel dots</strong> animated along the IMO
            shipping lanes — proportional to the day&apos;s IMF PortWatch transit
            count by vessel type (tanker · cargo · container · dry bulk).
          </p>
        </Section>

        <Section title="2. Data sources">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-[#1E2533] rounded-lg overflow-hidden">
              <thead className="bg-[#0B0F18] text-[#6B7787] text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2">Source</th>
                  <th className="text-left px-3 py-2">Used for</th>
                  <th className="text-left px-3 py-2">Refresh</th>
                  <th className="text-left px-3 py-2">License / notes</th>
                </tr>
              </thead>
              <tbody>
                {SOURCES.map((s) => (
                  <tr key={s.name} className="border-t border-[#1E2533]">
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{s.name}</td>
                    <td className="px-3 py-2 text-[#A9B4C2]">{s.use}</td>
                    <td className="px-3 py-2 text-[#A9B4C2] font-mono whitespace-nowrap">{s.cadence}</td>
                    <td className="px-3 py-2 text-[#6B7787]">{s.license}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="3. Status computation">
          <p>
            Status is derived in <code>app/lib/api.ts → deriveStatus()</code>.
            Runs client-side on every data refresh using the latest timeline
            events and Brent price change.
          </p>

          <h3 className="text-[#E6ECF3] font-semibold text-sm mt-4 mb-2">Step 1 — Keyword state detection</h3>
          <pre className="p-4 bg-[#0B0F18] border border-[#1E2533] rounded-lg text-[12px] overflow-x-auto leading-relaxed">{`# Scan events from the past 72 hours
CLOSURE_PATTERNS = /closed|closure|shut down|blocked|blockade|suspended|halt/
PARTIAL_PATTERNS = /diverted|rerouted|delayed|evacuated|traffic disrupt/

if any recent event matches CLOSURE_PATTERNS → state = CLOSED
elif any recent event matches PARTIAL_PATTERNS → state = DISRUPTED
else → state = OPEN`}</pre>

          <h3 className="text-[#E6ECF3] font-semibold text-sm mt-4 mb-2">Step 2 — Multi-signal Threat Score (0–100)</h3>
          <pre className="p-4 bg-[#0B0F18] border border-[#1E2533] rounded-lg text-[12px] overflow-x-auto leading-relaxed">{`# Timeline Severity Score (last 24 h)
weight = { low: 1, medium: 2, high: 4, critical: 7 }
raw_timeline = sum(weight[e.severity] for e in last24)
timeline_score = min(100, raw_timeline × (100 / 35))   # normalised 0–100

# Market Volatility Score
# Brent spike > 2% starts triggering; 5% spike → score 100
if brent_change_pct > 2:
    market_score = min(100, (brent_change_pct - 2) × 33.3)
else:
    market_score = 0

# Final 50/50 blend
threat_score = round(timeline_score × 0.5 + market_score × 0.5)

# Tension level thresholds
if threat_score ≥ 80 or state == CLOSED   → CRITICAL
elif threat_score ≥ 40 or state != OPEN   → ELEVATED
else                                        → NORMAL

# State override — timeline events required to escalate
# (pure Brent spike without events never closes the strait)
if state == OPEN and last24 not empty and threat_score > 85:
    state = DISRUPTED`}</pre>

          <h3 className="text-[#E6ECF3] font-semibold text-sm mt-4 mb-2">Step 3 — Confidence</h3>
          <pre className="p-4 bg-[#0B0F18] border border-[#1E2533] rounded-lg text-[12px] overflow-x-auto leading-relaxed">{`sources    = unique source names contributing to last24 events
confidence = min(0.99,
  0.55
  + 0.06 × |sources|
  + 0.02 × min(|last24|, 6)
)`}</pre>
        </Section>

        <Section title="4. Vessel transit map">
          <p>
            The hero map renders two independent vessel layers:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[#A9B4C2]">
            <li>
              <strong className="text-[#F59E0B]">AIS live dots</strong> — real
              MMSI positions streamed from AISStream.io, refreshed every 15 s.
              Colour-coded by type. Shown only when the collector is active.
            </li>
            <li>
              <strong>PortWatch representative vessels</strong> — animated dots
              distributed along IMO TSS lanes, proportional to the latest daily
              transit count by type:{' '}
              <span style={{ color: '#F59E0B' }}>tanker (amber)</span>,{' '}
              <span style={{ color: '#38BDF8' }}>cargo (sky)</span>,{' '}
              <span style={{ color: '#A78BFA' }}>container (purple)</span>,{' '}
              <span style={{ color: '#94A3B8' }}>dry bulk (slate)</span>.
              These are <em>illustrative</em> — not real GPS positions.
            </li>
          </ul>
          <p>
            IMF PortWatch updates weekly (~Tuesdays 09:00 ET, 2–3 day lag).
            Chokepoint ID: <code>chokepoint6</code>. Historical baseline:
            ~34 transits/day.
          </p>
        </Section>

        <Section title="5. Refresh cadence">
          <ul className="list-disc list-inside space-y-1 text-[#A9B4C2]">
            <li>Timeline / RSS aggregator — <strong>60 s</strong> (KV cached)</li>
            <li>News (GDELT) — <strong>5 min</strong> (KV cached)</li>
            <li>Brent · WTI · Henry Hub — <strong>5 min</strong> (KV cached, EIA primary)</li>
            <li>IMF PortWatch transit counts — <strong>6 h</strong> (KV cached)</li>
            <li>Weather (Open-Meteo) — <strong>15 min</strong> (KV cached)</li>
            <li>AIS vessel positions — <strong>15 s</strong> (live WebSocket, KV fallback)</li>
            <li>Feed health — <strong>30 s</strong></li>
          </ul>
          <p className="text-sm text-[#6B7787] mt-2">
            All routes run on Cloudflare Pages Functions (Edge Runtime) with
            Cloudflare KV caching. Multiple concurrent users share the same cached
            upstream response within each TTL window.
          </p>
        </Section>

        <Section title="6. Public API">
          <p>
            A read-only JSON API is available for embeds and partner integrations.
            CORS is allow-all; responses are cached at the edge.
          </p>
          <pre className="mt-3 p-4 bg-[#0B0F18] border border-[#1E2533] rounded-lg text-[12px] overflow-x-auto leading-relaxed">{`GET /v1/status              # strait state, tension level, confidence, reason
GET /v1/events?limit=30     # latest aggregated timeline events
GET /v1/events?since=ISO    # incremental fetch since ISO timestamp
GET /v1/metrics             # markets (Brent/WTI/NG), weather, event counts
GET /feed.xml               # RSS 2.0 for journalists and aggregators`}</pre>
          <p className="mt-3 text-[#6B7787] text-sm">
            License: CC-BY-4.0. Attribution: &ldquo;IsStraitHormuzOpen?&rdquo; with a link
            to{' '}
            <a
              href="https://strait-of-hormuz-monitor.pages.dev"
              className="text-[#06B6D4] hover:underline"
            >
              strait-of-hormuz-monitor.pages.dev
            </a>.
          </p>
        </Section>

        <Section title="7. Known limitations">
          <ul className="list-disc list-inside space-y-2 text-[#A9B4C2]">
            <li>
              <strong>Keyword matching</strong> — closure/disruption detection is
              regex-based. Ironic, quoted, or context-heavy headlines can produce
              false positives. Treat as directional signal only.
            </li>
            <li>
              <strong>AIS coverage gaps</strong> — AISStream.io free tier covers
              only vessels transmitting within range of terrestrial receivers.
              Military vessels, tankers in radio-quiet mode, and vessels in
              Iranian waters may be invisible.
            </li>
            <li>
              <strong>PortWatch lag</strong> — IMF data is 2–3 days lagged and
              updates weekly. Map vessels reflect the latest complete day, not
              today. They are illustrative, not real-time positions.
            </li>
            <li>
              <strong>Yahoo Finance rate limits</strong> — unofficial endpoint;
              may return 429 under load. EIA is the primary crude source; FRED
              for Henry Hub. Yahoo is fallback only.
            </li>
            <li>
              <strong>RSS deduplication</strong> — URL-based. Near-duplicate
              stories from different outlets may appear separately.
            </li>
          </ul>
        </Section>

        <Section title="8. Change log">
          <ul className="space-y-3">
            {CHANGELOG.map((c) => (
              <li key={c.v} className="border-l-2 border-[#06B6D4]/50 pl-3">
                <div className="text-[11px] text-[#06B6D4] font-mono">
                  v{c.v} · {c.date}
                </div>
                <div className="text-[#A9B4C2] text-sm mt-0.5">{c.notes}</div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="9. Disclaimer">
          <p className="text-[#A9B4C2]">
            This site provides information for situational awareness only. It
            is <strong>not</strong> navigational, financial, military, or
            operational advice. Always verify with official authorities (IMO,
            NAVCENT, UKMTO, port authorities, your insurer&apos;s war-risk cell)
            before making decisions. Threat scores are probabilistic outputs
            of an automated algorithm and do not represent a forecast of
            imminent events.
          </p>
        </Section>

        <Section title="10. Contact">
          <p className="text-[#A9B4C2]">
            Corrections, source suggestions, takedowns, press enquiries:{' '}
            <a
              className="text-[#06B6D4] hover:underline"
              href="mailto:cesarnogueira1210@gmail.com"
            >
              cesarnogueira1210@gmail.com
            </a>
          </p>
        </Section>

        <footer
          className="mt-12 pt-6 border-t border-[#1E2533] text-[11px] text-[#6B7787] font-mono"
          suppressHydrationWarning
        >
          © {new Date().getFullYear()} IsStraitHormuzOpen? ·{' '}
          <Link href="/" className="hover:text-[#06B6D4]">Dashboard</Link> ·{' '}
          <a href="/feed.xml" className="hover:text-[#06B6D4]">RSS</a> ·{' '}
          <a href="/v1/status" className="hover:text-[#06B6D4]">API</a>
        </footer>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight text-[#E6ECF3] border-b border-[#1E2533] pb-2">
        {title}
      </h2>
      <div className="mt-3 text-[#A9B4C2] leading-relaxed space-y-3 text-sm">
        {children}
      </div>
    </section>
  );
}
