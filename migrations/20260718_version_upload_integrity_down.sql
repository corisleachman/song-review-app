-- Version upload integrity — schema migration (DOWN)

DROP FUNCTION IF EXISTS public.finalize_song_version_upload(UUID, UUID, BIGINT, BIGINT);
DROP FUNCTION IF EXISTS public.create_song_version_upload(UUID, UUID, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT);

ALTER TABLE public.song_versions
  DROP COLUMN IF EXISTS upload_finalized_at;
