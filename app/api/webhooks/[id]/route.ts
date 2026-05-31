export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getD1 } from '@/app/lib/db';

type WebhookRow = { id: string; url: string; events: string; confirmed: number; created_at: number; secret: string };

async function getAndAuth(req: NextRequest, id: string): Promise<WebhookRow | null | 'unauthorized'> {
  const db = getD1();
  if (!db) return null;
  const hook = await db
    .prepare('SELECT id, url, events, confirmed, created_at, secret FROM webhooks WHERE id = ?')
    .bind(id)
    .first<WebhookRow>()
    .catch(() => null);
  if (!hook) return null;
  const provided = req.headers.get('x-webhook-secret');
  if (!provided || provided !== hook.secret) return 'unauthorized';
  return hook;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getAndAuth(req, id);
  if (result === null) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (result === 'unauthorized') return NextResponse.json({ error: 'x-webhook-secret required' }, { status: 401 });
  const { secret: _, ...safe } = result;
  return NextResponse.json(safe);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getAndAuth(req, id);
  if (result === null) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (result === 'unauthorized') return NextResponse.json({ error: 'x-webhook-secret required' }, { status: 401 });
  const db = getD1()!;
  await db.prepare('DELETE FROM webhooks WHERE id = ?').bind(id).run();
  return NextResponse.json({ ok: true });
}
