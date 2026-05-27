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

// Global shipping routes radiating outward from the Strait — shown as ghost lines
// to illustrate why Hormuz is a global chokepoint.
const ROUTE_EAST: [number, number][] = [
  [24.2, 59.0], [20.0, 63.0], [12.0, 68.0], [7.0, 76.0],
  [2.0, 82.0], [1.3, 103.8], // → Singapore / Asia
];
const ROUTE_SUEZ: [number, number][] = [
  [24.2, 58.8], [18.0, 56.0], [13.5, 51.0],
  [12.5, 44.0], [13.5, 43.0], [20.0, 38.5], [29.9, 32.5], // → Suez Canal
];
const ROUTE_CAPE: [number, number][] = [
  [24.0, 59.0], [15.0, 60.0], [5.0, 58.0],
  [-10.0, 52.0], [-25.0, 38.0], [-34.5, 18.5], // → Cape of Good Hope
];

const STATUS_COLOR: Record<string, string> = {
  OPEN: '#10B981',
  PARTIALLY_CLOSED: '#F59E0B',
  CLOSED: '#EF4444',
};

// AIS real-time vessel colours
const AIS_TYPE_COLOR: Record<string, string> = {
  Tanker: '#F59E0B', Cargo: '#38BDF8', Passenger: '#67E8F9',
  Fishing: '#A78BFA', Military: '#F97316', Pilot: '#10B981',
  Tug: '#10B981', Unknown: '#6B7787',
};

// PortWatch vessel type colours
const PW_COLOR: Record<string, string> = {
  tanker:    '#F59E0B', // amber
  cargo:     '#38BDF8', // sky
  container: '#A78BFA', // purple
  dryBulk:   '#94A3B8', // slate
};

// Vessel type radii — tankers are the key ships, make them largest
const PW_RADIUS: Record<string, number> = {
  tanker:    6,
  cargo:     5,
  container: 5,
  dryBulk:   4,
};

type AisVessel = { mmsi: number; lat: number; lon: number; type: string; heading: number | null };

type PortWatchDay = {
  date: string;
  total: number;
  tanker: number;
  cargo: number;
  container: number;
  dryBulk: number;
};

// Interpolate a lat/lon position along a lane at t ∈ [0,1]
function lerpLane(pts: [number, number][], t: number): [number, number] {
  const n = pts.length - 1;
  const fi = Math.max(0, Math.min(n - 0.001, t * n));
  const i = Math.floor(fi);
  const f = fi - i;
  return [
    pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
    pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f,
  ];
}

interface PwVessel {
  lane: 'in' | 'out';
  progress: number; // 0–1 along lane
  speed: number;    // progress per tick (150 ms)
  type: string;
}

function buildPortWatchVessels(day: PortWatchDay): PwVessel[] {
  const out: PwVessel[] = [];
  const breakdown: [string, number][] = [
    ['tanker', day.tanker],
    ['cargo', day.cargo],
    ['container', day.container],
    ['dryBulk', day.dryBulk],
  ];
  let idx = 0;
  for (const [type, rawCount] of breakdown) {
    const count = Math.min(rawCount, 5); // cap at 5 per type for readability
    for (let i = 0; i < count; i++) {
      const lane: 'in' | 'out' = idx % 2 === 0 ? 'in' : 'out';
      // Spread evenly along the lane with slight random offset
      const base = (i + 0.5) / Math.max(count, 1);
      const jitter = (Math.random() - 0.5) * 0.12;
      out.push({
        type,
        lane,
        progress: Math.max(0.02, Math.min(0.98, base + jitter)),
        // Speed scaled for 150 ms ticks — tankers move slower than cargo
        speed: type === 'tanker'
          ? 0.000055 + Math.random() * 0.000025
          : 0.000075 + Math.random() * 0.000035,
      });
      idx++;
    }
  }
  return out;
}

// Anchor point for the status orb — middle of the strait
const ORB_LATLNG: [number, number] = [26.5, 56.3];

// Global chokepoints mini-panel data
const GLOBAL_CP = [
  { key: 'hormuz', name: 'Hormuz',  risk: 88, color: '#EF4444' },
  { key: 'redsea', name: 'Red Sea', risk: 74, color: '#F97316' },
  { key: 'suez',   name: 'Suez',    risk: 57, color: '#F59E0B' },
  { key: 'panama', name: 'Panama',  risk: 41, color: '#F59E0B' },
  { key: 'taiwan', name: 'Taiwan',  risk: 46, color: '#F59E0B' },
] as const;

interface Props {
  status: StatusData;
  vessels?: AisVessel[];
}

