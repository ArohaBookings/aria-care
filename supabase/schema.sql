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
  notification_preferences jsonb default '{}',
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

create or replace function get_user_org_id()
returns uuid as $$
  select organisation_id from public.users where id = auth.uid();
$$ language sql security definer stable;

create policy "org_access" on public.organisations for all using (id = get_user_org_id());
create policy "org_access" on public.users for all using (organisation_id = get_user_org_id());
create policy "org_access" on public.participants for all using (organisation_id = get_user_org_id());
create policy "org_access" on public.progress_notes for all using (organisation_id = get_user_org_id());
create policy "org_access" on public.support_plans for all using (organisation_id = get_user_org_id());
create policy "org_access" on public.incident_reports for all using (organisation_id = get_user_org_id());
create policy "org_access" on public.staff_compliance for all using (organisation_id = get_user_org_id());
create policy "org_access" on public.shifts for all using (organisation_id = get_user_org_id());
create policy "org_access" on public.billing_records for all using (organisation_id = get_user_org_id());

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
$$ language plpgsql security definer;

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
$$ language sql security definer stable;

create policy "admins_only" on public.admin_users for all using (is_admin());
create policy "admins_only" on public.admin_audit_log for all using (is_admin());
create policy "admins_only" on public.system_announcements for all using (is_admin());

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
$$ language plpgsql security definer;

create index if not exists idx_audit_log_admin on public.admin_audit_log(admin_id);
create index if not exists idx_audit_log_created on public.admin_audit_log(created_at desc);
