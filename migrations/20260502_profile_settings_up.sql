create table if not exists public.profile_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  primary_color text not null default '#ff1493',
  accent_color text not null default '#a855f7',
  background_color text not null default '#0d0914',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create or replace function public.profile_settings_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profile_settings_touch_updated_at_trigger on public.profile_settings;

create trigger profile_settings_touch_updated_at_trigger
before update on public.profile_settings
for each row
execute function public.profile_settings_touch_updated_at();
