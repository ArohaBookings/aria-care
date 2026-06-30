-- ============================================================
-- Security/performance tightening from Supabase advisors.
-- Safe to re-run.
-- ============================================================

do $$
begin
  if to_regprocedure('public.get_user_org_id()') is not null then
    execute 'alter function public.get_user_org_id() set search_path = public, auth';
    execute 'revoke execute on function public.get_user_org_id() from anon';
    execute 'grant execute on function public.get_user_org_id() to authenticated';
  end if;

  if to_regprocedure('public.is_admin()') is not null then
    execute 'alter function public.is_admin() set search_path = public, auth';
    execute 'revoke execute on function public.is_admin() from anon';
    execute 'grant execute on function public.is_admin() to authenticated';
  end if;

  if to_regprocedure('public.handle_new_user()') is not null then
    execute 'alter function public.handle_new_user() set search_path = public, auth';
    execute 'revoke execute on function public.handle_new_user() from anon, authenticated';
  end if;

  if to_regprocedure('public.make_admin(text)') is not null then
    execute 'alter function public.make_admin(text) set search_path = public, auth';
    execute 'revoke execute on function public.make_admin(text) from anon, authenticated';
  end if;

  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'alter function public.rls_auto_enable() set search_path = public';
    execute 'revoke execute on function public.rls_auto_enable() from anon, authenticated';
  end if;

  if to_regprocedure('public.update_compliance_status()') is not null then
    execute 'alter function public.update_compliance_status() set search_path = public';
    execute 'revoke execute on function public.update_compliance_status() from anon, authenticated';
  end if;
end $$;

create index if not exists idx_users_organisation_id on public.users(organisation_id);
create index if not exists idx_billing_records_organisation_id on public.billing_records(organisation_id);
create index if not exists idx_billing_records_participant_id on public.billing_records(participant_id);
create index if not exists idx_billing_records_shift_id on public.billing_records(shift_id);
create index if not exists idx_documents_created_by on public.documents(created_by);
create index if not exists idx_incident_reports_organisation_id on public.incident_reports(organisation_id);
create index if not exists idx_incident_reports_participant_id on public.incident_reports(participant_id);
create index if not exists idx_incident_reports_reported_by on public.incident_reports(reported_by);
create index if not exists idx_notifications_organisation_id on public.notifications(organisation_id);
create index if not exists idx_progress_notes_author_id on public.progress_notes(author_id);
create index if not exists idx_progress_notes_approved_by on public.progress_notes(approved_by);
create index if not exists idx_shifts_participant_id on public.shifts(participant_id);
create index if not exists idx_shifts_worker_id on public.shifts(worker_id);
create index if not exists idx_staff_compliance_organisation_id on public.staff_compliance(organisation_id);
create index if not exists idx_support_plans_organisation_id on public.support_plans(organisation_id);
create index if not exists idx_support_plans_participant_id on public.support_plans(participant_id);
create index if not exists idx_support_plans_created_by on public.support_plans(created_by);
create index if not exists idx_system_announcements_created_by on public.system_announcements(created_by);
