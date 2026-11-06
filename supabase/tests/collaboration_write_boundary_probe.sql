-- Synthetic records only. No provider, Auth API, email or Storage operations.
-- Compose with the script; every mode always ROLLBACKs.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('public.accounts'::regclass,'public.account_members'::regclass,'public.songs'::regclass,'public.song_versions'::regclass,'public.actions'::regclass,'public.song_tasks'::regclass,'public.comments'::regclass,'public.comment_threads'::regclass,'public.playlists'::regclass,'public.playlist_songs'::regclass)) THEN RAISE EXCEPTION 'Review fixture triggers'; END IF;
END $$;
CREATE TEMP TABLE collab_results(test_case text,passed boolean) ON COMMIT DROP;
CREATE TEMP TABLE collab_fixture ON COMMIT DROP AS
 SELECT gen_random_uuid() a,gen_random_uuid() b,gen_random_uuid() sa,gen_random_uuid() sb,
 gen_random_uuid() va,gen_random_uuid() vb,gen_random_uuid() ta,gen_random_uuid() tb,
 gen_random_uuid() ca,gen_random_uuid() cb,gen_random_uuid() pa,gen_random_uuid() pb,
 gen_random_uuid() action_a,gen_random_uuid() task_a,gen_random_uuid() entry_a,
 ids[1] owner_id,ids[2] admin_id,ids[3] member_id,ids[4] outsider_id
 FROM (SELECT array_agg(id ORDER BY id) ids FROM (SELECT id FROM public.profiles ORDER BY id LIMIT 4) p) x;
DO $$ BEGIN IF (SELECT outsider_id IS NULL FROM collab_fixture) THEN RAISE EXCEPTION 'Need four profile-backed identities'; END IF; END $$;
GRANT SELECT ON collab_fixture TO authenticated,service_role;
GRANT SELECT,INSERT ON collab_results TO authenticated,service_role;
CREATE TEMP TABLE collab_policies ON COMMIT DROP AS SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('actions','song_tasks','playlist_songs','comments','comment_threads');
CREATE TEMP TABLE collab_grants ON COMMIT DROP AS
 SELECT r,t,p,has_table_privilege(r,'public.'||t,p) allowed
 FROM unnest(array['anon','authenticated','service_role']) r,
 unnest(array['accounts','account_members','songs','song_versions','actions','song_tasks','playlist_songs','comments','comment_threads','playlists','public_comments']) t,
 unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
 WHERE NOT(r IN ('anon','authenticated') AND t IN ('actions','song_tasks','playlist_songs','comments','comment_threads') AND p IN ('INSERT','UPDATE','DELETE'));
INSERT INTO public.accounts(id,name,created_by_user_id) SELECT a,'B37 rollback-only A',owner_id FROM collab_fixture UNION ALL SELECT b,'B37 rollback-only B',outsider_id FROM collab_fixture;
INSERT INTO public.account_members(account_id,user_id,role)
 SELECT a,owner_id,'owner'::public.account_role FROM collab_fixture UNION ALL SELECT a,admin_id,'admin'::public.account_role FROM collab_fixture UNION ALL SELECT a,member_id,'member'::public.account_role FROM collab_fixture UNION ALL SELECT b,outsider_id,'owner'::public.account_role FROM collab_fixture;
INSERT INTO public.songs(id,title,account_id) SELECT sa,'B37 song A',a FROM collab_fixture UNION ALL SELECT sb,'B37 song B',b FROM collab_fixture;
INSERT INTO public.song_versions(id,song_id,account_id,version_number,created_by,file_name,file_path)
 SELECT va,sa,a,1,'Agent','a.mp3','songs/'||sa::text||'/a.mp3' FROM collab_fixture UNION ALL SELECT vb,sb,b,1,'Agent','b.mp3','songs/'||sb::text||'/b.mp3' FROM collab_fixture;
INSERT INTO public.comment_threads(id,song_version_id,timestamp_seconds,created_by,account_id)
 SELECT ta,va,0,'Agent',a FROM collab_fixture UNION ALL SELECT tb,vb,0,'Agent',b FROM collab_fixture;
INSERT INTO public.comments(id,thread_id,author,body,account_id,author_user_id)
 SELECT ca,ta,'Agent','Fixture A',a,owner_id FROM collab_fixture UNION ALL SELECT cb,tb,'Agent','Fixture B',b,outsider_id FROM collab_fixture;
