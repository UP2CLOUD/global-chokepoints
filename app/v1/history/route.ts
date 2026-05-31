// ============================================================
// /v1/history — Paginated status-change history from D1.
// Returns the log of recorded state transitions written by
// /api/alert-check whenever the strait status changes.
// Cache TTL: 60 s. CORS: allow-all. License: CC-BY-4.0.
// ============================================================
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getD1 } from '@/app/lib/db';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const VALID_STATES = new Set(['OPEN', 'CLOSED', 'PARTIALLY_CLOSED', 'DISRUPTED']);

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl;

  // Clamp limit 1–200, default 50
  const limit = Math.min(200, Math.max(1, parseInt(u.searchParams.get('limit') ?? '50', 10) || 50));

  // ?since — return only records AFTER this ISO timestamp (exclusive)
  const sinceParam = u.searchParams.get('since');
  const sinceMs    = sinceParam ? +new Date(sinceParam) : NaN;
  const sinceUnix  = !isNaN(sinceMs) ? Math.floor(sinceMs / 1000) : null;

  // ?before — return only records BEFORE this ISO timestamp (cursor for backward pagination)
  const beforeParam = u.searchParams.get('before');
  const beforeMs    = beforeParam ? +new Date(beforeParam) : NaN;
  const beforeUnix  = !isNaN(beforeMs) ? Math.floor(beforeMs / 1000) : null;

  // Optional state filter (OPEN | CLOSED | PARTIALLY_CLOSED | DISRUPTED)
  const stateParam = (u.searchParams.get('state') ?? '').toUpperCase() || null;
  if (stateParam && !VALID_STATES.has(stateParam)) {
    return NextResponse.json(
      { error: `Invalid state filter. Valid values: ${[...VALID_STATES].join(', ')}` },
      { status: 400, headers: CORS }
    );
  }

  const db = getD1();
  if (!db) {
    return NextResponse.json(
      { ok: true, count: 0, items: [], nextCursor: null, note: 'Database unavailable in this environment' },
      { status: 200, headers: { ...CORS, 'Cache-Control': 'no-store' } }
    );
  }

  try {
    let sql = 'SELECT id, state, previous_state, tension, confidence, reason, created_at FROM status_history';
    const bindings: (string | number)[] = [];
    const conditions: string[] = [];

    if (sinceUnix !== null) {
      conditions.push('created_at > ?');
      bindings.push(sinceUnix);
    }
    if (beforeUnix !== null) {
      conditions.push('created_at < ?');
      bindings.push(beforeUnix);
    }
    if (stateParam) {
      conditions.push('state = ?');
      bindings.push(stateParam);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at DESC LIMIT ?';
    bindings.push(limit);

    const { results } = await db
      .prepare(sql)
      .bind(...bindings)
      .all<{
        id: string;
        state: string;
        previous_state: string | null;
        tension: number | null;
        confidence: number | null;
        reason: string | null;
        created_at: number;
      }>();

    const items = (results ?? []).map(r => ({
      id:            r.id,
      state:         r.state,
      previousState: r.previous_state ?? null,
      tension:       r.tension ?? null,
      confidence:    r.confidence != null ? Math.round(r.confidence * 1000) / 1000 : null,
      reason:        r.reason ?? null,
      timestamp:     new Date(r.created_at * 1000).toISOString(),
    }));

    // nextCursor: if a full page was returned there may be more; pass the oldest
    // item's timestamp as ?before= to fetch the next page.
    const nextCursor = items.length === limit ? items[items.length - 1].timestamp : null;

    return NextResponse.json(
      {
        ok:      true,
        count:   items.length,
        limit,
        ...(sinceParam  ? { since:  sinceParam  } : {}),
        ...(beforeParam ? { before: beforeParam } : {}),
        ...(stateParam  ? { stateFilter: stateParam } : {}),
        nextCursor,
        items,
        license: 'CC-BY-4.0 (attribution required: "Global Chokepoints Alerts")',
      },
      {
        headers: {
          ...CORS,
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (err) {
    console.error('[v1/history]', err);
    return NextResponse.json(
      { error: 'Failed to query history' },
      { status: 500, headers: CORS }
    );
  }
}
