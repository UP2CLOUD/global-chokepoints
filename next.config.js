/** @type {import('next').NextConfig} */

// Security headers applied to all routes in local dev.
// Production equivalents live in public/_headers (Cloudflare Pages).
const GLOBAL_SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig = {
  // NOTE: `output: 'export'` removed — we now use server-side API routes
  // for live data (Brent, GDELT, RSS). For Cloudflare Pages deployment,
  // use `@cloudflare/next-on-pages` instead of static export.
  images: { unoptimized: true },

  // The app now uses the native WebSocket API which doesn't need to be excluded.

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: GLOBAL_SECURITY_HEADERS,
      },
      // Non-embeddable pages: add clickjacking protection.
      // /embed is intentionally excluded so third parties can use the widget.
      {
        source: '/',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
      {
        source: '/docs(.*)',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
      {
        source: '/methodology',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
    ];
  },
};
module.exports = nextConfig;
