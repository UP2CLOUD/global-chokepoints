import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
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
  if (!request.nextUrl.pathname.startsWith('/v1/')) {
    return NextResponse.next();
  }

  if (request.method === 'OPTIONS') {
    return NextResponse.next();
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
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          );
        }

        const today = new Date().toISOString().slice(0, 10);
        const rlKey = `rl:${cached.id}:${today}`;
        const count = Number(await kv.get(rlKey) ?? '0');

        if (count >= cached.rateLimit) {
          return NextResponse.json(
            { error: 'Rate limit exceeded', limit: cached.rateLimit, resetAt: 'midnight UTC' },
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': String(cached.rateLimit),
                'X-RateLimit-Remaining': '0',
              },
            },
          );
        }

        await kv.put(rlKey, String(count + 1), { expirationTtl: 86401 });
        const res = NextResponse.next();
        res.headers.set('X-RateLimit-Limit', String(cached.rateLimit));
        res.headers.set('X-RateLimit-Remaining', String(cached.rateLimit - count - 1));
        return res;
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
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/v1/:path*'],
};
