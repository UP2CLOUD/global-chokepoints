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
  source?: string;
  spark?: SparkPoint[];
  asOf?: string;
  refreshSec?: number;
  stale?: boolean;
  down?: boolean;
  tone?: 'ok' | 'caution' | 'warn' | 'danger' | 'default';
  loading?: boolean;
}

function MiniSpark({ data, up }: { data: SparkPoint[]; up: boolean }) {
  if (!data || data.length < 2) return null;
  const prices = data.map(d => d.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const w = 80, h = 24, pad = 2;
  const stepX = (w - pad * 2) / (data.length - 1);
  const pts = prices.map((p, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (p - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${pts.join(' L ')}`;
  const stroke = up ? 'var(--ok)' : 'var(--danger)';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden role="presentation">
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
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
  delay = 0, source, spark, stale, down, tone = 'default',
  loading = false,
}: Props) {
  const changeColor =
    changeType === 'up'   ? 'text-ok'
    : changeType === 'down' ? 'text-danger'
    : 'text-text3';
  const valueColor = TONE_CLASS[tone];

  if (loading) {
    return (
      <div className="animate-fadeInUp" style={{ animationDelay: `${delay}s` }} aria-busy="true">
        <div className="h-[9px] w-24 bg-bg2 rounded-sm mb-3 animate-pulse" />
        <div className="h-9 w-32 bg-bg2 rounded-sm mb-2 animate-pulse" />
        <div className="h-[9px] w-20 bg-bg2 rounded-sm animate-pulse" />
      </div>
    );
  }

  return (
    <div className="animate-fadeInUp" style={{ animationDelay: `${delay}s` }}>
      {/* Label row */}
      <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.22em] text-text3 mb-2">
        <span className="text-text4" aria-hidden>{icon}</span>
        {title}
      </div>

      {/* Value + sparkline */}
      <div className="flex items-end gap-3">
        <div
          className={`text-[32px] md:text-[36px] font-mono font-bold leading-none tabular-nums ${
            down ? 'text-text4' : valueColor
          }`}
        >
          {down ? '—' : value}
        </div>
        {spark && spark.length >= 2 && !down && (
          <div className="pb-1">
            <MiniSpark data={spark} up={changeType !== 'down'} />
          </div>
        )}
      </div>

      {/* Change */}
      {change && !down && (
        <div className={`mt-1.5 text-[11px] font-mono ${changeColor}`}>{change}</div>
      )}

      {/* Source / badges */}
      <div className="mt-1 flex items-center gap-2 text-[9px] font-mono text-text4">
        {source && <span>via {source}</span>}
        {stale && !down && (
          <span className="stale px-1.5 py-0.5 text-[8px] uppercase tracking-wider">stale</span>
        )}
        {down && (
          <span className="down px-1.5 py-0.5 text-[8px] uppercase tracking-wider">feed down</span>
        )}
      </div>
    </div>
  );
}
