import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// CORS preflight + GET on /v1/* are unconditionally public — they back the
// CC-BY-4.0 read-only data API documented at /docs and consumed by partner
// embeds. Auth is only required for non-GET methods, and even then only
// when V1_API_KEY is configured. This way an accidentally-set V1_API_KEY in
// the deployment environment cannot break the public-read contract.
export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/v1/')) {
    return NextResponse.next();
  }

  // Always permit safe, public read access (and CORS preflight).
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  // For write methods, only enforce auth when V1_API_KEY is explicitly set.
  const validKey = process.env.V1_API_KEY;
  if (!validKey) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('Authorization') || request.headers.get('x-api-key');
  if (!authHeader || (authHeader !== `Bearer ${validKey}` && authHeader !== validKey)) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized. Provide x-api-key or Authorization: Bearer <key>' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/v1/:path*'],
};
