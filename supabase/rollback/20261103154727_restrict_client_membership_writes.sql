-- Restores observed client grants and reopens the direct membership bypass.
-- Use only to recover a verified regression; data and policies are unchanged.
grant insert, update, delete on table public.account_members to anon, authenticated;
