-- Membership creation/removal already uses owner-checked server routes/RPCs.
-- Direct writes bypass invitation, role and owner-preservation controls.
-- Preserve client reads, existing RLS, server privileges and membership data.
do $$ begin
  if not has_table_privilege('service_role','public.account_members','INSERT')
    or not has_table_privilege('service_role','public.account_members','UPDATE')
    or not has_table_privilege('service_role','public.account_members','DELETE') then
    raise exception 'Review missing canonical membership server privileges';
  end if;
end $$;
revoke insert, update, delete on table public.account_members from public, anon, authenticated;
do $$ declare role_name text; privilege text; begin
  foreach role_name in array array['anon','authenticated'] loop
    foreach privilege in array array['INSERT','UPDATE'] loop
      if has_any_column_privilege(role_name,'public.account_members',privilege) then
        raise exception 'Review inherited or column membership % for %',privilege,role_name;
      end if;
    end loop;
    if has_table_privilege(role_name,'public.account_members','DELETE') then
      raise exception 'Review inherited membership DELETE for %',role_name;
    end if;
  end loop;
  if not has_table_privilege('authenticated','public.account_members','SELECT') then
    raise exception 'Workspace membership reads must remain available';
  end if;
end $$;
