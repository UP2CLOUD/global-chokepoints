'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PortWatchDay } from '@/app/api/portwatch/route';
import { useLang } from './LangContext';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

// Chart layout constants shared between draw effect and mouse handler
const PAD_L = 28, PAD_R = 8;

type CPStats = {
  days: PortWatchDay[];
  todayTotal: number;
  sevenDayAvg: number;
  baselineDaily: number;
  vsBaseline: number;
  latestDate: string;
};

type TransitData = CPStats & {
  ok: boolean;
  source?: string;
  stale?: boolean;
  chokepoints?: Record<string, CPStats>;
};

type CPKey = 'hormuz' | 'redsea' | 'suez' | 'panama';

const TABS: { key: CPKey; label: string; codes: string }[] = [
  { key: 'hormuz', label: 'HORMUZ',  codes: 'IR/OM' },
  { key: 'redsea', label: 'RED SEA', codes: 'YE/DJ' },
  { key: 'suez',   label: 'SUEZ',    codes: 'EG'    },
  { key: 'panama', label: 'PANAMA',  codes: 'PA'    },
];

const STATIC_BASELINES: Record<CPKey, number> = {
  hormuz: 34, redsea: 50, suez: 50, panama: 35,
};

type TooltipState = { day: PortWatchDay; x: number; y: number } | null;

// ── Bar chart rendered on <canvas> ───────────────────────────
function TransitCanvas({
  days,
  baseline,
  onHover,
}: {
  days: PortWatchDay[];
  baseline: number;
  onHover?: (day: PortWatchDay | null, clientX: number, clientY: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onHover || !days.length) return;
    const canvas = ref.current;
    if (!canvas) return;
    const W = canvas.offsetWidth;
    const barW = (W - PAD_L - PAD_R) / days.length;
    const relX = e.nativeEvent.offsetX - PAD_L;
    const idx = Math.floor(relX / barW);
    if (idx >= 0 && idx < days.length) {
      onHover(days[idx], e.clientX, e.clientY);
    } else {
      onHover(null, 0, 0);
    }
  }, [days, onHover]);

  const handleMouseLeave = useCallback(() => onHover?.(null, 0, 0), [onHover]);

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

    const padL = PAD_L, padR = PAD_R, padT = 8, padB = 32;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const maxVal = Math.max(baseline * 1.1, ...days.map(d => d.total), 10);
    const barW   = chartW / days.length;
    const gap    = Math.max(1, barW * 0.18);

    // Grid lines + Y labels
    const gridLines = [0, 10, 20, 30, 40, 60, 80].filter(v => v <= maxVal + 2);
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

    // Baseline marker (dashed amber)
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
      className="w-full cursor-crosshair"
      style={{ height: 140 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  );
}

// Vessel type colour palette (matches canvas bar colours)
const TYPE_COLORS: Record<string, string> = {
  Tanker:    '#F59E0B',
  Cargo:     '#38BDF8',
  Container: '#A78BFA',
  'Dry Bulk':'#94A3B8',
};

