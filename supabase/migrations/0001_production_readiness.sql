-- ============================================================
-- Aria — production readiness migration (0001)
-- Run AFTER schema.sql in the Supabase SQL editor.
-- Safe to re-run: every statement uses `if not exists` / `or replace`.
-- ============================================================

-- ------------------------------------------------------------
-- Structured participant goals (separate from the text[] column
-- on participants, which remains for backwards compatibility).
-- ------------------------------------------------------------
create table if not exists public.participant_goals (
  id uuid default gen_random_uuid() primary key,
  participant_id uuid references public.participants(id) on delete cascade not null,
  organisation_id uuid references public.organisations(id) on delete cascade not null,
  goal_text text not null,
  goal_type text default 'long_term',         -- long_term | short_term
  support_category text,
  target_date date,
  status text default 'active',                -- active | achieved | discontinued
  progress_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_participant_goals_participant on public.participant_goals(participant_id);
create index if not exists idx_participant_goals_org on public.participant_goals(organisation_id);

-- ------------------------------------------------------------
-- Documents (support plans, incident reports, handover notes,
-- email drafts). Distinct from `support_plans` which remains
-- the canonical source for plan review cycles.
-- ------------------------------------------------------------
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  organisation_id uuid references public.organisations(id) on delete cascade not null,
  participant_id uuid references public.participants(id) on delete cascade,
  document_type text not null,                 -- support_plan | incident_report | handover_note | email_draft
  title text,
  content jsonb not null,
  created_by uuid references public.users(id),
  author_name text,
  status text default 'draft',                 -- draft | final
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_documents_org on public.documents(organisation_id);
create index if not exists idx_documents_participant on public.documents(participant_id);
create index if not exists idx_documents_type on public.documents(document_type);

-- ------------------------------------------------------------
-- In-app notifications (bell icon queue).
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  organisation_id uuid references public.organisations(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'info',                    -- info | warning | action_required | success
  action_url text,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_user_unread
  on public.notifications(user_id, is_read) where is_read = false;

-- ------------------------------------------------------------
-- Email audit log (every transactional email we fire).
-- ------------------------------------------------------------
create table if not exists public.email_log (
  id uuid default gen_random_uuid() primary key,
  organisation_id uuid references public.organisations(id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  email_type text,                             -- compliance_reminder | trial_expiry | welcome | note_approved
  status text default 'sent',                  -- sent | failed | queued
  error text,
  resend_id text,
  sent_at timestamptz default now()
);

create index if not exists idx_email_log_org on public.email_log(organisation_id);
create index if not exists idx_email_log_type on public.email_log(email_type);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.participant_goals enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.email_log enable row level security;

-- Drop-then-create pattern so the migration is idempotent.
drop policy if exists "org_access" on public.participant_goals;
drop policy if exists "org_access" on public.documents;
drop policy if exists "org_access" on public.notifications;
drop policy if exists "org_access" on public.email_log;

create policy "org_access" on public.participant_goals
  for all using (organisation_id = get_user_org_id());
create policy "org_access" on public.documents
  for all using (organisation_id = get_user_org_id());
create policy "org_access" on public.notifications
  for all using (organisation_id = get_user_org_id());
create policy "org_access" on public.email_log
  for all using (organisation_id = get_user_org_id());

-- ------------------------------------------------------------
-- Compliance status auto-update function
--   valid        → expiry > 60 days away (or no expiry)
--   expiring_soon→ 0–60 days remaining
--   expired      → expiry < today
-- Call from a daily cron: SELECT update_compliance_status();
-- ------------------------------------------------------------
create or replace function public.update_compliance_status()
returns table (updated_count int) as $$
declare
  v_count int;
begin
  with updated as (
    update public.staff_compliance
    set status = case
      when expiry_date is null then 'valid'
      when expiry_date < current_date then 'expired'
      when expiry_date <= current_date + interval '60 days' then 'expiring_soon'
      else 'valid'
    end,
    updated_at = now()
    where status is distinct from case
      when expiry_date is null then 'valid'
      when expiry_date < current_date then 'expired'
      when expiry_date <= current_date + interval '60 days' then 'expiring_soon'
      else 'valid'
    end
    returning 1
  )
  select count(*)::int into v_count from updated;

  return query select v_count;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- Helpful view: per-org MRR snapshot for the admin revenue page.
-- Uses a tiny tiered pricing table; edit the values here if you
-- change pricing in Stripe.
-- ------------------------------------------------------------
create or replace view public.admin_org_mrr as
select
  o.id,
  o.name,
  o.contact_email,
  o.subscription_tier,
  o.subscription_status,
  o.trial_ends_at,
  o.stripe_customer_id,
  o.created_at,
  case o.subscription_tier
    when 'starter'  then 149
    when 'growth'   then 349
    when 'business' then 749
    else 0
  end as monthly_value_aud,
  (select count(*) from public.users u where u.organisation_id = o.id) as staff_count,
  (select count(*) from public.participants p where p.organisation_id = o.id and p.status = 'active') as participant_count
from public.organisations o;
