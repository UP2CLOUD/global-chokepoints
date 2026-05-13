// ============================================================
// Cloudflare KV helpers
// ============================================================

export function getKV(): KVNamespace | null {
  try {
    // In Cloudflare Workers, the global scope has the cloudflare context symbol
    const sym = Symbol.for('__cloudflare-context__');
    const ctx = (globalThis as any)[sym];
    if (ctx?.env?.HORMUZ_KV) return ctx.env.HORMUZ_KV;
    return null;
  } catch {
    return null; // local dev — no KV available
  }
}
