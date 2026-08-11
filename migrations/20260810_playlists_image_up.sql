-- =============================================================================
-- Playlist custom cover image (UP) — Date: 2026-08-10
-- =============================================================================
-- Optional per-playlist cover for social share previews. When set, it overrides
-- the default (the first track's artwork). Run against the PUBLIC app DB
-- (hxtsuhmqrufcdplidtov). Existing table -> ALTER only, no grants/RLS changes.
-- =============================================================================

ALTER TABLE playlists ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN playlists.image_url IS
  'Optional custom playlist cover (share preview). When set, overrides the first track''s artwork.';
