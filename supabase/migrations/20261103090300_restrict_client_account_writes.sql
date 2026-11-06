-- Core account fields include plan, Stripe linkage and storage accounting.
-- All application account mutations already use canonical server routes/RPCs.
-- Preserve client reads, existing RLS, server privileges and all account data.
do $$ begin
  if not has_table_privilege('service_role','public.accounts','INSERT')
    or not has_table_privilege('service_role','public.accounts','UPDATE')
    or not has_table_privilege('service_role','public.accounts','DELETE') then
    raise exception 'Review missing canonical account server privileges';
  end if;
end $$;
revoke insert, update, delete on table public.accounts from public, anon, authenticated;
do $$ declare role_name text; privilege text; begin
  foreach role_name in array array['anon','authenticated'] loop
    foreach privilege in array array['INSERT','UPDATE'] loop
      if has_any_column_privilege(role_name,'public.accounts',privilege) then
        raise exception 'Review inherited or column account % for %',privilege,role_name;
      end if;
    end loop;
    if has_table_privilege(role_name,'public.accounts','DELETE') then
      raise exception 'Review inherited account DELETE for %',role_name;
    end if;
  end loop;
  if not has_table_privilege('authenticated','public.accounts','SELECT') then
    raise exception 'Workspace account reads must remain available';
  end if;
end $$;
