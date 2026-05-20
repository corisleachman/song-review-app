-- ============================================================
-- Rollback: Revert to blanket "Allow all" policies
-- Date: 2026-05-20
-- ============================================================

-- Drop all named policies
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname NOT IN ('Allow all')
      AND policyname LIKE '%_select_%' OR policyname LIKE '%_insert_%'
        OR policyname LIKE '%_update_%' OR policyname LIKE '%_delete_%'
        OR policyname LIKE '%_owner' OR policyname LIKE '%_member'
        OR policyname LIKE '%_own' OR policyname LIKE '%_authenticated_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Restore blanket policies
CREATE POLICY "Allow all" ON songs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON song_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON comment_threads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON song_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON actions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON account_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON profile_settings FOR ALL USING (true) WITH CHECK (true);
