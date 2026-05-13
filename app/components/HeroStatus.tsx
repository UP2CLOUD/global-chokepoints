'use client';

import { StatusData } from '@/app/lib/types';
import { useLang } from './LangContext';
import { fmtTime } from '@/app/lib/utils';
import { Shield, Clock, ExternalLink, Info } from 'lucide-react';

interface Props {
  status: StatusData;
}

/**
 * The site is "IsStraitHormuzOpen?". Headline answer:
 *
 *   state OPEN                → YES   (the strait is open)
 *   state CLOSED              → NO    (the strait is not open)
 *   state PARTIALLY_CLOSED    → DISRUPTED
 *
 * Canonical state value (used by /v1/status, the OG image, etc.)
 * stays unchanged. Only the displayed glyph changes.
 */
function displayAnswer(state: StatusData['state']): {
  word: 'YES' | 'NO' | 'DISRUPTED';
  tone: 'danger' | 'ok' | 'caution';
} {
  if (state === 'OPEN') return { word: 'YES', tone: 'ok' };
  if (state === 'CLOSED') return { word: 'NO', tone: 'danger' };
  return { word: 'DISRUPTED', tone: 'caution' };
}

const TONE = {
  ok:      { color: 'text-ok',      border: 'border-ok/30',      bg: 'bg-ok/[0.06]',      dot: 'bg-ok',      shadow: '' },
  caution: { color: 'text-caution', border: 'border-caution/30', bg: 'bg-caution/[0.07]', dot: 'bg-caution', shadow: '' },
  danger:  { color: 'text-danger',  border: 'border-danger/35',  bg: 'bg-danger/[0.08]',  dot: 'bg-danger',  shadow: 'animate-[closed-pulse_3s_ease-in-out_infinite]' },
} as const;

export default function HeroStatus({ status }: Props) {
  const { lang, t } = useLang();
  const { word, tone } = displayAnswer(status.state);
  const styles = TONE[tone];

  const tIdx = status.tensionIndex ?? (status.tensionLevel === 'CRITICAL' ? 85 : status.tensionLevel === 'ELEVATED' ? 55 : 20);
  const tensionLabel =
    status.tensionLevel === 'CRITICAL' ? t.hero.tensionCritical
      : status.tensionLevel === 'ELEVATED' ? t.hero.tensionElevated
      : t.hero.tensionNormal;
  const tensionColor =
    status.tensionLevel === 'CRITICAL' ? 'text-danger'
      : status.tensionLevel === 'ELEVATED' ? 'text-caution'
      : 'text-ok';
  const tensionBar =
    status.tensionLevel === 'CRITICAL' ? 'bg-danger'
      : status.tensionLevel === 'ELEVATED' ? 'bg-caution'
      : 'bg-ok';

  const question = lang === 'en'
    ? 'Is the Strait of Hormuz open?'
    : 'O Estreito de Ormuz está aberto?';
  const answerWord =
    lang === 'en'
      ? word
      : word === 'YES' ? 'SIM' : word === 'NO' ? 'NÃO' : 'INTERROMPIDO';

  return (
    <section className="relative overflow-hidden rounded-2xl border border-divider bg-gradient-to-br from-bg1 via-bg1 to-bg2">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(170,180,200,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(170,180,200,0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 p-5 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text2 text-[11px] font-mono uppercase tracking-[0.18em]">
            <Shield size={13} className="text-accent" />
            {t.hero.statusLabel}
          </div>
          <div className="flex items-center gap-1.5 text-text3 text-[11px] font-mono">
            <Clock size={11} />
            <span suppressHydrationWarning>{fmtTime(status.lastUpdated, lang === 'en' ? 'en-US' : 'pt-BR')}</span>
          </div>
        </div>

        {/* The question above the answer */}
        <p className="mt-6 md:mt-8 text-text2 text-[13px] md:text-[14px] font-medium tracking-tight">
          {question}
        </p>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-[auto_1fr] items-center gap-6 md:gap-10">
          <div
            className={`relative inline-flex flex-col items-center px-7 md:px-10 py-4 md:py-5 rounded-xl border ${styles.border} ${styles.bg} ${styles.shadow}`}
            role="status"
            aria-live="polite"
            aria-label={`${question} — ${answerWord}`}
          >
            <span
              className={`absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full ${styles.dot} animate-[status-dot_2.4s_ease-in-out_infinite]`}
              aria-hidden
            />
            <h2 className={`text-6xl md:text-8xl font-black tracking-tighter font-mono ${styles.color} leading-none`}>
              {answerWord}
            </h2>
            <span className="mt-1 text-[10px] font-mono text-text3 uppercase tracking-[0.18em]">
              {/* secondary line: canonical state, for clarity */}
              {status.state === 'OPEN' ? (lang === 'en' ? 'strait open' : 'estreito aberto')
                : status.state === 'CLOSED' ? (lang === 'en' ? 'strait closed' : 'estreito fechado')
                : (lang === 'en' ? 'traffic disrupted' : 'tráfego interrompido')}
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-text leading-relaxed text-[15px] md:text-base">
              {status.reason}
            </p>
            {status.reasonUrl && (
              <a
                href={status.reasonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-mono text-accent hover:text-accent-hi transition-colors duration-180"
              >
                <ExternalLink size={12} />
                {lang === 'en' ? 'Open source' : 'Ver fonte'}
                {status.reasonSource ? ` · ${status.reasonSource}` : ''}
              </a>
            )}
          </div>
        </div>

        {/* Tension index — 0..100 numeric */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
              {t.hero.tensionLabel}
              <span className="text-text4 normal-case tracking-normal">· index</span>
            </span>
            <span className={`text-[11px] font-mono font-semibold ${tensionColor}`}>
              {tIdx}<span className="text-text3">/100</span>
              <span className="text-text3 ml-2">{tensionLabel}</span>
            </span>
          </div>
          <div className="relative h-1.5 bg-bg2 rounded-full overflow-hidden border border-divider">
            <div
              className={`h-full rounded-full ${tensionBar} transition-all duration-500 ease-standard`}
              style={{ width: `${tIdx}%` }}
              role="progressbar"
              aria-valuenow={tIdx}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Tension index"
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[9px] text-text4 font-mono uppercase tracking-wider">
            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 text-[11px] font-mono text-text3">
          <Info size={11} />
          <span>{t.hero.confidence}: <span className="text-accent font-semibold">{(status.confidence * 100).toFixed(0)}%</span></span>
          <a href="/methodology" className="ml-auto text-text3 hover:text-accent transition-colors duration-180">
            {lang === 'en' ? 'How is this computed?' : 'Como isto é calculado?'} →
          </a>
        </div>
      </div>
    </section>
  );
}
