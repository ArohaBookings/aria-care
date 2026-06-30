-- ============================================================
-- Super admin account controls and in-app password recovery
-- Safe to re-run.
-- ============================================================

alter table public.users
  add column if not exists force_password_change boolean not null default false,
  add column if not exists password_reset_required_at timestamptz,
  add column if not exists password_reset_reason text,
  add column if not exists last_admin_password_reset_at timestamptz,
  add column if not exists last_admin_password_reset_by uuid,
  add column if not exists last_password_changed_at timestamptz,
  add column if not exists solo_usage_reset_at timestamptz;

alter table public.organisations
  add column if not exists admin_plan_override_until timestamptz,
  add column if not exists admin_plan_override_reason text,
  add column if not exists admin_plan_override_by uuid,
  add column if not exists admin_plan_override_at timestamptz,
  add column if not exists billing_status_checked_at timestamptz;

create index if not exists idx_users_force_password_change
  on public.users(force_password_change)
  where force_password_change = true;

create index if not exists idx_users_solo_usage_reset
  on public.users(solo_usage_reset_at)
  where solo_usage_reset_at is not null;
