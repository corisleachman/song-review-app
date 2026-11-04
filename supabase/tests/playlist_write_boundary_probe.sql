-- Disposable rows only; existing identities are used as role subjects, never changed.
-- No Storage, Auth API, email, payment or network operation. Always rollback.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('public.accounts'::regclass,'public.account_members'::regclass,'public.songs'::regclass,'public.playlists'::regclass,'public.playlist_songs'::regclass)) THEN RAISE EXCEPTION 'Review fixture triggers'; END IF;
END $$;
CREATE TEMP TABLE playlist_results(test_case text,passed boolean) ON COMMIT DROP;
CREATE TEMP TABLE playlist_fixture ON COMMIT DROP AS SELECT
 gen_random_uuid() a,gen_random_uuid() b,gen_random_uuid() song_a,gen_random_uuid() pa,gen_random_uuid() pb,
 ids[1] owner_id,ids[2] admin_id,ids[3] member_id,ids[4] outsider_id
 FROM (SELECT array_agg(id ORDER BY id) ids FROM (SELECT id FROM public.profiles ORDER BY id LIMIT 4) p) x;
DO $$ BEGIN IF (SELECT outsider_id IS NULL FROM playlist_fixture) THEN RAISE EXCEPTION 'Need four existing profile subjects'; END IF; END $$;
GRANT SELECT ON playlist_fixture TO authenticated,anon,service_role;
GRANT SELECT,INSERT ON playlist_results TO authenticated,anon,service_role;
CREATE TEMP TABLE playlist_policies ON COMMIT DROP AS SELECT policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='playlists';
CREATE TEMP TABLE playlist_grants ON COMMIT DROP AS
 SELECT r,t,p,has_table_privilege(r,'public.'||t,p) allowed FROM unnest(array['anon','authenticated','service_role']) r,
 unnest(array['playlists','playlist_songs','songs','accounts','account_members']) t,
 unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
 WHERE NOT(r IN ('anon','authenticated') AND t='playlists' AND p IN ('INSERT','UPDATE','DELETE'));
INSERT INTO public.accounts(id,name,created_by_user_id) SELECT a,'B39 rollback-only A',owner_id FROM playlist_fixture UNION ALL SELECT b,'B39 rollback-only B',outsider_id FROM playlist_fixture;
INSERT INTO public.account_members(account_id,user_id,role)
 SELECT a,owner_id,'owner'::public.account_role FROM playlist_fixture UNION ALL SELECT a,admin_id,'admin'::public.account_role FROM playlist_fixture
 UNION ALL SELECT a,member_id,'member'::public.account_role FROM playlist_fixture UNION ALL SELECT b,member_id,'member'::public.account_role FROM playlist_fixture
 UNION ALL SELECT b,outsider_id,'owner'::public.account_role FROM playlist_fixture;
INSERT INTO public.songs(id,title,account_id) SELECT song_a,'B39 private source title',a FROM playlist_fixture;
INSERT INTO public.playlists(id,account_id,title,created_by) SELECT pa,a,'B39 A',owner_id FROM playlist_fixture UNION ALL SELECT pb,b,'B39 B',outsider_id FROM playlist_fixture;
INSERT INTO public.playlist_songs(playlist_id,song_id) SELECT pa,song_a FROM playlist_fixture;

-- MIGRATION_UNDER_TEST

INSERT INTO playlist_results SELECT 'other grants unchanged',bool_and(allowed=has_table_privilege(r,'public.'||t,p)) FROM playlist_grants;
INSERT INTO playlist_results SELECT 'playlist policies unchanged',NOT EXISTS(
 (SELECT * FROM playlist_policies EXCEPT SELECT policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='playlists') UNION ALL
 (SELECT policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='playlists' EXCEPT SELECT * FROM playlist_policies));
