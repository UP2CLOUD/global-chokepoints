'use client';

import { useEffect, useRef, useState } from 'react';
import { useLang } from './LangContext';

/**
 * VesselMap
 *
 * Two render modes, picked automatically:
 *
 *  1) LIVE AIS (when the collector script is running and /api/vessels
 *     returns at least one vessel) — real positions, projected into the
 *     map bounding box, dot color by ship type.
 *
 *  2) SIMULATED LANES (no key / collector not running) — calm two-lane
 *     drift labelled "simulated" so the user never confuses it for AIS.
 *
 * Either mode honors prefers-reduced-motion.
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

// Bounding box used by the collector — keep in sync.
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

type Simulated = {
  x: number; y: number; vx: number; size: number; pulse: number; lane: 'in' | 'out';
};

function initSimulated(count = 14): Simulated[] {
  return Array.from({ length: count }, (_, i) => {
    const lane: 'in' | 'out' = i % 2 === 0 ? 'in' : 'out';
    const yBase = lane === 'in' ? 0.38 : 0.62;
    return {
      x: Math.random(),
      y: yBase + (Math.random() - 0.5) * 0.08,
      vx: (lane === 'in' ? 1 : -1) * (0.025 + Math.random() * 0.02),
      size: 1.6 + Math.random() * 1.4,
      pulse: Math.random() * Math.PI * 2,
      lane,
    };
  });
}

export default function VesselMap() {
  const { lang, t } = useLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [ais, setAis] = useState<AisResponse | null>(null);

  // Poll /api/vessels every 6 seconds for fresh AIS positions
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/vessels', { cache: 'no-store' });
        if (!res.ok) return;
        const j = (await res.json()) as AisResponse;
        if (alive) setAis(j);
      } catch { /* keep last */ }
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

    const simulated = initSimulated();
    let lastTs = performance.now();
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

    function projectAis(v: AisVessel, W: number, H: number) {
      // Map latitude (SW.lat → NE.lat) to canvas Y (top → bottom),
      // longitude (SW.lon → NE.lon) to canvas X (left → right).
      const [[swLat, swLon], [neLat, neLon]] = BBOX;
      const x = ((v.lon - swLon) / (neLon - swLon)) * W;
      // higher latitude = "up" in geography but canvas y grows downward,
      // so we invert.
      const y = H - ((v.lat - swLat) / (neLat - swLat)) * H;
      return { x, y };
    }

    function draw(now: number) {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;

      const dpr = window.devicePixelRatio || 1;
      const W = canvas!.width / dpr;
      const H = canvas!.height / dpr;

      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = '#0B0F18';
      ctx!.fillRect(0, 0, W, H);

      // Coastlines — Iran top-left, Oman bottom-right
      ctx!.strokeStyle = '#1E2533';
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(W * 0.18, 0);
      ctx!.lineTo(W * 0.22, H * 0.4);
      ctx!.lineTo(W * 0.28, H * 0.55);
      ctx!.lineTo(W * 0.26, H);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(W * 0.82, 0);
      ctx!.lineTo(W * 0.78, H * 0.4);
      ctx!.lineTo(W * 0.72, H * 0.55);
      ctx!.lineTo(W * 0.74, H);
      ctx!.stroke();

      // Lane guides
      ctx!.strokeStyle = 'rgba(6,182,212,0.07)';
      ctx!.lineWidth = 1;
      ctx!.setLineDash([4, 6]);
      ctx!.beginPath();
      ctx!.moveTo(W * 0.28, H * 0.38);
      ctx!.lineTo(W * 0.72, H * 0.38);
      ctx!.moveTo(W * 0.28, H * 0.62);
      ctx!.lineTo(W * 0.72, H * 0.62);
      ctx!.stroke();
      ctx!.setLineDash([]);

      const useAis = ais && ais.running && ais.vessels?.length > 0;

      if (useAis) {
        // ===== Real AIS =====
        for (const v of ais!.vessels) {
          const { x, y } = projectAis(v, W, H);
          if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
          const color = TYPE_COLOR[v.type] ?? TYPE_COLOR.Unknown;
          // Glow
          ctx!.fillStyle = color;
          ctx!.globalAlpha = 0.14;
          ctx!.beginPath();
          ctx!.arc(x, y, 6, 0, Math.PI * 2);
          ctx!.fill();
          // Dot
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
      } else {
        // ===== Simulated lanes =====
        for (const v of simulated) {
          v.x += v.vx * dt;
          if (v.x > 1.05) v.x = -0.05;
          if (v.x < -0.05) v.x = 1.05;
          const yBase = v.lane === 'in' ? 0.38 : 0.62;
          v.y += Math.sin(now * 0.0005 + v.pulse) * 0.00008;
          v.y += (yBase - v.y) * 0.02 * dt * 60;
          v.pulse += dt * 1.6;

          const px = v.x * W;
          const py = v.y * H;

          ctx!.fillStyle = '#06B6D4';
          ctx!.globalAlpha = 0.16 - 0.04 * Math.sin(v.pulse);
          ctx!.beginPath();
          ctx!.arc(px, py, v.size * 3, 0, Math.PI * 2);
          ctx!.fill();

          ctx!.globalAlpha = 0.9;
          ctx!.beginPath();
          ctx!.arc(px, py, v.size, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.globalAlpha = 1;
        }
      }

      // Labels
      ctx!.fillStyle = '#6B7787';
      ctx!.font = '9px monospace';
      ctx!.fillText(lang === 'en' ? 'IRAN' : 'IRÃ', W * 0.03, H * 0.48);
      ctx!.fillText('OMAN', W * 0.9, H * 0.48);
      ctx!.fillText(
        lang === 'en' ? 'STRAIT OF HORMUZ' : 'ESTREITO DE ORMUZ',
        W * 0.34,
        H * 0.52
      );

      if (!reducedMotion) {
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
  return (
    <div
      className="relative h-[220px] md:h-[280px] rounded-lg overflow-hidden border border-divider bg-[#0B0F18]"
      role="img"
      aria-label={live ? `Live AIS vessels in the Strait of Hormuz — ${ais!.count} ships` : 'Simulated shipping lanes — set up AISStream key for live data'}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-2 left-2 right-2 flex justify-between text-[10px] font-mono">
        <span
          className={`px-1.5 py-0.5 rounded ${live ? 'bg-ok/15 text-ok border border-ok/30' : 'bg-bg2/80 text-text3 border border-divider'}`}
        >
          {live
            ? `LIVE · ${ais!.count} ${lang === 'en' ? 'ships' : 'navios'}`
            : (lang === 'en' ? 'SIMULATED · no AIS key' : 'SIMULADO · sem chave AIS')}
        </span>
        {live && (
          <span className="text-text3">
            via {ais!.source} · {ais!.ageSec}s
          </span>
        )}
      </div>
      <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[9px] text-text3 font-mono">
        <span>{t.map.lat}: 26.5°N</span>
        <span>{t.map.lon}: 56.4°E</span>
        <span>{t.map.zoom}: 9x</span>
      </div>
    </div>
  );
}
