-- =============================================================================
-- Dashboard query indexes — migration (UP)
-- Date: 2026-07-18
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_songs_account_created_desc
  ON public.songs (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_song_versions_song_version_desc
  ON public.song_versions (song_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_actions_song_status_updated_desc
  ON public.actions (song_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_actions_account_assignee_status
  ON public.actions (account_id, assigned_to_user_id, status);

CREATE INDEX IF NOT EXISTS idx_comment_threads_version_updated_desc
  ON public.comment_threads (song_version_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_thread_created_desc
  ON public.comments (thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_members_account_user
  ON public.account_members (account_id, user_id);
