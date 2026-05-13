import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Methodology — IsStraitHormuzOpen?',
  description:
    'How IsStraitHormuzOpen? computes the Strait of Hormuz state: sources, formulas, refresh cadence, limitations, and change log.',
};

const SOURCES = [
  { name: 'Yahoo Finance', use: 'Brent crude (BZ=F), WTI (CL=F), Henry Hub (NG=F)', cadence: '5 min', license: 'Public unofficial endpoint; replace with EIA/ICE for production.' },
  { name: 'GDELT v2 Doc API', use: 'Global news article discovery', cadence: '5 min', license: 'Free; attribution requested.' },
  { name: 'CNN RSS', use: 'World + Middle East headlines', cadence: '60 s', license: 'Public RSS; headlines + links only.' },
  { name: 'BBC RSS', use: 'World + Middle East headlines', cadence: '60 s', license: 'Public RSS; headlines + links only.' },
  { name: 'Al Jazeera RSS', use: 'Headlines + summaries', cadence: '60 s', license: 'Public RSS.' },
  { name: 'Reuters (via Google News mirror)', use: 'Headlines + links', cadence: '60 s', license: 'Reuters direct RSS is paid; mirror is fair-use headline aggregation.' },
  { name: 'Open-Meteo', use: 'Wind, visibility, wave height at 26.5°N 56.4°E', cadence: '15 min', license: 'CC-BY-4.0; no key required.' },
];

