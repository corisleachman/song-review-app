-- Dashboard query indexes — migration (DOWN)

DROP INDEX IF EXISTS public.idx_account_members_account_user;
DROP INDEX IF EXISTS public.idx_comments_thread_created_desc;
DROP INDEX IF EXISTS public.idx_comment_threads_version_updated_desc;
DROP INDEX IF EXISTS public.idx_actions_account_assignee_status;
DROP INDEX IF EXISTS public.idx_actions_song_status_updated_desc;
DROP INDEX IF EXISTS public.idx_song_versions_song_version_desc;
DROP INDEX IF EXISTS public.idx_songs_account_created_desc;
