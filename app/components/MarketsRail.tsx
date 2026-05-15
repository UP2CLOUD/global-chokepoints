'use client';

import { useEffect, useState } from 'react';
import { useLang } from './LangContext';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Ticker = {
  label: string;
  symbol: string;
  unit: string;
  price?: number;
  change?: number;
  changePercent?: number;
  asOf?: string;
  history?: { date: string; price: number }[];
  provider?: string;
  stale?: boolean;
  error?: string;
};

type MarketsResponse = {
  markets: Record<string, Ticker>;
  source: string;
  generatedAt: string;
};

function Sparkline({ data, up }: { data: { date: string; price: number }[]; up: boolean }) {
  if (!data || data.length < 2) return null;
  const prices = data.map(d => d.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const w = 84, h = 22, pad = 2;
  const stepX = (w - pad * 2) / (data.length - 1);
  const pts = prices
    .map((p, i) => `${(pad + i * stepX).toFixed(1)},${(pad + (1 - (p - min) / range) * (h - pad * 2)).toFixed(1)}`)
    .join(' L ');
  const stroke = up ? 'var(--ok)' : 'var(--danger)';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <path d={`M ${pts}`} fill="none" stroke={stroke} strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  );
}

export default function MarketsRail() {
  const { t, locale } = useLang();
  const [data, setData] = useState<MarketsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/markets', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const j = (await res.json()) as MarketsResponse;
        if (alive) { setData(j); setLoading(false); }
      } catch {
        if (alive) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const order = ['brent', 'wti', 'natgas'];
  const items: { key: string; t: Ticker }[] = order
    .map(k => ({ key: k, t: data?.markets?.[k] ?? { label: k.toUpperCase(), symbol: '', unit: '' } }))
    .filter(x => !!x.t);

  return (
    <section className="rounded-xl border border-divider bg-card/70 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
          {t.markets.title}
        </div>
        <div className="text-[10px] font-mono text-text3">
          {data ? `via Yahoo Finance · ${new Date(data.generatedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}` : '—'}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {items.map(({ key, t }) => {
          const ok = !t.error && t.price != null;
          const Up = (t.changePercent ?? 0) > 0;
          const Down = (t.changePercent ?? 0) < 0;
          const TrendIcon = Up ? TrendingUp : Down ? TrendingDown : Minus;
          const trendCol = Up ? 'text-ok' : Down ? 'text-danger' : 'text-text2';
          return (
            <div key={key} className="rounded-lg border border-divider bg-bg1/60 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-text2">{t.label}</span>
                <span className="text-[9px] font-mono text-text4">{t.symbol}</span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className={`text-[20px] font-bold font-mono leading-none ${ok ? 'text-text' : 'text-text3'}`}>
                    {ok ? `$${t.price!.toFixed(2)}` : '—'}
                  </div>
                  <div className="text-[10px] font-mono text-text3 mt-1">{t.unit}</div>
                </div>
                {ok && t.history && <Sparkline data={t.history} up={!Down} />}
              </div>
              {ok && (
                <div className="mt-2 flex items-center gap-2">
                  <div className={`inline-flex items-center gap-1 text-[11px] font-mono ${trendCol}`}>
                    <TrendIcon size={12} />
                    {(t.change ?? 0) >= 0 ? '+' : ''}{(t.change ?? 0).toFixed(2)} ({(t.changePercent ?? 0) >= 0 ? '+' : ''}{(t.changePercent ?? 0).toFixed(2)}%)
                  </div>
                  {t.stale && (
                    <span className="text-[9px] font-mono stale px-1.5 py-0.5 rounded uppercase tracking-wider">stale</span>
                  )}
                </div>
              )}
              {!ok && !loading && (
                <div className="mt-2 text-[10px] font-mono down inline-block px-1.5 py-0.5 rounded">
                  feed down
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
