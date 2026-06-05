export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getD1, randomId, randomToken } from '@/app/lib/db';

const VALID_EVENTS = ['status_change'] as const;
type WebhookEvent = typeof VALID_EVENTS[number];

export async function POST(req: NextRequest) {
  let body: { url?: string; events?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  if (!body.url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }
  try { new URL(body.url); } catch {
    return NextResponse.json({ error: 'url must be a valid URL' }, { status: 400 });
  }
  if (!body.url.startsWith('https://')) {
    return NextResponse.json({ error: 'url must use HTTPS' }, { status: 400 });
  }

  const requestedEvent = body.events ?? 'status_change';
  if (!VALID_EVENTS.includes(requestedEvent as WebhookEvent)) {
    return NextResponse.json(
      { error: `Invalid event type. Allowed: ${VALID_EVENTS.join(', ')}` },
      { status: 400 },
    );
  }

  const db = getD1();
  if (!db) return NextResponse.json({ error: 'D1 not available' }, { status: 503 });

  const id     = randomId();
  const secret = randomToken();
  const events = requestedEvent;

  try {
    await db
      .prepare('INSERT INTO webhooks (id, url, secret, events, confirmed) VALUES (?, ?, ?, ?, 1)')
      .bind(id, body.url, secret, events)
      .run();
  } catch (err) {
    console.error('[api/webhooks] Failed to register webhook:', err);
    return NextResponse.json({ error: 'Failed to register webhook' }, { status: 500 });
  }

  return NextResponse.json({
    id,
    url: body.url,
    events,
    secret,
    note: 'Store the secret safely. Deliveries are signed: X-Signature-256: sha256=<hmac-sha256-hex>',
  }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const cron = process.env.ALERT_CRON_SECRET;
  if (!cron || req.headers.get('x-alert-secret') !== cron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getD1();
  if (!db) return NextResponse.json({ webhooks: [] }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const { results } = await db
      .prepare('SELECT id, url, events, confirmed, created_at FROM webhooks ORDER BY created_at DESC')
      .all<{ id: string; url: string; events: string; confirmed: number; created_at: number }>();
    return NextResponse.json({ webhooks: results ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ webhooks: [] }, { headers: { 'Cache-Control': 'no-store' } });
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
    await db.prepare('DELETE FROM webhooks WHERE id = ?').bind(id).run();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
