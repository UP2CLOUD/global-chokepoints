'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { DashboardData } from '@/app/lib/types';
import { getMockData } from '@/app/lib/mockData';
import { fetchDashboardData, fetchTimeline, deriveStatus } from '@/app/lib/api';
import { LangProvider, useLang } from '@/app/components/LangContext';
import Header from '@/app/components/Header';
import HeroStatus from '@/app/components/HeroStatus';
import MetricsGrid from '@/app/components/MetricsGrid';
import BrentChart from '@/app/components/BrentChart';
import MarketsRail from '@/app/components/MarketsRail';
import WeatherPanel from '@/app/components/WeatherPanel';
import NewsFeed from '@/app/components/NewsFeed';
import Timeline from '@/app/components/Timeline';
import Footer from '@/app/components/Footer';
import RefreshButton from '@/app/components/RefreshButton';
import LoadingScreen from '@/app/components/LoadingScreen';
import ScrollIndicator from '@/app/components/ScrollIndicator';
import { TrendingUp, Navigation, Activity } from 'lucide-react';

// ── 3D hero — dynamic import, no SSR (WebGL) ─────────────────
const HeroScene = dynamic(() => import('@/app/components/HeroScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#07090F] flex items-center justify-center">
      <span className="text-[11px] font-mono text-text3 tracking-[0.2em]">INITIALISING 3D…</span>
    </div>
  ),
});

// ── AIS polling ───────────────────────────────────────────────
type AisVessel = { mmsi: number; lat: number; lon: number; type: string; heading: number | null };
type AisResponse = { running: boolean; vessels: AisVessel[] };

function useAisVessels() {
  const [vessels, setVessels] = useState<AisVessel[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/vessels', { cache: 'no-store' });
        if (!r.ok) return;
        const j = (await r.json()) as AisResponse;
        if (j.running && j.vessels?.length > 0) setVessels(j.vessels);
      } catch { /* keep last */ }
    };
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);
  return vessels;
}

