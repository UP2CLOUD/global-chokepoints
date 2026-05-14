'use client';

import { useEffect, useRef, useState } from 'react';
import type { StatusData } from '@/app/lib/types';

// Shipping lane waypoints [lat, lon] — inbound enters Gulf of Oman heading west
const LANE_IN: [number, number][] = [
  [24.2, 59.0], [25.0, 58.0], [25.6, 57.2], [26.1, 56.5],
  [26.3, 56.0], [26.3, 55.2], [26.1, 54.0], [25.8, 52.5],
];
const LANE_OUT: [number, number][] = LANE_IN.map(
  ([lat, lon]): [number, number] => [lat + 0.28, lon],
).reverse();

const STATUS_COLOR: Record<string, string> = {
  OPEN: '#10B981',
  PARTIALLY_CLOSED: '#F59E0B',
  CLOSED: '#EF4444',
};

const TYPE_COLOR: Record<string, string> = {
  Tanker: '#F59E0B', Cargo: '#38BDF8', Passenger: '#67E8F9',
  Fishing: '#A78BFA', Military: '#F97316', Pilot: '#10B981',
  Tug: '#10B981', Unknown: '#6B7787',
};

type AisVessel = { mmsi: number; lat: number; lon: number; type: string; heading: number | null };

interface Props {
  status: StatusData;
  vessels?: AisVessel[];
}

export default function HormuzMap({ status, vessels = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef      = useRef<any>(null);
  const LRef        = useRef<any>(null);
  const vesselLayer = useRef<any>(null);

  // Orb starts yellow, transitions to status colour after map loads
  const [orbColor, setOrbColor] = useState('#F59E0B');
  const [orbPos,   setOrbPos]   = useState({ x: 50, y: 42 });
  const [orbReady, setOrbReady] = useState(false);

  // Yellow → status colour animation
  useEffect(() => {
    const target = STATUS_COLOR[status.state] ?? '#10B981';
    const t = setTimeout(() => setOrbColor(target), 1400);
    return () => clearTimeout(t);
  }, [status.state]);

  // Init Leaflet map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: any;
    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      LRef.current = L;
      if (cancelled) return;

      map = L.map(containerRef.current!, {
        center: [26.0, 56.3],
        zoom: 7,
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        keyboard: false,
        boxZoom: false,
      });

      // CartoDB dark tiles — free, no API key
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        },
      ).addTo(map);

      // Shipping lanes
      L.polyline(LANE_IN,  { color: '#06B6D4', weight: 2.5, opacity: 0.75, dashArray: '10 6' }).addTo(map);
      L.polyline(LANE_OUT, { color: '#F59E0B', weight: 2.5, opacity: 0.75, dashArray: '10 6' }).addTo(map);

      // Lane direction arrows (every ~2 points)
      [[LANE_IN, '#06B6D4'], [LANE_OUT, '#F59E0B']].forEach(([lane, color]) => {
        const pts = lane as [number, number][];
        for (let i = 0; i < pts.length - 1; i += 2) {
          const mid: [number, number] = [
            (pts[i][0] + pts[i + 1][0]) / 2,
            (pts[i][1] + pts[i + 1][1]) / 2,
          ];
          L.circleMarker(mid, { radius: 2, color: color as string, fillColor: color as string, fillOpacity: 0.6, weight: 0 }).addTo(map);
        }
      });

      vesselLayer.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      map.whenReady(() => {
        const pt   = map.latLngToContainerPoint([26.5, 56.3]);
        const size = map.getSize();
        setOrbPos({ x: (pt.x / size.x) * 100, y: (pt.y / size.y) * 100 });
        setOrbReady(true);
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update AIS vessel dots
  useEffect(() => {
    if (!vesselLayer.current || !LRef.current) return;
    const L = LRef.current;
    vesselLayer.current.clearLayers();
    vessels.forEach((v) => {
      const color = TYPE_COLOR[v.type] ?? '#6B7787';
      L.circleMarker([v.lat, v.lon], {
        radius: 5,
        color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: 1.5,
      }).addTo(vesselLayer.current);
    });
  }, [vessels]);

  return (
    <div className="relative w-full h-full">
      {/* Leaflet map */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Dark vignette edges */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 55%, #07090F 100%)' }} />

      {/* Status orb — positioned over the strait */}
      {orbReady && (
        <div
          className="absolute pointer-events-none"
          style={{ left: `${orbPos.x}%`, top: `${orbPos.y}%`, transform: 'translate(-50%,-50%)', zIndex: 500 }}
        >
          <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
            {/* Outer ping */}
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{ backgroundColor: `${orbColor}12`, border: `1px solid ${orbColor}45` }}
            />
            {/* Mid glow */}
            <div
              className="absolute rounded-full"
              style={{
                width: 56, height: 56,
                background: `radial-gradient(circle, ${orbColor}28 0%, transparent 70%)`,
                border: `1px solid ${orbColor}35`,
              }}
            />
            {/* Core */}
            <div
              className="rounded-full transition-all duration-[1200ms] ease-out"
              style={{
                width: 22, height: 22,
                backgroundColor: orbColor,
                boxShadow: `0 0 18px ${orbColor}, 0 0 36px ${orbColor}80, 0 0 72px ${orbColor}25`,
              }}
            />
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1 pointer-events-none" style={{ zIndex: 500 }}>
        <div className="flex items-center gap-2">
          <span className="inline-block w-5 h-px bg-cyan-400 opacity-80" style={{ borderTop: '2px dashed #06B6D4' }} />
          <span className="text-[9px] font-mono text-text3 uppercase tracking-wider">Inbound</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-5 h-px opacity-80" style={{ borderTop: '2px dashed #F59E0B' }} />
          <span className="text-[9px] font-mono text-text3 uppercase tracking-wider">Outbound</span>
        </div>
        {vessels.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span className="text-[9px] font-mono text-text3">{vessels.length} AIS vessels</span>
          </div>
        )}
      </div>
    </div>
  );
}
