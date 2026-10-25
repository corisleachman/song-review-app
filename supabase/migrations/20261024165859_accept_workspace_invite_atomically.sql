-- Accept one workspace invitation and create its membership in the same
-- transaction. The caller is the trusted server-side service-role client.
create or replace function public.accept_workspace_invite_atomically(
  p_invite_token uuid,
  p_user_id uuid,
  p_user_email text
)
returns table (
  result text,
  account_id uuid,
  already_member boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_invite public.account_invites%rowtype;
  v_already_member boolean := false;
begin
  if p_invite_token is null or p_user_id is null or nullif(btrim(p_user_email), '') is null then
    return query select 'not_found'::text, null::uuid, false;
    return;
  end if;

  select invite.*
  into v_invite
  from public.account_invites as invite
  where invite.invite_token = p_invite_token
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, false;
    return;
  end if;

  if lower(btrim(p_user_email)) <> v_invite.normalized_email then
    return query select 'email_mismatch'::text, null::uuid, false;
    return;
  end if;

  if v_invite.status = 'revoked' then
    return query select 'revoked'::text, null::uuid, false;
    return;
  end if;

  if v_invite.status = 'expired' then
    return query select 'expired'::text, null::uuid, false;
    return;
  end if;

  select exists (
    select 1
    from public.account_members as member
    where member.account_id = v_invite.account_id
      and member.user_id = p_user_id
  ) into v_already_member;

  if v_invite.status = 'accepted' then
    if v_invite.accepted_by_user_id = p_user_id then
      insert into public.account_members (account_id, user_id, role)
      values (v_invite.account_id, p_user_id, 'member')
      on conflict on constraint account_members_pkey do nothing;

      return query select 'already_accepted'::text, v_invite.account_id, true;
    elsif v_already_member then
      return query select 'already_accepted'::text, v_invite.account_id, true;
    else
      return query select 'already_used'::text, null::uuid, false;
    end if;
    return;
  end if;

  if v_invite.expires_at <= statement_timestamp() then
    return query select 'expired'::text, null::uuid, false;
    return;
  end if;

  insert into public.account_members (account_id, user_id, role)
  values (v_invite.account_id, p_user_id, 'member')
  on conflict on constraint account_members_pkey do nothing;

  update public.account_invites as invite
  set
    status = 'accepted',
    accepted_by_user_id = p_user_id,
    accepted_at = statement_timestamp()
  where invite.id = v_invite.id
    and invite.status = 'pending';

  if not found then
    raise exception 'Invite state changed while it was being accepted'
      using errcode = '40001';
  end if;

  return query select 'accepted'::text, v_invite.account_id, v_already_member;
end;
$$;

revoke all privileges on function public.accept_workspace_invite_atomically(uuid, uuid, text)
  from public, anon, authenticated, service_role;

grant execute on function public.accept_workspace_invite_atomically(uuid, uuid, text)
  to service_role;

comment on function public.accept_workspace_invite_atomically(uuid, uuid, text) is
  'Service-role-only atomic workspace invitation acceptance and membership creation.';