SET LOCAL ROLE authenticated;
DO $$ DECLARE f record; who record; op record; changed integer; allowed boolean:=/* CLIENT_WRITES_ALLOWED */; BEGIN
 SELECT * INTO f FROM playlist_fixture;
 FOR who IN SELECT f.owner_id id,'owner' label UNION ALL SELECT f.admin_id,'admin' UNION ALL SELECT f.member_id,'member' UNION ALL SELECT f.outsider_id,'outsider' LOOP
  PERFORM set_config('request.jwt.claims',json_build_object('sub',who.id,'role','authenticated')::text,true);
  INSERT INTO playlist_results SELECT who.label||' source playlist read',count(*)=CASE WHEN who.label='outsider' THEN 0 ELSE 1 END FROM public.playlists WHERE id=f.pa;
  FOR op IN SELECT 'insert spoofed creator' label,format('INSERT INTO public.playlists(account_id,title,created_by) VALUES(%L,%L,%L)',f.a,'B39 forged',f.outsider_id) sql
   UNION ALL SELECT 'update header',format('UPDATE public.playlists SET title=%L WHERE id=%L','B39 changed',f.pa)
   UNION ALL SELECT 'delete header',format('DELETE FROM public.playlists WHERE id=%L',f.pa) LOOP
   BEGIN
    EXECUTE op.sql; GET DIAGNOSTICS changed=ROW_COUNT;
    IF NOT allowed OR (who.label='outsider' AND changed<>0) THEN RAISE EXCEPTION 'Unexpected client write % %',who.label,op.label; END IF;
    IF who.label<>'outsider' AND changed<>1 THEN RAISE EXCEPTION 'Expected baseline write'; END IF;
    RAISE EXCEPTION USING ERRCODE='P1234';
   EXCEPTION
    WHEN SQLSTATE 'P1234' THEN INSERT INTO playlist_results VALUES(who.label||' baseline '||op.label,true);
    WHEN insufficient_privilege THEN
     IF allowed AND who.label<>'outsider' THEN RAISE; END IF;
     INSERT INTO playlist_results VALUES(who.label||' denied '||op.label,true);
   END;
  END LOOP;
 END LOOP;
 -- The dual-workspace member moves the header but not its linked source song.
 PERFORM set_config('request.jwt.claims',json_build_object('sub',f.member_id,'role','authenticated')::text,true);
 BEGIN
  UPDATE public.playlists SET account_id=f.b WHERE id=f.pa; GET DIAGNOSTICS changed=ROW_COUNT;
  IF NOT allowed OR changed<>1 THEN RAISE EXCEPTION 'Unexpected header transfer result'; END IF;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',f.outsider_id,'role','authenticated')::text,true);
  INSERT INTO playlist_results SELECT 'baseline destination-only user sees transferred foreign song link',count(*)=1 FROM public.playlist_songs WHERE playlist_id=f.pa AND song_id=f.song_a;
  INSERT INTO playlist_results SELECT 'baseline destination-only user cannot read source song directly',count(*)=0 FROM public.songs WHERE id=f.song_a;
 EXCEPTION WHEN insufficient_privilege THEN
  IF allowed THEN RAISE; END IF;
  INSERT INTO playlist_results VALUES('dual-workspace client header transfer denied',true);
 END;
END $$;
RESET ROLE;
-- Same unscoped service metadata query used by private playlist GET: baseline
-- can return a source title to the destination-only caller after header transfer.
INSERT INTO playlist_results SELECT 'cross-workspace linked-title state matches mode',count(*)=CASE WHEN /* CLIENT_WRITES_ALLOWED */ THEN 1 ELSE 0 END
 FROM public.playlist_songs ps JOIN public.playlists p ON p.id=ps.playlist_id JOIN public.songs s ON s.id=ps.song_id,playlist_fixture f
 WHERE p.id=f.pa AND p.account_id=f.b AND s.account_id=f.a;
SET LOCAL ROLE anon;
INSERT INTO playlist_results SELECT 'anonymous playlist read denied',count(*)=0 FROM public.playlists WHERE id IN (SELECT pa FROM playlist_fixture UNION ALL SELECT pb FROM playlist_fixture);
DO $$ DECLARE f record; BEGIN SELECT * INTO f FROM playlist_fixture;
 BEGIN INSERT INTO public.playlists(account_id,title) VALUES(f.a,'B39 anon'); RAISE EXCEPTION 'Anonymous insert succeeded';
 EXCEPTION WHEN insufficient_privilege THEN INSERT INTO playlist_results VALUES('anonymous playlist insert denied',true); END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ DECLARE f record; new_id uuid; changed integer; BEGIN SELECT * INTO f FROM playlist_fixture;
 INSERT INTO public.playlists(account_id,title,created_by) VALUES(f.a,'B39 service',f.owner_id) RETURNING id INTO new_id;
 INSERT INTO playlist_results VALUES('server playlist insert',new_id IS NOT NULL);
 UPDATE public.playlists SET title='B39 server renamed',is_public=true WHERE id=new_id; GET DIAGNOSTICS changed=ROW_COUNT;
 INSERT INTO playlist_results VALUES('server playlist update',changed=1);
 DELETE FROM public.playlists WHERE id=new_id; GET DIAGNOSTICS changed=ROW_COUNT;
 INSERT INTO playlist_results VALUES('server playlist delete',changed=1);
END $$;
RESET ROLE;
SELECT * FROM playlist_results ORDER BY test_case;
ROLLBACK;
