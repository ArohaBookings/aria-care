-- ============================================================
-- Aria Care Solo migration (0002)
-- Run AFTER schema.sql and 0001_production_readiness.sql.
-- Safe to re-run: every statement uses if not exists / or replace.
-- ============================================================

alter table public.organisations
  add column if not exists product_mode text default 'provider',
  add column if not exists billing_country text default 'AU',
  add column if not exists solo_note_limit_override int,
  add column if not exists solo_platform text;

alter table public.users
  add column if not exists account_type text default 'provider',
  add column if not exists onboarding_profile jsonb default '{}';

create table if not exists public.solo_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  organisation_id uuid references public.organisations(id) on delete cascade,
  note_type text not null default 'progress',
  input_method text not null default 'text',
  raw_input text not null,
  context jsonb default '{}',
  draft_text text not null,
  short_text text,
  handover_text text,
  incident_text text,
  detail_level text default 'balanced',
  formatting_mode text default 'structured',
  status text default 'draft',
  copied_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.solo_note_feedback (
  id uuid default gen_random_uuid() primary key,
  note_id uuid references public.solo_notes(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade not null,
  rating text not null,
  comment text,
  created_at timestamptz default now()
);

alter table public.solo_notes enable row level security;
alter table public.solo_note_feedback enable row level security;

drop policy if exists "solo_notes_user_access" on public.solo_notes;
drop policy if exists "solo_feedback_user_access" on public.solo_note_feedback;

create policy "solo_notes_user_access" on public.solo_notes
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "solo_feedback_user_access" on public.solo_note_feedback
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists idx_solo_notes_user_created
  on public.solo_notes(user_id, created_at desc);

create index if not exists idx_solo_notes_user_month
  on public.solo_notes(user_id, created_at);

create index if not exists idx_solo_notes_type
  on public.solo_notes(note_type);

create index if not exists idx_solo_feedback_note
  on public.solo_note_feedback(note_id);

create index if not exists idx_solo_notes_org
  on public.solo_notes(organisation_id);

create index if not exists idx_solo_feedback_user
  on public.solo_note_feedback(user_id);

create or replace view public.admin_solo_metrics
with (security_invoker = true) as
select
  count(distinct u.id) filter (where u.account_type = 'solo' or o.product_mode = 'solo') as solo_users,
  count(distinct u.id) filter (where coalesce(u.account_type, 'provider') <> 'solo' and coalesce(o.product_mode, 'provider') <> 'solo') as provider_users,
  count(distinct u.id) filter (where o.subscription_tier = 'solo_free') as free_solo_users,
  count(distinct u.id) filter (where o.subscription_tier in ('solo', 'solo_pro')) as paid_solo_users,
  (select count(*) from public.solo_notes where created_at >= date_trunc('month', now())) as monthly_solo_notes,
  (select coalesce(jsonb_object_agg(note_type, note_count), '{}'::jsonb)
     from (
       select note_type, count(*) as note_count
       from public.solo_notes
       where created_at >= date_trunc('month', now())
       group by note_type
     ) type_counts) as note_type_counts,
  (select coalesce(jsonb_object_agg(platform, platform_count), '{}'::jsonb)
     from (
       select coalesce(nullif(o2.solo_platform, ''), u2.onboarding_profile->>'platform', 'Not sure') as platform,
              count(*) as platform_count
       from public.users u2
       left join public.organisations o2 on o2.id = u2.organisation_id
       where u2.account_type = 'solo' or o2.product_mode = 'solo'
       group by platform
     ) platform_counts) as platform_counts,
  (select count(*) from public.solo_note_feedback) as feedback_count
from public.users u
left join public.organisations o on o.id = u.organisation_id;

create or replace view public.admin_org_mrr
with (security_invoker = true) as
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
    when 'starter' then 149
    when 'growth' then 349
    when 'business' then 699
    when 'solo' then 19
    when 'solo_pro' then 29
    else 0
  end as monthly_value_aud,
  (select count(*) from public.users u where u.organisation_id = o.id) as staff_count,
  (select count(*) from public.participants p where p.organisation_id = o.id and p.status = 'active') as participant_count
from public.organisations o;
