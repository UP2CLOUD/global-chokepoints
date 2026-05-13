// ============================================================
// Cloudflare D1 helpers — subscription system
//
// getD1() obtains the D1 binding from the CF Workers request
// context via OpenNext.  Returns null in local `next dev` mode
// so API routes degrade gracefully without crashing.
// ============================================================

export interface Subscription {
  id: string;
  email: string;
  confirm_token: string;
  unsubscribe_token: string;
  confirmed: number;
  confirmed_at: number | null;
  created_at: number;
}

export function getD1(): D1Database | null {
  try {
    // @opennextjs/cloudflare exposes bindings via getCloudflareContext()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    return (ctx.env as { DB?: D1Database }).DB ?? null;
  } catch {
    return null; // local dev — no D1 available
  }
}

/** Tiny random hex token (32 chars). Crypto-safe on both Node and CF. */
export function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Nano-id style — just crypto UUID v4 via Web Crypto (works everywhere). */
export function randomId(): string {
  return crypto.randomUUID();
}
