alter table public.songs add column if not exists status text;

update public.songs
set status = 'in_progress'
where status is null;

alter table public.songs drop constraint if exists songs_status_check;
alter table public.songs alter column status set default 'in_progress';
alter table public.songs add constraint songs_status_check check (status = any (array[
  'writing'::text,
  'in_progress'::text,
  'mixing'::text,
  'mastering'::text,
  'finished'::text
]));
