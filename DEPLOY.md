# Deployment Guide — Strait of Hormuz Monitor

## 1. Push to GitHub (UP2CLOUD org)

Run these commands once in the project directory:

```bash
# One-time: remove the sandbox git and re-init from your machine
cd ~/Desktop/ishormuzopen-nextjs        # or wherever the folder lives

git init
git config user.email "cesarnogueira1210@gmail.com"
git config user.name "Cesar Nogueira"
git branch -m main
git add -A
git commit -m "feat: initial commit"

# Add remote (create the repo on GitHub first at https://github.com/organizations/UP2CLOUD/repositories/new)
git remote add origin https://github.com/UP2CLOUD/global-chokepoints.git
git push -u origin main
```

---

## 2. Create a Cloudflare Pages project

```bash
npm install          # installs wrangler + @cloudflare/next-on-pages
wrangler login       # opens browser OAuth

# Create D1 database — copy the database_id it prints
wrangler d1 create strait-subscriptions

# Edit wrangler.toml: replace REPLACE_WITH_REAL_D1_DATABASE_ID with the id above

# Run the D1 migration
npm run db:migrate

# Create the Pages project (first deploy)
npm run deploy:cf
```

---

## 3. Set Cloudflare Pages secrets

```bash
wrangler pages secret put RESEND_API_KEY          # from resend.com → API Keys
wrangler pages secret put ALERT_CRON_SECRET       # any random string, e.g. openssl rand -hex 32
wrangler pages secret put AISSTREAM_KEY           # from aisstream.io/authenticate
wrangler pages secret put EIA_API_KEY             # from eia.gov/opendata/register.php
wrangler pages secret put RESEND_FROM_EMAIL       # e.g. alerts@yourdomain.com
```

---

## 4. Add GitHub Actions secrets

In GitHub → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | CF token with "Cloudflare Pages: Edit" permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your CF account ID (dashboard URL or `wrangler whoami`) |
| `ALERT_CRON_SECRET` | Same value as the CF Pages secret above |
| `SITE_URL` | `https://global-chokepoints.pages.dev` |

In GitHub → Settings → Variables → Actions → New variable:

| Variable | Value |
|----------|-------|
| `CF_PROJECT_NAME` | `global-chokepoints` |
| `NEXT_PUBLIC_SITE_URL` | `https://global-chokepoints.pages.dev` |

After this, every `git push origin main` will automatically build and deploy.

---

## 5. Set up Resend (email)

1. Sign up at [resend.com](https://resend.com) (free: 3 000 emails/month)
2. Add & verify your sending domain (e.g. `yourdomain.com`)
3. Create an API key → paste as `RESEND_API_KEY` in CF secrets
4. Set `RESEND_FROM_EMAIL` to `alerts@yourdomain.com`

Until your domain is verified, you can use `onboarding@resend.dev` for testing (sends only to your own verified email).

---

## 6. How the alert system works

```
CF Cron (every 10 min)
  └─ POST /api/alert-check  [X-Alert-Secret header]
       ├─ GET /v1/status  →  current strait state
       ├─ D1: read last_alerted_status
       ├─ if CHANGED → send email to all confirmed subscribers via Resend
       └─ D1: update last_alerted_status

GH Actions (hourly, alert-check.yml)  ← backup in case CF Cron is paused
```

---

## 7. Test the subscription flow locally

```bash
npm run dev

# In another terminal:
curl -s -X POST http://localhost:3000/api/subscribe \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com"}' | jq

# Local dev has no D1 — returns {ok:true, dev:true}
# In production (CF Pages) it inserts into D1 and sends confirmation email
```

---

## Architecture

```
Browser  ──┬──  Next.js App (CF Pages)
           │       ├─ /api/brent        Yahoo Finance → EIA fallback
           │       ├─ /api/news         GDELT (retry + stale cache)
           │       ├─ /api/vessels      AIS embedded WebSocket (Node.js only)
           │       ├─ /api/subscribe    D1 insert + Resend confirmation
           │       ├─ /api/confirm      D1 update → redirect
           │       ├─ /api/unsubscribe  D1 delete → redirect
           │       └─ /api/alert-check  CRON: status diff → Resend alerts
           │
           └──  Cloudflare D1 (SQLite)
                  ├─ subscriptions  (email, tokens, confirmed)
                  └─ system_state   (last_alerted_status)
```
