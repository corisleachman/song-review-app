drop trigger if exists account_invites_sync_derived_fields_trigger on public.account_invites;

drop function if exists public.account_invites_sync_derived_fields();

drop index if exists public.account_invites_pending_unique_idx;
drop index if exists public.account_invites_normalized_email_idx;
drop index if exists public.account_invites_account_id_idx;

drop table if exists public.account_invites;
