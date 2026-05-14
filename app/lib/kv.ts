// ============================================================
// Cloudflare KV helpers
// ============================================================
import { getRequestContext } from '@cloudflare/next-on-pages';

export function getKV(): KVNamespace | null {
  try {
    return (getRequestContext().env as any).HORMUZ_KV ?? null;
  } catch {
    return null; // local dev — no KV available
  }
}
