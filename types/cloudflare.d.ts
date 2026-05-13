// Cloudflare Workers / D1 type stubs for TypeScript.
// The real types ship with wrangler but are only available after
// `npm install` — these stubs keep tsc happy in CI before wrangler is installed.

// D1 Database (Cloudflare Workers)
// Full docs: https://developers.cloudflare.com/d1/

interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(): Promise<T[]>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1Result>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

// Cloudflare Workers global
declare const EdgeRuntime: string | undefined;