const CHANGELOG = [
  { v: '0.2.0', date: '2026-05-12', notes: 'Live data architecture: API routes, RSS aggregator, status derivation, public /v1 API, RSS feed, methodology page.' },
  { v: '0.1.0', date: '2026-05-11', notes: 'Initial Next.js port of the static dashboard; visual + i18n only.' },
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
          operational state of the Strait of Hormuz. Every number on the
          page is computed from a documented source on a documented cadence.
          This page explains how.
        </p>

        <Section title="1. What we measure">
          <p>
            The headline output is the <strong>Strait State</strong>: one of{' '}
            <code>OPEN</code>, <code>DISRUPTED</code>, or <code>CLOSED</code>.
            It is derived in real time from the most recent 72 hours of news,
            weighted by severity, plus the day&apos;s Brent crude move.
          </p>
          <p>
            Alongside the state we publish a <strong>Tension Level</strong>{' '}
            (NORMAL / ELEVATED / CRITICAL) and an <strong>analyst
            confidence</strong> score in [0, 1] that grows with source
            diversity and event density.
          </p>
        </Section>

        <Section title="2. Sources">
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
                    <td className="px-3 py-2 font-medium">{s.name}</td>
                    <td className="px-3 py-2 text-[#A9B4C2]">{s.use}</td>
                    <td className="px-3 py-2 text-[#A9B4C2] font-mono">{s.cadence}</td>
                    <td className="px-3 py-2 text-[#6B7787]">{s.license}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="3. How status is computed">
          <p>
            The function lives in <code>app/lib/api.ts</code> as{' '}
            <code>deriveStatus()</code>. Pseudocode:
          </p>
          <pre className="mt-3 p-4 bg-[#0B0F18] border border-[#1E2533] rounded-lg text-[12px] overflow-x-auto leading-relaxed">{`recent  = events in past 72h
last24  = events in past 24h

# State
if recent matches /closed|closure|blocked|suspended|halted/  -> CLOSED
elif recent matches /diverted|rerouted|delayed|evacuated/    -> DISRUPTED
else                                                          -> OPEN

# Tension
weight = { low: 1, medium: 2, high: 4, critical: 7 }
score  = sum(weight[e.severity] for e in last24)
if |brent_change_pct| >= 3:  score += 4
if score >= 14 or state != OPEN: tensionLevel = CRITICAL
elif score >= 5:                  tensionLevel = ELEVATED
else:                              tensionLevel = NORMAL

# Confidence
sources    = unique(e.source for e in last24)
confidence = min(0.99, 0.55 + 0.06 * |sources| + 0.02 * min(|last24|, 6))`}</pre>
        </Section>

        <Section title="4. Refresh cadence">
          <ul className="list-disc list-inside space-y-1 text-[#A9B4C2]">
            <li>Timeline / RSS aggregator — <strong>every 60 seconds</strong></li>
            <li>News (GDELT) — every 5 minutes</li>
            <li>Brent / WTI / Henry Hub — every 5 minutes</li>
            <li>Weather (Open-Meteo) — every 15 minutes</li>
            <li>Feed health — every 30 seconds</li>
          </ul>
        </Section>

        <Section title="5. Public API">
          <p>
            A read-only JSON API is available for embeds and partner sites.
            CORS is allow-all and responses are cached at the edge.
          </p>
          <pre className="mt-3 p-4 bg-[#0B0F18] border border-[#1E2533] rounded-lg text-[12px] overflow-x-auto leading-relaxed">{`GET /v1/status              # headline state, tension, confidence
GET /v1/events?limit=30     # latest aggregated events
GET /v1/events?since=ISO    # incremental fetch
GET /v1/metrics             # markets, weather, event counts
GET /feed.xml               # RSS 2.0 for journalists`}</pre>
          <p className="mt-3 text-[#6B7787] text-sm">
            License: CC-BY-4.0. Attribution required as &ldquo;IsStraitHormuzOpen?&rdquo; with
            a link back.
          </p>
        </Section>

        <Section title="6. Known limitations">
          <ul className="list-disc list-inside space-y-1 text-[#A9B4C2]">
            <li>
              Real-time AIS (vessel positions) requires a paid feed; the map
              currently uses a simulated shipping-lane animation and is
              explicitly labelled as such.
            </li>
            <li>
              Sentiment is a keyword-matching heuristic. It can mislabel ironic
              or quoted headlines. Treat as a directional signal, not an
              editorial judgement.
            </li>
            <li>
              RSS deduplication is URL-based; near-duplicate stories from
              different outlets may still appear separately.
            </li>
            <li>
              Yahoo Finance is an unofficial endpoint and may rate-limit
              during very high traffic. EIA / ICE replacement is on the V2
              roadmap.
            </li>
          </ul>
        </Section>

        <Section title="7. Change log">
          <ul className="space-y-2">
            {CHANGELOG.map((c) => (
              <li key={c.v} className="border-l-2 border-[#06B6D4]/50 pl-3">
                <div className="text-[11px] text-[#06B6D4] font-mono">
                  v{c.v} · {c.date}
                </div>
                <div className="text-[#A9B4C2] text-sm">{c.notes}</div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="8. Disclaimer">
          <p className="text-[#A9B4C2]">
            This site provides information for situational awareness only. It
            is <strong>not</strong> navigational, financial, military or
            operational advice. Always verify with official authorities (IMO,
            NAVCENT, UKMTO, port authorities, your insurer&apos;s war-risk
            cell) before making decisions. Predictions are probabilistic and
            do not represent a forecast of imminent events.
          </p>
        </Section>

        <Section title="9. Contact">
          <p className="text-[#A9B4C2]">
            Corrections, source suggestions, takedowns, press enquiries:{' '}
            <a
              className="text-[#06B6D4] hover:underline"
              href="mailto:contact@ishormuzopen.example"
            >
              contact@ishormuzopen.example
            </a>
          </p>
        </Section>

        <footer className="mt-12 pt-6 border-t border-[#1E2533] text-[11px] text-[#6B7787] font-mono">
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
      <h2 className="text-lg font-semibold tracking-tight text-[#E6ECF3]">
        {title}
      </h2>
      <div className="mt-3 text-[#A9B4C2] leading-relaxed space-y-3 text-sm">
        {children}
      </div>
    </section>
  );
}
