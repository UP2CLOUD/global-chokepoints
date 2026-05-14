'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { DashboardData } from '@/app/lib/types';
import { getMockData } from '@/app/lib/mockData';
import { fetchDashboardData, fetchTimeline, fetchNews, deriveStatus } from '@/app/lib/api';
import { LangProvider, useLang } from '@/app/components/LangContext';
import Header from '@/app/components/Header';
import HeroStatus from '@/app/components/HeroStatus';
import MetricsGrid from '@/app/components/MetricsGrid';
import BrentChart from '@/app/components/BrentChart';
import TransitChart from '@/app/components/TransitChart';
import MarketsRail from '@/app/components/MarketsRail';
import WeatherPanel from '@/app/components/WeatherPanel';
import NewsFeed from '@/app/components/NewsFeed';
import Timeline from '@/app/components/Timeline';
import Footer from '@/app/components/Footer';
import RefreshButton from '@/app/components/RefreshButton';
// LoadingScreen removed — dashboard renders instantly with progressive loading
import ScrollIndicator from '@/app/components/ScrollIndicator';
import AdSlot from '@/app/components/AdSlot';
import { SubscribeInlineCTA } from '@/app/components/SubscribeModal';
import { TrendingUp, BarChart2, Activity, Zap } from 'lucide-react';

