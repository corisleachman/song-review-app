alter table public.actions add column if not exists assigned_to_user_id uuid references auth.users(id) on delete set null;

alter table public.actions drop constraint if exists actions_status_check;

update public.actions
set status = case
  when status = 'approved' then 'in_progress'
  when status = 'completed' then 'done'
  else 'open'
end
where status is distinct from case
  when status = 'approved' then 'in_progress'
  when status = 'completed' then 'done'
  else 'open'
end;

alter table public.actions alter column status set default 'open';
alter table public.actions add constraint actions_status_check check (status = any (array['open'::text, 'in_progress'::text, 'done'::text]));

update public.actions a
set account_id = s.account_id
from public.songs s
where a.song_id = s.id
  and a.account_id is null;

update public.actions a
set created_by_user_id = c.author_user_id,
    account_id = coalesce(a.account_id, c.account_id)
from public.comments c
where a.comment_id = c.id
  and (a.created_by_user_id is null or a.account_id is null);
