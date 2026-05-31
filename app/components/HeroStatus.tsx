'use client';

import { useState, useEffect } from 'react';
import { StatusData } from '@/app/lib/types';
import { useLang } from './LangContext';
import { fmtTime, fmt } from '@/app/lib/utils';
import { ExternalLink, Share2, Copy } from 'lucide-react';
import { BLOCKAGE_START_ISO } from '@/app/lib/constants';

interface Props {
  status: StatusData;
  loading?: boolean;
  brentPrice?: number;
}

const BLOCKAGE_START = (() => {
  if (!BLOCKAGE_START_ISO) return null;
  const d = new Date(BLOCKAGE_START_ISO);
  return Number.isNaN(d.getTime()) ? null : d;
})();

function useElapsedMs(active: boolean): number | null {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    if (!active || !BLOCKAGE_START) return;
    const tick = () => setMs(Math.max(0, Date.now() - BLOCKAGE_START!.getTime()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active]);
  return ms;
}

function splitElapsed(ms: number) {
  const total = Math.floor(ms / 1000);
  const days    = Math.floor(total / 86400);
  const hours   = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { days, hours, minutes, seconds };
}

// Map state → instrument colors (earthy, not neon)
const STATE_TONE = {
  ok: {
    color:     'text-ok',
    bar:       'bg-ok',
    indicator: 'var(--ok)',
    label:     'text-ok',
  },
  caution: {
    color:     'text-caution',
    bar:       'bg-caution',
    indicator: 'var(--caution)',
    label:     'text-caution',
  },
  danger: {
    color:     'text-danger',
    bar:       'bg-danger',
    indicator: 'var(--danger)',
    label:     'text-danger',
  },
} as const;

