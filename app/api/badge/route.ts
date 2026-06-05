export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

// Status → badge color + short label
const STATUS_COLOR: Record<string, { fill: string; text: string }> = {
  // /v1/status states
  OPEN:             { fill: '#10B981', text: 'open' },
  PARTIALLY_CLOSED: { fill: '#F59E0B', text: 'disrupted' },
  DISRUPTED:        { fill: '#F59E0B', text: 'disrupted' },
  CLOSED:           { fill: '#EF4444', text: 'closed' },
  // /v1/chokepoints statuses
  normal:           { fill: '#10B981', text: 'normal' },
  elevated:         { fill: '#F59E0B', text: 'elevated' },
  degraded:         { fill: '#FB923C', text: 'degraded' },
  critical:         { fill: '#EF4444', text: 'critical' },
};

const CP_LABELS: Record<string, string> = {
  hormuz: 'Strait of Hormuz',
  redsea: 'Red Sea',
  suez:   'Suez Canal',
  panama: 'Panama Canal',
  taiwan: 'Taiwan Strait',
};

// Approximate char width for badge font (DejaVu Sans 11px)
function textW(str: string): number {
  return Math.ceil(str.length * 6.5 + 16);
}

function makeBadge(label: string, status: string, risk: number): string {
  const { fill, text } = STATUS_COLOR[status] ?? STATUS_COLOR.OPEN;
  const value   = `${text} · ${risk}`;
  const labelW  = textW(label);
  const valueW  = textW(value);
  const totalW  = labelW + valueW;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0"  stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1"  stop-opacity=".1"/>
  </linearGradient>
  <rect rx="3" width="${totalW}" height="20" fill="#555"/>
  <rect rx="3" x="${labelW}" width="${valueW}" height="20" fill="${fill}"/>
  <rect rx="3" width="${totalW}" height="20" fill="url(#s)"/>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelW / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelW / 2}" y="14">${label}</text>
    <text x="${labelW + valueW / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelW + valueW / 2}" y="14">${value}</text>
  </g>
</svg>`;
}

const VALID_CPS = new Set(Object.keys(CP_LABELS));

export async function GET(req: NextRequest) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.pages.dev').replace(/\/$/, '');
  const cp   = (req.nextUrl.searchParams.get('cp') ?? '').toLowerCase();

  if (cp && !VALID_CPS.has(cp)) {
    return new NextResponse('Invalid ?cp value', { status: 400 });
  }

  let label  = CP_LABELS.hormuz;
  let status = 'OPEN';
  let risk   = 0;

  try {
    if (!cp || cp === 'hormuz') {
      // Hormuz: use live /v1/status for precise tension index
      const res = await fetch(`${base}/v1/status`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const j = await res.json() as { state?: string; tensionIndex?: number };
        if (j.state)        status = j.state;
        if (j.tensionIndex) risk   = Math.round(j.tensionIndex);
      }
    } else {
      // Other chokepoints: fetch from /v1/chokepoints
      label = CP_LABELS[cp];
      const res = await fetch(`${base}/v1/chokepoints`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const j = await res.json() as { chokepoints?: { key: string; status: string; riskIndex: number }[] };
        const found = j.chokepoints?.find(c => c.key === cp);
        if (found) {
          status = found.status;
          risk   = found.riskIndex;
        }
      }
    }
  } catch (err) { console.warn('[api/badge] upstream fetch failed, using defaults:', (err as Error).message); }

  return new NextResponse(makeBadge(label, status, risk), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, max-age=0',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
