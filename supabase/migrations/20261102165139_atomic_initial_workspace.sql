-- Initial provisioning only. Existing/active memberships keep the canonical
-- application's existing read path; normal sign-in/dashboard reads aren't gated.
create function public.ensure_initial_workspace_membership(
  p_user_id uuid, p_workspace_name text
)
returns table (
  account_id uuid, user_id uuid, role text, joined_at timestamptz, was_created boolean
)
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_membership record;
  v_account_id uuid;
begin
  if p_user_id is null or p_workspace_name is null or btrim(p_workspace_name) = '' then
    raise exception 'Invalid initial workspace details' using errcode = '22023';
  end if;

  -- A stale empty-membership read may reach this RPC from several requests.
  -- Recheck after locking; the account and owner insert commit as one unit.
  perform pg_advisory_xact_lock(hashtextextended('song-room-initial-workspace:' || p_user_id::text, 0));
  if not exists (select 1 from public.profiles as p where p.id = p_user_id) then
    raise exception 'Profile required for initial workspace' using errcode = '22023';
  end if;

  select m.account_id, m.user_id, m.role::text as role, m.joined_at into v_membership
    from public.account_members as m
    where m.user_id = p_user_id and m.role::text in ('member', 'owner')
    order by case when m.role::text = 'member' then 0 else 1 end, m.joined_at, m.account_id
    limit 1;
  if found then
    return query select v_membership.account_id, v_membership.user_id,
      v_membership.role, v_membership.joined_at, false;
    return;
  end if;

  insert into public.accounts(created_by_user_id, name)
    values(p_user_id, p_workspace_name) returning id into v_account_id;
  insert into public.account_members(account_id,user_id,role)
    values(v_account_id,p_user_id,'owner')
    returning account_members.account_id, account_members.user_id,
      account_members.role::text, account_members.joined_at into v_membership;

  return query select v_membership.account_id, v_membership.user_id,
    v_membership.role, v_membership.joined_at, true;
end;
$$;
revoke all on function public.ensure_initial_workspace_membership(uuid,text)
  from public, anon, authenticated, service_role;
grant execute on function public.ensure_initial_workspace_membership(uuid,text) to service_role;
comment on function public.ensure_initial_workspace_membership(uuid,text) is
  'Service-role-only atomic initial workspace/owner provisioning. Rechecks member-first/owner-second membership under a per-user transaction lock.';
