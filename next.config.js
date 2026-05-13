/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: `output: 'export'` removed — we now use server-side API routes
  // for live data (Brent, GDELT, RSS). For Cloudflare Pages deployment,
  // use `@cloudflare/next-on-pages` instead of static export.
  images: { unoptimized: true },

  // The app now uses the native WebSocket API which doesn't need to be excluded.
};
module.exports = nextConfig;
