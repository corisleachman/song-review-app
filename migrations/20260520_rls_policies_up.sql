-- ============================================================
-- Migration: Enable proper RLS policies (safe / idempotent)
-- Date: 2026-05-20
-- Uses DROP IF EXISTS before each CREATE to avoid conflicts.
-- ============================================================

-- ─── Ensure RLS is enabled on all tables ────────────────────
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

-- ─── Drop ALL existing policies first (blanket + named) ─────
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

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

DROP POLICY IF EXISTS "profile_settings_select_own" ON profile_settings;
DROP POLICY IF EXISTS "profile_settings_insert_own" ON profile_settings;
DROP POLICY IF EXISTS "profile_settings_update_own" ON profile_settings;

DROP POLICY IF EXISTS "settings_authenticated_all" ON settings;
DROP POLICY IF EXISTS "settings_select_member" ON settings;
DROP POLICY IF EXISTS "settings_insert_member" ON settings;
DROP POLICY IF EXISTS "settings_update_member" ON settings;

DROP POLICY IF EXISTS "accounts_select_member" ON accounts;
DROP POLICY IF EXISTS "accounts_insert_own" ON accounts;
DROP POLICY IF EXISTS "accounts_update_owner" ON accounts;
DROP POLICY IF EXISTS "accounts_delete_owner" ON accounts;

DROP POLICY IF EXISTS "account_members_select_member" ON account_members;
DROP POLICY IF EXISTS "account_members_insert_owner" ON account_members;
DROP POLICY IF EXISTS "account_members_delete_owner" ON account_members;

DROP POLICY IF EXISTS "songs_select_member" ON songs;
DROP POLICY IF EXISTS "songs_insert_member" ON songs;
DROP POLICY IF EXISTS "songs_update_member" ON songs;
DROP POLICY IF EXISTS "songs_delete_owner" ON songs;
DROP POLICY IF EXISTS "Enable read access for all users" ON songs;

DROP POLICY IF EXISTS "song_versions_select_member" ON song_versions;
DROP POLICY IF EXISTS "song_versions_insert_member" ON song_versions;
DROP POLICY IF EXISTS "song_versions_update_member" ON song_versions;
DROP POLICY IF EXISTS "song_versions_delete_owner" ON song_versions;

DROP POLICY IF EXISTS "comment_threads_select_member" ON comment_threads;
DROP POLICY IF EXISTS "comment_threads_insert_member" ON comment_threads;

DROP POLICY IF EXISTS "comments_select_member" ON comments;
DROP POLICY IF EXISTS "comments_insert_member" ON comments;

DROP POLICY IF EXISTS "actions_select_member" ON actions;
DROP POLICY IF EXISTS "actions_insert_member" ON actions;
DROP POLICY IF EXISTS "actions_update_member" ON actions;
DROP POLICY IF EXISTS "actions_delete_owner" ON actions;

DROP POLICY IF EXISTS "song_tasks_select_member" ON song_tasks;
DROP POLICY IF EXISTS "song_tasks_insert_member" ON song_tasks;
DROP POLICY IF EXISTS "song_tasks_update_member" ON song_tasks;
DROP POLICY IF EXISTS "song_tasks_delete_member" ON song_tasks;

-- ─── profiles ───────────────────────────────────────────────
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─── profile_settings ───────────────────────────────────────
CREATE POLICY "profile_settings_select_own"
  ON profile_settings FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "profile_settings_insert_own"
  ON profile_settings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profile_settings_update_own"
  ON profile_settings FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── settings (legacy) ──────────────────────────────────────
CREATE POLICY "settings_select_member"
  ON settings FOR SELECT TO authenticated
  USING (public.is_account_member(account_id));

