-- Public song comments — schema migration (DOWN)

DROP TABLE IF EXISTS public.public_comments;

ALTER TABLE public.songs
  DROP CONSTRAINT IF EXISTS songs_public_comments_require_public;

ALTER TABLE public.songs
  DROP COLUMN IF EXISTS public_comments_enabled,
  DROP COLUMN IF EXISTS is_public;
