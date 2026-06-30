-- ============================================================
-- Revoke implicit PUBLIC execute grants on SECURITY DEFINER helpers.
-- Safe to re-run.
-- ============================================================

do $$
begin
  if to_regprocedure('public.get_user_org_id()') is not null then
    execute 'revoke execute on function public.get_user_org_id() from public';
    execute 'grant execute on function public.get_user_org_id() to authenticated';
  end if;

  if to_regprocedure('public.is_admin()') is not null then
    execute 'revoke execute on function public.is_admin() from public';
    execute 'grant execute on function public.is_admin() to authenticated';
  end if;

  if to_regprocedure('public.handle_new_user()') is not null then
    execute 'revoke execute on function public.handle_new_user() from public';
  end if;

  if to_regprocedure('public.make_admin(text)') is not null then
    execute 'revoke execute on function public.make_admin(text) from public';
  end if;

  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public';
  end if;

  if to_regprocedure('public.update_compliance_status()') is not null then
    execute 'revoke execute on function public.update_compliance_status() from public';
  end if;
end $$;
