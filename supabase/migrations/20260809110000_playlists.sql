-- =============================================================================
-- Playlist sharing — schema migration (UP)
-- Date: 2026-08-09
-- =============================================================================
-- Creates two tables for shareable, sequential-play playlists:
--   playlists       - a named, orderable set of songs owned by an account.
--   playlist_songs  - the ordered membership (playlist_id, song_id, position).
--
-- Notes for the v2 consumer build:
--   * Run against the PUBLIC app DB (hxtsuhmqrufcdplidtov).
--   * Scoped by account_id via account_members, mirroring the songs RLS pattern:
--     any account member can read/create/update/delete the account's playlists.
--   * Public access: when a playlist is is_public = true, the public API
--     (/api/public/playlist/[id], service-role) serves its songs' audio THROUGH
--     the playlist without requiring each song to be individually is_public.
--     There is intentionally NO anon RLS policy - public reads go through the
--     service-role API with an explicit is_public check (defence in depth).
-- =============================================================================

CREATE TABLE IF NOT EXISTS playlists (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id   UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by   UUID                 REFERENCES profiles(id) ON DELETE SET NULL,
  title        TEXT        NOT NULL DEFAULT 'Untitled playlist'
               CHECK (char_length(title) BETWEEN 1 AND 200),
  is_public    BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playlist_songs (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id  UUID        NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id      UUID        NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position     INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_playlists_account   ON playlists (account_id);
CREATE INDEX IF NOT EXISTS idx_playlists_public    ON playlists (id) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_playlist_songs_order ON playlist_songs (playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_song  ON playlist_songs (song_id);

-- ── Row Level Security ──
ALTER TABLE playlists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;

-- playlists: any account member manages the account's playlists.
CREATE POLICY "playlists_select_member"
  ON playlists FOR SELECT TO authenticated
  USING (account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid()));

CREATE POLICY "playlists_insert_member"
  ON playlists FOR INSERT TO authenticated
  WITH CHECK (account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid()));

CREATE POLICY "playlists_update_member"
  ON playlists FOR UPDATE TO authenticated
  USING (account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid()))
  WITH CHECK (account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid()));

CREATE POLICY "playlists_delete_member"
  ON playlists FOR DELETE TO authenticated
  USING (account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid()));

-- playlist_songs: scoped through the parent playlist's account (mirrors song_versions).
CREATE POLICY "playlist_songs_select_member"
  ON playlist_songs FOR SELECT TO authenticated
  USING (playlist_id IN (
    SELECT id FROM playlists WHERE account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid())));

CREATE POLICY "playlist_songs_insert_member"
  ON playlist_songs FOR INSERT TO authenticated
  WITH CHECK (playlist_id IN (
    SELECT id FROM playlists WHERE account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid())));

CREATE POLICY "playlist_songs_update_member"
  ON playlist_songs FOR UPDATE TO authenticated
  USING (playlist_id IN (
    SELECT id FROM playlists WHERE account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid())))
  WITH CHECK (playlist_id IN (
    SELECT id FROM playlists WHERE account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid())));

CREATE POLICY "playlist_songs_delete_member"
  ON playlist_songs FOR DELETE TO authenticated
  USING (playlist_id IN (
    SELECT id FROM playlists WHERE account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid())));

-- ── Grants (auth-gated tables: authenticated + service_role, never anon) ──
GRANT SELECT, INSERT, UPDATE, DELETE ON playlists      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON playlist_songs TO authenticated;
GRANT ALL ON playlists      TO service_role;
GRANT ALL ON playlist_songs TO service_role;

-- ── Comments ──
COMMENT ON TABLE playlists IS
  'A named, orderable set of songs owned by an account. When is_public = true it is playable via /listen/playlist/[id] through the service-role public API.';
COMMENT ON TABLE playlist_songs IS
  'Ordered membership of playlists (position). A song appears at most once per playlist.';
