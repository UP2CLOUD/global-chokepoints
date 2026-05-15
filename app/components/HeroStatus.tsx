'use client';

import { useState, useEffect } from 'react';
import { StatusData } from '@/app/lib/types';
import { useLang } from './LangContext';
import { fmtTime, fmt } from '@/app/lib/utils';
import { Shield, Clock, ExternalLink, Info, Share2 } from 'lucide-react';

interface Props {
  status: StatusData;
  loading?: boolean;
}

function displayAnswer(state: StatusData['state']): {
  word: 'YES' | 'NO' | 'DISRUPTED';
  tone: 'danger' | 'ok' | 'caution';
} {
  if (state === 'OPEN') return { word: 'YES', tone: 'ok' };
  if (state === 'CLOSED') return { word: 'NO', tone: 'danger' };
  return { word: 'DISRUPTED', tone: 'caution' };
}

const TONE = {
  ok: {
    color:  'text-ok',
    border: 'border-ok/30',
    bg:     'bg-ok/[0.06]',
    dot:    'bg-ok',
    shadow: '',
    glow:   'animate-ok-glow',
    bracket:'border-ok/40',
    bar:    'bg-ok',
  },
  caution: {
    color:  'text-caution',
    border: 'border-caution/30',
    bg:     'bg-caution/[0.07]',
    dot:    'bg-caution',
    shadow: '',
    glow:   'animate-caution-glow',
    bracket:'border-caution/40',
    bar:    'bg-caution',
  },
  danger: {
    color:  'text-danger',
    border: 'border-danger/35',
    bg:     'bg-danger/[0.08]',
    dot:    'bg-danger',
    shadow: 'animate-[closed-pulse_3s_ease-in-out_infinite]',
    glow:   'animate-danger-glow',
    bracket:'border-danger/40',
    bar:    'bg-danger',
  },
} as const;

