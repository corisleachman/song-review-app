-- =============================================================================
-- Add visualizer_enabled preference to profile_settings (DOWN)
-- Date: 2026-08-09
-- =============================================================================
-- Reverses 20260809_profile_settings_visualizer_up.sql.
-- =============================================================================

ALTER TABLE profile_settings
  DROP COLUMN IF EXISTS visualizer_enabled;
