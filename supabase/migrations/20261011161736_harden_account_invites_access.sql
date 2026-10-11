-- account_invites is a server-only table. Keep invite email addresses and
-- bearer tokens outside the client-facing Data API boundary.
alter table public.account_invites enable row level security;

revoke all privileges on table public.account_invites from anon, authenticated;

-- This trigger only normalizes rows written by the trusted server client.
-- It does not need to be callable through PostgREST, and its name resolution
-- should not depend on a caller-controlled search path.
alter function public.account_invites_sync_derived_fields()
  set search_path = '';

revoke execute on function public.account_invites_sync_derived_fields()
  from public, anon, authenticated;
