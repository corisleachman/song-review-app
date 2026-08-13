-- =============================================================================
-- Stripe webhook idempotency — schema migration (UP)
-- Date: 2026-07-18
-- =============================================================================
-- Records and atomically claims Stripe event IDs. Failed events and processing
-- claims abandoned for more than ten minutes can be retried; processed events
-- cannot be claimed again.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status_attempt
  ON public.stripe_webhook_events (status, last_attempt_at);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.stripe_webhook_events TO service_role;

CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  p_event_id TEXT,
  p_event_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  IF NULLIF(btrim(p_event_id), '') IS NULL OR NULLIF(btrim(p_event_type), '') IS NULL THEN
    RAISE EXCEPTION 'Stripe event id and type are required';
  END IF;

  INSERT INTO public.stripe_webhook_events (
    stripe_event_id,
    event_type,
    status,
    attempt_count,
    received_at,
    last_attempt_at
  )
  VALUES (p_event_id, p_event_type, 'processing', 1, now(), now())
  ON CONFLICT (stripe_event_id) DO NOTHING;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows = 1 THEN
    RETURN true;
  END IF;

  UPDATE public.stripe_webhook_events
  SET
    status = 'processing',
    event_type = p_event_type,
    attempt_count = attempt_count + 1,
    last_attempt_at = now(),
    processed_at = NULL,
    last_error = NULL
  WHERE stripe_event_id = p_event_id
    AND (
      status = 'failed'
      OR (status = 'processing' AND last_attempt_at < now() - interval '10 minutes')
    );

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_stripe_webhook_event(p_event_id TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.stripe_webhook_events
  SET status = 'processed', processed_at = now(), last_error = NULL
  WHERE stripe_event_id = p_event_id
    AND status = 'processing';
$$;

CREATE OR REPLACE FUNCTION public.fail_stripe_webhook_event(
  p_event_id TEXT,
  p_error TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.stripe_webhook_events
  SET status = 'failed', last_error = left(coalesce(p_error, 'Unknown webhook error'), 1000)
  WHERE stripe_event_id = p_event_id
    AND status = 'processing';
$$;

REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_stripe_webhook_event(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_stripe_webhook_event(TEXT, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_stripe_webhook_event(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_stripe_webhook_event(TEXT, TEXT) TO service_role;

COMMENT ON TABLE public.stripe_webhook_events IS
  'Service-role-only processing ledger for Stripe webhook event idempotency and safe retries.';
