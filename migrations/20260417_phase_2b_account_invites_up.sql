create table if not exists public.account_invites (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  email text not null,
  normalized_email text not null,
  role text not null default 'member' check (role = any (array['member'::text])),
  status text not null default 'pending' check (status = any (array[
    'pending'::text,
    'accepted'::text,
    'revoked'::text,
    'expired'::text
  ])),
  invite_token uuid not null default gen_random_uuid(),
  invited_by_user_id uuid not null references auth.users(id) on delete cascade,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamp with time zone,
  revoked_at timestamp with time zone,
  expires_at timestamp with time zone not null default (now() + interval '14 days'),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint account_invites_invite_token_key unique (invite_token),
  constraint account_invites_normalized_email_check check (normalized_email = lower(btrim(email)))
);

create index if not exists account_invites_account_id_idx
  on public.account_invites (account_id);

create index if not exists account_invites_normalized_email_idx
  on public.account_invites (normalized_email);

create unique index if not exists account_invites_pending_unique_idx
  on public.account_invites (account_id, normalized_email)
  where status = 'pending';

create or replace function public.account_invites_sync_derived_fields()
returns trigger
language plpgsql
as $$
begin
  new.email := btrim(new.email);
  new.normalized_email := lower(new.email);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists account_invites_sync_derived_fields_trigger on public.account_invites;

create trigger account_invites_sync_derived_fields_trigger
before insert or update on public.account_invites
for each row
execute function public.account_invites_sync_derived_fields();
