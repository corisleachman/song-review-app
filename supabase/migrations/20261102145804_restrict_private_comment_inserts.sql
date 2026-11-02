-- Private comment creation/replies use canonical server routes, where identity,
-- workspace checks, shared rate limits and notification scheduling are enforced.
-- Existing client INSERT grants bypass that path. Preserve all other privileges,
-- policies and rows; the server's service_role still creates threads/comments.
do $$
begin
  if not has_table_privilege('service_role','public.comments','INSERT')
    or not has_table_privilege('service_role','public.comment_threads','INSERT') then
    raise exception 'Review missing server comment INSERT permissions before applying';
  end if;
end $$;

revoke insert on table public.comments, public.comment_threads
  from public, anon, authenticated;

-- Column grants or inherited roles could otherwise leave another insert path.
-- Stop rather than silently expanding the change into unrelated role grants.
do $$
begin
  if has_any_column_privilege('anon','public.comments','INSERT')
    or has_any_column_privilege('anon','public.comment_threads','INSERT')
    or has_any_column_privilege('authenticated','public.comments','INSERT')
    or has_any_column_privilege('authenticated','public.comment_threads','INSERT') then
    raise exception 'Review remaining client column/inherited comment INSERT privileges';
  end if;
end $$;
