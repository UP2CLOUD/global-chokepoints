import type { Metadata } from 'next';
import Link from 'next/link';
import CopyButton from './CopyButton';
import { SITE_URL } from '@/app/lib/constants';

export const metadata: Metadata = {
  title: 'API Docs — IsStraitHormuzOpen?',
  description:
    'Full reference for the IsStraitHormuzOpen? public API: strait status, event timeline, markets, weather, and vessel data. CC-BY-4.0.',
};

// ── Colour helpers ─────────────────────────────────────────────────────────────
function MethodBadge({ method }: { method: 'GET' | 'POST' }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest ${
        method === 'GET'
          ? 'bg-info/15 text-info border border-info/30'
          : 'bg-caution/15 text-caution border border-caution/30'
      }`}
    >
      {method}
    </span>
  );
}

function SeverityPill({ level, label }: { level: 'ok' | 'caution' | 'info' | 'neutral'; label: string }) {
  const cls = {
    ok:      'bg-ok/10 text-ok border-ok/25',
    caution: 'bg-caution/10 text-caution border-caution/25',
    info:    'bg-info/10 text-info border-info/25',
    neutral: 'bg-text4/20 text-text2 border-text4/30',
  }[level];
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${cls}`}>
      {label}
    </span>
  );
}

function Code({ children }: { children: string }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-bg1 border border-divider text-[12px] font-mono text-accent-hi">
      {children}
    </code>
  );
}

