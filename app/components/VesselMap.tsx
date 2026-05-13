'use client';

import { useEffect, useRef, useState } from 'react';
import { useLang } from './LangContext';

/**
 * VesselMap
 *
 * Shows real AIS vessel positions fetched from /api/vessels (aisstream.io).
 * When no live data is available (collector not running / no key / stale),
 * renders the map background with a clear "no data" notice.
 * No simulated or fake vessel positions are ever drawn.
 */

type AisVessel = {
  mmsi: number;
  name: string;
  type: string;
  lat: number;
  lon: number;
  sog: number | null;
  cog: number | null;
  heading: number | null;
};
type AisResponse = {
  running: boolean;
  stale: boolean;
  ageSec: number | null;
  count: number;
  vessels: AisVessel[];
  generatedAt: string;
  source: string;
  bbox?: [[number, number], [number, number]];
};

// Bounding box used by the collector — keep in sync with ais-collector.
const BBOX: [[number, number], [number, number]] = [[25.2, 54.6], [27.8, 58.4]];

const TYPE_COLOR: Record<string, string> = {
  Tanker:    '#F59E0B', // amber — the oil ships everyone watches
  Cargo:     '#38BDF8', // cyan
  Passenger: '#67E8F9',
  Fishing:   '#A78BFA',
  Military:  '#F97316',
  Pilot:     '#10B981',
  Tug:       '#10B981',
  Unknown:   '#A9B4C2',
};

function drawMapBase(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
) {
  // Background
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0B0F18';
  ctx.fillRect(0, 0, W, H);

  // Coastline hints — Iran top-left, Oman bottom-right
  ctx.strokeStyle = '#1E2533';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W * 0.18, 0);
  ctx.lineTo(W * 0.22, H * 0.4);
  ctx.lineTo(W * 0.28, H * 0.55);
  ctx.lineTo(W * 0.26, H);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W * 0.82, 0);
  ctx.lineTo(W * 0.78, H * 0.4);
  ctx.lineTo(W * 0.72, H * 0.55);
  ctx.lineTo(W * 0.74, H);
  ctx.stroke();

  // TSS lane guides (faint dashed reference lines only — no fake vessels)
  ctx.strokeStyle = 'rgba(6,182,212,0.07)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(W * 0.28, H * 0.38);
  ctx.lineTo(W * 0.72, H * 0.38);
  ctx.moveTo(W * 0.28, H * 0.62);
  ctx.lineTo(W * 0.72, H * 0.62);
  ctx.stroke();
  ctx.setLineDash([]);
}

function projectVessel(v: AisVessel, W: number, H: number) {
  const [[swLat, swLon], [neLat, neLon]] = BBOX;
  const x = ((v.lon - swLon) / (neLon - swLon)) * W;
  const y = H - ((v.lat - swLat) / (neLat - swLat)) * H;
  return { x, y };
}

