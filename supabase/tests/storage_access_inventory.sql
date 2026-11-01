-- Read-only metadata inventory. Run separately on the confirmed target project.
-- No object names, URLs, identities or customer content are returned.
BEGIN READ ONLY;
SELECT jsonb_build_object(
  'buckets', (SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'public', public, 'file_size_limit', file_size_limit,
    'allowed_mime_types', allowed_mime_types) ORDER BY id), '[]'::jsonb)
    FROM storage.buckets WHERE id IN ('song-files', 'song-images')),
  'storage_object_policy_count', (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'),
  'public_view_count', (SELECT count(*) FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm'))
) AS storage_access_inventory;
ROLLBACK;
