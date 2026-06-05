// ============================================================
// POST /api/alert-check  — chokepoint status change detector & mailer
//
// Called by:
//   • Cloudflare Cron Trigger  (every 10 min, wrangler.toml)
//   • GitHub Actions scheduled workflow (hourly fallback)
//
// Security: requires header  X-Alert-Secret: <ALERT_CRON_SECRET>
//
// Logic:
//   1. Fetch /api/timeline + /api/brent in parallel (no self-call chain)
//   2. Derive status via deriveStatus()
//   3. Compare with last_alerted_status in D1 system_state
//   4. If changed → send alert emails to all confirmed subscribers
//   5. Upsert system_state with new status
// ============================================================
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { getD1, randomId } from '@/app/lib/db';
import { sendEmail, alertEmailHtml } from '@/app/lib/email';
import { deriveStatus } from '@/app/lib/api';
import { REOPEN_CONFIDENCE_THRESHOLD } from '@/app/lib/constants';
import { hmacSha256hex } from '@/app/lib/crypto';
import type { StatusData } from '@/app/lib/types';

export const dynamic = 'force-dynamic';

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.pages.dev').replace(/\/$/, '');
}

async function deriveCurrentStatus(): Promise<{ status: StatusData | null; error?: string }> {
  // Always use the canonical public URL — the internal CF origin from req.url
  // is an internal address that cannot reach sibling edge functions.
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.pages.dev')
    .replace(/\/$/, '');

  try {
    const [timelineRes, brentRes] = await Promise.all([
      fetch(`${base}/api/timeline`, {
        headers: { 'User-Agent': 'GlobalChokepointsAlerts/alert-check' },
        signal: AbortSignal.timeout(20_000),
      }),
      fetch(`${base}/api/brent`, {
        headers: { 'User-Agent': 'GlobalChokepointsAlerts/alert-check' },
        signal: AbortSignal.timeout(20_000),
      }),
    ]);

    const timeline = timelineRes.ok ? ((await timelineRes.json()).events ?? []) : [];
    const brent    = brentRes.ok    ? await brentRes.json()                     : null;

    if (!timelineRes.ok && !brentRes.ok) {
      return { status: null, error: `timeline=${timelineRes.status} brent=${brentRes.status}` };
    }

    return { status: deriveStatus(timeline, brent?.changePercent ?? null, 'en', brent?.price ?? null) };
  } catch (err) {
    return { status: null, error: String(err) };
  }
}

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────
  const secret   = process.env.ALERT_CRON_SECRET;
  const provided = req.headers.get('x-alert-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getD1();
  if (!db) {
    return NextResponse.json({ ok: false, reason: 'D1 not available (local dev)' });
  }

  // ── Derive current status ────────────────────────────────
  const { status, error: deriveError } = await deriveCurrentStatus();
  if (!status) {
    return NextResponse.json(
      { ok: false, reason: 'Could not derive current status', detail: deriveError },
      { status: 502 },
    );
  }

  const currentStatus = status.state;

  // ── Get last alerted status ──────────────────────────────
  let lastStatus = 'OPEN';
  try {
    const row = await db
      .prepare("SELECT value FROM system_state WHERE key = 'last_alerted_status'")
      .first<{ value: string }>();
    lastStatus = row?.value ?? 'OPEN';
  } catch {
    // system_state table missing (migration not run yet) — treat as first run
  }

  if (currentStatus === lastStatus) {
    return NextResponse.json({ ok: true, noChange: true, status: currentStatus });
  }

  // ── Reopen gate: require high confidence before alerting OPEN ─
  // Algorithmic signals alone are not sufficient to confirm a reopening —
  // we need official corroboration (UKMTO, NAVCENT, etc.) reflected in
  // multiple independent sources, which drives confidence above the threshold.
  const isReopening = currentStatus === 'OPEN' && lastStatus !== 'OPEN';
  if (isReopening && status.confidence < REOPEN_CONFIDENCE_THRESHOLD) {
    return NextResponse.json({
      ok: true,
      held: true,
      reason: `Reopen signal confidence ${(status.confidence * 100).toFixed(0)}% < required ${(REOPEN_CONFIDENCE_THRESHOLD * 100).toFixed(0)}% — awaiting official confirmation`,
      currentStatus,
      lastStatus,
    });
  }

  // ── Fetch confirmed subscribers ──────────────────────────
  let subscribers: { id: string; email: string; unsubscribe_token: string }[] = [];
  try {
    const { results } = await db
      .prepare('SELECT id, email, unsubscribe_token FROM subscriptions WHERE confirmed = 1')
      .all<{ id: string; email: string; unsubscribe_token: string }>();
    subscribers = results ?? [];
  } catch {
    // subscriptions table missing — skip email sending
  }

  // ── Persist new status (UPSERT — safe even if seed row is missing) ──
  try {
    await db
      .prepare(`
        INSERT INTO system_state (key, value, updated_at)
          VALUES ('last_alerted_status', ?, unixepoch())
        ON CONFLICT(key) DO UPDATE
          SET value = excluded.value, updated_at = excluded.updated_at
      `)
      .bind(currentStatus)
      .run();
  } catch (err) {
    console.error('[alert-check] Failed to upsert system_state:', err);
  }

  // ── Log to status_history ────────────────────────────────
  try {
    await db
      .prepare('INSERT INTO status_history (id, state, previous_state, tension, confidence, reason) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(randomId(), currentStatus, lastStatus, Math.round(status.tensionIndex ?? 0), status.confidence, status.reason)
      .run();
  } catch { /* table may not exist yet */ }

  if (subscribers.length === 0) {
    return NextResponse.json({ ok: true, changed: true, subscribers: 0, status: currentStatus });
  }

  // ── Send alert emails ────────────────────────────────────
  let sent = 0;
  let failed = 0;
  const base = siteUrl();

  for (const sub of subscribers) {
    const html = alertEmailHtml({
      newStatus: currentStatus,
      previousStatus: lastStatus,
      reason:    status.reason,
      reasonUrl: status.reasonUrl,
      unsubscribeUrl: `${base}/api/unsubscribe?token=${sub.unsubscribe_token}`,
    });

    const label =
      currentStatus === 'OPEN'             ? 'OPEN ✓'       :
      currentStatus === 'PARTIALLY_CLOSED' ? 'DISRUPTED ⚠'  : 'CLOSED ✗';

    const result = await sendEmail({
      to:      sub.email,
      subject: `[Global Chokepoints] Status is now ${label}`,
      html,
    });

    if (result.ok) sent++; else failed++;
  }

  // ── Webhook fan-out ──────────────────────────────────────
  const webhookPayload = JSON.stringify({
    event: 'status_change',
    previousStatus: lastStatus,
    currentStatus,
    tensionIndex: status.tensionIndex ?? 0,
    reason: status.reason,
    timestamp: new Date().toISOString(),
  });

  let webhooksSent = 0;
  try {
    const { results: hooks } = await db
      .prepare("SELECT id, url, secret FROM webhooks WHERE confirmed = 1 AND (events = 'status_change' OR events LIKE '%status_change%')")
      .all<{ id: string; url: string; secret: string }>();

    await Promise.allSettled((hooks ?? []).map(async hook => {
      const sig = await hmacSha256hex(hook.secret, webhookPayload);
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature-256': `sha256=${sig}`,
          'User-Agent': 'GlobalChokepointsAlerts/1.0',
        },
        body: webhookPayload,
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) webhooksSent++;
    }));
  } catch { /* webhooks table may not exist yet */ }

  return NextResponse.json({
    ok: true,
    changed: true,
    previousStatus: lastStatus,
    currentStatus,
    subscribers: subscribers.length,
    sent,
    failed,
    webhooksSent,
  });
}

// Support GET for CF dashboard health-check / manual trigger
export async function GET(req: NextRequest) {
  return POST(req);
}
