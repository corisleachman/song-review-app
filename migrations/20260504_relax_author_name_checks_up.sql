alter table public.song_versions
  drop constraint if exists song_versions_created_by_check;

alter table public.comment_threads
  drop constraint if exists comment_threads_created_by_check;

alter table public.comments
  drop constraint if exists comments_author_check;

alter table public.actions
  drop constraint if exists actions_suggested_by_check;

alter table public.settings
  drop constraint if exists settings_user_identity_check;