// ── Main component ────────────────────────────────────────────
export default function TransitChart() {
  const { lang } = useLang();
  const [data, setData] = useState<TransitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CPKey>('hormuz');
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleBarHover = useCallback((day: PortWatchDay | null, clientX: number, clientY: number) => {
    if (!day) { setTooltip(null); return; }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ day, x: clientX - rect.left, y: clientY - rect.top });
  }, []);

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
    const id = setInterval(load, 30 * 60_000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        <div className="h-4 w-48 bg-bg1" />
        <div className="h-36 bg-bg1" />
        <div className="h-3 w-24 bg-bg1" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-36 text-text3 text-[11px] font-mono">
        {lang === 'en' ? 'Transit data unavailable' : 'Dados de trânsito indisponíveis'}
      </div>
    );
  }

  // Resolve active CP stats — fall back to root-level (Hormuz) if tab data missing
  const cpStats: CPStats | null = activeTab === 'hormuz'
    ? { days: data.days, todayTotal: data.todayTotal, sevenDayAvg: data.sevenDayAvg, baselineDaily: data.baselineDaily, vsBaseline: data.vsBaseline, latestDate: data.latestDate }
    : (data.chokepoints?.[activeTab] ?? null);

  if (!cpStats || !cpStats.days.length) {
    return (
      <div className="flex flex-col gap-3">
        {/* Tab bar */}
        <TabBar activeTab={activeTab} onSelect={setActiveTab} />
        <div className="flex items-center justify-center h-36 text-text3 text-[11px] font-mono border border-divider">
          {lang === 'en' ? 'No data for this chokepoint' : 'Sem dados para este ponto'}
        </div>
      </div>
    );
  }

  const { days, todayTotal, sevenDayAvg, baselineDaily, vsBaseline, latestDate } = cpStats;
  const baseline = baselineDaily || STATIC_BASELINES[activeTab];

  const pctText = vsBaseline < 0
    ? `${Math.abs(vsBaseline)}% ${lang === 'en' ? 'below' : 'abaixo'} avg`
    : vsBaseline > 0
    ? `${vsBaseline}% ${lang === 'en' ? 'above' : 'acima'} avg`
    : lang === 'en' ? 'at baseline' : 'na linha base';
  const pctColor = vsBaseline < -50 ? 'text-danger' : vsBaseline < -20 ? 'text-caution' : vsBaseline > 10 ? 'text-ok' : 'text-text3';

  const TrendIcon = vsBaseline < -5 ? TrendingDown : vsBaseline > 5 ? TrendingUp : Minus;

  return (
    <div ref={containerRef} className="flex flex-col gap-1 relative">
      {/* Bar tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none border border-divider bg-bg1 px-2.5 py-2 text-[9px] font-mono min-w-[110px]"
          style={{
            left: Math.min(tooltip.x + 14, (containerRef.current?.offsetWidth ?? 999) - 130),
            top:  Math.max(0, tooltip.y - 110),
          }}
        >
          <div className="text-text4 mb-1.5 text-[8px]">{tooltip.day.date}</div>
          {([['Tanker', tooltip.day.tanker], ['Cargo', tooltip.day.cargo], ['Container', tooltip.day.container], ['Dry Bulk', tooltip.day.dryBulk]] as [string, number][]).map(([label, val]) => (
            <div key={label} className="flex items-center justify-between gap-3 mb-0.5">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 inline-block" style={{ backgroundColor: TYPE_COLORS[label] }} />
                <span className="text-text4">{label}</span>
              </span>
              <span className="text-text font-semibold tabular-nums">{val}</span>
            </div>
          ))}
          <div className="border-t border-divider/50 mt-1.5 pt-1 flex justify-between">
            <span className="text-text4">Total</span>
            <span className="text-text font-bold tabular-nums">{tooltip.day.total}</span>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <TabBar activeTab={activeTab} onSelect={setActiveTab} />

      {/* Header row */}
      <div className="flex items-start justify-between mb-1 mt-3">
        <div>
          <div className="text-[11px] font-mono text-text3 uppercase tracking-wider mb-0.5">
            {lang === 'en' ? 'Today' : 'Hoje'}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${todayTotal === 0 ? 'text-danger' : todayTotal < baseline * 0.3 ? 'text-caution' : 'text-ok'}`}>
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
            <TrendIcon size={8} />
            {pctText}
          </div>
        </div>
      </div>

      {/* Chart */}
      <TransitCanvas days={days} baseline={baseline} onHover={handleBarHover} />

      {/* Footer */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2 text-[9px] font-mono text-text4">
          <span className="inline-block w-3 h-[2px] bg-amber-400/50" />
          {lang === 'en'
            ? `pre-2026 baseline (~${baseline}/day)`
            : `linha base pré-2026 (~${baseline}/dia)`}
        </div>
        <span className="text-[9px] font-mono text-text4">
          {lang === 'en' ? 'as of' : 'em'} {latestDate} · IMF PortWatch
        </span>
      </div>
    </div>
  );
}

function TabBar({ activeTab, onSelect }: { activeTab: CPKey; onSelect: (k: CPKey) => void }) {
  return (
    <div className="flex border-b border-divider">
      {TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => onSelect(tab.key)}
          className={`flex flex-col items-center px-3 py-1.5 text-[8px] font-mono uppercase tracking-[0.16em] border-b-2 transition-colors -mb-px ${
            activeTab === tab.key
              ? 'border-accent text-accent'
              : 'border-transparent text-text4 hover:text-text3'
          }`}
        >
          {tab.label}
          <span className="text-[7px] tracking-normal normal-case opacity-60">{tab.codes}</span>
        </button>
      ))}
    </div>
  );
}

// ── Compact metric tile (for MetricsGrid) ─────────────────────
export function TransitMetricTile() {
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
