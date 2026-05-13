'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardData } from '@/app/lib/types';
import { getMockData } from '@/app/lib/mockData';
import { fetchDashboardData, fetchTimeline, deriveStatus } from '@/app/lib/api';
import { LangProvider, useLang } from '@/app/components/LangContext';
import StatusBar from '@/app/components/StatusBar';
import Header from '@/app/components/Header';
import HeroStatus from '@/app/components/HeroStatus';
import MetricsGrid from '@/app/components/MetricsGrid';
import BrentChart from '@/app/components/BrentChart';
import VesselMap from '@/app/components/VesselMap';
import MarketsRail from '@/app/components/MarketsRail';
import WeatherPanel from '@/app/components/WeatherPanel';
import NewsFeed from '@/app/components/NewsFeed';
import Timeline from '@/app/components/Timeline';
import Footer from '@/app/components/Footer';
import RefreshButton from '@/app/components/RefreshButton';
import LoadingScreen from '@/app/components/LoadingScreen';
import { TrendingUp, Navigation } from 'lucide-react';

function DashboardContent() {
  const { lang, t } = useLang();

  // Seed: structure only; live data overrides on first successful fetch.
  const seed = getMockData(lang);
  const [data, setData] = useState<DashboardData>(() => ({
    ...seed,
    // Wipe seeded news so we don't show fixtures before the first fetch.
    news: [],
    timeline: [],
    metrics: {
      ...seed.metrics,
      brentPrice: 0,
      brentChange: 0,
      brentChangePercent: 0,
      brentDown: true,
      eventsLast24h: 0,
      eventsChange: 0,
      eventsDown: true,
      lastIncident: null,
    },
  }));
  const [loading, setLoading] = useState(true);

  // --- Full dashboard load -----------------
  const loadData = useCallback(async () => {
    try {
      const realData = await fetchDashboardData();
      setData((prev) => {
        const merged: DashboardData = { ...prev, ...realData } as DashboardData;
        const status = deriveStatus(
          merged.timeline ?? [],
          merged.metrics?.brentChangePercent ?? null,
          lang
        );
        return { ...merged, status };
      });
    } catch (err) {
      console.warn('Real API fetch failed, keeping previous data:', err);
    }
  }, [lang]);

  // --- Timeline-only refresh (cheap, every 60s) --------------
  const refreshTimeline = useCallback(async () => {
    const events = await fetchTimeline();
    if (events && events.length > 0) {
      setData((prev) => ({
        ...prev,
        timeline: events,
        status: deriveStatus(
          events,
          prev.metrics?.brentChangePercent ?? null,
          lang
        ),
      }));
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
    const id = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadData]);

  useEffect(() => {
    const id = setInterval(refreshTimeline, 60 * 1000);
    return () => clearInterval(id);
  }, [refreshTimeline]);

  // Language change — recompute status text in the new language; do NOT
  // overwrite live news/timeline with seed.
  useEffect(() => {
    setData((prev) => ({
      ...prev,
      status: deriveStatus(prev.timeline ?? [], prev.metrics?.brentChangePercent ?? null, lang),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-bg text-text">
      <StatusBar />
      <Header />

      <main className="max-w-[1280px] mx-auto px-4 py-4 md:px-6 md:py-6 flex flex-col gap-4 md:gap-5">
        <HeroStatus status={data.status} />
        <MetricsGrid metrics={data.metrics} />

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 md:gap-5">
          <section className="rounded-xl border border-divider bg-card/70 p-4 md:p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
                <TrendingUp size={13} className="text-accent" />
                {t.chart.title}
              </div>
              <span className="text-[10px] text-text3 font-mono">via Yahoo Finance · {t.chart.period}</span>
            </div>
            <BrentChart />
          </section>

          <section className="rounded-xl border border-divider bg-card/70 p-4 md:p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
                <Navigation size={13} className="text-accent" />
                {t.map.title}
              </div>
              <span className="text-[10px] text-text3 font-mono">
                {lang === 'en' ? 'Simulated lanes (no AIS key)' : 'Faixas simuladas (sem AIS)'}
              </span>
            </div>
            <VesselMap />
            <p className="mt-2 text-center text-[10px] text-text3 font-mono">
              {t.map.disclaimer}
            </p>
          </section>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <MarketsRail />
          <WeatherPanel />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <NewsFeed news={data.news} />
          <Timeline events={data.timeline} />
        </div>

        <Footer />
      </main>

      <RefreshButton onRefresh={loadData} />
    </div>
  );
}

export default function Dashboard() {
  return (
    <LangProvider>
      <DashboardContent />
    </LangProvider>
  );
}
