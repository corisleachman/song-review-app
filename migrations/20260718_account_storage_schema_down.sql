-- Account storage schema sync — migration (DOWN)

ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_storage_bytes_nonnegative;

ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_plan_check;

UPDATE public.accounts
SET plan = 'paid'
WHERE plan IN ('pro', 'studio');

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_plan_check
  CHECK (plan IN ('free', 'paid'));

ALTER TABLE public.song_versions
  DROP COLUMN IF EXISTS file_size_bytes;

ALTER TABLE public.accounts
  DROP COLUMN IF EXISTS storage_bytes_used;