CREATE POLICY "settings_insert_member"
  ON settings FOR INSERT TO authenticated
  WITH CHECK (
    public.is_account_member(account_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "settings_update_member"
  ON settings FOR UPDATE TO authenticated
  USING (public.is_account_member(account_id))
  WITH CHECK (
    public.is_account_member(account_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- ─── accounts ───────────────────────────────────────────────
CREATE POLICY "accounts_select_member"
  ON accounts FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "accounts_insert_own"
  ON accounts FOR INSERT TO authenticated
  WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "accounts_update_owner"
  ON accounts FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "accounts_delete_owner"
  ON accounts FOR DELETE TO authenticated
  USING (
    id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ─── account_members ────────────────────────────────────────
CREATE POLICY "account_members_select_member"
  ON account_members FOR SELECT TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "account_members_insert_owner"
  ON account_members FOR INSERT TO authenticated
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "account_members_delete_owner"
  ON account_members FOR DELETE TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ─── songs ──────────────────────────────────────────────────
CREATE POLICY "songs_select_member"
  ON songs FOR SELECT TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "songs_insert_member"
  ON songs FOR INSERT TO authenticated
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "songs_update_member"
  ON songs FOR UPDATE TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "songs_delete_owner"
  ON songs FOR DELETE TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ─── song_versions ──────────────────────────────────────────
CREATE POLICY "song_versions_select_member"
  ON song_versions FOR SELECT TO authenticated
  USING (
    song_id IN (
      SELECT id FROM songs WHERE account_id IN (
        SELECT account_id FROM account_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "song_versions_insert_member"
  ON song_versions FOR INSERT TO authenticated
  WITH CHECK (
    song_id IN (
      SELECT id FROM songs WHERE account_id IN (
        SELECT account_id FROM account_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "song_versions_update_member"
  ON song_versions FOR UPDATE TO authenticated
  USING (
    song_id IN (
      SELECT id FROM songs WHERE account_id IN (
        SELECT account_id FROM account_members WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    song_id IN (
      SELECT id FROM songs WHERE account_id IN (
        SELECT account_id FROM account_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "song_versions_delete_owner"
  ON song_versions FOR DELETE TO authenticated
  USING (
    song_id IN (
      SELECT id FROM songs WHERE account_id IN (
        SELECT account_id FROM account_members WHERE user_id = auth.uid() AND role = 'owner'
      )
    )
  );

-- ─── comment_threads ────────────────────────────────────────
CREATE POLICY "comment_threads_select_member"
  ON comment_threads FOR SELECT TO authenticated
  USING (
    song_version_id IN (
      SELECT sv.id FROM song_versions sv
      JOIN songs s ON s.id = sv.song_id
      WHERE s.account_id IN (
        SELECT account_id FROM account_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "comment_threads_insert_member"
  ON comment_threads FOR INSERT TO authenticated
  WITH CHECK (
    song_version_id IN (
      SELECT sv.id FROM song_versions sv
      JOIN songs s ON s.id = sv.song_id
      WHERE s.account_id IN (
        SELECT account_id FROM account_members WHERE user_id = auth.uid()
      )
    )
  );

-- ─── comments ───────────────────────────────────────────────
CREATE POLICY "comments_select_member"
  ON comments FOR SELECT TO authenticated
  USING (
    thread_id IN (
      SELECT ct.id FROM comment_threads ct
      JOIN song_versions sv ON sv.id = ct.song_version_id
      JOIN songs s ON s.id = sv.song_id
      WHERE s.account_id IN (
        SELECT account_id FROM account_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "comments_insert_member"
  ON comments FOR INSERT TO authenticated
  WITH CHECK (
    thread_id IN (
      SELECT ct.id FROM comment_threads ct
      JOIN song_versions sv ON sv.id = ct.song_version_id
      JOIN songs s ON s.id = sv.song_id
      WHERE s.account_id IN (
        SELECT account_id FROM account_members WHERE user_id = auth.uid()
      )
    )
  );

-- ─── actions ────────────────────────────────────────────────
CREATE POLICY "actions_select_member"
  ON actions FOR SELECT TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "actions_insert_member"
  ON actions FOR INSERT TO authenticated
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "actions_update_member"
  ON actions FOR UPDATE TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "actions_delete_owner"
  ON actions FOR DELETE TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ─── song_tasks ─────────────────────────────────────────────
CREATE POLICY "song_tasks_select_member"
  ON song_tasks FOR SELECT TO authenticated
  USING (
    song_id IN (
      SELECT id FROM songs WHERE account_id IN (
        SELECT account_id FROM account_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "song_tasks_insert_member"
  ON song_tasks FOR INSERT TO authenticated
  WITH CHECK (
    song_id IN (
      SELECT id FROM songs WHERE account_id IN (
        SELECT account_id FROM account_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "song_tasks_update_member"
  ON song_tasks FOR UPDATE TO authenticated
  USING (
    song_id IN (
      SELECT id FROM songs WHERE account_id IN (
        SELECT account_id FROM account_members WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    song_id IN (
      SELECT id FROM songs WHERE account_id IN (
        SELECT account_id FROM account_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "song_tasks_delete_member"
  ON song_tasks FOR DELETE TO authenticated
  USING (
    song_id IN (
      SELECT id FROM songs WHERE account_id IN (
        SELECT account_id FROM account_members WHERE user_id = auth.uid()
      )
    )
  );
