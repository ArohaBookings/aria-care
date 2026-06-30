-- ============================================================
-- ARIA — COMPLETE SUPABASE DATABASE SCHEMA v1.0
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

create table if not exists public.organisations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  abn text,
  address text,
  contact_email text,
  subscription_tier text default 'trial',
  subscription_status text default 'trialing',
  trial_ends_at timestamptz default (now() + interval '14 days'),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  participant_limit int default 10,
  product_mode text default 'provider',
  billing_country text default 'AU',
  solo_note_limit_override int,
  solo_platform text,
  admin_plan_override_until timestamptz,
  admin_plan_override_reason text,
  admin_plan_override_by uuid,
  admin_plan_override_at timestamptz,
  billing_status_checked_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  organisation_id uuid references public.organisations(id) on delete cascade,
  email text,
  full_name text,
  role text default 'support_worker',
  avatar_url text,
  is_active boolean default true,
  account_type text default 'provider',
  onboarding_profile jsonb default '{}',
  notification_preferences jsonb default '{}',
  force_password_change boolean not null default false,
  password_reset_required_at timestamptz,
  password_reset_reason text,
  last_admin_password_reset_at timestamptz,
  last_admin_password_reset_by uuid,
  last_password_changed_at timestamptz,
  solo_usage_reset_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.participants (
  id uuid default gen_random_uuid() primary key,
  organisation_id uuid references public.organisations(id) on delete cascade not null,
  full_name text not null,
  preferred_name text,
  date_of_birth date,
  ndis_number text,
  email text,
  phone text,
  address text,
  primary_disability text,
  diagnoses text[],
  goals text[],
  support_category text default 'Daily Activities',
  support_needs text,
  living_arrangement text,
  emergency_contact_name text,
  emergency_contact_phone text,
  plan_budget numeric,
  plan_start_date date,
  plan_end_date date,
  funding_remaining_pct numeric default 100,
  status text default 'active',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.progress_notes (
  id uuid default gen_random_uuid() primary key,
  organisation_id uuid references public.organisations(id) on delete cascade not null,
  participant_id uuid references public.participants(id) on delete cascade not null,
  author_id uuid references public.users(id),
  author_name text,
  shift_date date default current_date,
  shift_start time,
  shift_end time,
  input_method text default 'voice',
  raw_input text,
  note_text text not null,
  goals_referenced text[],
  support_level text,
  mood text,
  support_type text,
  incident_flagged boolean default false,
  suggested_review boolean default false,
  suggested_review_reason text,
  status text default 'pending',
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.support_plans (
  id uuid default gen_random_uuid() primary key,
  organisation_id uuid references public.organisations(id) on delete cascade not null,
  participant_id uuid references public.participants(id) on delete cascade not null,
  created_by uuid references public.users(id),
  plan_data jsonb not null,
  status text default 'draft',
  version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.incident_reports (
  id uuid default gen_random_uuid() primary key,
  organisation_id uuid references public.organisations(id) on delete cascade not null,
  participant_id uuid references public.participants(id) on delete cascade,
  reported_by uuid references public.users(id),
  reporter_name text,
  report_data jsonb not null,
  severity text default 'low',
  incident_type text,
  incident_date date default current_date,
  is_reportable_to_ndis boolean default false,
  status text default 'open',
  created_at timestamptz default now()
);

create table if not exists public.staff_compliance (
  id uuid default gen_random_uuid() primary key,
  organisation_id uuid references public.organisations(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  item_type text not null,
  item_label text not null,
  expiry_date date,
  issued_date date,
  document_url text,
  status text default 'valid',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.shifts (
  id uuid default gen_random_uuid() primary key,
  organisation_id uuid references public.organisations(id) on delete cascade not null,
  participant_id uuid references public.participants(id) on delete cascade not null,
  worker_id uuid references public.users(id),
  worker_name text,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  support_type text,
  status text default 'scheduled',
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.billing_records (
  id uuid default gen_random_uuid() primary key,
  organisation_id uuid references public.organisations(id) on delete cascade not null,
  participant_id uuid references public.participants(id) on delete cascade not null,
  shift_id uuid references public.shifts(id),
  ndis_line_item text,
  line_item_description text,
  hours numeric,
  rate numeric,
  total_amount numeric,
  claim_status text default 'pending',
  support_category text,
  service_date date,
  created_at timestamptz default now()
);

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

create table if not exists public.email_log (
  id uuid default gen_random_uuid() primary key,
  organisation_id uuid references public.organisations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  recipient_email text not null,
  recipient text,
  subject text not null,
  email_type text,
  status text default 'sent',
  error text,
  resend_id text,
  related_note_id uuid,
  unsubscribed boolean not null default false,
  created_at timestamptz default now(),
  sent_at timestamptz default now()
);

-- RLS
alter table public.organisations enable row level security;
alter table public.users enable row level security;
alter table public.participants enable row level security;
alter table public.progress_notes enable row level security;
alter table public.support_plans enable row level security;
alter table public.incident_reports enable row level security;
alter table public.staff_compliance enable row level security;
alter table public.shifts enable row level security;
alter table public.billing_records enable row level security;
alter table public.solo_notes enable row level security;
alter table public.solo_note_feedback enable row level security;
alter table public.email_log enable row level security;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.get_user_org_id()
returns uuid as $$
  select organisation_id from public.users where id = auth.uid();
$$ language sql security definer stable set search_path = public, auth;

create or replace function private.is_admin()
returns boolean as $$
  select exists(select 1 from public.admin_users where id = auth.uid() and is_active = true);
$$ language sql security definer stable set search_path = public, auth;

revoke execute on function private.get_user_org_id() from public;
revoke execute on function private.is_admin() from public;
grant execute on function private.get_user_org_id() to authenticated;
grant execute on function private.is_admin() to authenticated;

create or replace function get_user_org_id()
returns uuid as $$
  select organisation_id from public.users where id = auth.uid();
$$ language sql security definer stable set search_path = public, auth;

create policy "org_access" on public.organisations for all using (id = private.get_user_org_id());
create policy "org_access" on public.users for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.participants for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.progress_notes for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.support_plans for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.incident_reports for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.staff_compliance for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.shifts for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.billing_records for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.email_log for all using (organisation_id = private.get_user_org_id());
create policy "solo_notes_user_access" on public.solo_notes
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "solo_feedback_user_access" on public.solo_note_feedback
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_org_id uuid;
begin
  insert into public.organisations (name, contact_email)
  values (coalesce(new.raw_user_meta_data->>'organisation_name', 'My Organisation'), new.email)
  returning id into new_org_id;

  insert into public.users (id, organisation_id, email, full_name, role)
  values (new.id, new_org_id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), 'owner')
  on conflict (id) do update set organisation_id = new_org_id;

  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

revoke execute on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

create index if not exists idx_participants_org on public.participants(organisation_id);
create index if not exists idx_notes_participant on public.progress_notes(participant_id);
create index if not exists idx_notes_org_status on public.progress_notes(organisation_id, status);
create index if not exists idx_shifts_date on public.shifts(shift_date);
create index if not exists idx_shifts_org on public.shifts(organisation_id);
create index if not exists idx_compliance_user on public.staff_compliance(user_id);
create index if not exists idx_compliance_status on public.staff_compliance(status);
create index if not exists idx_solo_notes_user_created on public.solo_notes(user_id, created_at desc);
create index if not exists idx_solo_notes_user_month on public.solo_notes(user_id, created_at);
create index if not exists idx_solo_notes_type on public.solo_notes(note_type);
create index if not exists idx_solo_feedback_note on public.solo_note_feedback(note_id);
create index if not exists idx_solo_notes_org on public.solo_notes(organisation_id);
create index if not exists idx_solo_feedback_user on public.solo_note_feedback(user_id);
create index if not exists idx_email_log_org on public.email_log(organisation_id);
create index if not exists idx_email_log_user on public.email_log(user_id);
create index if not exists idx_email_log_recipient on public.email_log(recipient);
create index if not exists idx_email_log_type on public.email_log(email_type);
create index if not exists idx_email_log_sent_at on public.email_log(sent_at desc);
create index if not exists idx_email_log_user_type_sent on public.email_log(user_id, email_type, sent_at desc);
create index if not exists idx_email_log_related_note on public.email_log(related_note_id);
create index if not exists idx_users_force_password_change on public.users(force_password_change) where force_password_change = true;
create index if not exists idx_users_solo_usage_reset on public.users(solo_usage_reset_at) where solo_usage_reset_at is not null;
create index if not exists idx_users_organisation_id on public.users(organisation_id);
create index if not exists idx_billing_records_organisation_id on public.billing_records(organisation_id);
create index if not exists idx_billing_records_participant_id on public.billing_records(participant_id);
create index if not exists idx_billing_records_shift_id on public.billing_records(shift_id);
create index if not exists idx_incident_reports_organisation_id on public.incident_reports(organisation_id);
create index if not exists idx_incident_reports_participant_id on public.incident_reports(participant_id);
create index if not exists idx_incident_reports_reported_by on public.incident_reports(reported_by);
create index if not exists idx_progress_notes_author_id on public.progress_notes(author_id);
create index if not exists idx_progress_notes_approved_by on public.progress_notes(approved_by);
create index if not exists idx_shifts_participant_id on public.shifts(participant_id);
create index if not exists idx_shifts_worker_id on public.shifts(worker_id);
create index if not exists idx_staff_compliance_organisation_id on public.staff_compliance(organisation_id);
create index if not exists idx_support_plans_organisation_id on public.support_plans(organisation_id);
create index if not exists idx_support_plans_participant_id on public.support_plans(participant_id);
create index if not exists idx_support_plans_created_by on public.support_plans(created_by);

-- ============================================================
-- ADMIN TABLES (added for super-admin dashboard)
-- ============================================================

-- Admin users table (separate from regular users)
create table if not exists public.admin_users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  created_at timestamptz default now(),
  last_login_at timestamptz,
  is_active boolean default true
);

-- Audit log — every admin action is logged
create table if not exists public.admin_audit_log (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references public.admin_users(id),
  admin_email text,
  action text not null,
  target_type text,  -- 'user' | 'organisation' | 'subscription'
  target_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz default now()
);

-- System announcements (show banners to all users)
create table if not exists public.system_announcements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  message text not null,
  type text default 'info',  -- info | warning | critical
  is_active boolean default true,
  created_by uuid references public.admin_users(id),
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- RLS for admin tables (only admins can access)
alter table public.admin_users enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.system_announcements enable row level security;

create or replace function is_admin()
returns boolean as $$
  select exists(select 1 from public.admin_users where id = auth.uid() and is_active = true);
$$ language sql security definer stable set search_path = public, auth;

create policy "admins_only" on public.admin_users for all using (private.is_admin());
create policy "admins_only" on public.admin_audit_log for all using (private.is_admin());
create policy "admins_only" on public.system_announcements for all using (private.is_admin());

-- Function to make a user an admin (run manually in SQL editor)
-- Usage: SELECT make_admin('user@email.com');
create or replace function make_admin(admin_email text)
returns text as $$
declare
  target_user_id uuid;
begin
  select id into target_user_id from auth.users where email = admin_email;
  if target_user_id is null then
    return 'Error: user not found';
  end if;
  insert into public.admin_users (id, email, full_name)
  select target_user_id, admin_email, coalesce(raw_user_meta_data->>'full_name', admin_email)
  from auth.users where id = target_user_id
  on conflict (id) do update set is_active = true;
  return 'Success: ' || admin_email || ' is now an admin';
end;
$$ language plpgsql security definer set search_path = public, auth;

revoke execute on function public.get_user_org_id() from public;
revoke execute on function public.get_user_org_id() from authenticated;
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin() from authenticated;
revoke execute on function public.make_admin(text) from public;

create index if not exists idx_audit_log_admin on public.admin_audit_log(admin_id);
create index if not exists idx_audit_log_created on public.admin_audit_log(created_at desc);
create index if not exists idx_system_announcements_created_by on public.system_announcements(created_by);

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
