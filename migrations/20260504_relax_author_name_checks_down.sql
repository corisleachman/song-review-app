alter table public.song_versions
  add constraint song_versions_created_by_check check (created_by = any (array['Coris'::text, 'Al'::text]));

alter table public.comment_threads
  add constraint comment_threads_created_by_check check (created_by = any (array['Coris'::text, 'Al'::text]));

alter table public.comments
  add constraint comments_author_check check (author = any (array['Coris'::text, 'Al'::text]));

alter table public.actions
  add constraint actions_suggested_by_check check (suggested_by = any (array['Coris'::text, 'Al'::text]));

alter table public.settings
  add constraint settings_user_identity_check check (user_identity = any (array['Coris'::text, 'Al'::text]));
