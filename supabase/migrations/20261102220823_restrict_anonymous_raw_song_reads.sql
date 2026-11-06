-- Public song/playlist/comment readers already use canonical server projections.
-- Raw anon SELECT exposes history, pending uploads and internal column values.
-- Public comments are already server-only. Keep that existing boundary, all
-- policies, authenticated workspace access, service access and data unchanged.
do $$
begin
  if not has_table_privilege('service_role','public.songs','SELECT')
    or not has_table_privilege('service_role','public.song_versions','SELECT') then
    raise exception 'Review missing public projection server SELECT grants';
  end if;
end $$;
revoke select on table public.songs, public.song_versions from public, anon;
do $$
begin
  if has_any_column_privilege('anon','public.songs','SELECT')
    or has_any_column_privilege('anon','public.song_versions','SELECT') then
    raise exception 'Review remaining anonymous column or inherited SELECT grants';
  end if;
  if not has_table_privilege('authenticated','public.songs','SELECT')
    or not has_table_privilege('authenticated','public.song_versions','SELECT') then
    raise exception 'Authenticated workspace SELECT must remain available';
  end if;
end $$;
