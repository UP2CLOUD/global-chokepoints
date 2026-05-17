// ============================================================
// /api/og — Dynamic Open Graph image (1200x630)
// When called without ?state/brent/tension params (e.g. from social
// media scrapers), the route self-fetches /v1/status and /v1/metrics
// to display live data. Explicit params always take precedence.
// Accepts ?lang=en|pt|es|fr|it|ru for localised text.
// ============================================================
export const runtime = 'edge';
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { translations, LANG_LOCALE } from '@/app/lib/translations';
import type { Lang } from '@/app/lib/types';

// Cache for 2 minutes so social scrapers get reasonably fresh data
// while not hammering /v1/status on every share.
export const revalidate = 120;

const VALID_LANGS: Lang[] = ['en', 'pt', 'es', 'fr', 'it', 'ru'];

function answerFor(state: string, t: typeof translations.en): {
  word: string; color: string; sub: string; question: string; glow: string;
} {
  const s = state.toUpperCase();
  if (s === 'OPEN')
    return { word: t.hero.answerYes, color: '#10B981', glow: '#10B98133', sub: t.hero.straitOpen.toUpperCase(), question: t.hero.question };
  if (s === 'PARTIALLY_CLOSED' || s === 'DISRUPTED')
    return { word: t.hero.answerDisrupted, color: '#F59E0B', glow: '#F59E0B33', sub: t.hero.trafficDisrupted.toUpperCase(), question: t.hero.question };
  return { word: t.hero.answerNo, color: '#EF4444', glow: '#EF444433', sub: t.hero.straitClosed.toUpperCase(), question: t.hero.questionClosed };
}

async function fetchLiveData(baseUrl: string): Promise<{ state: string; brent: string; tension: string }> {
  try {
    const [statusRes, metricsRes] = await Promise.allSettled([
      fetch(`${baseUrl}/v1/status`, { signal: AbortSignal.timeout(3000) }),
      fetch(`${baseUrl}/v1/metrics`, { signal: AbortSignal.timeout(3000) }),
    ]);

    let state = 'OPEN', brent = '—', tension = '—';

    if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
      const json = await statusRes.value.json() as { state?: string; tensionIndex?: number };
      if (json.state) state = json.state;
      if (json.tensionIndex != null) tension = String(Math.round(json.tensionIndex));
    }
    if (metricsRes.status === 'fulfilled' && metricsRes.value.ok) {
      const json = await metricsRes.value.json() as { markets?: { brent?: { price?: number } } };
      if (json.markets?.brent?.price != null) brent = json.markets.brent.price.toFixed(2);
    }

    return { state, brent, tension };
  } catch {
    return { state: 'OPEN', brent: '—', tension: '—' };
  }
}

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const rawLang = u.searchParams.get('lang') ?? 'en';
  const lang: Lang = VALID_LANGS.includes(rawLang as Lang) ? (rawLang as Lang) : 'en';

  // If explicit params present use them; otherwise fetch live data
  const hasExplicit = u.searchParams.has('state');
  let state: string, brent: string, tension: string;

  if (hasExplicit) {
    state   = (u.searchParams.get('state') || 'OPEN').toUpperCase();
    brent   = u.searchParams.get('brent') || '—';
    tension = u.searchParams.get('tension') || '—';
  } else {
    const live = await fetchLiveData(`${u.protocol}//${u.host}`);
    state   = live.state;
    brent   = live.brent;
    tension = live.tension;
  }

  const t = translations[lang] as typeof translations.en;
  const locale = LANG_LOCALE[lang];
  const { word, color, glow, sub, question } = answerFor(state, t);

  const now = new Date().toLocaleString(locale, {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
  });

  const tensionNum = Math.min(100, Math.max(0, Number(tension) || 0));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#07090F',
          color: '#E6ECF3',
          fontFamily: 'monospace',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: -120,
            width: 600,
            height: 600,
            borderRadius: 9999,
            background: glow,
            filter: 'blur(80px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            right: -80,
            width: 400,
            height: 400,
            borderRadius: 9999,
            background: '#06B6D41A',
            filter: 'blur(60px)',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: '52px 60px',
            position: 'relative',
          }}
        >
          {/* Top row: brand + date */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 9999,
                  background: color,
                  boxShadow: `0 0 12px ${color}`,
                }}
              />
              <span
                style={{
                  fontSize: 18,
                  letterSpacing: 2,
                  color: '#06B6D4',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                IsStraitHormuzOpen?
              </span>
              <span style={{ fontSize: 14, color: '#4B5563', letterSpacing: 1 }}>
                · {t.header.subtitle}
              </span>
            </div>
            <span style={{ fontSize: 13, color: '#4B5563', letterSpacing: 0.5 }}>{now}</span>
          </div>

          {/* Middle: question + big answer */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: 0 }}>
            <div
              style={{
                fontSize: 24,
                color: '#9CA3AF',
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              {question}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              {/* Big YES / NO */}
              <div
                style={{
                  fontSize: 180,
                  fontWeight: 900,
                  color,
                  lineHeight: 0.9,
                  letterSpacing: -6,
                  textShadow: `0 0 60px ${color}55`,
                }}
              >
                {word}
              </div>

              {/* Right column: tension + Brent */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 20,
                  paddingBottom: 12,
                }}
              >
                {/* Tension */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#6B7787',
                      textTransform: 'uppercase',
                      letterSpacing: 3,
                    }}
                  >
                    {t.hero.tensionLabel}
                  </span>
                  <span style={{ fontSize: 52, fontWeight: 700, color: '#E6ECF3', lineHeight: 1 }}>
                    {tension}
                    <span style={{ fontSize: 22, color: '#6B7787' }}>/100</span>
                  </span>
                  <div
                    style={{
                      width: 140,
                      height: 6,
                      background: '#1E2533',
                      borderRadius: 3,
                      overflow: 'hidden',
                      display: 'flex',
                    }}
                  >
                    <div
                      style={{
                        width: `${tensionNum}%`,
                        height: '100%',
                        background: color,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>

                {/* Brent */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#6B7787',
                      textTransform: 'uppercase',
                      letterSpacing: 3,
                    }}
                  >
                    {t.metrics.brent}
                  </span>
                  <span style={{ fontSize: 36, color: '#E6ECF3', lineHeight: 1 }}>${brent}</span>
                </div>
              </div>
            </div>

            {/* Status sub-label */}
            <div
              style={{
                fontSize: 18,
                color,
                letterSpacing: 4,
                textTransform: 'uppercase',
                marginTop: 4,
                opacity: 0.85,
              }}
            >
              {sub}
            </div>
          </div>

          {/* Bottom row: stats bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 18,
              borderTop: '1px solid #1E2533',
            }}
          >
            <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 10, color: '#4B5563', textTransform: 'uppercase', letterSpacing: 2 }}>
                  21 Mb/d
                </span>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>of world oil flows</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 10, color: '#4B5563', textTransform: 'uppercase', letterSpacing: 2 }}>
                  5,000+ vessels/yr
                </span>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>transit annually</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 10, color: '#4B5563', textTransform: 'uppercase', letterSpacing: 2 }}>
                  30% of LNG trade
                </span>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>by volume</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4B5563', fontSize: 14 }}>
              <div style={{ width: 8, height: 8, borderRadius: 9999, background: '#06B6D4' }} />
              strait-of-hormuz-monitor.pages.dev
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
