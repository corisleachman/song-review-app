-- =============================================================================
-- Playlist sharing — schema migration (DOWN)
-- Date: 2026-08-09
-- =============================================================================
-- Reverses 20260809_playlists_up.sql. Policies, indexes, and playlist_songs
-- rows drop with the tables.
-- WARNING: destroys all playlists and their song ordering.
-- =============================================================================

DROP TABLE IF EXISTS playlist_songs;
DROP TABLE IF EXISTS playlists;
