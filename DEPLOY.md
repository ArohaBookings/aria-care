# Aria — Production Deployment Checklist

Target stack:
- **GitHub:** https://github.com/ArohaBookings/aria-care.git
- **Vercel project:** `ariacare`
- **Supabase:** one project, region close to your users (Sydney for AU)
- **Stripe:** live mode, AUD pricing
- **Resend:** verified sending domain

Do **not** create new Vercel projects or GitHub repos. Everything plugs into the two above.

---

## 1. Push the code to GitHub

From `aria V2/aria/`:

```bash
git init            # if not already a repo
git add -A
git commit -m "Initial production build"
git branch -M main
git remote add origin https://github.com/ArohaBookings/aria-care.git
git push -u origin main
```

If `origin` already exists, use `git remote set-url origin …`. Never force-push `main`.

---

## 2. Supabase — database + auth

1. Open the project, Settings → API. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose)
2. SQL Editor → run every migration in `supabase/migrations/` in order. The most important is `0001_production_readiness.sql` which creates `participant_goals`, `documents`, `notifications`, `email_log`, the `update_compliance_status()` function, and the `admin_org_mrr` view.
3. Authentication → URL Configuration:
   - **Site URL:** `https://ariacare.vercel.app` (or your custom domain once added)
   - **Redirect URLs:** add `https://ariacare.vercel.app/auth/callback`, `https://ariacare.vercel.app/reset-password`, and your custom domain equivalents
4. Authentication → Email Templates: edit confirmation and magic-link templates to match the Aria brand.
5. Make your user an admin (after you sign up once):
   ```sql
   select make_admin('you@ariacare.com.au');
   ```

---

## 3. OpenAI

- Create an API key with access to `gpt-4o-mini` and `whisper-1`.
- Copy it → `OPENAI_API_KEY`.

---

## 4. Stripe (AUD live mode)

1. Products → create three recurring prices:
   - **Starter** — $149 AUD / month
   - **Growth** — $349 AUD / month
   - **Business** — $699 AUD / month
2. Copy each `price_…` id → `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID`, `…_GROWTH_…`, `…_BUSINESS_…`.
3. Developers → API keys → copy the **Secret key** → `STRIPE_SECRET_KEY`.
4. Developers → Webhooks → add endpoint:
   - URL: `https://ariacare.vercel.app/api/stripe/webhook`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `customer.subscription.trial_will_end`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`.
5. Customer portal → Settings → Billing → Customer portal → **Activate**. Allow cancel, switch plans, and update payment method.

**Trial configuration is code-driven** — no Stripe dashboard changes needed. The checkout route already sets:
- `trial_period_days: 14` (only on the first ever subscription per org)
- `payment_method_collection: "always"` — card required upfront
- `trial_settings.end_behavior.missing_payment_method: "cancel"` — no free rides

---

## 5. Resend (email)

1. Verify your sending domain (e.g. `aria.care`) in Resend.
2. Create an API key → `RESEND_API_KEY`.
3. Set the from address → `RESEND_FROM_EMAIL="Aria <noreply@yourdomain.com.au>"`.

If `RESEND_API_KEY` is missing the app will still boot — emails just get logged to `email_log` with status `failed` instead of crashing the cron routes.

---

## 6. Vercel — ariacare project

1. Import the GitHub repo into the existing `ariacare` project (Settings → Git → Connect). Do **not** create a new project.
2. Framework preset: **Next.js** (autodetected).
3. Root directory: leave as repo root (the Next app is at the top level of this repo once pushed).
4. Environment variables — add these to **Production**, **Preview**, and **Development** scopes:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Supabase (never preview/dev in untrusted envs) |
   | `OPENAI_API_KEY` | from OpenAI |
   | `STRIPE_SECRET_KEY` | from Stripe |
   | `STRIPE_WEBHOOK_SECRET` | from Stripe webhook |
   | `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID` | `price_…` |
   | `NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID` | `price_…` |
   | `NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID` | `price_…` |
   | `RESEND_API_KEY` | from Resend |
   | `RESEND_FROM_EMAIL` | `Aria <noreply@yourdomain>` |
   | `CRON_SECRET` | any long random string (e.g. `openssl rand -hex 32`) |
   | `NEXT_PUBLIC_APP_URL` | `https://ariacare.vercel.app` (or custom domain) |

5. Deploy. Cron jobs are declared in `vercel.json` and pick up automatically:
   - `/api/cron/compliance` — daily at 14:00 UTC
   - `/api/cron/trial-expiry` — daily at 23:00 UTC
   Both require `Authorization: Bearer $CRON_SECRET`, which Vercel injects when calling from its cron runner.

---

## 7. Post-deploy smoke test

In this order, on the live site:

1. **Sign up** with a real email → you should land on `/onboarding`.
2. Complete the org step → participant → invite → land on **Start Trial**.
3. Click a plan → redirected to Stripe Checkout → use a **real card** (or `4242 4242 4242 4242` in test mode) → return to `/billing/success`.
4. Click **Go to dashboard** → you should reach `/dashboard` with the trial banner showing days remaining.
5. Go to `/billing` — verify the "You're on a free trial" banner with end date and the **Cancel trial** button.
6. Click Cancel trial → confirm → you should be marked cancelled, not charged.
7. Sign up a second test account and confirm emails arrive from Resend (check `email_log` table).
8. In Supabase, mark an `organisations.trial_ends_at` to 4 days from now and run the cron manually:
   ```bash
   curl https://ariacare.vercel.app/api/cron/trial-expiry \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
   Verify the day-10 nudge email arrives with participant count personalisation.
9. Admin panel: `select make_admin('you@yourdomain.com')` in Supabase, then visit `/admin/revenue` to confirm MRR math works.

---

## 8. Things to watch on day 1

- **Stripe webhook delivery** — check Developers → Webhooks → log should show all events as 200.
- **Supabase logs** — filter on `error` to catch RLS violations from real users.
- **Vercel functions** — watch the `api/transcribe` and `api/voice-to-note` latencies. Anything > 30s means OpenAI is throttling you — bump account limits.
- **email_log** — query `select * from email_log where status='failed' order by created_at desc limit 20;` to catch Resend issues early.
- **Trial conversion funnel** — `admin_org_mrr` view and `/admin/revenue` show MRR and expiring trials in real time.

---

## 9. Security notes

- `.env` and `.env.local` are in `.gitignore` — never commit keys.
- `SUPABASE_SERVICE_ROLE_KEY` must only live in Vercel env, never in any file imported by client code.
- Rate limiting on AI endpoints is in-memory per serverless instance (20/hour/user). For multi-instance scaling move to Upstash Redis.
- Prompt injection sanitiser runs on every user-supplied text field before it hits OpenAI. Check `lib/security.ts`.
- Admin routes are gated by `admin_users` table + `requireAdmin()` helper on every `/api/admin/*` route.
