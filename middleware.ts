import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Protect all /v1/* routes
  if (request.nextUrl.pathname.startsWith('/v1/')) {
    // Basic API Key check
    // In production, this should ideally be checked against a secure KV store or DB.
    // For now, we use an environment variable or header check.
    const authHeader = request.headers.get('Authorization') || request.headers.get('x-api-key');
    const validKey = process.env.V1_API_KEY;

    // If V1_API_KEY is not configured, /v1/* is public (backwards compatible)
    if (!validKey) {
      return NextResponse.next();
    }

    if (!authHeader || (authHeader !== `Bearer ${validKey}` && authHeader !== validKey)) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized. Provide x-api-key or Authorization: Bearer <key>' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Add rate-limiting logic here (e.g. using Cloudflare rate-limiting rules via dashboard
    // or KV-based sliding window if needed).
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/v1/:path*'],
};
