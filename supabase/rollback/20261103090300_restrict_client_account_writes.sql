-- Restores the exact observed client table grants and reopens the confirmed
-- direct plan/Stripe/account-lifecycle bypass. Recover a verified regression only.
-- The migration does not alter policies, account data or service-role privileges.
grant insert, update, delete on table public.accounts to anon, authenticated;
