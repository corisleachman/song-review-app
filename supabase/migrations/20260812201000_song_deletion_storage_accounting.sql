-- Delete a song and release its finalized audio bytes in one database transaction.
-- The API uses the returned paths to remove storage objects after the row delete.

CREATE OR REPLACE FUNCTION public.delete_song_and_release_storage(
  p_song_id UUID,
  p_account_id UUID
)
RETURNS TABLE(file_paths TEXT[], released_bytes BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  paths_to_remove TEXT[];
  bytes_to_release BIGINT;
BEGIN
  PERFORM 1
  FROM public.songs
  WHERE id = p_song_id
    AND account_id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Song does not belong to the supplied account' USING ERRCODE = '42501';
  END IF;

  PERFORM 1
  FROM public.song_versions
  WHERE song_id = p_song_id
  FOR UPDATE;

  SELECT
    coalesce(
      array_agg(file_path) FILTER (WHERE NULLIF(btrim(file_path), '') IS NOT NULL),
      ARRAY[]::TEXT[]
    ),
    coalesce(
      sum(
        CASE
          WHEN upload_finalized_at IS NOT NULL THEN greatest(coalesce(file_size_bytes, 0), 0)
          ELSE 0
        END
      ),
      0
    )
  INTO paths_to_remove, bytes_to_release
  FROM public.song_versions
  WHERE song_id = p_song_id;

  PERFORM 1
  FROM public.accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.accounts
  SET storage_bytes_used = greatest(0, coalesce(storage_bytes_used, 0) - bytes_to_release)
  WHERE id = p_account_id;

  DELETE FROM public.songs
  WHERE id = p_song_id
    AND account_id = p_account_id;

  RETURN QUERY SELECT paths_to_remove, bytes_to_release;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_song_and_release_storage(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_song_and_release_storage(UUID, UUID)
  TO service_role;
