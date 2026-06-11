// ============================================================
// Email sending via Resend (https://resend.com)
// Free tier: 3 000 emails/month, 100/day.
// Set RESEND_API_KEY in Cloudflare Pages secrets (wrangler pages secret put RESEND_API_KEY)
// Set RESEND_FROM_EMAIL to your verified sender address, e.g. alerts@yourdomain.com
// If no domain is verified yet, Resend allows: onboarding@resend.dev (for testing only)
// ============================================================

const RESEND_API = 'https://api.resend.com/emails';

function fromAddress() {
  return process.env.RESEND_FROM_EMAIL ?? 'alerts@global-chokepoints.dev';
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://global-chokepoints.pages.dev').replace(/\/$/, '');
}

// ── HTML email templates ──────────────────────────────────────

function baseTemplate(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#07090F;font-family:'Courier New',monospace;color:#E2E8F0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#07090F;">
<tr><td align="center" style="padding:40px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#0D1117;border:1px solid #1E2533;border-radius:8px;max-width:600px;">
  <tr><td style="padding:32px 32px 0;">
    <p style="margin:0 0 4px;font-size:10px;letter-spacing:2px;color:#6B7787;text-transform:uppercase;">Global Chokepoints Alerts</p>
    <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#F1F5F9;">${title}</h1>
  </td></tr>
  <tr><td style="padding:0 32px 32px;">
    ${body}
  </td></tr>
  <tr><td style="padding:24px 32px;border-top:1px solid #1E2533;">
    <p style="margin:0;font-size:10px;color:#4A5568;line-height:1.6;">
      For informational purposes only. Not navigational, financial or operational advice.<br/>
      Always verify with official authorities (IMO, NAVCENT, UKMTO) before making decisions.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function confirmationEmailHtml(confirmUrl: string) {
  const body = `
    <p style="margin:0 0 16px;font-size:14px;color:#94A3B8;line-height:1.7;">
      You requested email alerts for the Global Chokepoints status monitor.
      Click the button below to confirm your subscription.
    </p>
    <a href="${confirmUrl}"
       style="display:inline-block;padding:12px 28px;background:#06B6D4;color:#07090F;font-weight:700;
              font-size:13px;border-radius:6px;text-decoration:none;letter-spacing:0.5px;">
      CONFIRM SUBSCRIPTION
    </a>
    <p style="margin:20px 0 0;font-size:11px;color:#4A5568;">
      Or paste this link in your browser:<br/>
      <a href="${confirmUrl}" style="color:#06B6D4;">${confirmUrl}</a>
    </p>
    <p style="margin:16px 0 0;font-size:11px;color:#4A5568;">
      If you didn't request this, you can safely ignore this email.
    </p>`;
  return baseTemplate('Confirm your subscription', body);
}

export function alertEmailHtml(opts: {
  newStatus: string;
  previousStatus: string;
  reason?: string;
  reasonUrl?: string;
  unsubscribeUrl: string;
}) {
  const isOpen = opts.newStatus === 'OPEN';
  const isDisrupted = opts.newStatus === 'PARTIALLY_CLOSED';
  const statusColor = isOpen ? '#10B981' : isDisrupted ? '#F59E0B' : '#EF4444';
  const statusWord = isOpen ? 'OPEN ✓' : isDisrupted ? 'DISRUPTED ⚠' : 'CLOSED ✗';
  const prevWord = opts.previousStatus === 'OPEN' ? 'Open' : opts.previousStatus === 'PARTIALLY_CLOSED' ? 'Disrupted' : 'Closed';
  const title = isOpen
    ? 'Global Chokepoints — Traffic Restored'
    : isDisrupted
    ? 'Global Chokepoints — Disruption Alert'
    : 'Global Chokepoints — Closure Alert';

  const officialSourcesBlock = isOpen ? `
    <div style="margin:20px 0;padding:16px;background:#0B1A14;border:1px solid #10B98140;border-radius:6px;">
      <p style="margin:0 0 10px;font-size:11px;letter-spacing:1.5px;color:#10B981;text-transform:uppercase;font-weight:700;">⚠ Verify with Official Sources</p>
      <p style="margin:0 0 12px;font-size:12px;color:#94A3B8;line-height:1.6;">
        This signal is based on automated analysis of news feeds and market data.
        Before acting on this information, confirm the reopening through official maritime authorities:
      </p>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        <tr>
          <td style="padding:4px 0;font-size:12px;color:#06B6D4;">
            <a href="https://www.ukmto.org" style="color:#06B6D4;text-decoration:none;">UKMTO</a>
            <span style="color:#4A5568;"> · United Kingdom Maritime Trade Operations</span>
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:12px;color:#06B6D4;">
            <a href="https://www.navcen.uscg.gov" style="color:#06B6D4;text-decoration:none;">US NAVCENT</a>
            <span style="color:#4A5568;"> · US Naval Forces Central Command</span>
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:12px;color:#06B6D4;">
            <a href="https://www.imo.org" style="color:#06B6D4;text-decoration:none;">IMO</a>
            <span style="color:#4A5568;"> · International Maritime Organization</span>
          </td>
        </tr>
      </table>
    </div>` : '';

  const body = `
    <div style="padding:20px;background:#0B0F18;border:1px solid ${statusColor}40;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;color:#6B7787;text-transform:uppercase;">Current Status</p>
      <p style="margin:0;font-size:32px;font-weight:700;color:${statusColor};letter-spacing:1px;">${statusWord}</p>
      <p style="margin:8px 0 0;font-size:12px;color:#6B7787;">Changed from: ${prevWord}</p>
    </div>
    ${opts.reason ? `<p style="margin:0 0 16px;font-size:13px;color:#94A3B8;line-height:1.7;">${opts.reason}</p>` : ''}
    ${opts.reasonUrl ? `<a href="${opts.reasonUrl}" style="display:inline-block;margin-bottom:20px;font-size:12px;color:#06B6D4;">Read source article →</a>` : ''}
    ${officialSourcesBlock}
    <a href="${siteUrl()}"
       style="display:inline-block;padding:12px 28px;background:${statusColor};color:#07090F;font-weight:700;
              font-size:13px;border-radius:6px;text-decoration:none;letter-spacing:0.5px;">
      VIEW LIVE DASHBOARD
    </a>
    <p style="margin:24px 0 0;font-size:11px;color:#4A5568;">
      <a href="${opts.unsubscribeUrl}" style="color:#4A5568;">Unsubscribe from alerts</a>
    </p>`;
  return baseTemplate(title, body);
}

// ── Send via Resend ───────────────────────────────────────────

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set — email not sent to', opts.to);
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'User-Agent': 'GlobalChokepointsAlerts/1.0',
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[email] Resend error ${res.status}:`, body);
    return { ok: false, error: `Resend HTTP ${res.status}` };
  }

  return { ok: true };
}
