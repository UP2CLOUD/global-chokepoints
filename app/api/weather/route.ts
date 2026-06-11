// ============================================================
// /api/weather — Marine conditions near the Strait of Hormuz
// Source: Open-Meteo (https://open-meteo.com) — FREE, no API key.
//   - Forecast: current wind, visibility, temperature
//   - Marine:   wave height, swell, wind-wave
// ============================================================
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getKV } from '@/app/lib/kv';

export const revalidate = 900; // 15 min
export const dynamic = 'force-dynamic';

const LAT = 26.5;
const LON = 56.4;

const FORECAST_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  `&current=temperature_2m,wind_speed_10m,wind_direction_10m,visibility,weather_code` +
  `&wind_speed_unit=kn&timezone=UTC`;

const MARINE_URL =
  `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}` +
  `&current=wave_height,wave_period,wind_wave_height,swell_wave_height` +
  `&timezone=UTC`;

const KV_WEATHER_KEY = 'weather:cache';
const KV_WEATHER_TTL = 900; // 15 min

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Heavy showers',
  82: 'Violent showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm w/ hail',
  99: 'Severe thunderstorm',
};

function compass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// Crude navigation-risk index 0..100 from wind + wave height + visibility.
function navRisk(windKn: number, waveM: number, visM: number, code: number): number {
  let r = 0;
  // Wind: light <10kn, fresh 10-20, strong 20-30, gale 30+
  r += Math.min(40, Math.max(0, (windKn - 10) * 2));
  // Wave: <1m ok, 1-2 noticeable, 2-3 rough, 3+ dangerous
  r += Math.min(40, Math.max(0, (waveM - 0.8) * 20));
  // Visibility: < 1km is fog
  if (visM < 1000) r += 20;
  else if (visM < 5000) r += 8;
  // Thunderstorms
  if (code >= 95) r += 20;
  return Math.min(100, Math.round(r));
}

export async function GET() {
  const kv = getKV();
  if (kv) {
    try {
      const cached = await kv.get(KV_WEATHER_KEY, 'json');
      if (cached) return NextResponse.json(cached, { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800, stale-if-error=86400', 'X-Cache': 'HIT' } });
    } catch { /* fall through to live fetch */ }
  }

  try {
    const [fRes, mRes] = await Promise.all([
      fetch(FORECAST_URL, { next: { revalidate: 900 }, signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'GlobalChokepointsAlerts/1.0' } }),
      fetch(MARINE_URL, { next: { revalidate: 900 }, signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'GlobalChokepointsAlerts/1.0' } }),
    ]);

    if (!fRes.ok) throw new Error(`forecast HTTP ${fRes.status}`);
    const f = await fRes.json();
    const fc = f.current ?? {};

    const m = mRes.ok ? await mRes.json() : null;
    const mc = m?.current ?? {};

    const windKn = Number(fc.wind_speed_10m ?? 0);
    const windDeg = Number(fc.wind_direction_10m ?? 0);
    const visM = Number(fc.visibility ?? 10000);
    const code = Number(fc.weather_code ?? 0);
    const waveM = Number(mc.wave_height ?? 0);

    const risk = navRisk(windKn, waveM, visM, code);

    const payload = {
      location: { lat: LAT, lon: LON, label: 'Strait of Hormuz' },
      temperatureC: Number(fc.temperature_2m ?? 0),
      wind: {
        speedKn: Number(windKn.toFixed(1)),
        direction: compass(windDeg),
        directionDeg: windDeg,
      },
      visibilityM: visM,
      weather: WEATHER_CODES[code] ?? 'Unknown',
      weatherCode: code,
      sea: {
        waveHeightM: Number(waveM.toFixed(2)),
        wavePeriodS: mc.wave_period != null ? Number(mc.wave_period) : null,
        windWaveM: mc.wind_wave_height != null ? Number(mc.wind_wave_height) : null,
        swellM: mc.swell_wave_height != null ? Number(mc.swell_wave_height) : null,
      },
      navRisk: risk,
      navRiskLabel: risk < 25 ? 'CALM' : risk < 50 ? 'MODERATE' : risk < 75 ? 'ROUGH' : 'SEVERE',
      source: 'Open-Meteo',
      generatedAt: new Date().toISOString(),
    };

    if (kv) await kv.put(KV_WEATHER_KEY, JSON.stringify(payload), { expirationTtl: KV_WEATHER_TTL }).catch(e => console.warn('[api/weather] KV write failed:', e));

    return NextResponse.json(payload, { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800, stale-if-error=86400', 'X-Cache': 'MISS' } });
  } catch (err) {
    console.error('[api/weather] failed:', err);
    return NextResponse.json(
      { error: 'Weather data temporarily unavailable', source: 'Open-Meteo' },
      { status: 502 }
    );
  }
}
