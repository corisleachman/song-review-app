-- Restores observed grants and reopens client legacy-billing fact mutation.
-- No account entitlement, Stripe object, row or policy is changed.
grant insert,update,delete on table public.billing_subscriptions,public.billing_checkout_sessions to anon,authenticated;
