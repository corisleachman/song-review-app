alter table public.accounts
  add column if not exists plan text;

update public.accounts
set plan = 'free'
where plan is null;

alter table public.accounts
  alter column plan set default 'free';

alter table public.accounts
  alter column plan set not null;

alter table public.accounts
  drop constraint if exists accounts_plan_check;

alter table public.accounts
  add constraint accounts_plan_check
  check (plan in ('free', 'paid'));
