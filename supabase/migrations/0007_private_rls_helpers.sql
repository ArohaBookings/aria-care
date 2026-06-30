-- ============================================================
-- Move RLS helper functions out of the exposed public API schema.
-- Safe to re-run.
-- ============================================================

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

drop policy if exists "org_access" on public.organisations;
drop policy if exists "org_access" on public.users;
drop policy if exists "org_access" on public.participants;
drop policy if exists "org_access" on public.progress_notes;
drop policy if exists "org_access" on public.support_plans;
drop policy if exists "org_access" on public.incident_reports;
drop policy if exists "org_access" on public.staff_compliance;
drop policy if exists "org_access" on public.shifts;
drop policy if exists "org_access" on public.billing_records;
drop policy if exists "org_access" on public.participant_goals;
drop policy if exists "org_access" on public.documents;
drop policy if exists "org_access" on public.notifications;
drop policy if exists "org_access" on public.email_log;

create policy "org_access" on public.organisations for all using (id = private.get_user_org_id());
create policy "org_access" on public.users for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.participants for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.progress_notes for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.support_plans for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.incident_reports for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.staff_compliance for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.shifts for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.billing_records for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.participant_goals for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.documents for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.notifications for all using (organisation_id = private.get_user_org_id());
create policy "org_access" on public.email_log for all using (organisation_id = private.get_user_org_id());

drop policy if exists "admins_only" on public.admin_users;
drop policy if exists "admins_only" on public.admin_audit_log;
drop policy if exists "admins_only" on public.system_announcements;

create policy "admins_only" on public.admin_users for all using (private.is_admin());
create policy "admins_only" on public.admin_audit_log for all using (private.is_admin());
create policy "admins_only" on public.system_announcements for all using (private.is_admin());

revoke execute on function public.get_user_org_id() from public;
revoke execute on function public.is_admin() from public;