export default function HeroStatus({ status, loading = false, brentPrice }: Props) {
  const { lang, t, locale } = useLang();

  const tone =
    loading             ? 'caution'
    : status.state === 'OPEN'   ? 'ok'
    : status.state === 'CLOSED' ? 'danger'
    : 'caution';

  const styles = STATE_TONE[tone];

  const answerWord =
    loading             ? '···'
    : status.state === 'OPEN'   ? t.hero.answerYes
    : status.state === 'CLOSED' ? t.hero.answerNo
    : t.hero.answerDisrupted;

  const stateLabel =
    status.state === 'OPEN'   ? t.hero.straitOpen
    : status.state === 'CLOSED' ? t.hero.straitClosed
    : t.hero.trafficDisrupted;

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

  const [displayTIdx, setDisplayTIdx] = useState(0);
  useEffect(() => {
    if (!loading) {
      const id = setTimeout(() => setDisplayTIdx(tIdx), 120);
      return () => clearTimeout(id);
    }
  }, [loading, tIdx]);

  const [showWhy, setShowWhy] = useState(false);
  const [copied, setCopied]   = useState(false);
  const isDisrupted = !loading && status.state !== 'OPEN';
  const elapsedMs   = useElapsedMs(isDisrupted);

  const copyCardLink = () => {
    if (typeof navigator === 'undefined') return;
    const params = new URLSearchParams({ state: status.state, tension: String(tIdx), lang });
    if (brentPrice != null) params.set('brent', brentPrice.toFixed(2));
    navigator.clipboard.writeText(`${window.location.origin}/api/og?${params}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const shareStatus = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: `${t.header.title}${t.header.titleAccent}`,
        text: fmt(t.hero.shareText, {
          state: stateLabel,
          tension: tIdx,
          brent: brentPrice ? brentPrice.toFixed(2) : '—',
        }),
        url: window.location.href,
      }).catch(() => {});
    }
  };

  return (
    <section
      className="relative overflow-hidden border border-divider panel-tactical"
      role="status"
      aria-live="polite"
      aria-label={loading ? 'Loading strait status…' : `${t.hero.question} — ${answerWord}`}
    >
      <div className="scan-bar" aria-hidden />
      {/* ── Header strip ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 md:px-8 py-3 border-b border-divider bg-bg1">
        <div className="flex items-center gap-3">
          <span
            className="w-1.5 h-1.5 rounded-full animate-[status-dot_2.4s_ease-in-out_infinite]"
            style={{ background: styles.indicator }}
            aria-hidden
          />
          <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-text3">
            {t.hero.statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-5 text-[9px] font-mono text-text4">
          <span suppressHydrationWarning>{fmtTime(status.lastUpdated, locale)}</span>
          <button
            onClick={copyCardLink}
            className="flex items-center gap-1.5 hover:text-text2 transition-colors uppercase tracking-[0.14em]"
            aria-label={t.hero.copyCard}
          >
            <Copy size={10} />
            <span className="hidden sm:inline">{copied ? t.hero.copied : t.hero.copyCard}</span>
          </button>
          <button
            onClick={shareStatus}
            className="flex items-center gap-1.5 hover:text-text2 transition-colors uppercase tracking-[0.14em]"
            aria-label={t.hero.share}
          >
            <Share2 size={10} />
            <span className="hidden sm:inline">{t.hero.share}</span>
          </button>
        </div>
      </div>

      {/* ── Main body ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr]">

        {/* Left: Question + Answer + Reason */}
        <div className="p-6 md:p-8 md:border-r border-divider">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-text3 mb-4">
            {t.hero.question}
          </p>

          {/* Answer — massive editorial type */}
          <div
            key={answerWord}
            className={`font-headline font-black italic leading-[0.85] tracking-tight ${styles.color} animate-answer-pop select-none`}
            style={{ fontSize: 'clamp(72px, 11vw, 148px)' }}
          >
            {answerWord}
          </div>

          <p className="mt-6 text-[14px] md:text-[15px] text-text2 leading-relaxed max-w-lg">
            {loading ? t.hero.syncingData : status.reason}
          </p>

          {/* Links */}
          {!loading && (
            <div className="mt-4 flex flex-wrap items-center gap-5 text-[11px] font-mono">
              {status.reasonUrl && (
                <a
                  href={status.reasonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-accent hover:text-accent-hi transition-colors"
                >
                  <ExternalLink size={11} />
                  {t.hero.openSource}
                  {status.reasonSource ? ` · ${status.reasonSource}` : ''}
                </a>
              )}
              <button
                onClick={() => setShowWhy(!showWhy)}
                className="text-text3 hover:text-text2 transition-colors"
              >
                {t.hero.whyStatus} {showWhy ? '↑' : '↓'}
              </button>
            </div>
          )}

          {/* Operational CTAs */}
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { label: t.hero.ctaIncidentFeed, href: '#intel'        },
              { label: t.hero.ctaMaritimeMap,  href: '#hero'         },
              { label: t.hero.ctaChokepoints,  href: '#chokepoints'  },
              { label: t.hero.ctaApiAccess,    href: '/docs'         },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-[9px] font-mono uppercase tracking-[0.14em] text-text3 border border-divider px-3 py-1.5 hover:border-accent/50 hover:text-accent transition-colors duration-150 cursor-pointer"
              >
                {label}
              </a>
            ))}
          </div>

          {showWhy && (
            <div className="mt-4 pt-4 border-t border-divider animate-fadeInUp">
              <p className="text-[12px] font-mono text-text3 leading-relaxed">
                {fmt(t.hero.signalTemplate, {
                  state: status.state,
                  quality: status.confidence > 0.8 ? t.hero.signalHighlyReliable : t.hero.signalMultiple,
                  tIdx,
                })}
              </p>
            </div>
          )}
        </div>

        {/* Right: Intelligence metrics */}
        <div className="p-6 md:p-8 flex flex-col gap-6 border-t md:border-t-0 border-divider">

          {/* Brent price */}
          {brentPrice != null && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-text3 mb-1.5">
                {t.hero.brentLabel}
              </div>
              <div className="text-[34px] font-mono font-bold text-text leading-none tabular-nums">
                ${brentPrice.toFixed(2)}
              </div>
            </div>
          )}

          {/* Tension index */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-text3">
                {t.hero.tensionLabel}
              </span>
              <span className={`text-[10px] font-mono font-semibold ${tensionColor}`}>
                {tIdx}/100 · {tensionLabel}
              </span>
            </div>
            {/* Flat bar — no rounded corners */}
            <div className="h-[3px] bg-bg2">
              <div
                className={`h-full ${styles.bar} transition-all duration-700`}
                style={{ width: `${displayTIdx}%` }}
                role="progressbar"
                aria-valuenow={tIdx}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Tension index"
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[8px] font-mono text-text4 uppercase tracking-[0.14em]">
              <span>{t.hero.tensionNormal}</span><span>{t.hero.tensionElevated}</span><span>{t.hero.tensionCritical}</span>
            </div>
          </div>

          {/* Confidence */}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-text3 mb-1.5">
              {t.hero.confidence}
            </div>
            <div className="text-[28px] font-mono font-bold text-text leading-none">
              {loading ? '—' : `${(status.confidence * 100).toFixed(0)}%`}
            </div>
            <div className="mt-1 text-[9px] font-mono text-text4">
              <a href="/methodology" className="hover:text-accent transition-colors">
                {t.hero.howComputed} →
              </a>
            </div>
          </div>

          {/* System status row */}
          <div className="pt-3 border-t border-divider/60 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-text4 mb-1">
                {t.hero.dataFreshness}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1 h-1 rounded-full animate-[live-pulse_2s_ease-in-out_infinite] ${loading ? 'bg-text4' : 'bg-ok'}`} aria-hidden />
                <span className="text-[10px] font-mono text-text">{loading ? t.header.statusSyncing : t.hero.dataCurrent}</span>
              </div>
            </div>
            <div>
              <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-text4 mb-1">
                {t.hero.systemLabel}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-ok" aria-hidden />
                <span className="text-[10px] font-mono text-ok">{t.footer.operational}</span>
              </div>
            </div>
          </div>

          {/* Elapsed timer when closed/disrupted */}
          {isDisrupted && BLOCKAGE_START && elapsedMs !== null && (() => {
            const { days, hours, minutes, seconds } = splitElapsed(elapsedMs);
            const pad = (n: number) => String(n).padStart(2, '0');
            const label = status.state === 'CLOSED'
              ? t.hero.closureTimer
              : t.hero.disruptionTimer;
            return (
              <div className="pt-4 border-t border-divider">
                <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-text3 mb-1.5">
                  {label}
                </div>
                <div
                  className={`text-[20px] font-mono font-bold ${styles.color} leading-none tabular-nums`}
                  suppressHydrationWarning
                >
                  {days}{t.hero.timerDays} · {pad(hours)}:{pad(minutes)}:{pad(seconds)}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </section>
  );
}
