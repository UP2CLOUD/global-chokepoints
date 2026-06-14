'use client';

import { useEffect, useState } from 'react';
import { useLang } from './LangContext';
import { Wind, Waves, Eye, Compass } from 'lucide-react';

type Weather = {
  location: { lat: number; lon: number; label: string };
  temperatureC: number;
  wind: { speedKn: number; direction: string; directionDeg: number };
  visibilityM: number;
  weather: string;
  sea: { waveHeightM: number; wavePeriodS: number | null; windWaveM: number | null; swellM: number | null };
  navRisk: number;
  navRiskLabel: 'CALM' | 'MODERATE' | 'ROUGH' | 'SEVERE';
  source: string;
  generatedAt: string;
  error?: string;
};

const RISK_COLOR: Record<Weather['navRiskLabel'], string> = {
  CALM: 'text-ok',
  MODERATE: 'text-caution',
  ROUGH: 'text-warn',
  SEVERE: 'text-danger',
};
const RISK_BAR: Record<Weather['navRiskLabel'], string> = {
  CALM: 'bg-ok',
  MODERATE: 'bg-caution',
  ROUGH: 'bg-warn',
  SEVERE: 'bg-danger',
};

export default function WeatherPanel() {
  const { t, locale } = useLang();
  const [data, setData] = useState<Weather | null>(null);
  const [down, setDown] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/weather', { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
        if (!res.ok) throw new Error(String(res.status));
        const j = (await res.json()) as Weather;
        if (alive) { setData(j); setDown(false); }
      } catch {
        if (alive) setDown(true);
      }
    };
    load();
    const id = setInterval(load, 15 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <section className="border border-divider bg-bg1 p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-text3 flex items-center gap-2">
          <Wind size={13} className="text-accent" />
          {t.weather.title}
        </div>
        <div className="text-[10px] font-mono text-text3">
          {data ? `via Open-Meteo · ${new Date(data.generatedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}` : '—'}
        </div>
      </div>

      {down || !data ? (
        <div className="text-[12px] font-mono text-text3 py-6 text-center">
          <span className="inline-block px-2 py-1 rounded down">
            {t.weather.unavailable}
          </span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={<Wind size={14} />} label={t.weather.wind} value={`${data.wind.speedKn.toFixed(0)} kn`} sub={data.wind.direction} />
            <Stat icon={<Waves size={14} />} label={t.weather.waves} value={`${data.sea.waveHeightM.toFixed(1)} m`} sub={data.sea.wavePeriodS ? `T ${data.sea.wavePeriodS.toFixed(0)}s` : '—'} />
            <Stat icon={<Eye size={14} />} label={t.weather.visibility} value={data.visibilityM >= 10000 ? '>10 km' : `${(data.visibilityM / 1000).toFixed(1)} km`} sub={data.weather} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-text2 flex items-center gap-1.5">
                <Compass size={11} />
                {t.weather.navRisk}
              </span>
              <span className={`text-[11px] font-mono font-semibold ${RISK_COLOR[data.navRiskLabel]}`}>
                {data.navRisk}<span className="text-text3">/100</span> · {data.navRiskLabel}
              </span>
            </div>
            <div className="h-[2px] bg-divider overflow-hidden">
              <div className={`h-full ${RISK_BAR[data.navRiskLabel]} transition-all duration-500`} style={{ width: `${data.navRisk}%` }} role="progressbar" aria-valuenow={data.navRisk} aria-valuemin={0} aria-valuemax={100} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="border border-divider bg-bg2 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-text2">
        <span className="text-accent" aria-hidden>{icon}</span>
        {label}
      </div>
      <div className="text-[18px] font-bold font-mono text-text leading-none mt-1">{value}</div>
      {sub && <div className="text-[10px] font-mono text-text3 mt-1">{sub}</div>}
    </div>
  );
}
