// ============================================================
// /v1/chokepoints — Public, stable API for all five tracked
// strategic maritime chokepoints with live PortWatch vessel counts.
// CORS allow-all; cache 60 s; partner embeds friendly.
// ============================================================
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 60;
export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const CP_DEF = [
  { key: 'hormuz', name: 'Strait of Hormuz', region: 'Persian Gulf',    codes: 'IR/OM', riskIndex: 88, status: 'critical', oilMbd: 21,  tradePerDayB: 3.4  },
  { key: 'redsea', name: 'Red Sea',           region: 'Bab el-Mandeb',   codes: 'YE/DJ', riskIndex: 74, status: 'degraded', oilMbd: 6.2, tradePerDayB: 1.0  },
  { key: 'suez',   name: 'Suez Canal',         region: 'Egypt',           codes: 'EG',    riskIndex: 57, status: 'elevated', oilMbd: 9,   tradePerDayB: 9.7  },
  { key: 'panama', name: 'Panama Canal',       region: 'Central America', codes: 'PA',    riskIndex: 41, status: 'elevated', oilMbd: null, tradePerDayB: 0.27 },
  { key: 'taiwan', name: 'Taiwan Strait',      region: 'Western Pacific', codes: 'TW/CN', riskIndex: 46, status: 'elevated', oilMbd: null, tradePerDayB: 2.4  },
] as const;

const STATIC_VESSELS: Record<string, number> = {
  hormuz: 52, redsea: 28, suez: 45, panama: 35, taiwan: 128,
};

type PwStats = { todayTotal?: number; vsBaseline?: number };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.pages.dev').replace(/\/$/, '');
  const origin = new URL(req.url).origin;

  let pwChokepoints: Record<string, PwStats> = {};
  let hormuzLiveTension: number | null = null;
  let hormuzLiveStatus: string | null  = null;

  const [pwResult, statusResult] = await Promise.allSettled([
    fetch(`${base}/api/portwatch`, { signal: AbortSignal.timeout(8_000) })
      .then(r => r.ok ? r.json() as Promise<{ chokepoints?: Record<string, PwStats> }> : null),
    fetch(`${base}/v1/status`, { signal: AbortSignal.timeout(4_000) })
      .then(r => r.ok ? r.json() as Promise<{ tensionIndex?: number; state?: string }> : null),
  ]);

  if (pwResult.status === 'fulfilled' && pwResult.value?.chokepoints) {
    pwChokepoints = pwResult.value.chokepoints;
  }
  if (statusResult.status === 'fulfilled' && statusResult.value) {
    const sd = statusResult.value;
    if (sd.tensionIndex != null) hormuzLiveTension = Math.round(sd.tensionIndex);
    if (sd.state) {
      hormuzLiveStatus =
        sd.state === 'OPEN'             ? 'normal'   :
        sd.state === 'PARTIALLY_CLOSED' ? 'degraded' : 'critical';
    }
  }

  const chokepoints = CP_DEF.map(cp => {
    const pw = pwChokepoints[cp.key];
    const vessels24h = pw?.todayTotal ?? STATIC_VESSELS[cp.key] ?? 0;
    const vsBaseline  = pw?.vsBaseline ?? 0;
    const trend = vsBaseline <= -10 ? 'down' : vsBaseline >= 10 ? 'up' : 'stable';
    const riskIndex = cp.key === 'hormuz' && hormuzLiveTension !== null
      ? hormuzLiveTension
      : cp.riskIndex;
    const status = cp.key === 'hormuz' && hormuzLiveStatus !== null
      ? hormuzLiveStatus
      : cp.status;
    return {
      key:          cp.key,
      name:         cp.name,
      region:       cp.region,
      codes:        cp.codes,
      status,
      riskIndex,
      oilMbd:       cp.oilMbd,
      tradePerDayB: cp.tradePerDayB,
      vessels24h,
      vsBaseline,
      trend,
    };
  });

  return NextResponse.json(
    {
      ok:          true,
      generatedAt: new Date().toISOString(),
      count:       chokepoints.length,
      chokepoints,
      license:     'CC-BY-4.0 (attribution required: "Global Chokepoints Alerts")',
      docs:        `${origin}/docs`,
    },
    {
      headers: {
        ...CORS,
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120, stale-if-error=3600',
      },
    },
  );
}
