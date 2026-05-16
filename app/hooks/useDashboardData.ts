'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardData } from '@/app/lib/types';
import { getMockData } from '@/app/lib/mockData';
import { fetchDashboardData, fetchTimeline, fetchNews, deriveStatus } from '@/app/lib/api';
import { useLang } from '@/app/components/LangContext';
import { LOADING_SEED_DATE } from '@/app/lib/constants';

const DASHBOARD_REFRESH_MS = 5 * 60_000;  // 5 min
const TIMELINE_REFRESH_MS  = 60_000;       // 60 s
const NEWS_REFRESH_MS      = 10 * 60_000;  // 10 min

export interface DashboardDataState {
  data: DashboardData;
  dataReady: boolean;
  newsLoading: boolean;
  loadData: () => Promise<void>;
}

export function useDashboardData(): DashboardDataState {
  const { lang } = useLang();
  const seed = getMockData(lang);

  const loadingStatus = {
    state:        'PARTIALLY_CLOSED' as const,
    tensionLevel: 'NORMAL'           as const,
    tensionIndex: 0,
    lastUpdated:  LOADING_SEED_DATE,
    confidence:   0,
    reason:       lang === 'pt'
      ? 'Obtendo dados de inteligência ao vivo…'
      : 'Fetching live intelligence data…',
  };

  const [data, setData] = useState<DashboardData>(() => ({
    ...seed,
    status: loadingStatus,
    news: [],
    timeline: [],
    metrics: {
      ...seed.metrics,
      brentPrice: 0, brentChange: 0, brentChangePercent: 0,
      brentDown: true, eventsLast24h: 0, eventsChange: 0,
      eventsDown: true, lastIncident: null,
    },
  }));
  const [dataReady, setDataReady]   = useState(false);
  const [newsLoading, setNewsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const realData = await fetchDashboardData();
      setData((prev) => {
        const merged = { ...prev, ...realData } as DashboardData;
        return {
          ...merged,
          status: deriveStatus(merged.timeline ?? [], merged.metrics?.brentChangePercent ?? null, lang, merged.metrics?.brentPrice ?? null),
        };
      });
    } catch (err) {
      console.warn('Dashboard fetch failed:', err);
    }
  }, [lang]);

  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const news = await fetchNews();
      if (news && news.length > 0) setData((prev) => ({ ...prev, news }));
    } catch {
      // non-critical — fail silently
    } finally {
      setNewsLoading(false);
    }
  }, []);

  const refreshTimeline = useCallback(async () => {
    const events = await fetchTimeline();
    if (events && events.length > 0) {
      setData((prev) => ({
        ...prev,
        timeline: events,
        status: deriveStatus(events, prev.metrics?.brentChangePercent ?? null, lang, prev.metrics?.brentPrice ?? null),
      }));
    }
  }, [lang]);

  // Initial loads
  useEffect(() => {
    let cancelled = false;
    (async () => { await loadData(); if (!cancelled) setDataReady(true); })();
    return () => { cancelled = true; };
  }, [loadData]);

  useEffect(() => { loadNews(); }, [loadNews]);

  // Polling
  useEffect(() => { const id = setInterval(loadData,        DASHBOARD_REFRESH_MS); return () => clearInterval(id); }, [loadData]);
  useEffect(() => { const id = setInterval(refreshTimeline, TIMELINE_REFRESH_MS);  return () => clearInterval(id); }, [refreshTimeline]);
  useEffect(() => { const id = setInterval(loadNews,        NEWS_REFRESH_MS);       return () => clearInterval(id); }, [loadNews]);

  // Re-derive on language change
  useEffect(() => {
    setData((prev) => ({
      ...prev,
      status: deriveStatus(prev.timeline ?? [], prev.metrics?.brentChangePercent ?? null, lang, prev.metrics?.brentPrice ?? null),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return { data, dataReady, newsLoading, loadData };
}
