-- Restores observed client grants and reopens playlist workspace/link reassignment.
-- No content, policy or other privilege changes.
grant insert,update,delete on table public.playlists to anon,authenticated;