export default function HormuzMap({ status, vessels = [] }: Props) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<any>(null);
  const LRef            = useRef<any>(null);
  const vesselLayer     = useRef<any>(null);
  const pwLayer         = useRef<any>(null);

  const [orbColor, setOrbColor] = useState('#F59E0B');
  const [orbPos,   setOrbPos]   = useState({ x: 50, y: 42 });
  const [orbReady, setOrbReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [pwDay,    setPwDay]    = useState<PortWatchDay | null>(null);

  // Yellow → status colour
  useEffect(() => {
    const target = STATUS_COLOR[status.state] ?? '#10B981';
    const t = setTimeout(() => setOrbColor(target), 1400);
    return () => clearTimeout(t);
  }, [status.state]);

  // Fetch PortWatch latest day — use .at(-1) since days are ordered oldest→newest
  useEffect(() => {
    fetch('/api/portwatch', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.days?.length) setPwDay(d.days.at(-1)); })
      .catch(() => {});
  }, []);

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
        center: [22.0, 60.0],
        zoom: 5,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        keyboard: true,
        boxZoom: true,
      });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        },
      ).addTo(map);

      // Global ghost routes — thin, low-opacity, no dash
      const ghostStyle = { weight: 1.2, opacity: 0.28, dashArray: '6 8' };
      L.polyline(ROUTE_EAST, { ...ghostStyle, color: '#06B6D4' }).addTo(map);
      L.polyline(ROUTE_SUEZ, { ...ghostStyle, color: '#A78BFA' }).addTo(map);
      L.polyline(ROUTE_CAPE, { ...ghostStyle, color: '#94A3B8' }).addTo(map);

      // Local strait lanes — brighter, bold
      L.polyline(LANE_IN,  { color: '#06B6D4', weight: 2.5, opacity: 0.80, dashArray: '10 6' }).addTo(map);
      L.polyline(LANE_OUT, { color: '#F59E0B', weight: 2.5, opacity: 0.80, dashArray: '10 6' }).addTo(map);

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

      // Secondary chokepoint markers along ghost routes
      const mkChokepoint = (pos: [number, number], color: string) => {
        L.circleMarker(pos, { radius: 9, color: 'transparent', fillColor: color, fillOpacity: 0.12, weight: 0, interactive: false }).addTo(map);
        L.circleMarker(pos, { radius: 4, color: color, fillColor: color, fillOpacity: 0.9, weight: 1.5, interactive: false }).addTo(map);
      };
      mkChokepoint([12.6, 43.4],  '#F97316'); // Bab-el-Mandeb / Red Sea
      mkChokepoint([30.1, 32.5],  '#F59E0B'); // Suez Canal northern entry

      // Layer groups — PortWatch below AIS
      pwLayer.current      = L.layerGroup().addTo(map);
      vesselLayer.current  = L.layerGroup().addTo(map);
      mapRef.current = map;

      const updateOrbPos = () => {
        const pt   = map.latLngToContainerPoint(ORB_LATLNG);
        const size = map.getSize();
        setOrbPos({ x: (pt.x / size.x) * 100, y: (pt.y / size.y) * 100 });
      };

      map.whenReady(() => {
        updateOrbPos();
        setOrbReady(true);
        setMapReady(true);
      });

      map.on('move zoom', updateOrbPos);
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // AIS vessel dots — glow ring + solid core
  useEffect(() => {
    if (!vesselLayer.current || !LRef.current) return;
    const L = LRef.current;
    vesselLayer.current.clearLayers();
    vessels.forEach((v) => {
      const color = AIS_TYPE_COLOR[v.type] ?? '#6B7787';
      const isTanker = v.type === 'Tanker';
      const r = isTanker ? 6 : 5;

      // Outer pulse halo
      L.circleMarker([v.lat, v.lon], {
        radius: r + 6,
        color: 'transparent',
        fillColor: color,
        fillOpacity: 0.12,
        weight: 0,
        interactive: false,
      }).addTo(vesselLayer.current);

      // Mid glow
      L.circleMarker([v.lat, v.lon], {
        radius: r + 2,
        color: color,
        fillColor: color,
        fillOpacity: 0.22,
        weight: 0,
        interactive: false,
      }).addTo(vesselLayer.current);

      // Solid core
      L.circleMarker([v.lat, v.lon], {
        radius: r,
        color: '#0B0F18',
        fillColor: color,
        fillOpacity: 1,
        weight: 1.5,
        interactive: false,
      }).addTo(vesselLayer.current);
    });
  }, [vessels]);

  // PortWatch animated vessels — runs when map + data both ready
  useEffect(() => {
    if (!mapReady || !pwDay || !pwLayer.current || !LRef.current) return;
    const L = LRef.current;
    const layer = pwLayer.current;
    layer.clearLayers();

    const pwVessels = buildPortWatchVessels(pwDay);

    // Create double-layer markers: outer glow ring + inner solid core
    const markers = pwVessels.map(v => {
      const pts = v.lane === 'in' ? LANE_IN : LANE_OUT;
      const pos = lerpLane(pts, v.progress);
      const color = PW_COLOR[v.type] ?? '#6B7787';
      const r = PW_RADIUS[v.type] ?? 4;

      const glow = L.circleMarker(pos, {
        radius: r + 5,
        color: 'transparent',
        fillColor: color,
        fillOpacity: 0.15,
        weight: 0,
        interactive: false,
      }).addTo(layer);

      const core = L.circleMarker(pos, {
        radius: r,
        color: color,
        fillColor: color,
        fillOpacity: 0.92,
        weight: 1.5,
        interactive: false,
      }).addTo(layer);

      return { glow, core };
    });

    // Animate at 150 ms for smooth movement
    const id = setInterval(() => {
      pwVessels.forEach((v, i) => {
        v.progress = (v.progress + v.speed) % 1;
        const pts = v.lane === 'in' ? LANE_IN : LANE_OUT;
        const pos = lerpLane(pts, v.progress);
        markers[i].glow.setLatLng(pos);
        markers[i].core.setLatLng(pos);
      });
    }, 150);

    return () => {
      clearInterval(id);
      layer.clearLayers();
    };
  }, [mapReady, pwDay]);

  const pwTotal = pwDay ? Math.min(
    pwDay.tanker + pwDay.cargo + pwDay.container + pwDay.dryBulk,
    20,
  ) : 0;

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 55%, #07090F 100%)' }} />

      {orbReady && (
        <div
          className="absolute pointer-events-none"
          style={{ left: `${orbPos.x}%`, top: `${orbPos.y}%`, transform: 'translate(-50%,-50%)', zIndex: 500 }}
        >
          <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
            <div className="absolute inset-0 rounded-full animate-ping"
              style={{ backgroundColor: `${orbColor}12`, border: `1px solid ${orbColor}45` }} />
            <div className="absolute rounded-full"
              style={{ width: 56, height: 56, background: `radial-gradient(circle, ${orbColor}28 0%, transparent 70%)`, border: `1px solid ${orbColor}35` }} />
            <div className="rounded-full transition-all duration-[1200ms] ease-out"
              style={{ width: 22, height: 22, backgroundColor: orbColor, boxShadow: `0 0 18px ${orbColor}, 0 0 36px ${orbColor}80, 0 0 72px ${orbColor}25` }} />
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1 pointer-events-none" style={{ zIndex: 500 }}>
        <div className="flex items-center gap-2">
          <span className="inline-block w-5 h-px opacity-80" style={{ borderTop: '2px dashed #06B6D4' }} />
          <span className="text-[9px] font-mono text-text3 uppercase tracking-wider">Inbound</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-5 h-px opacity-80" style={{ borderTop: '2px dashed #F59E0B' }} />
          <span className="text-[9px] font-mono text-text3 uppercase tracking-wider">Outbound</span>
        </div>
        {pwTotal > 0 && (
          <>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: PW_COLOR.tanker }} />
              <span className="text-[9px] font-mono text-text3">Tanker ({pwDay!.tanker})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: PW_COLOR.cargo }} />
              <span className="text-[9px] font-mono text-text3">Cargo ({pwDay!.cargo})</span>
            </div>
            {pwDay!.container > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: PW_COLOR.container }} />
                <span className="text-[9px] font-mono text-text3">Container ({pwDay!.container})</span>
              </div>
            )}
            {pwDay!.dryBulk > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: PW_COLOR.dryBulk }} />
                <span className="text-[9px] font-mono text-text3">Dry Bulk ({pwDay!.dryBulk})</span>
              </div>
            )}
            <div className="mt-0.5 text-[9px] font-mono text-text4">
              IMF PortWatch · {pwDay!.date}
            </div>
          </>
        )}
        {vessels.length > 0 && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span className="text-[9px] font-mono text-text3">{vessels.length} AIS live</span>
          </div>
        )}
      </div>

      {/* Global chokepoints status panel — bottom-right */}
      <div
        className="absolute bottom-3 right-3 pointer-events-none hidden sm:block"
        style={{ zIndex: 500 }}
      >
        <div style={{ background: 'rgba(7,9,15,0.82)', border: '1px solid rgba(255,255,255,0.07)', padding: '8px 10px' }}>
          <div style={{ fontSize: 8, fontFamily: 'monospace', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#4B5563', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            Global Chokepoints
          </div>
          {GLOBAL_CP.map((cp) => (
            <div key={cp.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: cp.color, flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#94A3B8', minWidth: 56 }}>{cp.name}</span>
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: cp.color, fontWeight: 700, marginLeft: 'auto' }}>
                {cp.risk}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
