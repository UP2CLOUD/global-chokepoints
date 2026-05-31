export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getD1 } from '@/app/lib/db';
import { hmacSha256hex } from '@/app/lib/crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getD1();
  if (!db) return NextResponse.json({ error: 'D1 not available' }, { status: 503 });

  // Look up the webhook
  const hook = await db
    .prepare('SELECT id, url, secret FROM webhooks WHERE id = ?')
    .bind(id)
    .first<{ id: string; url: string; secret: string }>()
    .catch(() => null);

  if (!hook) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });

  // Require the caller to prove they know the secret
  const provided = req.headers.get('x-webhook-secret');
  if (!provided || provided !== hook.secret) {
    return NextResponse.json({ error: 'x-webhook-secret header required' }, { status: 401 });
  }

  const payload = JSON.stringify({
    event: 'status_change',
    previousStatus: 'OPEN',
    currentStatus: 'PARTIALLY_CLOSED',
    tensionIndex: 55,
    reason: 'Test delivery from Global Chokepoints Alerts.',
    timestamp: new Date().toISOString(),
    test: true,
  });

  const sig = await hmacSha256hex(hook.secret, payload);

  let status = 0;
  let responseBody = '';
  let ok = false;
  try {
    const res = await fetch(hook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature-256': `sha256=${sig}`,
        'User-Agent': 'GlobalChokepointsAlerts/1.0',
      },
      body: payload,
      signal: AbortSignal.timeout(10_000),
    });
    status = res.status;
    responseBody = await res.text().catch(() => '');
    ok = res.ok;
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }

  return NextResponse.json({ ok, status, response: responseBody.slice(0, 200) });
}