// ── Hero map — dynamic import, no SSR (Leaflet) ───────────────
const HormuzMap = dynamic(() => import('@/app/components/HormuzMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#07090F] flex items-center justify-center">
      <span className="text-[11px] font-mono text-text3 tracking-[0.2em]">LOADING MAP…</span>
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

  // Neutral loading status — PARTIALLY_CLOSED/yellow, confidence=0.
  // Prevents the green "YES" flash before the real API result lands.
  const loadingStatus = {
    state:        'PARTIALLY_CLOSED' as const,
    tensionLevel: 'NORMAL'           as const,
    tensionIndex: 0,
    lastUpdated:  '2026-05-14T00:00:00.000Z', // static — avoids SSR/client hydration mismatch
    confidence:   0,
    reason:       lang === 'en'
      ? 'Fetching live intelligence data…'
      : 'Obtendo dados de inteligência ao vivo…',
  };

  const [data, setData] = useState<DashboardData>(() => ({
    ...seed,
    status: loadingStatus,   // override seed's hard-coded OPEN state
    news: [],
    timeline: [],
    metrics: {
      ...seed.metrics,
      brentPrice: 0, brentChange: 0, brentChangePercent: 0,
      brentDown: true, eventsLast24h: 0, eventsChange: 0,
      eventsDown: true, lastIncident: null,
    },
  }));
  const [dataReady, setDataReady] = useState(false);
  const [newsLoading, setNewsLoading] = useState(true);

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

  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const news = await fetchNews();
      if (news && news.length > 0) setData((prev) => ({ ...prev, news }));
    } catch {
      // fail silently — news is non-critical
    } finally {
      setNewsLoading(false);
    }
  }, []);

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
    (async () => { await loadData(); if (!cancelled) setDataReady(true); })();
    return () => { cancelled = true; };
  }, [loadData]);

  // News loads independently — GDELT is slow (2–9s) and must not block status/metrics
  useEffect(() => { loadNews(); }, [loadNews]);

  useEffect(() => { const id = setInterval(loadData,        5 * 60_000); return () => clearInterval(id); }, [loadData]);
  useEffect(() => { const id = setInterval(refreshTimeline, 60_000);     return () => clearInterval(id); }, [refreshTimeline]);
  useEffect(() => { const id = setInterval(loadNews,       10 * 60_000); return () => clearInterval(id); }, [loadNews]);

  useEffect(() => {
    setData((prev) => ({
      ...prev,
      status: deriveStatus(prev.timeline ?? [], prev.metrics?.brentChangePercent ?? null, lang),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // No loading gate — render immediately with seed data + shimmer skeletons

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Fixed glass header */}
      <Header />

      {/* ── HERO — full viewport 3D scene ──────────────────── */}
      <section
        id="hero"
        className="relative w-full overflow-hidden"
        style={{ height: 'min(62vh, 520px)', minHeight: '340px' }}
        aria-label="Strait of Hormuz live map"
      >
        <HormuzMap status={data.status} vessels={vessels} />

        {/* Overlay: bottom-left status pill */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          {/* Gradient fade to content below */}
          <div className="h-32 bg-gradient-to-t from-bg to-transparent" />
        </div>

        {/* Status badge — top right */}
        <div className="absolute top-16 right-4 md:right-6 pointer-events-none z-[600]">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md text-[11px] font-mono transition-colors duration-500 ${
            !dataReady
              ? 'bg-caution/10 border-caution/30 text-caution'
              : data.status.state === 'OPEN'
              ? 'bg-ok/10 border-ok/30 text-ok'
              : data.status.state === 'CLOSED'
              ? 'bg-danger/10 border-danger/35 text-danger'
              : 'bg-caution/10 border-caution/30 text-caution'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              !dataReady ? 'bg-caution'
              : data.status.state === 'OPEN' ? 'bg-ok'
              : data.status.state === 'CLOSED' ? 'bg-danger'
              : 'bg-caution'
            }`} />
            {!dataReady
              ? (lang === 'en' ? 'SYNCING…' : 'SINCRONIZANDO…')
              : data.status.state === 'OPEN'
              ? (lang === 'en' ? 'STRAIT OPEN' : 'ESTREITO ABERTO')
              : data.status.state === 'CLOSED'
              ? (lang === 'en' ? 'STRAIT CLOSED' : 'ESTREITO FECHADO')
              : (lang === 'en' ? 'DISRUPTED' : 'INTERROMPIDO')}
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <ScrollIndicator />
        </div>
      </section>

      {/* ── CONTENT ────────────────────────────────────────── */}
      <main className="max-w-[1280px] mx-auto px-4 py-8 md:px-6 md:py-10 flex flex-col gap-6 md:gap-8">

        {/* Status card — full width below hero */}
        <div className="animate-fadeInUp" style={{ animationDelay: '0.05s' }}>
          <HeroStatus status={data.status} loading={!dataReady} />
        </div>

        {/* Metrics — shimmer skeletons until real data arrives */}
        <div className="animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <MetricsGrid metrics={data.metrics} loading={!dataReady} />
        </div>

        {/* Brent chart + Daily Transit count (two column) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 md:gap-6 animate-fadeInUp" style={{ animationDelay: '0.18s' }}>
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
                <BarChart2 size={13} className="text-accent" />
                {lang === 'en' ? 'Vessel Transits · Hormuz' : 'Trânsitos de Navios · Ormuz'}
              </div>
              <span className="text-[10px] text-text3 font-mono">IMF PortWatch</span>
            </div>
            <TransitChart />
          </section>
        </div>

        {/* Markets + Weather */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 animate-fadeInUp" style={{ animationDelay: '0.26s' }}>
          <MarketsRail />
          <WeatherPanel />
        </div>

        {/* Intelligence — News + Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 animate-fadeInUp" style={{ animationDelay: '0.34s' }}>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2 mb-3">
              <Activity size={13} className="text-accent" />
              {lang === 'en' ? 'Intelligence Feed' : 'Feed de Inteligência'}
            </div>
            <NewsFeed news={data.news} loading={newsLoading} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2 mb-3">
              <Activity size={13} className="text-accent" />
              {lang === 'en' ? 'Event Timeline' : 'Linha do Tempo'}
            </div>
            <Timeline events={data.timeline} />
          </div>
        </div>

        {/* Newsletter CTA — after intelligence sections */}
        <div className="animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
          <SubscribeInlineCTA />
        </div>

        {/* API Access CTA */}
        <div className="animate-fadeInUp rounded-2xl border border-divider bg-card/40 backdrop-blur-sm p-5 md:p-6" style={{ animationDelay: '0.46s' }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text2 mb-2">
                <Zap size={13} className="text-accent" />
                {lang === 'en' ? 'Commercial API Access' : 'Acesso à API Comercial'}
              </div>
              <p className="text-[12px] text-text3 leading-relaxed max-w-lg">
                {lang === 'en'
                  ? 'Need real-time status data for your platform? Access the Strait monitoring API with webhooks, historical events, and commercial-grade rate limits.'
                  : 'Precisa de dados em tempo real para sua plataforma? Acesse a API de monitoramento do Estreito com webhooks, eventos históricos e limites comerciais.'}
              </p>
            </div>
            <a
              href="/v1/status"
              className="shrink-0 px-4 py-2 rounded-lg text-[11px] font-mono uppercase tracking-[0.12em]
                text-accent border border-accent/30 hover:border-accent/60 hover:bg-accent/5
                transition-all duration-200"
            >
              {lang === 'en' ? 'Explore API →' : 'Explorar API →'}
            </a>
          </div>
        </div>

        {/* Ad slot — below intelligence, before footer */}
        <AdSlot position="below-intel" />

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
