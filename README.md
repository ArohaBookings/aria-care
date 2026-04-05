# Aria 🌊
### AI Operating System for NDIS & Disability Support Providers

> Turn 45-minute progress notes into 90-second voice memos. Built for Australia and New Zealand.

---

## What Is Aria

Aria is a complete B2B SaaS platform for disability support providers. Support workers record a voice memo after each shift — Aria writes the NDIS-compliant progress note. Coordinators get a full compliance dashboard, billing intelligence, and smart rostering.

**The hero feature:** Voice → progress note in ~8 seconds, NDIS compliant, ready to file.

---

## Stack

- **Next.js 15** (App Router, TypeScript, Server Actions)
- **Tailwind CSS** with custom teal healthcare theme (Bricolage Grotesque + Nunito Sans)
- **Supabase** (auth, Postgres with RLS, row-level org isolation)
- **Stripe** (subscriptions, billing portal, webhooks)
- **OpenAI GPT-4o** (primary AI) + **Anthropic Claude** (fallback)
- **Vercel** (deploy target)

---

## Setup Guide

### Step 1 — Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier works)
2. Go to **SQL Editor** and run the entire contents of `supabase/schema.sql`
3. Go to **Settings → API** and copy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Enable Email auth: **Authentication → Providers → Email** (enable "Confirm email")
5. Optional: Enable Google OAuth: **Authentication → Providers → Google**
   - Redirect URL: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`

### Step 2 — OpenAI (Required for AI features)

1. Go to [platform.openai.com](https://platform.openai.com) → API Keys
2. Create a new key → copy it as `OPENAI_API_KEY`
3. Optionally add Anthropic key at [console.anthropic.com](https://console.anthropic.com) as fallback

### Step 3 — Stripe

1. Create account at [stripe.com](https://stripe.com)
2. Create 3 products in **Products**:

| Product | Price | Billing |
|---------|-------|---------|
| Aria Starter | $149 AUD | Monthly recurring |
| Aria Growth | $349 AUD | Monthly recurring |
| Aria Business | $699 AUD | Monthly recurring |

3. Copy each **Price ID** (starts with `price_`)
4. Add webhook at **Developers → Webhooks**:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`
5. Enable Customer Portal: **Settings → Billing → Customer portal → Activate**

### Step 4 — Environment Variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Fill in all values. For `ENCRYPTION_KEY` run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5 — Run Locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

### Step 6 — Deploy to Vercel

```bash
# Push to GitHub first
git init && git add . && git commit -m "Aria v1.0"
git remote add origin https://github.com/YOUR_USERNAME/aria.git
git push -u origin main
```

Then:
1. [vercel.com](https://vercel.com) → Import Project → select repo
2. Add all environment variables from `.env.local`
3. Deploy

Update Stripe webhook URL to your live Vercel domain after deploy.

---

## Go-To-Market Playbook

### Week 1–2: Warm Community Outreach
Post in NDIS Provider Facebook groups (47,000+ members):
> "Quick question for providers — how long do your support workers spend on progress notes each week? Building something to help."

Don't sell. Listen. Reply to every comment. You'll have 50+ warm leads.

### Week 3–4: Beta → Founding Members
Offer free access to beta users in exchange for feedback. When one says "this saved me 10 hours" — that's your conversion message. Launch founding member pricing: locked-in rate forever.

### Month 2+: Referral Engine
Give each provider a referral code. One referred provider = one free month. NDIS providers are a tight community — they talk constantly.

### Month 3+: Consultant Partnerships
NDIS registration consultants help new providers get set up. 200+ consultants in Australia. 20% recurring commission = they become your sales team.

---

## Pricing

| Plan | Price | Participants | Target |
|------|-------|-------------|--------|
| Starter | $149/mo | 10 | Solo operators |
| Growth | $349/mo | 30 | Small providers |
| Business | $699/mo | 75 | Medium providers |
| Enterprise | Custom | 75+ | Large providers |

**$10k MRR** = ~35 customers on Growth. 35 customers from 47,000 providers = 0.07%.

---

## File Structure

```
aria/
├── app/
│   ├── (auth)/login, signup
│   ├── (dashboard)/
│   │   ├── dashboard, participants, staff
│   │   ├── notes, compliance, billing
│   │   ├── rostering, settings
│   ├── api/
│   │   ├── voice-to-note
│   │   ├── generate-document
│   │   ├── notes/approve
│   │   ├── participants
│   │   ├── staff/invite
│   │   ├── audit-pack
│   │   └── stripe/checkout, webhook, portal
│   ├── auth/callback
│   ├── onboarding
│   ├── privacy, terms
│   └── page.tsx (landing)
├── components/landing/ (8 sections)
├── components/dashboard/ (Sidebar, TopBar)
├── lib/ai/ (generate.ts, prompts.ts)
├── lib/supabase/ (client.ts, server.ts)
├── supabase/schema.sql
└── public/logo.svg, favicon.svg
```

---

## v2 Roadmap

- [ ] Whisper API for actual audio transcription (workers record audio, not text)
- [ ] PRODA/NDIS claiming file export
- [ ] Participant family portal
- [ ] Automated email reminders (plan reviews, compliance)
- [ ] Mobile app (React Native)
- [ ] Aged care module
- [ ] UK/Canada market expansion

---

Built in Australia 🇦🇺 · For care workers who deserve better tools.