function Pre({ children, lang = 'bash' }: { children: string; lang?: string }) {
  return (
    <div className="relative group">
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg1/80 border border-divider rounded-t-lg border-b-0">
        <span className="text-[10px] font-mono text-text4 uppercase tracking-widest">{lang}</span>
        <CopyButton text={children} />
      </div>
      <pre className="p-4 bg-[#080B13] border border-divider rounded-b-lg text-[12px] font-mono leading-relaxed overflow-x-auto text-text2 scrollbar-thin">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl font-semibold tracking-tight text-text border-b border-divider pb-3 mb-5">
        {title}
      </h2>
      <div className="space-y-4 text-sm text-text2 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function EndpointCard({
  method,
  path,
  summary,
  description,
  badge,
  params,
  responseFields,
  curlExample,
  jsExample,
}: {
  method: 'GET' | 'POST';
  path: string;
  summary: string;
  description?: string;
  badge?: React.ReactNode;
  params?: { name: string; in: string; type: string; required?: boolean; desc: string }[];
  responseFields?: { name: string; type: string; desc: string }[];
  curlExample?: string;
  jsExample?: string;
}) {
  return (
    <div className="rounded-2xl border border-divider bg-card/60 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 bg-bg1/60 border-b border-divider">
        <MethodBadge method={method} />
        <code className="text-[13px] font-mono text-text font-medium">{path}</code>
        {badge}
        <span className="hidden sm:block text-text3 text-[12px]">—</span>
        <span className="text-[12px] text-text2">{summary}</span>
      </div>

      <div className="p-5 space-y-5">
        {description && <p className="text-[13px] text-text2">{description}</p>}

        {params && params.length > 0 && (
          <div>
            <h4 className="text-[11px] font-mono uppercase tracking-widest text-text3 mb-2">Parameters</h4>
            <table className="w-full text-[12px] border border-divider rounded-lg overflow-hidden">
              <thead className="bg-bg1/80 text-text3 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">In</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Required</th>
                  <th className="text-left px-3 py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {params.map((p) => (
                  <tr key={p.name} className="border-t border-divider">
                    <td className="px-3 py-2 font-mono text-accent-hi">{p.name}</td>
                    <td className="px-3 py-2 text-text3">{p.in}</td>
                    <td className="px-3 py-2 text-text3 font-mono">{p.type}</td>
                    <td className="px-3 py-2">
                      {p.required
                        ? <span className="text-danger text-[10px]">required</span>
                        : <span className="text-text4 text-[10px]">optional</span>}
                    </td>
                    <td className="px-3 py-2 text-text2">{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {responseFields && responseFields.length > 0 && (
          <div>
            <h4 className="text-[11px] font-mono uppercase tracking-widest text-text3 mb-2">Response fields</h4>
            <table className="w-full text-[12px] border border-divider rounded-lg overflow-hidden">
              <thead className="bg-bg1/80 text-text3 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2">Field</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {responseFields.map((f) => (
                  <tr key={f.name} className="border-t border-divider">
                    <td className="px-3 py-2 font-mono text-accent-hi">{f.name}</td>
                    <td className="px-3 py-2 text-text3 font-mono">{f.type}</td>
                    <td className="px-3 py-2 text-text2">{f.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(curlExample || jsExample) && (
          <div className="space-y-3">
            <h4 className="text-[11px] font-mono uppercase tracking-widest text-text3">Examples</h4>
            {curlExample && <Pre lang="bash">{curlExample}</Pre>}
            {jsExample && <Pre lang="javascript">{jsExample}</Pre>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Nav items ──────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview',   label: 'Overview' },
  { id: 'auth',       label: 'Authentication' },
  { id: 'public-api', label: 'Public v1 API' },
  { id: 'status',     label: '  GET /v1/status' },
  { id: 'events',     label: '  GET /v1/events' },
  { id: 'metrics',    label: '  GET /v1/metrics' },
  { id: 'feeds',      label: 'Data Feed Routes' },
  { id: 'subscribe',  label: 'Subscriptions' },
  { id: 'types',      label: 'Types reference' },
  { id: 'openapi',    label: 'OpenAPI spec' },
];

const SITE = SITE_URL;

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DocsPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Top bar */}
      <div className="border-b border-divider bg-bg1/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 h-12 flex items-center gap-4">
          <Link href="/" className="text-[11px] font-mono text-text3 hover:text-accent transition-colors tracking-[0.15em]">
            ← Dashboard
          </Link>
          <span className="text-text4">·</span>
          <span className="text-[11px] font-mono text-text2 tracking-[0.15em]">API DOCS</span>
          <div className="ml-auto flex items-center gap-3">
            <a
              href="/api/openapi"
              className="text-[10px] font-mono text-text3 hover:text-accent border border-divider/60 px-2.5 py-1 rounded hover:border-accent/30 transition-all"
            >
              openapi.json ↗
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-10 flex gap-10">

        {/* Sidebar — sticky on desktop */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-20 space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-widest text-text4 mb-3 px-2">Contents</p>
            {NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block text-[12px] font-mono text-text3 hover:text-accent transition-colors duration-120 py-0.5 px-2 rounded hover:bg-bg1/60"
              >
                {item.label}
              </a>
            ))}
            <div className="pt-4 border-t border-divider/40 mt-4">
              <a href="/methodology" className="block text-[12px] font-mono text-text3 hover:text-accent transition-colors py-0.5 px-2">
                Methodology ↗
              </a>
              <a href="/feed.xml" className="block text-[12px] font-mono text-text3 hover:text-accent transition-colors py-0.5 px-2">
                RSS feed ↗
              </a>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-14">

          {/* Hero */}
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-accent mb-3">
              <span className="w-1 h-4 bg-accent rounded-full" />
              Public API Reference
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
              IsStraitHormuzOpen? API
            </h1>
            <p className="text-text2 leading-relaxed max-w-2xl">
              Real-time JSON data on the operational status of the Strait of Hormuz.
              All <Code>/v1</Code> endpoints are public, CORS-open, and licensed under{' '}
              <a href="https://creativecommons.org/licenses/by/4.0/" className="text-accent hover:underline">CC-BY-4.0</a>.
              No API key required for most uses.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <SeverityPill level="ok"      label="CORS allow-all" />
              <SeverityPill level="info"    label="Edge cached" />
              <SeverityPill level="neutral" label="CC-BY-4.0" />
              <SeverityPill level="caution" label="No SDK — plain JSON" />
            </div>
          </div>

          {/* Overview */}
          <Section id="overview" title="Overview">
            <p>
              The API is deployed on <strong className="text-text">Cloudflare Pages Edge Workers</strong>.
              All routes run globally with no cold starts and multi-layer KV caching.
              The base URL is:
            </p>
            <Pre lang="text">{SITE}</Pre>

            <h3 className="text-text font-semibold text-sm mt-4 mb-1">Rate limits</h3>
            <p>
              There are no hard programmatic rate limits today. Cloudflare edge caching means most
              requests are served from cache within a 30–300 s TTL window; upstream sources are not
              hit per-request. Fair use is expected — treat each endpoint as a polling interval, not
              a real-time stream.
            </p>

            <h3 className="text-text font-semibold text-sm mt-4 mb-1">Attribution</h3>
            <p>
              When displaying data from <Code>/v1/*</Code> endpoints, include the attribution string
              from the <Code>license</Code> field: <em>&ldquo;IsStraitHormuzOpen?&rdquo;</em> with a
              link to <Code>{SITE}</Code>.
            </p>

            <h3 className="text-text font-semibold text-sm mt-4 mb-1">Route families</h3>
            <table className="w-full text-[12px] border border-divider rounded-lg overflow-hidden">
              <thead className="bg-bg1 text-text3 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2">Prefix</th>
                  <th className="text-left px-3 py-2">Purpose</th>
                  <th className="text-left px-3 py-2">Auth</th>
                  <th className="text-left px-3 py-2">CORS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['/v1/*',   'Public intelligence API',         'Optional key', 'Allow-all'],
                  ['/api/*',  'Internal dashboard data feeds',   'None',         'Same-origin'],
                  ['/feed.xml', 'RSS 2.0 event feed',            'None',         'Allow-all'],
                ].map(([prefix, purpose, auth, cors]) => (
                  <tr key={prefix} className="border-t border-divider">
                    <td className="px-3 py-2 font-mono text-accent-hi">{prefix}</td>
                    <td className="px-3 py-2 text-text2">{purpose}</td>
                    <td className="px-3 py-2 text-text3">{auth}</td>
                    <td className="px-3 py-2 text-text3">{cors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* Auth */}
          <Section id="auth" title="Authentication">
            <p>
              <Code>GET</Code> requests to <Code>/v1/*</Code> are <strong className="text-text">always public</strong> —
              no key, no header, no signup. CORS preflight (<Code>OPTIONS</Code>) and <Code>HEAD</Code> are also unauthenticated.
            </p>
            <p>
              Authentication only applies to non-GET methods on <Code>/v1/*</Code> and is enforced only when
              the deployment&apos;s <Code>V1_API_KEY</Code> environment variable is set. If a key is required, send it in either form:
            </p>
            <Pre lang="bash">{`# Option A — x-api-key header
curl -X POST -H "x-api-key: YOUR_KEY" ${SITE}/v1/...

# Option B — Bearer token
curl -X POST -H "Authorization: Bearer YOUR_KEY" ${SITE}/v1/...`}</Pre>
            <p>
              Requests without a valid key on a gated method receive <Code>401 Unauthorized</Code>.
              Internal <Code>/api/*</Code> routes are always same-origin and have no key requirement.
            </p>
          </Section>

          {/* Public v1 */}
          <Section id="public-api" title="Public v1 API">
            <p>
              Three endpoints provide everything needed to build embeds, dashboards, or
              alerting integrations. All responses include a <Code>license</Code> field
              and a <Code>docs</Code> pointer back to <Code>/methodology</Code>.
            </p>
          </Section>

          {/* v1/status */}
          <div id="status" className="scroll-mt-20">
            <EndpointCard
              method="GET"
              path="/v1/status"
              summary="Current strait status"
              badge={<SeverityPill level="info" label="30 s cache" />}
              description="The primary endpoint. Returns the computed operational state (OPEN / PARTIALLY_CLOSED / CLOSED), a 0–100 threat score, confidence value, and a human-readable reason string."
              responseFields={[
                { name: 'state',        type: 'enum',    desc: 'OPEN | PARTIALLY_CLOSED | CLOSED' },
                { name: 'tensionLevel', type: 'enum',    desc: 'NORMAL | ELEVATED | CRITICAL' },
                { name: 'tensionIndex', type: 'integer', desc: '0–100 composite threat score (see /methodology)' },
                { name: 'confidence',   type: 'number',  desc: '0..1 based on source diversity and event density' },
                { name: 'reason',       type: 'string',  desc: 'Human-readable explanation of current state' },
                { name: 'reasonUrl',    type: 'string?', desc: 'URL of the driving source article, if any' },
                { name: 'brent',        type: 'object?', desc: '{ price, change, changePercent } — null if feed is down' },
                { name: 'events24h',    type: 'integer', desc: 'Distinct classified events in the past 24 hours' },
                { name: 'asOf',         type: 'ISO 8601',desc: 'Timestamp of this computation' },
                { name: 'sources',      type: 'string[]',desc: 'Source names contributing to current state' },
              ]}
              curlExample={`curl ${SITE}/v1/status`}
              jsExample={`const res  = await fetch('${SITE}/v1/status');
const data = await res.json();

console.log(data.state);        // "OPEN"
console.log(data.tensionIndex); // 42
console.log(data.reason);       // "Maritime traffic operational. ..."`}
            />
          </div>

          {/* v1/events */}
          <div id="events" className="scroll-mt-20">
            <EndpointCard
              method="GET"
              path="/v1/events"
              summary="Geopolitical event timeline"
              badge={<SeverityPill level="info" label="60 s cache" />}
              description="Classified events aggregated from CNN, BBC, Al Jazeera, Reuters (via Google News), and Google News RSS. Events are filtered by Hormuz/Iran/maritime keywords and scored by severity."
              params={[
                { name: 'limit', in: 'query', type: 'integer', desc: 'Max events to return (1–100, default 30)' },
                { name: 'since', in: 'query', type: 'ISO 8601', desc: 'Return only events at or after this timestamp — useful for incremental polling' },
              ]}
              responseFields={[
                { name: 'events[].id',          type: 'string',   desc: 'Unique event identifier (URL-derived hash)' },
                { name: 'events[].date',         type: 'ISO 8601', desc: 'Event publication timestamp' },
                { name: 'events[].title',        type: 'string',   desc: 'Headline' },
                { name: 'events[].description',  type: 'string',   desc: 'Lead paragraph or snippet' },
                { name: 'events[].category',     type: 'enum',     desc: 'incident | military | diplomatic | economic' },
                { name: 'events[].severity',     type: 'enum',     desc: 'low | medium | high | critical' },
                { name: 'events[].source',       type: 'string',   desc: 'Publisher name (e.g. "BBC")' },
                { name: 'events[].url',          type: 'string',   desc: 'Original article URL' },
                { name: 'count',                 type: 'integer',  desc: 'Total events returned' },
                { name: 'generatedAt',           type: 'ISO 8601', desc: 'Response generation time' },
              ]}
              curlExample={`# Latest 10 events
curl "${SITE}/v1/events?limit=10"

# Incremental poll — events since last check
curl "${SITE}/v1/events?since=2026-05-14T06:00:00Z"`}
              jsExample={`// Incremental polling
let cursor = new Date(Date.now() - 60_000).toISOString();

setInterval(async () => {
  const url = \`${SITE}/v1/events?limit=20&since=\${cursor}\`;
  const { events, generatedAt } = await fetch(url).then(r => r.json());
  cursor = generatedAt;
  events.forEach(e => console.log(e.severity, e.title));
}, 60_000);`}
            />
          </div>

          {/* v1/metrics */}
          <div id="metrics" className="scroll-mt-20">
            <EndpointCard
              method="GET"
              path="/v1/metrics"
              summary="Markets, weather and event metrics"
              badge={<SeverityPill level="info" label="60 s cache" />}
              description="Aggregates Brent crude, WTI, Henry Hub natural gas, marine weather at Bandar Abbas, and 24-hour event delta. Any subsystem that is unreachable returns null rather than failing the whole response."
              responseFields={[
                { name: 'markets.brent',       type: 'Ticker|null',  desc: 'Brent crude (USD/bbl). See Ticker type below.' },
                { name: 'markets.wti',         type: 'Ticker|null',  desc: 'West Texas Intermediate (USD/bbl)' },
                { name: 'markets.natgas',      type: 'Ticker|null',  desc: 'Henry Hub natural gas (USD/MMBtu)' },
                { name: 'weather.temperatureC',type: 'number',       desc: 'Air temperature at Bandar Abbas approach (°C)' },
                { name: 'weather.wind',        type: 'object',       desc: '{ speedKn, direction, directionDeg }' },
                { name: 'weather.sea',         type: 'object',       desc: '{ waveHeightM, wavePeriodS, windWaveM, swellM }' },
                { name: 'weather.navRisk',     type: 'number',       desc: '0–100 navigational risk composite' },
                { name: 'weather.navRiskLabel',type: 'enum',         desc: 'CALM | MODERATE | ROUGH | SEVERE' },
                { name: 'events.last24h',      type: 'integer',      desc: 'Classified events in the past 24 hours' },
                { name: 'events.prev24h',      type: 'integer',      desc: 'Events in the preceding 24-hour window' },
                { name: 'events.delta',        type: 'integer',      desc: 'Difference: last24h − prev24h' },
              ]}
              curlExample={`curl ${SITE}/v1/metrics`}
              jsExample={`const { markets, weather, events } = await fetch('${SITE}/v1/metrics').then(r => r.json());

if (markets?.brent) {
  console.log(\`Brent: \$\{markets.brent.price\} (\$\{markets.brent.changePercent\}%)\`);
}
if (weather) {
  console.log(\`Wind: \$\{weather.wind.speedKn\}kn \$\{weather.wind.direction\} · NavRisk: \$\{weather.navRiskLabel\}\`);
}`}
            />
          </div>

          {/* Data feed routes */}
          <Section id="feeds" title="Data Feed Routes">
            <p>
              These routes are used by the dashboard internally and are <strong className="text-text">same-origin by default</strong>.
              They are documented here for transparency and local development. Each one implements
              a multi-source fallback chain — they never return <Code>502</Code> while any cached
              data exists.
            </p>

            <table className="w-full text-[12px] border border-divider rounded-lg overflow-hidden mt-2">
              <thead className="bg-bg1 text-text3 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2">Route</th>
                  <th className="text-left px-3 py-2">Sources (priority order)</th>
                  <th className="text-left px-3 py-2">Cache TTL</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['/api/brent',     'Yahoo Finance → Stooq CSV → EIA → module cache → KV', '5 min'],
                  ['/api/markets',   'EIA (Brent/WTI) + FRED (Henry Hub) → Yahoo Finance',  '5 min'],
                  ['/api/timeline',  '7 RSS feeds (CNN, BBC, Al Jazeera, Google News) → KV', '60 s'],
                  ['/api/news',      'GDELT v2 Doc API → KV fallback',                       '5 min'],
                  ['/api/weather',   'Open-Meteo Forecast + Marine → KV',                   '15 min'],
                  ['/api/vessels',   'data/vessels.json (AIS sidecar) → KV fallback',        '2 min'],
                  ['/api/portwatch', 'IMF PortWatch → KV',                                   '6 h'],
                  ['/api/health',    'Parallel probes (Yahoo, GDELT, RSS, Open-Meteo)',       '30 s'],
                ].map(([route, sources, ttl]) => (
                  <tr key={route as string} className="border-t border-divider">
                    <td className="px-3 py-2 font-mono text-accent-hi">{route}</td>
                    <td className="px-3 py-2 text-text2">{sources}</td>
                    <td className="px-3 py-2 text-text3 font-mono">{ttl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* Subscriptions */}
          <Section id="subscribe" title="Subscriptions">
            <p>
              Users can subscribe to receive an email when the strait state changes (e.g. OPEN → PARTIALLY_CLOSED).
              The alert system uses Cloudflare D1 for storage and Resend for transactional email.
            </p>
            <div className="space-y-3 mt-2">
              <EndpointCard
                method="POST"
                path="/api/subscribe"
                summary="Register email for status alerts"
                description="Inserts an unconfirmed subscription and sends a confirmation email. Idempotent for unconfirmed addresses — resends the confirmation link."
                params={[
                  { name: 'email',          in: 'body', type: 'string',  required: true,  desc: 'Email address to subscribe' },
                  { name: 'turnstileToken', in: 'body', type: 'string',  required: false, desc: 'Cloudflare Turnstile token — required when TURNSTILE_SECRET_KEY is configured' },
                ]}
                curlExample={`curl -X POST ${SITE}/api/subscribe \\
  -H "Content-Type: application/json" \\
  -d '{"email": "you@example.com"}'`}
              />
              <div className="text-[12px] text-text3 space-y-1">
                <p><Code>GET /api/confirm?token=&lt;token&gt;</Code> — confirms subscription; redirects to <Code>/?subscribed=1</Code></p>
                <p><Code>GET /api/unsubscribe?token=&lt;token&gt;</Code> — deletes subscription; redirects to <Code>/?unsubscribed=1</Code></p>
              </div>
            </div>
          </Section>

          {/* Types reference */}
          <Section id="types" title="Types reference">
            <h3 className="text-text font-semibold mb-2">StraitStatus</h3>
            <Pre lang="typescript">{`type StraitStatus =
  | 'OPEN'             // traffic operating normally
  | 'PARTIALLY_CLOSED' // disruption, diversion, or elevated incident signals
  | 'CLOSED'           // closure keyword detected in recent event headlines`}</Pre>

            <h3 className="text-text font-semibold mt-5 mb-2">TensionLevel &amp; threat score</h3>
            <Pre lang="typescript">{`type TensionLevel = 'NORMAL' | 'ELEVATED' | 'CRITICAL'

// tensionIndex is a 0–100 composite:
//   timeline_score (50%) — severity-weighted events in the last 24 h
//   market_score   (50%) — Brent Δ% mapped to 0–100 above +2%

// Thresholds
// tensionIndex >= 80 or state === 'CLOSED'  → CRITICAL
// tensionIndex >= 40 or state !== 'OPEN'    → ELEVATED
// otherwise                                 → NORMAL`}</Pre>

            <h3 className="text-text font-semibold mt-5 mb-2">TimelineEvent</h3>
            <Pre lang="typescript">{`interface TimelineEvent {
  id:          string
  date:        string       // ISO 8601
  title:       string
  description: string
  category:    'incident' | 'military' | 'diplomatic' | 'economic'
  severity:    'low' | 'medium' | 'high' | 'critical'
  source:      string       // publisher name, e.g. "BBC"
  url?:        string       // original article URL
}`}</Pre>

            <h3 className="text-text font-semibold mt-5 mb-2">Ticker (markets)</h3>
            <Pre lang="typescript">{`interface Ticker {
  price:         number
  change:        number
  changePercent: number
  history:       { date: string; price: number }[]  // 7-day spark
  asOf:          string       // ISO 8601
  label:         string       // e.g. "Brent Crude"
  symbol:        string       // e.g. "BZ=F"
  unit:          string       // e.g. "USD/bbl"
  provider:      string
  stale?:        boolean
  error?:        string
}`}</Pre>
          </Section>

          {/* OpenAPI */}
          <Section id="openapi" title="OpenAPI specification">
            <p>
              A machine-readable <a href="https://spec.openapis.org/oas/v3.0.3" className="text-accent hover:underline">OpenAPI 3.0.3</a> spec
              is served at <Code>/api/openapi</Code>. It can be imported into Postman, Insomnia, or any OpenAPI-compatible tool.
            </p>
            <Pre lang="bash">{`# Download spec
curl ${SITE}/api/openapi -o openapi.json

# Import into Postman (CLI)
postman import openapi.json`}</Pre>
            <p className="text-[12px] text-text3 mt-1">
              The spec is regenerated on each deploy and cached for 1 hour at the edge.
            </p>
          </Section>

          {/* Footer */}
          <footer className="pt-8 border-t border-divider text-[11px] font-mono text-text4">
            <div className="flex flex-wrap gap-4 items-center">
              <span suppressHydrationWarning>© {new Date().getFullYear()} IsStraitHormuzOpen?</span>
              <Link href="/" className="hover:text-accent transition-colors">Dashboard</Link>
              <Link href="/methodology" className="hover:text-accent transition-colors">Methodology</Link>
              <a href="/feed.xml" className="hover:text-accent transition-colors">RSS</a>
              <a href="/api/openapi" className="hover:text-accent transition-colors">openapi.json</a>
            </div>
          </footer>

        </main>
      </div>
    </div>
  );
}
