-- Harden the existing public-comments feature captured in the production
-- baseline. Public access is mediated by application routes using the service
-- role so validation and moderation cannot be bypassed through the Data API.

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_comments_enabled BOOLEAN NOT NULL DEFAULT false;

UPDATE public.songs
SET public_comments_enabled = false
WHERE public_comments_enabled = true
  AND is_public = false;

ALTER TABLE public.songs
  DROP CONSTRAINT IF EXISTS songs_public_comments_require_public;

ALTER TABLE public.songs
  ADD CONSTRAINT songs_public_comments_require_public
  CHECK (NOT public_comments_enabled OR is_public);

CREATE TABLE IF NOT EXISTS public.public_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.public_comments
  DROP CONSTRAINT IF EXISTS public_comments_author_name_length,
  DROP CONSTRAINT IF EXISTS public_comments_body_length;

ALTER TABLE public.public_comments
  ADD CONSTRAINT public_comments_author_name_length
    CHECK (char_length(btrim(author_name)) BETWEEN 1 AND 50),
  ADD CONSTRAINT public_comments_body_length
    CHECK (char_length(btrim(body)) BETWEEN 1 AND 500);

CREATE INDEX IF NOT EXISTS idx_public_comments_song_visible_created
  ON public.public_comments (song_id, is_hidden, created_at DESC);

ALTER TABLE public.public_comments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.public_comments FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.public_comments TO service_role;

COMMENT ON TABLE public.public_comments IS
  'Comments submitted through a public song link. Access is mediated by server routes using the service role.';

COMMENT ON COLUMN public.songs.public_comments_enabled IS
  'Allows public comments only while is_public is also true.';
