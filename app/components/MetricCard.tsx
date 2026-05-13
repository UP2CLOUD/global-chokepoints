'use client';

import { ReactNode } from 'react';

interface SparkPoint { date: string; price: number }

interface Props {
  title: string;
  value: string;
  icon: ReactNode;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  delay?: number;
  /** Provenance badge text (e.g. "Yahoo Finance") */
  source?: string;
  /** Optional 7-point series for a small sparkline */
  spark?: SparkPoint[];
  /** ISO timestamp of the data — used to render a freshness bar */
  asOf?: string;
  /** Expected refresh cadence in seconds; freshness scales against this */
  refreshSec?: number;
  /** Mark the value as stale (last refresh failed) */
  stale?: boolean;
  /** Mark the feed as down (no value to show) */
  down?: boolean;
  /** Optional tone for the value (e.g. severity color) */
  tone?: 'ok' | 'caution' | 'warn' | 'danger' | 'default';
}

function MiniSpark({ data, up }: { data: SparkPoint[]; up: boolean }) {
  if (!data || data.length < 2) return null;
  const prices = data.map(d => d.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const w = 96, h = 28, pad = 2;
  const stepX = (w - pad * 2) / (data.length - 1);
  const pts = prices.map((p, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (p - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${pts.join(' L ')}`;
  const fillPath = `${path} L ${pad + (data.length - 1) * stepX},${h - pad} L ${pad},${h - pad} Z`;
  const stroke = up ? 'var(--ok)' : 'var(--danger)';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden role="presentation">
      <defs>
        <linearGradient id={`g-${up ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#g-${up ? 'up' : 'down'})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function FreshnessBar({ asOf, refreshSec }: { asOf?: string; refreshSec?: number }) {
  if (!asOf || !refreshSec) return null;
  const ageSec = (Date.now() - +new Date(asOf)) / 1000;
  const ratio = Math.max(0, Math.min(4, ageSec / refreshSec));
  // 0..1 = green, 1..2 = amber, 2..4 = red
  const color =
    ratio < 1 ? 'var(--ok)' :
    ratio < 2 ? 'var(--caution)' : 'var(--danger)';
  const pct = Math.min(100, (ratio / 4) * 100);
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-bg2 rounded-b-xl overflow-hidden" aria-hidden>
      <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

const TONE_CLASS: Record<NonNullable<Props['tone']>, string> = {
  ok: 'text-ok',
  caution: 'text-caution',
  warn: 'text-warn',
  danger: 'text-danger',
  default: 'text-text',
};

export default function MetricCard({
  title, value, icon, change, changeType = 'neutral',
  delay = 0, source, spark, asOf, refreshSec, stale, down, tone = 'default',
}: Props) {
  const changeColor =
    changeType === 'up' ? 'text-ok'
    : changeType === 'down' ? 'text-danger'
    : 'text-text2';
  const valueColor = TONE_CLASS[tone];

  return (
    <div
      className="relative rounded-xl border border-divider bg-card/70 p-4 transition-colors duration-180 hover:border-divider/80 animate-fadeInUp"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-text2">{title}</span>
        <div className="w-7 h-7 rounded-md bg-bg2 flex items-center justify-center text-accent" aria-hidden>
          {icon}
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className={`text-[26px] md:text-[28px] font-bold font-mono leading-none ${down ? 'text-text3' : valueColor}`}>
          {down ? '—' : value}
        </div>
        {spark && spark.length >= 2 && !down && (
          <MiniSpark data={spark} up={changeType !== 'down'} />
        )}
      </div>

      {change && !down && (
        <div className={`mt-2 flex items-center gap-1.5 text-[12px] font-mono ${changeColor}`}>
          {change}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-text3">
        {source && <span className="truncate">via {source}</span>}
        {stale && !down && (
          <span className="ml-auto px-1.5 py-0.5 rounded stale text-[9px] uppercase tracking-wider">stale</span>
        )}
        {down && (
          <span className="ml-auto px-1.5 py-0.5 rounded down text-[9px] uppercase tracking-wider">feed down</span>
        )}
      </div>

      <FreshnessBar asOf={asOf} refreshSec={refreshSec} />
    </div>
  );
}
