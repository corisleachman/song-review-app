-- =============================================================================
-- Account storage schema sync — migration (UP)
-- Date: 2026-07-18
-- =============================================================================
-- Captures storage columns and the current free/pro/studio plan values that the
-- application already relies on but which were missing from migration history.
-- =============================================================================

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS storage_bytes_used BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.song_versions
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_plan_check;

UPDATE public.accounts
SET plan = 'pro'
WHERE plan = 'paid';

UPDATE public.accounts
SET plan = 'free'
WHERE plan IS NULL OR plan NOT IN ('free', 'pro', 'studio');

ALTER TABLE public.accounts
  ALTER COLUMN plan SET DEFAULT 'free',
  ALTER COLUMN plan SET NOT NULL;

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_plan_check
  CHECK (plan IN ('free', 'pro', 'studio'));

ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_storage_bytes_nonnegative;

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_storage_bytes_nonnegative
  CHECK (storage_bytes_used >= 0);
