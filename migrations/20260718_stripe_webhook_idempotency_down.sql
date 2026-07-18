-- Stripe webhook idempotency — schema migration (DOWN)

DROP FUNCTION IF EXISTS public.fail_stripe_webhook_event(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.complete_stripe_webhook_event(TEXT);
DROP FUNCTION IF EXISTS public.claim_stripe_webhook_event(TEXT, TEXT);
DROP TABLE IF EXISTS public.stripe_webhook_events;
