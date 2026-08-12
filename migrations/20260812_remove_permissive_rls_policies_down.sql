-- Intentionally no-op. Restoring these policies would expose private song
-- metadata and allow cross-workspace access to legacy settings rows.

DO $$
BEGIN
  RAISE NOTICE 'No rollback executed: restoring permissive RLS policies is unsafe.';
END $$;
