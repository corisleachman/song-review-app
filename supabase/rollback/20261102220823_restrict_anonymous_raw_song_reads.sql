-- Restores the observed legacy anon SELECT grants and reopens raw history and
-- internal metadata exposure. Use only to recover a verified regression.
-- RLS policies were not modified by the migration; no data is changed.
grant select on table public.songs, public.song_versions to anon;
