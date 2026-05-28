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
  const { lang } = useLang();
  const [data, setData]     = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cpData, setCpData]  = useState<CPItem[] | null>(null);

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
    return () => { cancelled = true; };
  }, [loadData]);

  useEffect(() => {
    fetch('/v1/chokepoints', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.chokepoints) setCpData(d.chokepoints); })
      .catch(() => {});
  }, []);

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
          Powered by Global Chokepoints Alerts
        </a>
      </div>
    </div>
  );
}

export default function EmbedPage() {
  return <EmbedContent />;
}
