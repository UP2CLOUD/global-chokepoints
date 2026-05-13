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

    if (!validKey) {
      // If no key is configured on the server, we might want to temporarily allow
      // or strictly block. We'll block to enforce security.
      return new NextResponse(
        JSON.stringify({ error: 'API key not configured on server' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!authHeader || (authHeader !== \`Bearer \${validKey}\` && authHeader !== validKey)) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized. Please provide a valid x-api-key header.' }),
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
