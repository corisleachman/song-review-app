-- Restores the exact observed anon/authenticated table INSERT grants in both
-- environments. Existing RLS policies remain in place throughout. This reopens
-- the direct member-write bypass, so use only to recover a verified regression.
grant insert on table public.comments, public.comment_threads to anon, authenticated;
