import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://fundingchoicesmessages.google.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

function addSecurityHeaders(res: NextResponse, requestId?: string): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-DNS-Prefetch-Control', 'on');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('Content-Security-Policy', CSP);
  if (requestId) res.headers.set('X-Request-ID', requestId);
  return res;
}
import { getRequestContext } from '@cloudflare/next-on-pages';

async function sha256hex(text: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

function getKV(): KVNamespace | null {
  try {
    return (getRequestContext().env as Record<string, unknown>).HORMUZ_KV as KVNamespace ?? null;
  } catch {
    return null;
  }
}

// CORS preflight + GET on /v1/* are unconditionally public — they back the
// CC-BY-4.0 read-only data API documented at /docs and consumed by partner
// embeds. Auth is only required for non-GET methods, and even then only
// when V1_API_KEY is configured. gca_* keys are validated + rate-limited via KV.
export async function middleware(request: NextRequest) {
  const isEmbed = request.nextUrl.pathname === '/embed' || request.nextUrl.pathname.startsWith('/embed/');
  const isV1    = request.nextUrl.pathname.startsWith('/v1/');
  const isApi   = request.nextUrl.pathname.startsWith('/api/');

  // Echo client-supplied X-Request-ID or generate a fresh one for API/v1 routes
  const requestId = (isV1 || isApi)
    ? (request.headers.get('X-Request-ID') || crypto.randomUUID())
    : undefined;

  if (request.method === 'OPTIONS') {
    return addSecurityHeaders(NextResponse.next(), requestId);
  }

  // Non-embed, non-v1 pages: deny framing and return early with security headers.
  if (!isEmbed && !isV1) {
    const res = addSecurityHeaders(NextResponse.next(), requestId);
    res.headers.set('X-Frame-Options', 'SAMEORIGIN');
    return res;
  }

  // Validate gca_* API keys and enforce per-key rate limits
  const rawAuth = request.headers.get('Authorization') || request.headers.get('x-api-key');
  if (rawAuth) {
    const rawKey = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7) : rawAuth;

    if (rawKey.startsWith('gca_')) {
      const kv = getKV();
      if (kv) {
        const hash   = await sha256hex(rawKey);
        const cached = await kv.get(`apikey:${hash}`, 'json') as { id: string; rateLimit: number } | null;

        if (!cached) {
          return NextResponse.json(
            { error: 'Invalid API key' },
            { status: 401, headers: { 'Content-Type': 'application/json', ...(requestId ? { 'X-Request-ID': requestId } : {}) } },
          );
        }

        const today = new Date().toISOString().slice(0, 10);
        const rlKey = `rl:${cached.id}:${today}`;
        const count = Number(await kv.get(rlKey) ?? '0');

        // Unix timestamp of midnight UTC (when the daily window resets)
        const midnightUTC = (() => {
          const d = new Date(); d.setUTCDate(d.getUTCDate() + 1); d.setUTCHours(0, 0, 0, 0);
          return Math.floor(d.getTime() / 1000);
        })();

        if (count >= cached.rateLimit) {
          return NextResponse.json(
            { error: 'Rate limit exceeded', limit: cached.rateLimit, resetAt: 'midnight UTC' },
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': String(cached.rateLimit),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(midnightUTC),
                ...(requestId ? { 'X-Request-ID': requestId } : {}),
              },
            },
          );
        }

        await kv.put(rlKey, String(count + 1), { expirationTtl: 86401 });
        const res = NextResponse.next();
        res.headers.set('X-RateLimit-Limit', String(cached.rateLimit));
        res.headers.set('X-RateLimit-Remaining', String(cached.rateLimit - count - 1));
        res.headers.set('X-RateLimit-Reset', String(midnightUTC));
        return addSecurityHeaders(res, requestId);
      }
      // KV unavailable (local dev) — fall through
    }
  }

  // For write methods, only enforce auth when V1_API_KEY is explicitly set.
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const validKey = process.env.V1_API_KEY;
    if (validKey) {
      const auth = request.headers.get('Authorization') || request.headers.get('x-api-key');
      if (!auth || (auth !== `Bearer ${validKey}` && auth !== validKey)) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized. Provide x-api-key or Authorization: Bearer <key>' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...(requestId ? { 'X-Request-ID': requestId } : {}) } },
        );
      }
    }
  }

  return addSecurityHeaders(NextResponse.next(), requestId);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|sw.js|manifest.json).*)'],
};