// ── Main dashboard ────────────────────────────────────────────
function DashboardContent() {
  const { lang, t } = useLang();
  const vessels = useAisVessels();

  const seed = getMockData(lang);
  const [data, setData] = useState<DashboardData>(() => ({
    ...seed,
    news: [],
    timeline: [],
    metrics: {
      ...seed.metrics,
      brentPrice: 0, brentChange: 0, brentChangePercent: 0,
      brentDown: true, eventsLast24h: 0, eventsChange: 0,
      eventsDown: true, lastIncident: null,
    },
  }));
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const realData = await fetchDashboardData();
      setData((prev) => {
        const merged = { ...prev, ...realData } as DashboardData;
        return { ...merged, status: deriveStatus(merged.timeline ?? [], merged.metrics?.brentChangePercent ?? null, lang) };
      });
    } catch (err) {
      console.warn('Dashboard fetch failed:', err);
    }
  }, [lang]);

  const refreshTimeline = useCallback(async () => {
    const events = await fetchTimeline();
    if (events && events.length > 0) {
      setData((prev) => ({
        ...prev, timeline: events,
        status: deriveStatus(events, prev.metrics?.brentChangePercent ?? null, lang),
      }));
    }
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    (async () => { await loadData(); if (!cancelled) setLoading(false); })();
    return () => { cancelled = true; };
  }, [loadData]);

  useEffect(() => { const id = setInterval(loadData,        5 * 60_000); return () => clearInterval(id); }, [loadData]);
  useEffect(() => { const id = setInterval(refreshTimeline, 60_000);     return () => clearInterval(id); }, [refreshTimeline]);

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
      {/* Fixed glass header */}
      <Header />

      {/* ── HERO — full viewport 3D scene ──────────────────── */}
      <section
        id="hero"
        className="relative w-full h-screen overflow-hidden"
        aria-label="3D Strait of Hormuz overview"
      >
        <HeroScene status={data.status} vessels={vessels} />

        {/* Overlay: bottom-left status pill */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          {/* Gradient fade to content below */}
          <div className="h-32 bg-gradient-to-t from-bg to-transparent" />
        </div>

        {/* Status badge — top right */}
        <div className="absolute top-16 right-4 md:right-6 pointer-events-none">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md text-[11px] font-mono ${
            data.status.state === 'OPEN'
              ? 'bg-ok/10 border-ok/30 text-ok'
              : data.status.state === 'CLOSED'
              ? 'bg-danger/10 border-danger/35 text-danger'
              : 'bg-caution/10 border-caution/30 text-caution'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              data.status.state === 'OPEN' ? 'bg-ok' : data.status.state === 'CLOSED' ? 'bg-danger' : 'bg-caution'
            }`} />
            {data.status.state === 'OPEN'
              ? (lang === 'en' ? 'STRAIT OPEN' : 'ESTREITO ABERTO')
              : data.status.state === 'CLOSED'
              ? (lang === 'en' ? 'STRAIT CLOSED' : 'ESTREITO FECHADO')
              : (lang === 'en' ? 'DISRUPTED' : 'INTERROMPIDO')}
          </div>
        </div>

        {/* Lane legend — bottom left */}
        <div className="absolute bottom-10 left-4 md:left-6 flex flex-col gap-1.5 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-6 h-[2px] bg-cyan-400 rounded" />
            <span className="text-[9px] font-mono text-text3 uppercase tracking-wider">
              {lang === 'en' ? 'Inbound lane' : 'Faixa entrada'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-[2px] bg-amber-400 rounded" />
            <span className="text-[9px] font-mono text-text3 uppercase tracking-wider">
              {lang === 'en' ? 'Outbound lane' : 'Faixa saída'}
            </span>
          </div>
          {vessels.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[9px] font-mono text-text3">
                {vessels.length} AIS {lang === 'en' ? 'vessels' : 'navios'}
              </span>
            </div>
          )}
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <ScrollIndicator />
        </div>
      </section>

      {/* ── CONTENT ────────────────────────────────────────── */}
      <main className="max-w-[1280px] mx-auto px-4 py-8 md:px-6 md:py-10 flex flex-col gap-6 md:gap-8">

        {/* Status card — full width below hero */}
        <HeroStatus status={data.status} />

        {/* Metrics */}
        <MetricsGrid metrics={data.metrics} />

        {/* Brent chart + Vessel map (two column) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 md:gap-6">
          <section className="rounded-2xl border border-divider bg-card/60 backdrop-blur-sm p-5 md:p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
                <TrendingUp size={13} className="text-accent" />
                {t.chart.title}
              </div>
              <span className="text-[10px] text-text3 font-mono">Yahoo Finance · {t.chart.period}</span>
            </div>
            <BrentChart />
          </section>

          <section className="rounded-2xl border border-divider bg-card/60 backdrop-blur-sm p-5 md:p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2">
                <Navigation size={13} className="text-accent" />
                {t.map.title}
              </div>
              <span className="text-[10px] text-text3 font-mono">aisstream.io</span>
            </div>
            {/* Compact 2D vessel map in panel */}
            <VesselMapPanel vessels={vessels} />
          </section>
        </div>

        {/* Markets + Weather */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          <MarketsRail />
          <WeatherPanel />
        </div>

        {/* Intelligence — News + Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2 mb-3">
              <Activity size={13} className="text-accent" />
              {lang === 'en' ? 'Intelligence Feed' : 'Feed de Inteligência'}
            </div>
            <NewsFeed news={data.news} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2 mb-3">
              <Activity size={13} className="text-accent" />
              {lang === 'en' ? 'Event Timeline' : 'Linha do Tempo'}
            </div>
            <Timeline events={data.timeline} />
          </div>
        </div>

        <Footer />
      </main>

      <RefreshButton onRefresh={loadData} />
    </div>
  );
}

// ── Compact AIS panel (2D canvas) ─────────────────────────────
type VesselMapPanelProps = { vessels: AisVessel[] };

function VesselMapPanel({ vessels }: VesselMapPanelProps) {
  const { lang } = useLang();
  // Reuse the existing canvas-based VesselMap
  const VesselMap = dynamic(() => import('@/app/components/VesselMap'), { ssr: false });
  return <VesselMap />;
}

export default function Dashboard() {
  return (
    <LangProvider>
      <DashboardContent />
    </LangProvider>
  );
}
