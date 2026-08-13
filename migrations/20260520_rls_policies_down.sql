-- ============================================================
-- Rollback: intentionally unavailable
-- Date: 2026-05-20
-- ============================================================
--
-- The state before this migration granted blanket access to workspace data.
-- Recreating that state would expose private records and is not a safe rollback.
-- Repair a policy regression with a new forward migration instead.

DO $$
BEGIN
  RAISE NOTICE 'No rollback executed: restoring blanket RLS policies is unsafe.';
END $$;
