-- =============================================================================
-- Version upload integrity — schema migration (UP)
-- Date: 2026-07-18
-- =============================================================================
-- Serializes version-number allocation and makes storage accounting happen only
-- after the server has verified the uploaded object. The default timestamp keeps
-- old application instances compatible during a migration-first deployment;
-- the new allocation function explicitly creates pending rows with NULL.
-- =============================================================================

ALTER TABLE public.song_versions
  ADD COLUMN IF NOT EXISTS upload_finalized_at TIMESTAMPTZ DEFAULT now();

UPDATE public.song_versions
SET upload_finalized_at = coalesce(updated_at, created_at, now())
WHERE upload_finalized_at IS NULL;

CREATE OR REPLACE FUNCTION public.create_song_version_upload(
  p_song_id UUID,
  p_account_id UUID,
  p_label TEXT,
  p_notes TEXT,
  p_file_path TEXT,
  p_file_name TEXT,
  p_file_size_bytes BIGINT,
  p_created_by TEXT
)
RETURNS TABLE(version_id UUID, allocated_version_number INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version_number INTEGER;
  inserted_version_id UUID;
BEGIN
  PERFORM 1
  FROM public.songs
  WHERE id = p_song_id
    AND account_id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Song does not belong to the supplied account' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(max(sv.version_number), 0) + 1
  INTO next_version_number
  FROM public.song_versions sv
  WHERE sv.song_id = p_song_id;

  INSERT INTO public.song_versions (
    song_id,
    version_number,
    label,
    notes,
    file_path,
    file_name,
    file_size_bytes,
    created_by,
    upload_finalized_at
  )
  VALUES (
    p_song_id,
    next_version_number,
    p_label,
    p_notes,
    p_file_path,
    p_file_name,
    p_file_size_bytes,
    p_created_by,
    NULL
  )
  RETURNING id INTO inserted_version_id;

  RETURN QUERY SELECT inserted_version_id, next_version_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_song_version_upload(
  p_version_id UUID,
  p_account_id UUID,
  p_file_size_bytes BIGINT,
  p_storage_limit_bytes BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  finalized_at TIMESTAMPTZ;
  used_bytes BIGINT;
BEGIN
  IF p_file_size_bytes <= 0 OR p_file_size_bytes > 209715200 THEN
    RAISE EXCEPTION 'INVALID_UPLOAD_SIZE' USING ERRCODE = '22023';
  END IF;

  SELECT sv.upload_finalized_at
  INTO finalized_at
  FROM public.song_versions sv
  JOIN public.songs s ON s.id = sv.song_id
  WHERE sv.id = p_version_id
    AND s.account_id = p_account_id
  FOR UPDATE OF sv;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version does not belong to the supplied account' USING ERRCODE = '42501';
  END IF;

  IF finalized_at IS NOT NULL THEN
    RETURN false;
  END IF;

  SELECT coalesce(storage_bytes_used, 0)
  INTO used_bytes
  FROM public.accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found' USING ERRCODE = 'P0002';
  END IF;

  IF used_bytes + p_file_size_bytes > p_storage_limit_bytes THEN
    RAISE EXCEPTION 'STORAGE_LIMIT_REACHED' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.song_versions
  SET
    file_size_bytes = p_file_size_bytes,
    upload_finalized_at = now(),
    updated_at = now()
  WHERE id = p_version_id;

  UPDATE public.accounts
  SET storage_bytes_used = used_bytes + p_file_size_bytes
  WHERE id = p_account_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_song_version_upload(UUID, UUID, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_song_version_upload(UUID, UUID, BIGINT, BIGINT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_song_version_upload(UUID, UUID, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_song_version_upload(UUID, UUID, BIGINT, BIGINT)
  TO service_role;

COMMENT ON COLUMN public.song_versions.upload_finalized_at IS
  'NULL while a signed upload is pending; set atomically after storage metadata and quota are verified.';
