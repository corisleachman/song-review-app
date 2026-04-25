alter table public.accounts
  drop constraint if exists accounts_plan_check;

alter table public.accounts
  drop column if exists plan;
