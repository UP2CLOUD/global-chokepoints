// Serves an interactive Scalar API playground at /api-reference
// Loads the OpenAPI spec from /api/openapi and renders it via Scalar CDN.
// Edge-compatible — returns raw HTML, no React needed.
export const runtime = 'edge';

import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Interactive API Reference — Global Chokepoints Alerts</title>
  <meta name="description" content="Try the Global Chokepoints Alerts public API live: v1/status, v1/events, v1/metrics." />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body { background: #07090F; font-family: ui-monospace, 'Cascadia Code', monospace; }

    /* Top nav bar */
    #topbar {
      position: fixed;
      inset: 0 0 auto 0;
      height: 44px;
      background: rgba(11,15,24,0.95);
      border-bottom: 1px solid #1E2533;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      gap: 0;
      padding: 0 16px;
      z-index: 99999;
    }
    #topbar a, #topbar span {
      font-size: 11px;
      letter-spacing: 0.15em;
      text-decoration: none;
      color: #64748B;
      transition: color 0.15s;
    }
    #topbar a:hover { color: #06B6D4; }
    #topbar .sep { color: #1E2533; margin: 0 10px; }
    #topbar .current { color: #94A3B8; }
    #topbar .badge {
      margin-left: auto;
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #10B981;
      border: 1px solid #10B98130;
      background: #10B98108;
      padding: 2px 8px;
    }

    /* Push content below topbar */
    #scalar-wrap {
      padding-top: 44px;
      height: 100%;
    }

    /* Scalar theme overrides — match our dark palette */
    :root {
      --scalar-color-1: #E2E8F0;
      --scalar-color-2: #94A3B8;
      --scalar-color-3: #64748B;
      --scalar-color-accent: #06B6D4;
      --scalar-background-1: #07090F;
      --scalar-background-2: #0B0F18;
      --scalar-background-3: #111827;
      --scalar-border-color: #1E2533;
      --scalar-sidebar-background-1: #080B13;
      --scalar-sidebar-color-1: #94A3B8;
      --scalar-sidebar-color-2: #64748B;
      --scalar-sidebar-color-active: #06B6D4;
      --scalar-color-green: #10B981;
      --scalar-color-red: #EF4444;
      --scalar-color-yellow: #F59E0B;
      --scalar-color-blue: #38BDF8;
      --scalar-scrollbar-color: #1E2533;
    }
  </style>
</head>
<body>
  <nav id="topbar">
    <a href="/">← Dashboard</a>
    <span class="sep">·</span>
    <a href="/docs">Docs</a>
    <span class="sep">·</span>
    <span class="current">INTERACTIVE REFERENCE</span>
    <span class="badge">LIVE</span>
  </nav>

  <div id="scalar-wrap">
    <script
      id="api-reference"
      data-url="${origin}/api/openapi"
      data-configuration='{"theme":"kepler","darkMode":true,"layout":"modern","showSidebar":true,"hideModels":false,"hideDownloadButton":false,"customCss":""}'
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.min.js"
      crossorigin="anonymous"
    ></script>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
