drop index if exists public.accounts_stripe_subscription_id_unique_idx;
drop index if exists public.accounts_stripe_customer_id_unique_idx;

alter table public.accounts
  drop column if exists stripe_subscription_id,
  drop column if exists stripe_customer_id;
