'use client';

import Link from 'next/link';
import { useLang } from '@/app/components/LangContext';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';

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

export default function MethodologyContent() {
  const { t } = useLang();
  const m = t.methodology;

  return (
    <main className="min-h-screen bg-bg text-text">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-divider bg-bg">
        <div className="max-w-3xl mx-auto px-5 md:px-8 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="IsStraitHormuzOpen?">
            <span className="w-2 h-2 rounded-full bg-accent shrink-0" aria-hidden />
            <div className="flex flex-col gap-[2px]">
              <span className="text-[7px] font-mono uppercase tracking-[0.28em] text-text3 leading-none">IS STRAIT</span>
              <span className="font-headline font-black italic text-[19px] leading-none tracking-tight text-text">HORMUZ</span>
              <span className="text-[7px] font-mono uppercase tracking-[0.28em] text-accent leading-none">OPEN?</span>
            </div>
          </Link>

          <div className="flex items-center gap-3 md:gap-4">
            <LanguageSwitcher />
            <Link
              href="/"
              className="hidden sm:block text-[9px] font-mono text-text3 hover:text-text2 transition-colors uppercase tracking-[0.18em]"
            >
              {m.backToDashboard}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14">
        {/* Page title */}
        <div className="border-b border-divider pb-6 mb-10">
          <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-text3 mb-3">
            IsStraitHormuzOpen?
          </p>
          <h1 className="font-headline font-black italic text-[42px] md:text-[56px] leading-none tracking-tight text-text">
            {m.title}
          </h1>
          <p className="mt-4 text-[14px] text-text2 leading-relaxed max-w-xl">
            {m.subtitle}
          </p>
        </div>

        <Section title={m.s1title}>
          <p>
            The headline output is the <strong>Strait State</strong>:{' '}
            <code className="font-mono text-accent text-[12px]">OPEN</code>,{' '}
            <code className="font-mono text-accent text-[12px]">DISRUPTED</code>, or{' '}
            <code className="font-mono text-accent text-[12px]">CLOSED</code>.
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

        <Section title={m.s2title}>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[12px] border border-divider">
              <thead className="bg-bg1 text-text3 text-[9px] font-mono uppercase tracking-[0.14em]">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-divider">{m.tableSource}</th>
                  <th className="text-left px-3 py-2 border-b border-divider">{m.tableUsedFor}</th>
                  <th className="text-left px-3 py-2 border-b border-divider">{m.tableRefresh}</th>
                  <th className="text-left px-3 py-2 border-b border-divider">{m.tableLicense}</th>
                </tr>
              </thead>
              <tbody>
                {SOURCES.map((s, i) => (
                  <tr key={s.name} className={i % 2 === 0 ? 'bg-bg' : 'bg-bg1/40'}>
                    <td className="px-3 py-2 font-medium text-text whitespace-nowrap border-b border-divider/50">{s.name}</td>
                    <td className="px-3 py-2 text-text2 border-b border-divider/50">{s.use}</td>
                    <td className="px-3 py-2 text-text2 font-mono whitespace-nowrap border-b border-divider/50">{s.cadence}</td>
                    <td className="px-3 py-2 text-text3 border-b border-divider/50">{s.license}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title={m.s3title}>
          <p>
            Status is derived in{' '}
            <code className="font-mono text-accent text-[12px]">app/lib/api.ts → deriveStatus()</code>.
            Runs client-side on every data refresh using the latest timeline
            events and Brent price change.
          </p>

          <SubHeading>Step 1 — Keyword state detection</SubHeading>
          <CodeBlock>{`# Scan events from the past 72 hours
CLOSURE_PATTERNS = /closed|closure|shut down|blocked|blockade|suspended|halt/
PARTIAL_PATTERNS = /diverted|rerouted|delayed|evacuated|traffic disrupt/

if any recent event matches CLOSURE_PATTERNS → state = CLOSED
elif any recent event matches PARTIAL_PATTERNS → state = DISRUPTED
else → state = OPEN`}</CodeBlock>

          <SubHeading>Step 2 — Multi-signal Threat Score (0–100)</SubHeading>
          <CodeBlock>{`# Timeline Severity Score (last 24 h)
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
    state = DISRUPTED`}</CodeBlock>

          <SubHeading>Step 3 — Confidence</SubHeading>
          <CodeBlock>{`sources    = unique source names contributing to last24 events
confidence = min(0.99,
  0.55
  + 0.06 × |sources|
  + 0.02 × min(|last24|, 6)
)`}</CodeBlock>
        </Section>

        <Section title={m.s4title}>
          <p>
            The hero map renders two independent vessel layers:
          </p>
          <ul className="list-none space-y-2 pl-0">
            <li className="flex gap-2">
              <span className="text-accent font-mono text-[11px] mt-0.5">→</span>
              <span>
                <strong className="text-text">AIS live dots</strong> — real
                MMSI positions streamed from AISStream.io, refreshed every 15 s.
                Colour-coded by type. Shown only when the collector is active.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-text3 font-mono text-[11px] mt-0.5">→</span>
              <span>
                <strong className="text-text">PortWatch representative vessels</strong> — animated dots
                distributed along IMO TSS lanes, proportional to the latest daily
                transit count by type:{' '}
                <span className="text-[#C17F24] font-mono text-[11px]">tanker (amber)</span>,{' '}
                <span className="font-mono text-[11px]">cargo (sky)</span>,{' '}
                <span className="font-mono text-[11px]">container (purple)</span>,{' '}
                <span className="font-mono text-[11px]">dry bulk (slate)</span>.
                These are <em>illustrative</em> — not real GPS positions.
              </span>
            </li>
          </ul>
          <p>
            IMF PortWatch updates weekly (~Tuesdays 09:00 ET, 2–3 day lag).
            Chokepoint ID: <code className="font-mono text-accent text-[12px]">chokepoint6</code>.
            Historical baseline: ~34 transits/day.
          </p>
        </Section>

        <Section title={m.s5title}>
          <ul className="space-y-1.5 text-text2">
            {[
              ['Timeline / RSS aggregator', '60 s', '(KV cached)'],
              ['News (GDELT)', '5 min', '(KV cached)'],
              ['Brent · WTI · Henry Hub', '5 min', '(KV cached, EIA primary)'],
              ['IMF PortWatch transit counts', '6 h', '(KV cached)'],
              ['Weather (Open-Meteo)', '15 min', '(KV cached)'],
              ['AIS vessel positions', '15 s', '(live WebSocket, KV fallback)'],
              ['Feed health', '30 s', ''],
            ].map(([label, cadence, note]) => (
              <li key={label} className="flex items-baseline gap-3 text-[12px]">
                <span className="text-accent font-mono text-[9px]">—</span>
                <span className="text-text">{label}</span>
                <span className="font-mono text-accent text-[11px] ml-auto shrink-0">{cadence}</span>
                {note && <span className="text-text3 text-[10px] font-mono hidden sm:inline">{note}</span>}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-text3 font-mono mt-3">
            All routes run on Cloudflare Pages Functions (Edge Runtime) with
            Cloudflare KV caching.
          </p>
        </Section>

        <Section title={m.s6title}>
          <p>
            A read-only JSON API is available for embeds and partner integrations.
            CORS is allow-all; responses are cached at the edge.
          </p>
          <CodeBlock>{`GET /v1/status              # strait state, tension level, confidence, reason
GET /v1/events?limit=30     # latest aggregated timeline events
GET /v1/events?since=ISO    # incremental fetch since ISO timestamp
GET /v1/metrics             # markets (Brent/WTI/NG), weather, event counts
GET /feed.xml               # RSS 2.0 for journalists and aggregators`}</CodeBlock>
          <p className="text-[11px] text-text3 mt-3">
            License: CC-BY-4.0. Attribution: &ldquo;IsStraitHormuzOpen?&rdquo; with a link to{' '}
            <a
              href="https://strait-of-hormuz-monitor.pages.dev"
              className="text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              strait-of-hormuz-monitor.pages.dev
            </a>.
            {' '}Full interactive reference at{' '}
            <Link href="/docs" className="text-accent hover:underline">/docs</Link>.
          </p>
        </Section>

        <Section title={m.s7title}>
          <ul className="space-y-3">
            {[
              ['Keyword matching', 'Closure/disruption detection is regex-based. Ironic, quoted, or context-heavy headlines can produce false positives. Treat as directional signal only.'],
              ['AIS coverage gaps', 'AISStream.io free tier covers only vessels transmitting within range of terrestrial receivers. Military vessels, tankers in radio-quiet mode, and vessels in Iranian waters may be invisible.'],
              ['PortWatch lag', 'IMF data is 2–3 days lagged and updates weekly. Map vessels reflect the latest complete day, not today. They are illustrative, not real-time positions.'],
              ['Yahoo Finance rate limits', 'Unofficial endpoint; may return 429 under load. EIA is the primary crude source; FRED for Henry Hub. Yahoo is fallback only.'],
              ['RSS deduplication', 'URL-based. Near-duplicate stories from different outlets may appear separately.'],
            ].map(([title, desc]) => (
              <li key={title as string} className="border-l border-divider pl-4">
                <div className="text-[11px] font-mono font-semibold text-text uppercase tracking-[0.1em] mb-1">{title}</div>
                <div className="text-[12px] text-text2 leading-relaxed">{desc}</div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={m.s8title}>
          <ul className="space-y-4">
            {CHANGELOG.map((c) => (
              <li key={c.v} className="border-l-2 border-accent/40 pl-4">
                <div className="text-[10px] text-accent font-mono tracking-[0.1em]">
                  v{c.v} · {c.date}
                </div>
                <div className="text-[12px] text-text2 mt-1 leading-relaxed">{c.notes}</div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={m.s9title}>
          <p>
            This site provides information for situational awareness only. It
            is <strong>not</strong> navigational, financial, military, or
            operational advice. Always verify with official authorities (IMO,
            NAVCENT, UKMTO, port authorities, your insurer&apos;s war-risk cell)
            before making decisions. Threat scores are probabilistic outputs
            of an automated algorithm and do not represent a forecast of
            imminent events.
          </p>
        </Section>

        <footer
          className="mt-12 pt-6 border-t border-divider text-[10px] text-text3 font-mono flex flex-wrap gap-4 items-center justify-between"
          suppressHydrationWarning
        >
          <span>© {new Date().getFullYear()} IsStraitHormuzOpen?</span>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-accent transition-colors">{m.dashboard}</Link>
            <a href="/feed.xml" className="hover:text-accent transition-colors">RSS</a>
            <a href="/v1/status" className="hover:text-accent transition-colors">API</a>
            <Link href="/docs" className="hover:text-accent transition-colors">Docs</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="border-b border-divider pb-2 mb-4">
        <h2 className="font-headline font-black italic text-[24px] leading-none tracking-tight text-text">
          {title}
        </h2>
      </div>
      <div className="text-[13px] text-text2 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-mono font-semibold text-text uppercase tracking-[0.18em] mt-5 mb-2">
      {children}
    </h3>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="p-4 bg-bg1 border border-divider text-[11px] font-mono text-text2 overflow-x-auto leading-relaxed">
      {children}
    </pre>
  );
}
