// ============================================================
// GET /api/unsubscribe?token=<unsubscribe_token>
// One-click unsubscribe — deletes the subscription row and
// redirects to the homepage with ?unsubscribed=1.
// ============================================================
export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { getD1 } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.workers.dev').replace(/\/$/, '');
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${siteUrl()}?unsubscribed=error`);
  }

  const db = getD1();
  if (!db) {
    return NextResponse.redirect(`${siteUrl()}?unsubscribed=1`);
  }

  const row = await db
    .prepare('SELECT id FROM subscriptions WHERE unsubscribe_token = ?')
    .bind(token)
    .first<{ id: string }>();

  if (row) {
    await db
      .prepare('DELETE FROM subscriptions WHERE id = ?')
      .bind(row.id)
      .run();
  }

  return NextResponse.redirect(`${siteUrl()}?unsubscribed=1`);
}