export default function HeroStatus({ status, loading = false }: Props) {
  const { lang, t, locale } = useLang();
  const { word, tone } = loading
    ? { word: 'YES' as const, tone: 'caution' as const }
    : displayAnswer(status.state);
  const styles = TONE[tone];

  const tIdx = status.tensionIndex ?? (
    status.tensionLevel === 'CRITICAL' ? 85 :
    status.tensionLevel === 'ELEVATED' ? 55 : 20
  );
  const tensionLabel =
    status.tensionLevel === 'CRITICAL' ? t.hero.tensionCritical
    : status.tensionLevel === 'ELEVATED' ? t.hero.tensionElevated
    : t.hero.tensionNormal;
  const tensionColor =
    status.tensionLevel === 'CRITICAL' ? 'text-danger'
    : status.tensionLevel === 'ELEVATED' ? 'text-caution'
    : 'text-ok';

  // Animate tension bar from 0 when data arrives
  const [displayTIdx, setDisplayTIdx] = useState(0);
  useEffect(() => {
    if (!loading) {
      const id = setTimeout(() => setDisplayTIdx(tIdx), 120);
      return () => clearTimeout(id);
    }
  }, [loading, tIdx]);

  const question = t.hero.question;
  const answerWord =
    word === 'YES' ? t.hero.answerYes
    : word === 'NO' ? t.hero.answerNo
    : t.hero.answerDisrupted;

  const [showWhy, setShowWhy] = useState(false);

  const shareStatus = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'IsStraitHormuzOpen?',
        text: fmt(t.hero.shareText, { state: status.state, tension: tIdx, brent: '—' }) + ' ' + window.location.href,
        url: window.location.href,
      }).catch(() => {});
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-divider bg-gradient-to-br from-bg1 via-bg1 to-bg2">

      {/* Grid pattern background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(170,180,200,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(170,180,200,0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Scan line sweep */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"
          style={{ animation: 'scan-h 9s linear infinite', top: 0 }}
        />
      </div>

      <div className="relative z-10 p-5 md:p-8">

        {/* ── Top row ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text2 text-[11px] font-mono uppercase tracking-[0.18em]">
            <Shield size={13} className="text-accent" />
            {t.hero.statusLabel}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={shareStatus}
              className="flex items-center gap-1.5 text-text3 hover:text-accent transition-colors duration-180 text-[11px] font-mono"
              aria-label="Share current status"
            >
              <Share2 size={11} />
              <span className="hidden sm:inline">{t.hero.share}</span>
            </button>
            <div className="flex items-center gap-1.5 text-text3 text-[11px] font-mono">
              <Clock size={11} />
              <span suppressHydrationWarning>
                {fmtTime(status.lastUpdated, locale)}
              </span>
            </div>
          </div>
        </div>

        {/* ── The question — primary headline ── */}
        <h2 className="mt-5 md:mt-7 text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight text-text">
          {question}
        </h2>

        {/* ── Answer + reason row ── */}
        <div className="mt-5 md:mt-6 grid grid-cols-1 md:grid-cols-[auto_1fr] items-center gap-6 md:gap-10">

          {/* Answer box */}
          <div
            className={`relative inline-flex flex-col items-center px-8 md:px-12 py-5 md:py-6 rounded-xl border ${styles.border} ${styles.bg} ${styles.shadow} ${!loading ? styles.glow : ''} overflow-hidden transition-colors duration-500`}
            role="status"
            aria-live="polite"
            aria-label={loading ? 'Loading status…' : `${question} — ${answerWord}`}
          >
            {/* Corner brackets — mil-spec aesthetic */}
            <span aria-hidden className={`absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 ${styles.bracket} pointer-events-none`} />
            <span aria-hidden className={`absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 ${styles.bracket} pointer-events-none`} />
            <span aria-hidden className={`absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 ${styles.bracket} pointer-events-none`} />
            <span aria-hidden className={`absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 ${styles.bracket} pointer-events-none`} />

            {/* Shimmer while loading */}
            {loading && (
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent pointer-events-none" />
            )}

            {/* Live pulse dot */}
            <span
              className={`absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full ${styles.dot} animate-[status-dot_2.4s_ease-in-out_infinite]`}
              aria-hidden
            />

            {loading ? (
              <>
                <span className="text-6xl md:text-8xl font-black tracking-tighter font-mono text-caution/40 leading-none select-none">
                  ···
                </span>
                <span className="mt-1.5 text-[10px] font-mono text-text4 uppercase tracking-[0.18em]">
                  {t.hero.syncingData}
                </span>
              </>
            ) : (
              <>
                <p
                  key={answerWord}
                  className={`text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter font-mono ${styles.color} leading-none animate-answer-pop`}
                >
                  {answerWord}
                </p>
                <span className="mt-1.5 text-[10px] font-mono text-text3 uppercase tracking-[0.18em]">
                  {status.state === 'OPEN'
                    ? t.hero.straitOpen
                    : status.state === 'CLOSED'
                    ? t.hero.straitClosed
                    : t.hero.trafficDisrupted}
                </span>
              </>
            )}
          </div>

          {/* Reason text */}
          <div className="min-w-0">
            <p className="text-text leading-relaxed text-[15px] md:text-base">
              {status.reason}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {status.reasonUrl && (
                <a
                  href={status.reasonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono text-accent hover:text-accent-hi transition-colors duration-180"
                >
                  <ExternalLink size={12} />
                  {t.hero.openSource}
                  {status.reasonSource ? ` · ${status.reasonSource}` : ''}
                </a>
              )}
              <button
                onClick={() => setShowWhy(!showWhy)}
                className="inline-flex items-center gap-1.5 text-[11px] font-mono text-text3 hover:text-text2 transition-colors"
              >
                <Info size={12} />
                {t.hero.whyStatus}
              </button>
            </div>
          </div>
        </div>

        {/* Why panel */}
        {showWhy && (
          <div className="mt-6 p-5 rounded-xl border border-divider bg-bg2/40 animate-fadeInUp">
            <h3 className="text-[12px] font-mono font-semibold text-text uppercase tracking-wider mb-2">
              {t.hero.signalAnalysis}
            </h3>
            <p className="text-[12px] text-text3 leading-relaxed">
              {fmt(t.hero.signalTemplate, {
                state: status.state,
                quality: status.confidence > 0.8 ? t.hero.signalHighlyReliable : t.hero.signalMultiple,
                tIdx,
              })}
            </p>
          </div>
        )}

        {/* ── Tension index bar ── */}
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
          <div className="relative h-2 bg-bg2 rounded-full overflow-hidden border border-divider">
            <div
              className={`h-full rounded-full ${styles.bar} transition-all duration-700 ease-out`}
              style={{ width: `${displayTIdx}%` }}
              role="progressbar"
              aria-valuenow={tIdx}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Tension index"
            />
            {/* Shimmer on the bar */}
            {!loading && displayTIdx > 0 && (
              <div
                className="absolute inset-y-0 left-0 animate-[shimmer_2.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"
                style={{ width: `${displayTIdx}%` }}
                aria-hidden
              />
            )}
          </div>
          <div className="mt-1.5 flex justify-between text-[9px] text-text4 font-mono uppercase tracking-wider">
            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>
        </div>

        {/* ── Confidence ── */}
        <div className="mt-5 flex items-center gap-2 text-[11px] font-mono text-text3">
          <Info size={11} />
          <span>
            {t.hero.confidence}:{' '}
            <span className="text-accent font-semibold">{(status.confidence * 100).toFixed(0)}%</span>
          </span>
          <a href="/methodology" className="ml-auto text-text3 hover:text-accent transition-colors duration-180">
            {t.hero.howComputed} →
          </a>
        </div>
      </div>
    </section>
  );
}
