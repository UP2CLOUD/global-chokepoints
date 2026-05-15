// ============================================================
// POST /api/alert-check  — strait status change detector & mailer
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
import { getD1 } from '@/app/lib/db';
import { sendEmail, alertEmailHtml } from '@/app/lib/email';
import { deriveStatus } from '@/app/lib/api';
import type { StatusData } from '@/app/lib/types';

export const dynamic = 'force-dynamic';

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://strait-of-hormuz-monitor.pages.dev').replace(/\/$/, '');
}

async function deriveCurrentStatus(origin: string): Promise<StatusData | null> {
  try {
    const [timelineRes, brentRes] = await Promise.all([
      fetch(`${origin}/api/timeline`, {
        headers: { 'User-Agent': 'IsHormuzOpen/alert-check' },
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      }),
      fetch(`${origin}/api/brent`, {
        headers: { 'User-Agent': 'IsHormuzOpen/alert-check' },
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      }),
    ]);

    const timeline = timelineRes.ok ? ((await timelineRes.json()).events ?? []) : [];
    const brent    = brentRes.ok    ? await brentRes.json()                     : null;

    return deriveStatus(timeline, brent?.changePercent ?? null, 'en');
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────
  const secret   = process.env.ALERT_CRON_SECRET;
  const provided = req.headers.get('x-alert-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const origin = new URL(req.url).origin;
  const db = getD1();
  if (!db) {
    return NextResponse.json({ ok: false, reason: 'D1 not available (local dev)' });
  }

  // ── Derive current status ────────────────────────────────
  const status = await deriveCurrentStatus(origin);
  if (!status) {
    return NextResponse.json({ ok: false, reason: 'Could not derive current status' }, { status: 502 });
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
      subject: `Strait of Hormuz is now ${label} — IsStraitHormuzOpen?`,
      html,
    });

    if (result.ok) sent++; else failed++;
  }

  return NextResponse.json({
    ok: true,
    changed: true,
    previousStatus: lastStatus,
    currentStatus,
    subscribers: subscribers.length,
    sent,
    failed,
  });
}

// Support GET for CF dashboard health-check / manual trigger
export async function GET(req: NextRequest) {
  return POST(req);
}
