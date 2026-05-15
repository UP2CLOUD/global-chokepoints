'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardData } from '@/app/lib/types';
import { fetchDashboardData, deriveStatus } from '@/app/lib/api';
import { getMockData } from '@/app/lib/mockData';
import { useLang } from '@/app/components/LangContext';
import HeroStatus from '@/app/components/HeroStatus';
import LoadingScreen from '@/app/components/LoadingScreen';

function EmbedContent() {
  const { lang } = useLang();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const realData = await fetchDashboardData();
      const status = deriveStatus(
        realData.timeline ?? [],
        realData.metrics?.brentChangePercent ?? null,
        lang
      );
      const seed = getMockData(lang);
      // seed provides required fallbacks (metrics, news, timeline) if realData is partial
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

  if (loading || !data) return <LoadingScreen />;

  return (
    <div className="flex flex-col gap-4">
      {/* Target a blank page when opening the link */}
      <a href="/" target="_blank" rel="noopener noreferrer" className="block hover:opacity-95 transition-opacity">
        <HeroStatus status={data.status} />
      </a>
      <div className="text-center">
        <a href="/" target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-text3 hover:text-accent transition-colors">
          Powered by IsStraitHormuzOpen?
        </a>
      </div>
    </div>
  );
}

export default function EmbedPage() {
  return <EmbedContent />;
}
