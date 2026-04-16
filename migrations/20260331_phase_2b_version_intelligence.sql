alter table public.song_versions add column if not exists notes text;

alter table public.actions add column if not exists resolved_in_version_id uuid references public.song_versions(id) on delete set null;
