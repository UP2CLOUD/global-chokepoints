// ============================================================
// /api/og — Dynamic Open Graph image (1200x630) with i18n
// Accepts ?lang=en|pt|es|fr|it|ru for localized text.
// ============================================================
export const runtime = 'edge';
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { translations, LANG_LOCALE } from '@/app/lib/translations';
import type { Lang } from '@/app/lib/types';

export const revalidate = 300;

const VALID_LANGS: Lang[] = ['en', 'pt', 'es', 'fr', 'it', 'ru'];

function answerFor(state: string, t: typeof translations.en): {
  word: string; color: string; sub: string; question: string;
} {
  const s = state.toUpperCase();
  if (s === 'OPEN')
    return { word: t.hero.answerYes, color: '#10B981', sub: t.hero.straitOpen.toUpperCase(), question: t.hero.question };
  if (s === 'PARTIALLY_CLOSED' || s === 'DISRUPTED')
    return { word: t.hero.answerDisrupted, color: '#F59E0B', sub: t.hero.trafficDisrupted.toUpperCase(), question: t.hero.question };
  return { word: t.hero.answerNo, color: '#EF4444', sub: t.hero.straitClosed.toUpperCase(), question: t.hero.questionClosed };
}

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const rawLang = u.searchParams.get('lang') ?? 'en';
  const lang: Lang = VALID_LANGS.includes(rawLang as Lang) ? (rawLang as Lang) : 'en';
  const state = (u.searchParams.get('state') || 'OPEN').toUpperCase();
  const brent = u.searchParams.get('brent') || '—';
  const tension = u.searchParams.get('tension') || '—';
  const updated = u.searchParams.get('asof') || new Date().toISOString();

  const t = translations[lang] as typeof translations.en;
  const locale = LANG_LOCALE[lang];
  const { word, color, sub, question } = answerFor(state, t);

  const dateStr = new Date(updated).toLocaleString(locale, {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          background: 'linear-gradient(135deg, #07090F 0%, #0B0F18 60%, #131826 100%)',
          color: '#E6ECF3',
          fontFamily: 'monospace',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 9999, background: color }} />
            <span style={{ fontSize: 22, letterSpacing: 2, color: '#06B6D4', textTransform: 'uppercase', fontWeight: 600 }}>
              IsStraitHormuzOpen? · {t.header.subtitle}
            </span>
          </div>
          <span style={{ color: '#4B5563', fontSize: 16 }}>{dateStr}</span>
        </div>

        {/* Main answer */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', paddingTop: 16 }}>
          <div style={{ fontSize: 32, color: '#9CA3AF', marginBottom: 12, letterSpacing: 1 }}>
            {question}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 32 }}>
            <div
              style={{
                fontSize: 220,
                fontWeight: 900,
                letterSpacing: -8,
                color,
                lineHeight: 1,
                textShadow: `0 0 80px ${color}40`,
              }}
            >
              {word}
            </div>
            {/* Tension bar on the right */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, paddingBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#6B7787', textTransform: 'uppercase', letterSpacing: 2 }}>
                {t.hero.tensionLabel}
              </div>
              <div style={{ fontSize: 48, fontWeight: 700, color: '#E6ECF3' }}>{tension}<span style={{ fontSize: 22, color: '#6B7787' }}>/100</span></div>
              <div style={{ width: 120, height: 6, background: '#1E2533', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, Number(tension) || 0)}%`, height: '100%', background: color, borderRadius: 3 }} />
              </div>
            </div>
          </div>
          <div style={{ fontSize: 20, color: '#6B7787', marginTop: 8, letterSpacing: 3, textTransform: 'uppercase' }}>
            {sub}
          </div>
        </div>

        {/* Footer bar */}
        <div
          style={{
            display: 'flex',
            gap: 48,
            paddingTop: 20,
            borderTop: '1px solid #1E2533',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: '#6B7787', fontSize: 13, textTransform: 'uppercase', letterSpacing: 2 }}>
              {t.metrics.brent}
            </span>
            <span style={{ color: '#E6ECF3', fontSize: 26 }}>${brent}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: '#6B7787', fontSize: 13, textTransform: 'uppercase', letterSpacing: 2 }}>
              {t.hero.tensionLabel}
            </span>
            <span style={{ color: '#E6ECF3', fontSize: 26 }}>{tension}/100</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, color: '#6B7787', fontSize: 18 }}>
            <div style={{ width: 10, height: 10, borderRadius: 9999, background: color }} />
            strait-of-hormuz-monitor.pages.dev
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
