-- Keep the state needed after a Supabase confirmation or recovery email out
-- of redirect_to. Supabase Auth logs redirect_to as the request referrer.
-- The UUID is only a short-lived lookup key; the sealed intent remains the
-- authority and is validated by the application before any redirect.
create table public.email_auth_flows (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  purpose text not null,
  sealed_intent text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 hour'),
  constraint email_auth_flows_email_hash_format
    check (email_hash ~ '^[0-9a-f]{64}$'),
  constraint email_auth_flows_purpose
    check (purpose in ('signup', 'recovery')),
  constraint email_auth_flows_sealed_intent_not_empty
    check (length(sealed_intent) > 0),
  constraint email_auth_flows_expiry_window
    check (
      expires_at > created_at
      and expires_at <= created_at + interval '1 hour'
    )
);

create index email_auth_flows_expires_at_idx
  on public.email_auth_flows (expires_at);

alter table public.email_auth_flows enable row level security;

-- No client policies are intentional. Only the server-side service-role
-- client can create, read, or consume a flow.
revoke all privileges on table public.email_auth_flows
  from public, anon, authenticated, service_role;

grant select, insert, delete on table public.email_auth_flows
  to service_role;
