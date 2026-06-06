'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardData } from '@/app/lib/types';
import { fetchDashboardData, deriveStatus } from '@/app/lib/api';
import { getMockData } from '@/app/lib/mockData';
import { useLang } from '@/app/components/LangContext';
import HeroStatus from '@/app/components/HeroStatus';
import LoadingScreen from '@/app/components/LoadingScreen';

type CPItem = { key: string; name: string; status: 'critical' | 'degraded' | 'elevated' | 'normal'; riskIndex: number };

const CP_COLOR: Record<string, string> = {
  critical: 'text-danger', degraded: 'text-warn', elevated: 'text-caution', normal: 'text-ok',
};
const CP_SHORT: Record<string, string> = {
  hormuz: 'HORZ', redsea: 'RED SEA', suez: 'SUEZ', panama: 'PAN', taiwan: 'TWN',
};

function EmbedContent() {
  const { lang, setLang, t } = useLang();
  const [data, setData]      = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cpData, setCpData]   = useState<CPItem[] | null>(null);

  // Override stored lang from URL param (used by embed configurator preview)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search).get('lang');
    const valid = ['en','pt','es','fr','it','ru','de','zh','ja','ar'];
    if (p && valid.includes(p)) setLang(p as import('@/app/lib/types').Lang);
  }, [setLang]);

  const loadData = useCallback(async () => {
    try {
      const realData = await fetchDashboardData();
      const status = deriveStatus(
        realData.timeline ?? [],
        realData.metrics?.brentChangePercent ?? null,
        lang
      );
      const seed = getMockData(lang);
      const merged: DashboardData = { ...seed, ...realData, status };
      setData(merged);
    } catch (err) {
      console.warn('Real API fetch failed:', err);
    }
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadData();
      if (!cancelled) setLoading(false);
    })();
    const id = setInterval(loadData, 90_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [loadData]);

  const loadChokepoints = useCallback(() => {
    fetch('/v1/chokepoints', { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.chokepoints) setCpData(d.chokepoints); })
      .catch(err => console.warn('[embed] chokepoints fetch failed:', err));
  }, []);

  useEffect(() => {
    loadChokepoints();
    const id = setInterval(loadChokepoints, 90_000);
    return () => clearInterval(id);
  }, [loadChokepoints]);

  if (loading || !data) return <LoadingScreen />;

  return (
    <div className="flex flex-col gap-3">
      <a href="/" target="_blank" rel="noopener noreferrer" className="block hover:opacity-95 transition-opacity">
        <HeroStatus status={data.status} brentPrice={data.metrics?.brentPrice} />
      </a>

      {/* Multi-CP status strip */}
      {cpData && (
        <div className="grid grid-cols-5 gap-px bg-divider border border-divider">
          {cpData.map(cp => (
            <div key={cp.key} className="bg-bg1 px-1 py-1.5 flex flex-col items-center gap-0.5">
              <span className="text-[7px] font-mono text-text4 uppercase truncate w-full text-center tracking-wide">
                {CP_SHORT[cp.key] ?? cp.key}
              </span>
              <span className={`text-[7px] font-mono font-bold uppercase ${CP_COLOR[cp.status] ?? 'text-text4'}`}>
                {cp.status.slice(0, 4).toUpperCase()}
              </span>
              <span className="text-[7px] font-mono text-text4 tabular-nums">{cp.riskIndex}</span>
            </div>
          ))}
        </div>
      )}

      <div className="text-center">
        <a href="/" target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-text3 hover:text-accent transition-colors">
          {t.nav.poweredBy}
        </a>
      </div>
    </div>
  );
}

export default function EmbedPage() {
  return <EmbedContent />;
}
