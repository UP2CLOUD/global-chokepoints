export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const STATE_COLOR: Record<string, { fill: string; text: string }> = {
  OPEN:             { fill: '#10B981', text: 'open' },
  PARTIALLY_CLOSED: { fill: '#F59E0B', text: 'disrupted' },
  CLOSED:           { fill: '#EF4444', text: 'closed' },
};

function badge(state: string, tension: number): string {
  const { fill, text } = STATE_COLOR[state] ?? STATE_COLOR.OPEN;
  const label    = 'strait of hormuz';
  const labelW   = 130;
  const valueW   = text.length * 7 + 16;
  const totalW   = labelW + valueW;
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
    <text x="${labelW + valueW / 2}" y="15" fill="#010101" fill-opacity=".3">${text} · ${tension}</text>
    <text x="${labelW + valueW / 2}" y="14">${text} · ${tension}</text>
  </g>
</svg>`;
}

export async function GET(_req: NextRequest) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.pages.dev').replace(/\/$/, '');
  let state   = 'OPEN';
  let tension = 0;

  try {
    const res = await fetch(`${base}/v1/status`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const j = await res.json() as { state?: string; tensionIndex?: number };
      if (j.state)        state   = j.state;
      if (j.tensionIndex) tension = Math.round(j.tensionIndex);
    }
  } catch { /* use defaults */ }

  return new NextResponse(badge(state, tension), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, max-age=0',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
