-- =============================================================================
-- Add visualizer_enabled preference to profile_settings (UP)
-- Date: 2026-08-09
-- =============================================================================
-- Adds a per-user "audio visualizer on/off" preference to the existing
-- profile_settings table. Defaults to true so existing users keep the reactive
-- visualizer on the player page until they turn it off in Settings > Appearance.
--
-- Notes:
--   * Run against the PUBLIC app DB (hxtsuhmqrufcdplidtov) — the consumer build.
--   * profile_settings already exists (theme colours), so this is an ALTER only:
--     no new grants, no RLS changes.
-- =============================================================================

ALTER TABLE profile_settings
  ADD COLUMN IF NOT EXISTS visualizer_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN profile_settings.visualizer_enabled IS
  'Per-user preference: whether the reactive audio visualizer renders on the player page. Default true.';
