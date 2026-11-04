-- Legacy billing facts are server-owned; current entitlements use accounts/Stripe.
-- Preserve client reads, RLS, server writes and all existing content.
do $$ declare target text; role_name text; privilege text; begin
 foreach target in array array['billing_subscriptions','billing_checkout_sessions'] loop
  foreach privilege in array array['INSERT','UPDATE','DELETE'] loop
   if not has_table_privilege('service_role','public.'||target,privilege) then
    raise exception 'Review missing server % on %',privilege,target;
   end if;
  end loop;
  execute format('revoke insert, update, delete on table public.%I from public, anon, authenticated',target);
  foreach role_name in array array['anon','authenticated'] loop
   foreach privilege in array array['INSERT','UPDATE'] loop
    if has_any_column_privilege(role_name,'public.'||target,privilege) then
     raise exception 'Review inherited or column % on % for %',privilege,target,role_name;
    end if;
   end loop;
   if has_table_privilege(role_name,'public.'||target,'DELETE') then
    raise exception 'Review inherited DELETE on % for %',target,role_name;
   end if;
  end loop;
  if not has_table_privilege('authenticated','public.'||target,'SELECT') then
   raise exception 'Member reads must remain available for %',target;
  end if;
 end loop;
end $$;
