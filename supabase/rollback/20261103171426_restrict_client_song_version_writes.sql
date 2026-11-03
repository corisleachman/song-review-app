-- Restores observed client grants and reopens upload/accounting bypasses.
-- Use only to recover a verified regression. No rows or policies are changed.
grant insert, update, delete on table public.songs,public.song_versions to anon,authenticated;