export default function VesselMap() {
  const { lang, t } = useLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [ais, setAis] = useState<AisResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Poll /api/vessels every 6 seconds for fresh AIS positions
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/vessels', { cache: 'no-store' });
        if (!res.ok) return;
        const j = (await res.json()) as AisResponse;
        if (alive) {
          setAis(j);
          setLoading(false);
        }
      } catch {
        if (alive) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 6000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // Show vessels whether fresh or stale — stale means slightly old but real data
    const hasLiveVessels = ais && ais.running && ais.vessels?.length > 0;

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const W = canvas!.width / dpr;
      const H = canvas!.height / dpr;

      drawMapBase(ctx!, W, H);

      if (hasLiveVessels) {
        for (const v of ais!.vessels) {
          const { x, y } = projectVessel(v, W, H);
          if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
          const color = TYPE_COLOR[v.type] ?? TYPE_COLOR.Unknown;

          // Glow ring
          ctx!.fillStyle = color;
          ctx!.globalAlpha = 0.14;
          ctx!.beginPath();
          ctx!.arc(x, y, 6, 0, Math.PI * 2);
          ctx!.fill();

          // Solid dot
          ctx!.globalAlpha = 0.95;
          ctx!.beginPath();
          ctx!.arc(x, y, 2.3, 0, Math.PI * 2);
          ctx!.fill();

          // Heading tick
          if (v.heading != null) {
            const rad = (v.heading * Math.PI) / 180;
            ctx!.globalAlpha = 0.85;
            ctx!.strokeStyle = color;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(x, y);
            ctx!.lineTo(x + Math.sin(rad) * 6, y - Math.cos(rad) * 6);
            ctx!.stroke();
          }
          ctx!.globalAlpha = 1;
        }
      }

      // Static labels
      ctx!.fillStyle = '#6B7787';
      ctx!.font = '9px monospace';
      ctx!.fillText(lang === 'en' ? 'IRAN' : 'IRÃ', W * 0.03, H * 0.48);
      ctx!.fillText('OMAN', W * 0.9, H * 0.48);
      ctx!.fillText(
        lang === 'en' ? 'STRAIT OF HORMUZ' : 'ESTREITO DE ORMUZ',
        W * 0.34,
        H * 0.52
      );

      // Only request next frame when animating live vessels
      if (hasLiveVessels && !reducedMotion) {
        rafRef.current = requestAnimationFrame(draw);
      }
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [lang, ais]);

  const live = ais && ais.running && ais.vessels?.length > 0;

  // Determine the status badge content
  let badge: { text: string; cls: string };
  if (loading) {
    badge = { text: lang === 'en' ? 'LOADING…' : 'CARREGANDO…', cls: 'bg-bg2/80 text-text3 border border-divider' };
  } else if (live) {
    badge = { text: `LIVE · ${ais!.count} ${lang === 'en' ? 'ships' : 'navios'}`, cls: 'bg-ok/15 text-ok border border-ok/30' };
  } else if (live && ais?.stale) {
    badge = { text: `LIVE · ${ais!.count} ${lang === 'en' ? 'ships' : 'navios'} · ${lang === 'en' ? 'refreshing' : 'atualizando'}`, cls: 'bg-ok/10 text-ok border border-ok/20' };
  } else {
    badge = { text: lang === 'en' ? 'AIS OFFLINE' : 'AIS OFFLINE', cls: 'bg-bg2/80 text-text3 border border-divider' };
  }

  return (
    <div
      className="relative h-[220px] md:h-[280px] rounded-lg overflow-hidden border border-divider bg-[#0B0F18]"
      role="img"
      aria-label={
        live
          ? `Live AIS vessels in the Strait of Hormuz — ${ais!.count} ships`
          : 'Strait of Hormuz map — no live AIS data available'
      }
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Status badge — top left */}
      <div className="absolute top-2 left-2 right-2 flex justify-between text-[10px] font-mono">
        <span className={`px-1.5 py-0.5 rounded ${badge.cls}`}>
          {badge.text}
        </span>
        {live && (
          <span className="text-text3">
            via {ais!.source} · {ais!.ageSec}s
          </span>
        )}
      </div>

      {/* No-data overlay — center message when AIS is offline */}
      {!loading && !live && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
          <span className="text-[11px] font-mono text-text3">
            {lang === 'en' ? 'No vessel data' : 'Sem dados de embarcações'}
          </span>
          <span className="text-[9px] font-mono text-text3/60">
            {lang === 'en' ? 'AIS collector offline or key not set' : 'Coletor AIS offline ou chave não configurada'}
          </span>
        </div>
      )}

      {/* Coordinate footer */}
      <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[9px] text-text3 font-mono">
        <span>{t.map.lat}: 26.5°N</span>
        <span>{t.map.lon}: 56.4°E</span>
        <span>{t.map.zoom}: 9x</span>
      </div>
    </div>
  );
}