INSERT INTO public.playlists(id,account_id,title,created_by) SELECT pa,a,'B37 playlist A',owner_id FROM collab_fixture UNION ALL SELECT pb,b,'B37 playlist B',outsider_id FROM collab_fixture;
INSERT INTO public.playlist_songs(id,playlist_id,song_id) SELECT entry_a,pa,sa FROM collab_fixture;
INSERT INTO public.actions(id,song_id,comment_id,account_id,description) SELECT action_a,sa,ca,a,'B37 action' FROM collab_fixture;
INSERT INTO public.song_tasks(id,song_id,account_id,description) SELECT task_a,sa,a,'B37 task' FROM collab_fixture;

-- MIGRATION_UNDER_TEST

INSERT INTO collab_results SELECT 'reads and unrelated grants unchanged',bool_and(allowed=has_table_privilege(r,'public.'||t,p)) FROM collab_grants;
INSERT INTO collab_results SELECT 'collaboration RLS unchanged',NOT EXISTS(
 (SELECT * FROM collab_policies EXCEPT SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('actions','song_tasks','playlist_songs','comments','comment_threads')) UNION ALL
 (SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('actions','song_tasks','playlist_songs','comments','comment_threads') EXCEPT SELECT * FROM collab_policies));
SET LOCAL ROLE authenticated;
DO $$ DECLARE f record; who record; op record; changed integer; allowed boolean:=/* CLIENT_WRITES_ALLOWED */; expected boolean; BEGIN
 SELECT * INTO f FROM collab_fixture;
 FOR op IN SELECT t,r FROM unnest(array['actions','song_tasks','playlist_songs','comments','comment_threads']) t,unnest(array['anon','authenticated']) r LOOP
  INSERT INTO collab_results VALUES(op.r||' '||op.t||' DML grants match mode',
   has_any_column_privilege(op.r,'public.'||op.t,'INSERT')=(allowed AND op.t NOT IN ('comments','comment_threads'))
   AND has_any_column_privilege(op.r,'public.'||op.t,'UPDATE')=allowed
   AND has_table_privilege(op.r,'public.'||op.t,'DELETE')=allowed);
 END LOOP;
 FOR who IN SELECT f.owner_id id,'owner' label UNION ALL SELECT f.admin_id,'admin' UNION ALL SELECT f.member_id,'member' UNION ALL SELECT f.outsider_id,'outsider' LOOP
  PERFORM set_config('request.jwt.claims',json_build_object('sub',who.id,'role','authenticated')::text,true);
  FOR op IN SELECT 'actions' t,f.action_a id UNION ALL SELECT 'song_tasks',f.task_a UNION ALL SELECT 'comments',f.ca UNION ALL SELECT 'comment_threads',f.ta UNION ALL SELECT 'playlist_songs',f.entry_a LOOP
   EXECUTE format('SELECT count(*) FROM public.%I WHERE id=%L',op.t,op.id) INTO changed;
   INSERT INTO collab_results VALUES(who.label||' scoped '||op.t||' read',changed=CASE WHEN who.label='outsider' THEN 0 ELSE 1 END);
  END LOOP;
  FOR op IN
   SELECT 'action foreign-link INSERT' label,format('INSERT INTO public.actions(song_id,comment_id,account_id,description,assigned_to_user_id,resolved_in_version_id) VALUES(%L,%L,%L,%L,%L,%L)',f.sb,f.cb,f.a,'B37 forged action',f.outsider_id,f.vb) sql
   UNION ALL SELECT 'action foreign-link UPDATE',format('UPDATE public.actions SET song_id=%L,comment_id=%L,assigned_to_user_id=%L,resolved_in_version_id=%L WHERE id=%L',f.sb,f.cb,f.outsider_id,f.vb,f.action_a)
   UNION ALL SELECT 'task inconsistent-account INSERT',format('INSERT INTO public.song_tasks(song_id,account_id,description) VALUES(%L,%L,%L)',f.sa,f.b,'B37 mismatched task')
   UNION ALL SELECT 'task inconsistent-account UPDATE',format('UPDATE public.song_tasks SET account_id=%L WHERE id=%L',f.b,f.task_a)
   UNION ALL SELECT 'playlist foreign-song INSERT',format('INSERT INTO public.playlist_songs(playlist_id,song_id) VALUES(%L,%L)',f.pa,f.sb)
   UNION ALL SELECT 'playlist foreign-song UPDATE',format('UPDATE public.playlist_songs SET song_id=%L WHERE id=%L',f.sb,f.entry_a)
   UNION ALL SELECT 'comment forged-author UPDATE',format('UPDATE public.comments SET author_user_id=%L,author=%L WHERE id=%L',f.outsider_id,'B37 forged author',f.ca)
   UNION ALL SELECT 'thread forged-creator UPDATE',format('UPDATE public.comment_threads SET created_by_user_id=%L,created_by=%L WHERE id=%L',f.outsider_id,'B37 forged creator',f.ta)
  LOOP
   expected:=allowed AND who.label<>'outsider';
   BEGIN
    EXECUTE op.sql; GET DIAGNOSTICS changed=ROW_COUNT;
    IF NOT allowed THEN RAISE EXCEPTION 'Direct mutation remains permitted'; END IF;
    IF (changed=1) IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Unexpected baseline mutation count'; END IF;
    RAISE EXCEPTION USING ERRCODE='P1234';
   EXCEPTION WHEN SQLSTATE 'P1234' THEN INSERT INTO collab_results VALUES(who.label||' baseline '||op.label,true);
   WHEN insufficient_privilege THEN
    IF expected THEN RAISE EXCEPTION 'Expected baseline operation denied'; END IF;
    INSERT INTO collab_results VALUES(who.label||' denied '||op.label,true);
   END;
  END LOOP;
 END LOOP;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ DECLARE f record; op record; changed integer; BEGIN
 SELECT * INTO f FROM collab_fixture;
 -- Exercise the existing server writes without invoking notification providers.
 FOR op IN
  SELECT 'actions' t,format('UPDATE public.actions SET status=%L WHERE id=%L','done',f.action_a) sql
  UNION ALL SELECT 'song_tasks',format('UPDATE public.song_tasks SET status=%L WHERE id=%L','completed',f.task_a)
  UNION ALL SELECT 'comments',format('UPDATE public.comments SET body=%L WHERE id=%L','B37 server reply edit',f.ca)
  UNION ALL SELECT 'comment_threads',format('UPDATE public.comment_threads SET updated_at=clock_timestamp() WHERE id=%L',f.ta)
  UNION ALL SELECT 'playlist_songs',format('UPDATE public.playlist_songs SET position=1 WHERE id=%L',f.entry_a)
 LOOP
  EXECUTE op.sql; GET DIAGNOSTICS changed=ROW_COUNT;
  INSERT INTO collab_results VALUES('server retains '||op.t||' update',changed=1);
 END LOOP;
 FOR op IN SELECT 'actions' t,f.action_a id UNION ALL SELECT 'song_tasks',f.task_a UNION ALL SELECT 'playlist_songs',f.entry_a UNION ALL SELECT 'comments',f.ca UNION ALL SELECT 'comment_threads',f.ta LOOP
  EXECUTE format('DELETE FROM public.%I WHERE id=%L',op.t,op.id); GET DIAGNOSTICS changed=ROW_COUNT;
  INSERT INTO collab_results VALUES('server retains '||op.t||' delete',changed=1);
 END LOOP;
 INSERT INTO public.comment_threads(id,song_version_id,timestamp_seconds,created_by,account_id) VALUES(f.ta,f.va,0,'Agent',f.a);
 INSERT INTO collab_results VALUES('server retains comment_threads insert',true);
 INSERT INTO public.comments(id,thread_id,author,body,account_id) VALUES(f.ca,f.ta,'Agent','B37 server reply',f.a);
 INSERT INTO collab_results VALUES('server retains comments insert',true);
 INSERT INTO public.actions(id,song_id,comment_id,account_id,description) VALUES(f.action_a,f.sa,f.ca,f.a,'B37 server action');
 INSERT INTO collab_results VALUES('server retains actions insert',true);
 INSERT INTO public.song_tasks(id,song_id,account_id,description) VALUES(f.task_a,f.sa,f.a,'B37 server task');
 INSERT INTO collab_results VALUES('server retains song_tasks insert',true);
 INSERT INTO public.playlist_songs(id,playlist_id,song_id) VALUES(f.entry_a,f.pa,f.sa);
 INSERT INTO collab_results VALUES('server retains playlist_songs insert',true);
END $$;
RESET ROLE;
INSERT INTO collab_results SELECT 'all server collaboration I/U/D retained',bool_and(has_table_privilege('service_role','public.'||t,p)) FROM unnest(array['actions','song_tasks','comments','comment_threads','playlist_songs']) t,unnest(array['INSERT','UPDATE','DELETE']) p;
INSERT INTO collab_results SELECT 'existing private comment client INSERT restrictions retained',NOT has_any_column_privilege('authenticated','public.comments','INSERT') AND NOT has_any_column_privilege('authenticated','public.comment_threads','INSERT');
DO $$ BEGIN IF EXISTS(SELECT 1 FROM collab_results WHERE passed IS DISTINCT FROM true) THEN RAISE EXCEPTION 'Collaboration boundary probe failed'; END IF; END $$;
SELECT test_case,passed FROM collab_results ORDER BY test_case;
ROLLBACK;
