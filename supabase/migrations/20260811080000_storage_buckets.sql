-- Keep storage provisioning in migration history so Supabase branches reproduce
-- the public media setup used by single-song and playlist sharing.
--
-- Objects remain data-less on a new branch. The application uploads through
-- server-authorized or signed requests, while public listeners read the final
-- media URLs without an account.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES
  ('song-files', 'song-files', true, NULL, NULL),
  ('song-images', 'song-images', true, NULL, NULL)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
