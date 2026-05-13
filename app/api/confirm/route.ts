// ============================================================
// GET /api/confirm?token=<confirm_token>
// Confirms a subscription and redirects to the homepage with
// a ?subscribed=1 query param so the UI can show a success banner.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getD1 } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://strait-of-hormuz-monitor.workers.dev').replace(/\/$/, '');
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${siteUrl()}?subscribed=error`);
  }

  const db = getD1();
  if (!db) {
    // Local dev — just redirect as if confirmed
    return NextResponse.redirect(`${siteUrl()}?subscribed=1`);
  }

  const row = await db
    .prepare('SELECT id, confirmed FROM subscriptions WHERE confirm_token = ?')
    .bind(token)
    .first<{ id: string; confirmed: number }>();

  if (!row) {
    return NextResponse.redirect(`${siteUrl()}?subscribed=invalid`);
  }

  if (row.confirmed === 1) {
    // Already confirmed — still redirect to success
    return NextResponse.redirect(`${siteUrl()}?subscribed=1`);
  }

  await db
    .prepare(
      'UPDATE subscriptions SET confirmed = 1, confirmed_at = unixepoch() WHERE id = ?'
    )
    .bind(row.id)
    .run();

  return NextResponse.redirect(`${siteUrl()}?subscribed=1`);
}
