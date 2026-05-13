// ============================================================
// Cloudflare KV helpers
// ============================================================

export function getKV(): KVNamespace | null {
  try {
    // @opennextjs/cloudflare exposes bindings via getCloudflareContext()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    return (ctx.env as { HORMUZ_KV?: KVNamespace }).HORMUZ_KV ?? null;
  } catch {
    return null; // local dev — no KV available
  }
}
