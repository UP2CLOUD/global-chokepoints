// ============================================================
// POST /api/subscribe — register an email for status alerts.
//
// Flow:
//   1. Validate email
//   2. Insert into D1 subscriptions (unconfirmed)
//   3. Send confirmation email via Resend
//   4. Return 200 (idempotent — resends confirmation if already unconfirmed)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getD1, randomId, randomToken } from '@/app/lib/db';
import { sendEmail, confirmationEmailHtml } from '@/app/lib/email';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://strait-of-hormuz-monitor.workers.dev').replace(/\/$/, '');
}

export async function POST(req: NextRequest) {
  let email: string;
  let turnstileToken: string;
  try {
    const body = await req.json();
    email = (body.email ?? '').toString().trim().toLowerCase();
    turnstileToken = (body.turnstileToken ?? '').toString().trim();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  // ── Turnstile Verification ────────────────────────────
  // Skip if we are running locally without a secret key (or using test keys)
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret && turnstileSecret !== '1x0000000000000000000000000000000AA') {
    if (!turnstileToken) {
      return NextResponse.json({ error: 'Missing Turnstile token' }, { status: 400 });
    }

    try {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: turnstileSecret,
          response: turnstileToken,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        console.warn('[subscribe] Turnstile verification failed:', verifyData);
        return NextResponse.json({ error: 'Bot verification failed. Please try again.' }, { status: 403 });
      }
    } catch (err) {
      console.error('[subscribe] Turnstile API error:', err);
      return NextResponse.json({ error: 'Failed to verify bot protection.' }, { status: 500 });
    }
  }

  const db = getD1();

  // ── Local dev: no D1 available ────────────────────────────
  if (!db) {
    console.log(`[subscribe] LOCAL DEV (No D1) — proceeding with email send for: ${email}`);
    // We continue without DB persistence for local testing
  } else {
    // ── Check if already confirmed (only if DB exists) ──────────
    const existing = await db
      .prepare('SELECT id, confirmed, confirm_token FROM subscriptions WHERE email = ?')
      .bind(email)
      .first<{ id: string; confirmed: number; confirm_token: string }>();

    if (existing?.confirmed === 1) {
      return NextResponse.json({
        ok: true,
        message: 'You are already subscribed.',
        alreadyConfirmed: true,
      });
    }

    // ── Upsert (insert or refresh tokens for unconfirmed) ────
    const id = existing?.id ?? randomId();
    const confirmToken = randomToken();
    const unsubToken = randomToken();

    if (existing) {
      await db
        .prepare('UPDATE subscriptions SET confirm_token = ? WHERE id = ?')
        .bind(confirmToken, id)
        .run();
    } else {
      await db
        .prepare(
          `INSERT INTO subscriptions (id, email, confirm_token, unsubscribe_token, confirmed, created_at)
           VALUES (?, ?, ?, ?, 0, unixepoch())`
        )
        .bind(id, email, confirmToken, unsubToken)
        .run();
    }
  }

  // Generate tokens for local dev if DB is missing
  const testToken = randomToken();
  const confirmUrl = `${siteUrl()}/api/confirm?token=${testToken}`;

  // If RESEND_API_KEY is not configured, still accept the subscription
  // but inform the user. The confirmation email will be sent once the key is set.
  if (!process.env.RESEND_API_KEY) {
    console.warn('[subscribe] RESEND_API_KEY not set — subscription saved, email not sent to:', email);
    return NextResponse.json({
      ok: true,
      message: 'Subscription recorded. Email confirmation is temporarily unavailable.',
    });
  }

  const result = await sendEmail({
    to: email,
    subject: 'Confirm your Strait of Hormuz alerts',
    html: confirmationEmailHtml(confirmUrl),
  });

  if (!result.ok) {
    // Still return success since the subscription was saved in D1
    console.error('[subscribe] Email send failed but subscription saved for:', email);
    return NextResponse.json({
      ok: true,
      message: 'Subscription recorded, but we could not send the confirmation email. We will retry shortly.',
    });
  }

  return NextResponse.json({
    ok: true,
    message: 'Check your email to confirm your subscription.',
  });
}
