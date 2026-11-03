-- Restores observed table grants and reopens direct context/attribution bypasses.
-- Preserve B26's existing private comment/thread INSERT denial.
grant insert,update,delete on table public.actions,public.song_tasks,public.playlist_songs to anon,authenticated;
grant update,delete on table public.comments,public.comment_threads to anon,authenticated;
