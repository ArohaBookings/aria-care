-- Public copies are no longer used by RLS policies after 0007.

do $$
begin
  if to_regprocedure('public.get_user_org_id()') is not null then
    execute 'revoke execute on function public.get_user_org_id() from authenticated';
  end if;

  if to_regprocedure('public.is_admin()') is not null then
    execute 'revoke execute on function public.is_admin() from authenticated';
  end if;
end $$;
