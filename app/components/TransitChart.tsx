'use client';

import { useEffect, useRef, useState } from 'react';
import { PortWatchDay } from '@/app/api/portwatch/route';
import { useLang } from './LangContext';
import { Ship, TrendingDown } from 'lucide-react';

type TransitData = {
  ok: boolean;
  days: PortWatchDay[];
  todayTotal: number;
  sevenDayAvg: number;
  baselineDaily: number;
  vsBaseline: number;
  latestDate: string;
  source?: string;
  stale?: boolean;
};

// ── Bar chart rendered on <canvas> ───────────────────────────
function TransitCanvas({ days, baseline }: { days: PortWatchDay[]; baseline: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !days.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr    = window.devicePixelRatio || 1;
    const W      = canvas.offsetWidth;
    const H      = canvas.offsetHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, W, H);

    const padL = 28, padR = 8, padT = 8, padB = 32;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const maxVal = Math.max(baseline * 1.1, ...days.map(d => d.total), 10);
    const barW   = chartW / days.length;
    const gap    = Math.max(1, barW * 0.18);

    // Grid lines + Y labels
    const gridLines = [0, 10, 20, 30, 40].filter(v => v <= maxVal + 2);
    ctx.font      = `9px monospace`;
    ctx.textAlign = 'right';
    gridLines.forEach(v => {
      const y = padT + chartH - (v / maxVal) * chartH;
      ctx.strokeStyle = 'rgba(170,180,200,0.08)';
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillStyle   = 'rgba(170,180,200,0.35)';
      ctx.fillText(String(v), padL - 3, y + 3);
    });

    // Baseline marker (dashed orange)
    const baseY = padT + chartH - (baseline / maxVal) * chartH;
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = 'rgba(245,158,11,0.4)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(padL, baseY); ctx.lineTo(W - padR, baseY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font      = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(245,158,11,0.55)';
    ctx.fillText('pre-2026 avg', padL + 4, baseY - 3);

    // Bars
    days.forEach((day, i) => {
      const x    = padL + i * barW + gap / 2;
      const bw   = barW - gap;
      const barH = day.total > 0 ? Math.max(2, (day.total / maxVal) * chartH) : 0;
      const y    = padT + chartH - barH;

      // Color: 0 = red, low = orange, approaching baseline = yellow, good = teal
      const ratio = day.total / baseline;
      let color: string;
      if (day.total === 0)    color = 'rgba(239,68,68,0.75)';
      else if (ratio < 0.15)  color = 'rgba(239,68,68,0.6)';
      else if (ratio < 0.4)   color = 'rgba(245,158,11,0.7)';
      else if (ratio < 0.7)   color = 'rgba(250,204,21,0.65)';
      else                    color = 'rgba(45,212,191,0.7)';

      ctx.fillStyle = color;
      const r = Math.min(2, bw / 2);
      ctx.beginPath();
      ctx.roundRect(x, y, bw, barH, [r, r, 0, 0]);
      ctx.fill();

      // X axis date labels — every 7th bar
      if (i % 7 === 0 || i === days.length - 1) {
        const dateStr = day.date.slice(5); // MM-DD
        ctx.font      = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(170,180,200,0.4)';
        ctx.fillText(dateStr, x + bw / 2, H - padB + 12);
      }
    });
  }, [days, baseline]);

  return (
    <canvas
      ref={ref}
      className="w-full"
      style={{ height: 140 }}
    />
  );
}

// ── Main component ────────────────────────────────────────────
export default function TransitChart() {
  const { lang } = useLang();
  const [data, setData] = useState<TransitData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/portwatch', { cache: 'no-store' });
        if (r.ok) {
          const j = await r.json() as TransitData;
          if (j.ok) setData(j);
        }
      } catch { /* keep null */ }
      finally { setLoading(false); }
    };
    load();
    const id = setInterval(load, 30 * 60_000); // refresh every 30 min
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        <div className="h-4 w-32 bg-bg1 rounded" />
        <div className="h-36 bg-bg1 rounded" />
        <div className="h-3 w-24 bg-bg1 rounded" />
      </div>
    );
  }

  if (!data || !data.days.length) {
    return (
      <div className="flex items-center justify-center h-36 text-text3 text-[11px] font-mono">
        {lang === 'en' ? 'Transit data unavailable' : 'Dados de trânsito indisponíveis'}
      </div>
    );
  }

  const { days, todayTotal, sevenDayAvg, baselineDaily, vsBaseline, latestDate } = data;
  const pctText = vsBaseline < 0
    ? `${Math.abs(vsBaseline)}% ${lang === 'en' ? 'below' : 'abaixo'} avg`
    : `${vsBaseline}% ${lang === 'en' ? 'above' : 'acima'} avg`;
  const pctColor = vsBaseline < -50 ? 'text-danger' : vsBaseline < -20 ? 'text-caution' : 'text-ok';

  return (
    <div className="flex flex-col gap-1">
      {/* Header row */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-[11px] font-mono text-text3 uppercase tracking-wider mb-0.5">
            {lang === 'en' ? 'Today' : 'Hoje'}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${todayTotal === 0 ? 'text-danger' : todayTotal < 10 ? 'text-caution' : 'text-ok'}`}>
              {todayTotal}
            </span>
            <span className="text-[11px] text-text3 font-mono">
              {lang === 'en' ? 'vessels' : 'navios'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-text4 mb-0.5">
            {lang === 'en' ? '7d avg' : 'média 7d'}
          </div>
          <div className="text-[13px] font-mono font-semibold text-text2">
            {sevenDayAvg.toFixed(1)}
          </div>
          <div className={`text-[9px] font-mono ${pctColor} flex items-center gap-0.5 justify-end`}>
            <TrendingDown size={8} />
            {pctText}
          </div>
        </div>
      </div>

      {/* Chart */}
      <TransitCanvas days={days} baseline={baselineDaily} />

      {/* Footer */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2 text-[9px] font-mono text-text4">
          <span className="inline-block w-3 h-[2px] bg-amber-400/50 rounded" />
          {lang === 'en' ? 'pre-2026 baseline (~34/day)' : 'linha base pré-2026 (~34/dia)'}
        </div>
        <span className="text-[9px] font-mono text-text4">
          {lang === 'en' ? 'as of' : 'em'} {latestDate} · IMF PortWatch
        </span>
      </div>
    </div>
  );
}

// ── Compact metric tile (for MetricsGrid) ─────────────────────
export function TransitMetricTile() {
  const { lang } = useLang();
  const [data, setData] = useState<TransitData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/portwatch', { cache: 'no-store' });
        if (r.ok) {
          const j = await r.json() as TransitData;
          if (j.ok) setData(j);
        }
      } catch { /* keep null */ }
    };
    load();
  }, []);

  const today = data?.todayTotal ?? null;
  const vsB   = data?.vsBaseline ?? null;

  return {
    todayTotal: today,
    vsBaseline: vsB,
    loading: !data,
  };
}
