-- ============================================================
-- Migration: Enable proper RLS policies for all tables
-- Date: 2026-05-20
-- Replaces the blanket "Allow all USING (true)" policies with
-- policies scoped to authenticated users and workspace membership.
-- ============================================================

-- ─── Drop existing blanket policies ─────────────────────────

DROP POLICY IF EXISTS "Allow all" ON songs;
DROP POLICY IF EXISTS "Allow all" ON song_versions;
DROP POLICY IF EXISTS "Allow all" ON comment_threads;
DROP POLICY IF EXISTS "Allow all" ON comments;
DROP POLICY IF EXISTS "Allow all" ON song_tasks;
DROP POLICY IF EXISTS "Allow all" ON actions;
DROP POLICY IF EXISTS "Allow all" ON settings;
DROP POLICY IF EXISTS "Allow all" ON profiles;
DROP POLICY IF EXISTS "Allow all" ON accounts;
DROP POLICY IF EXISTS "Allow all" ON account_members;
DROP POLICY IF EXISTS "Allow all" ON profile_settings;

-- Ensure RLS is enabled on all tables (idempotent)
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;

-- ─── Helper: is this user a member of the workspace that owns this song? ───
-- Used inline in policies below via subquery. No stored function needed.

-- ─── profiles ───────────────────────────────────────────────
-- Each user can read and update their own profile row.

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─── profile_settings ───────────────────────────────────────
-- Each user can read and write their own theme settings.

CREATE POLICY "profile_settings_select_own"
  ON profile_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "profile_settings_insert_own"
  ON profile_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profile_settings_update_own"
  ON profile_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── settings (legacy) ──────────────────────────────────────
-- Legacy table: any authenticated user can read/write.
-- This is acceptable because it's transitional and keyed by
-- identity string, not by user id or workspace.

CREATE POLICY "settings_authenticated_all"
  ON settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── accounts ───────────────────────────────────────────────
-- A user can see any account they are a member of.
-- Only the account creator can update or delete.

CREATE POLICY "accounts_select_member"
  ON accounts FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "accounts_insert_own"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "accounts_update_owner"
  ON accounts FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "accounts_delete_owner"
  ON accounts FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ─── account_members ────────────────────────────────────────
-- Members can see who else is in their workspace.
-- Only owners can add or remove members.

CREATE POLICY "account_members_select_member"
  ON account_members FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "account_members_insert_owner"
  ON account_members FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "account_members_delete_owner"
  ON account_members FOR DELETE
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ─── songs ──────────────────────────────────────────────────
-- Any workspace member can view and create songs.
-- Only owners can delete songs (enforced in app layer too).

CREATE POLICY "songs_select_member"
  ON songs FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "songs_insert_member"
  ON songs FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "songs_update_member"
  ON songs FOR UPDATE
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "songs_delete_owner"
  ON songs FOR DELETE
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ─── song_versions ──────────────────────────────────────────
-- Any member of the song's workspace can view or upload versions.

CREATE POLICY "song_versions_select_member"
  ON song_versions FOR SELECT
  TO authenticated
  USING (
    song_id IN (
      SELECT id FROM songs
      WHERE account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "song_versions_insert_member"
  ON song_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    song_id IN (
      SELECT id FROM songs
      WHERE account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "song_versions_update_member"
  ON song_versions FOR UPDATE
  TO authenticated
  USING (
    song_id IN (
      SELECT id FROM songs
      WHERE account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    song_id IN (
      SELECT id FROM songs
      WHERE account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "song_versions_delete_owner"
  ON song_versions FOR DELETE
  TO authenticated
  USING (
    song_id IN (
      SELECT id FROM songs
      WHERE account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid() AND role = 'owner'
      )
    )
  );

-- ─── comment_threads ────────────────────────────────────────
-- Any workspace member can view and create threads.

CREATE POLICY "comment_threads_select_member"
  ON comment_threads FOR SELECT
  TO authenticated
  USING (
    song_version_id IN (
      SELECT sv.id FROM song_versions sv
      JOIN songs s ON s.id = sv.song_id
      WHERE s.account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "comment_threads_insert_member"
  ON comment_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    song_version_id IN (
      SELECT sv.id FROM song_versions sv
      JOIN songs s ON s.id = sv.song_id
      WHERE s.account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- ─── comments ───────────────────────────────────────────────
-- Any workspace member can view and post comments.

CREATE POLICY "comments_select_member"
  ON comments FOR SELECT
  TO authenticated
  USING (
    thread_id IN (
      SELECT ct.id FROM comment_threads ct
      JOIN song_versions sv ON sv.id = ct.song_version_id
      JOIN songs s ON s.id = sv.song_id
      WHERE s.account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "comments_insert_member"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    thread_id IN (
      SELECT ct.id FROM comment_threads ct
      JOIN song_versions sv ON sv.id = ct.song_version_id
      JOIN songs s ON s.id = sv.song_id
      WHERE s.account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- ─── actions ────────────────────────────────────────────────
-- Any workspace member can view and create actions.
-- Any member can update action status/assignment.

CREATE POLICY "actions_select_member"
  ON actions FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "actions_insert_member"
  ON actions FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "actions_update_member"
  ON actions FOR UPDATE
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "actions_delete_owner"
  ON actions FOR DELETE
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ─── song_tasks ─────────────────────────────────────────────
-- Any workspace member can view and manage song tasks.

CREATE POLICY "song_tasks_select_member"
  ON song_tasks FOR SELECT
  TO authenticated
  USING (
    song_id IN (
      SELECT id FROM songs
      WHERE account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "song_tasks_insert_member"
  ON song_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    song_id IN (
      SELECT id FROM songs
      WHERE account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "song_tasks_update_member"
  ON song_tasks FOR UPDATE
  TO authenticated
  USING (
    song_id IN (
      SELECT id FROM songs
      WHERE account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    song_id IN (
      SELECT id FROM songs
      WHERE account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "song_tasks_delete_member"
  ON song_tasks FOR DELETE
  TO authenticated
  USING (
    song_id IN (
      SELECT id FROM songs
      WHERE account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid()
      )
    )
  );
