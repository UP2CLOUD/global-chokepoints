/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: `output: 'export'` removed — we now use server-side API routes
  // for live data (Brent, GDELT, RSS). For Cloudflare Pages deployment,
  // use `@cloudflare/next-on-pages` instead of static export.
  images: { unoptimized: true },

  // `ws` uses a native C addon (bufferUtil) for frame masking.
  // When webpack bundles it, the addon is corrupted → "bufferUtil.mask is not a function".
  // Marking it as external lets Node.js load it natively (same as running ais-collector.mjs).
  serverExternalPackages: ['ws'],
};
module.exports = nextConfig;
