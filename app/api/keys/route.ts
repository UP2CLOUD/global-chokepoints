export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getD1, randomId, randomToken } from '@/app/lib/db';
import { getKV } from '@/app/lib/kv';
import { sha256hex } from '@/app/lib/crypto';

export async function POST(req: NextRequest) {
  let body: { label?: string; rateLimit?: number } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const db = getD1();
  if (!db) return NextResponse.json({ error: 'D1 not available' }, { status: 503 });

  const rawKey    = `gca_${randomToken()}`;
  const hash      = await sha256hex(rawKey);
  const id        = randomId();
  const label     = String(body.label ?? '').slice(0, 80);
  const rateLimit = Math.min(Math.max(Number(body.rateLimit ?? 1000), 100), 10_000);

  try {
    await db
      .prepare('INSERT INTO api_keys (id, key_hash, label, rate_limit) VALUES (?, ?, ?, ?)')
      .bind(id, hash, label, rateLimit)
      .run();
  } catch (err) {
    console.error('[api/keys] Failed to create key:', err);
    return NextResponse.json({ error: 'Failed to create key' }, { status: 500 });
  }

  const kv = getKV();
  if (kv) {
    await kv.put(`apikey:${hash}`, JSON.stringify({ id, label, rateLimit }), { expirationTtl: 3600 });
  }

  return NextResponse.json({
    id,
    key: rawKey,
    label,
    rateLimit,
    note: 'Store this key securely — it will not be shown again. Send as: Authorization: Bearer <key>  or  X-API-Key: <key>',
  }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const cron = process.env.ALERT_CRON_SECRET;
  if (!cron || req.headers.get('x-alert-secret') !== cron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getD1();
  if (!db) return NextResponse.json({ keys: [] }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const { results } = await db
      .prepare('SELECT id, label, rate_limit, created_at, last_used_at FROM api_keys ORDER BY created_at DESC')
      .all<{ id: string; label: string; rate_limit: number; created_at: number; last_used_at: number | null }>();
    return NextResponse.json({ keys: results ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ keys: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function DELETE(req: NextRequest) {
  const cron = process.env.ALERT_CRON_SECRET;
  if (!cron || req.headers.get('x-alert-secret') !== cron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const db = getD1();
  if (!db) return NextResponse.json({ error: 'D1 not available' }, { status: 503 });
  try {
    const row = await db
      .prepare('SELECT key_hash FROM api_keys WHERE id = ?')
      .bind(id)
      .first<{ key_hash: string }>();
    await db.prepare('DELETE FROM api_keys WHERE id = ?').bind(id).run();
    const kv = getKV();
    if (kv && row?.key_hash) await kv.delete(`apikey:${row.key_hash}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
