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
//   1. Fetch current strait status from /v1/status
//   2. Compare with last_alerted_status in D1 system_state
//   3. If changed → send alert emails to all confirmed subscribers
//   4. Update system_state with new status
// ============================================================
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { getD1 } from '@/app/lib/db';
import { sendEmail, alertEmailHtml } from '@/app/lib/email';

export const dynamic = 'force-dynamic';

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://strait-of-hormuz-monitor.pages.dev').replace(/\/$/, '');
}

interface StatusResponse {
  state: 'OPEN' | 'PARTIALLY_CLOSED' | 'CLOSED';
  tensionLevel: string;
  reason?: string;
  reasonUrl?: string;
}

async function fetchCurrentStatus(): Promise<StatusResponse | null> {
  try {
    const res = await fetch(`${siteUrl()}/v1/status`, {
      headers: { 'User-Agent': 'IsHormuzOpen/alert-check' },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json() as StatusResponse;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // ── Auth check ───────────────────────────────────────────
  const secret = process.env.ALERT_CRON_SECRET;
  const provided = req.headers.get('x-alert-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getD1();
  if (!db) {
    return NextResponse.json({ ok: false, reason: 'D1 not available (local dev)' });
  }

  // ── Get current status ───────────────────────────────────
  const current = await fetchCurrentStatus();
  if (!current) {
    return NextResponse.json({ ok: false, reason: 'Could not fetch /v1/status' }, { status: 502 });
  }

  // ── Get last alerted status ──────────────────────────────
  const stateRow = await db
    .prepare("SELECT value FROM system_state WHERE key = 'last_alerted_status'")
    .first<{ value: string }>();

  const lastStatus = stateRow?.value ?? 'OPEN';
  const currentStatus = current.state;

  if (currentStatus === lastStatus) {
    return NextResponse.json({
      ok: true,
      noChange: true,
      status: currentStatus,
    });
  }

  // ── Status changed — fetch all confirmed subscribers ─────
  const { results: subscribers } = await db
    .prepare('SELECT id, email, unsubscribe_token FROM subscriptions WHERE confirmed = 1')
    .all<{ id: string; email: string; unsubscribe_token: string }>();

  if (!subscribers || subscribers.length === 0) {
    // Still update the state even if no subscribers yet
    await db
      .prepare("UPDATE system_state SET value = ?, updated_at = unixepoch() WHERE key = 'last_alerted_status'")
      .bind(currentStatus)
      .run();
    return NextResponse.json({ ok: true, changed: true, subscribers: 0, status: currentStatus });
  }

  // ── Send alert emails ────────────────────────────────────
  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    const unsubUrl = `${siteUrl()}/api/unsubscribe?token=${sub.unsubscribe_token}`;
    const html = alertEmailHtml({
      newStatus: currentStatus,
      previousStatus: lastStatus,
      reason: current.reason,
      reasonUrl: current.reasonUrl,
      unsubscribeUrl: unsubUrl,
    });

    const statusWord =
      currentStatus === 'OPEN' ? 'OPEN ✓' :
      currentStatus === 'PARTIALLY_CLOSED' ? 'DISRUPTED ⚠' : 'CLOSED ✗';

    const result = await sendEmail({
      to: sub.email,
      subject: `Strait of Hormuz is now ${statusWord} — IsStraitHormuzOpen?`,
      html,
    });

    if (result.ok) sent++;
    else failed++;
  }

  // ── Update last alerted status ───────────────────────────
  await db
    .prepare("UPDATE system_state SET value = ?, updated_at = unixepoch() WHERE key = 'last_alerted_status'")
    .bind(currentStatus)
    .run();

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

// Also support GET for easy health-check/manual trigger in CF dashboard
export async function GET(req: NextRequest) {
  return POST(req);
}
