-- Synthetic rows and paths only. No Storage objects, provider or Auth calls.
-- Candidate grants, all row changes and fixtures always ROLLBACK.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('public.accounts'::regclass,'public.account_members'::regclass,'public.songs'::regclass,'public.song_versions'::regclass)) THEN RAISE EXCEPTION 'Review fixture table triggers'; END IF;
END $$;
CREATE TEMP TABLE sv_results(test_case text,passed boolean) ON COMMIT DROP;
CREATE TEMP TABLE sv_fixture ON COMMIT DROP AS
 SELECT gen_random_uuid() workspace_id,gen_random_uuid() foreign_workspace,gen_random_uuid() song_id,gen_random_uuid() version_id,
 ids[1] owner_id,ids[2] admin_id,ids[3] member_id,ids[4] outsider_id
 FROM (SELECT array_agg(id ORDER BY id) ids FROM (SELECT id FROM public.profiles ORDER BY id LIMIT 4) p) x;
DO $$ BEGIN IF (SELECT outsider_id IS NULL FROM sv_fixture) THEN RAISE EXCEPTION 'Need four existing profile-backed identities'; END IF; END $$;
GRANT SELECT ON sv_fixture TO authenticated,service_role;
GRANT SELECT,INSERT ON sv_results TO authenticated,service_role;
CREATE TEMP TABLE sv_policies ON COMMIT DROP AS SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('songs','song_versions');
CREATE TEMP TABLE sv_grants ON COMMIT DROP AS
 SELECT r,t,p,has_table_privilege(r,'public.'||t,p) allowed
 FROM unnest(array['anon','authenticated','service_role']) r,
 unnest(array['accounts','account_members','songs','song_versions']) t,
 unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
 WHERE NOT(r IN ('anon','authenticated') AND t IN ('songs','song_versions') AND p IN ('INSERT','UPDATE','DELETE'));
INSERT INTO public.accounts(id,name,created_by_user_id,storage_bytes_used)
 SELECT workspace_id,'B36 rollback-only',owner_id,512 FROM sv_fixture
 UNION ALL SELECT foreign_workspace,'B36 foreign rollback-only',outsider_id,0 FROM sv_fixture;
INSERT INTO public.account_members(account_id,user_id,role)
 SELECT workspace_id,owner_id,'owner'::public.account_role FROM sv_fixture
 UNION ALL SELECT workspace_id,admin_id,'admin'::public.account_role FROM sv_fixture
 UNION ALL SELECT workspace_id,member_id,'member'::public.account_role FROM sv_fixture
 UNION ALL SELECT foreign_workspace,outsider_id,'owner'::public.account_role FROM sv_fixture;
INSERT INTO public.songs(id,title,account_id,created_by_user_id)
 SELECT song_id,'B36 synthetic song',workspace_id,owner_id FROM sv_fixture;
INSERT INTO public.song_versions(id,song_id,account_id,version_number,file_path,file_name,file_size_bytes,upload_finalized_at,created_by)
 SELECT version_id,song_id,workspace_id,1,'songs/'||song_id::text||'/uploads/fixture.mp3','fixture.mp3',512,now(),'Agent' FROM sv_fixture;

-- MIGRATION_UNDER_TEST

INSERT INTO sv_results SELECT 'other grants and all reads unchanged',bool_and(allowed=has_table_privilege(r,'public.'||t,p)) FROM sv_grants;
INSERT INTO sv_results SELECT 'song/version RLS policies unchanged',NOT EXISTS(
 (SELECT * FROM sv_policies EXCEPT SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('songs','song_versions'))
 UNION ALL (SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('songs','song_versions') EXCEPT SELECT * FROM sv_policies));
SET LOCAL ROLE authenticated;
DO $$ DECLARE f record; who record; op record; changed integer; allowed boolean:=/* CLIENT_WRITES_ALLOWED */; expected boolean; BEGIN
 SELECT * INTO f FROM sv_fixture;
 FOR who IN SELECT f.owner_id id,'owner' label UNION ALL SELECT f.admin_id,'admin' UNION ALL SELECT f.member_id,'member' UNION ALL SELECT f.outsider_id,'outsider' LOOP
  PERFORM set_config('request.jwt.claims',json_build_object('sub',who.id,'role','authenticated')::text,true);
  INSERT INTO sv_results SELECT who.label||' song reads scoped',count(*)=CASE WHEN who.label='outsider' THEN 0 ELSE 1 END FROM public.songs WHERE id=f.song_id;
  INSERT INTO sv_results SELECT who.label||' version reads scoped',count(*)=CASE WHEN who.label='outsider' THEN 0 ELSE 1 END FROM public.song_versions WHERE id=f.version_id;
  FOR op IN
   SELECT 'song INSERT' label,format('INSERT INTO public.songs(id,title,account_id) VALUES(%L,%L,%L)',gen_random_uuid(),'Bypass song fixture',f.workspace_id) sql,false deletion
   UNION ALL SELECT 'song UPDATE',format('UPDATE public.songs SET title=%L WHERE id=%L','Direct mutation fixture',f.song_id),false
   UNION ALL SELECT 'song DELETE',format('DELETE FROM public.songs WHERE id=%L',f.song_id),true
   UNION ALL SELECT 'version INSERT',format('INSERT INTO public.song_versions(id,song_id,account_id,version_number,file_path,file_name,file_size_bytes,upload_finalized_at,created_by) VALUES(%L,%L,%L,2,%L,%L,777,now(),%L)',gen_random_uuid(),f.song_id,f.workspace_id,'songs/'||f.song_id::text||'/uploads/unverified.mp3','unverified.mp3','Agent'),false
   UNION ALL SELECT 'version UPDATE',format('UPDATE public.song_versions SET file_size_bytes=999,upload_finalized_at=NULL WHERE id=%L',f.version_id),false
   UNION ALL SELECT 'version DELETE',format('DELETE FROM public.song_versions WHERE id=%L',f.version_id),true
  LOOP
   expected:=allowed AND who.label<>'outsider' AND (NOT op.deletion OR who.label IN ('owner','admin'));
   BEGIN
    EXECUTE op.sql;
    GET DIAGNOSTICS changed=ROW_COUNT;
    IF NOT allowed THEN RAISE EXCEPTION 'Direct client mutation unexpectedly permitted'; END IF;
    IF (changed=1) IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Unexpected baseline row count'; END IF;
    IF expected AND (op.label LIKE 'version%' OR op.deletion) AND
      (SELECT storage_bytes_used FROM public.accounts WHERE id=f.workspace_id)<>512 THEN
     RAISE EXCEPTION 'Baseline accounting behaviour changed';
    END IF;
    -- Roll back each operation before recording it, keeping later cases stable.
    RAISE EXCEPTION USING ERRCODE='P1234';
   EXCEPTION WHEN SQLSTATE 'P1234' THEN
    INSERT INTO sv_results VALUES(who.label||' baseline '||op.label||CASE WHEN expected THEN ' bypasses server path' ELSE ' denied by RLS' END,true);
   WHEN insufficient_privilege THEN
    IF expected THEN RAISE EXCEPTION 'Expected baseline mutation was denied'; END IF;
    INSERT INTO sv_results VALUES(who.label||' '||op.label||' denied',true);
   END;
  END LOOP;
 END LOOP;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ DECLARE f record; a record; deleted record; first_finalize boolean; second_finalize boolean; BEGIN
 SELECT * INTO f FROM sv_fixture;
 BEGIN
  PERFORM * FROM public.create_song_version_upload(f.song_id,f.foreign_workspace,'bad',NULL,'wrong.mp3','wrong.mp3',128,'Agent');
  RAISE EXCEPTION 'Cross-workspace allocation succeeded';
 EXCEPTION WHEN insufficient_privilege THEN INSERT INTO sv_results VALUES('allocation RPC rejects foreign workspace',true); END;
 SELECT * INTO a FROM public.create_song_version_upload(f.song_id,f.workspace_id,'fixture',NULL,'songs/'||f.song_id::text||'/uploads/pending.mp3','pending.mp3',128,'Agent');
 INSERT INTO sv_results SELECT 'allocation RPC creates pending next version without counting bytes',a.allocated_version_number=2 AND (SELECT upload_finalized_at IS NULL FROM public.song_versions WHERE id=a.version_id) AND (SELECT storage_bytes_used=512 FROM public.accounts WHERE id=f.workspace_id);
 BEGIN
  PERFORM public.finalize_song_version_upload(a.version_id,f.foreign_workspace,128,1024);
  RAISE EXCEPTION 'Cross-workspace finalization succeeded';
 EXCEPTION WHEN insufficient_privilege THEN INSERT INTO sv_results VALUES('finalize RPC rejects foreign workspace',true); END;
 first_finalize:=public.finalize_song_version_upload(a.version_id,f.workspace_id,128,1024);
 second_finalize:=public.finalize_song_version_upload(a.version_id,f.workspace_id,128,1024);
 INSERT INTO sv_results SELECT 'finalize RPC counts verified bytes exactly once',first_finalize AND NOT second_finalize AND storage_bytes_used=640 FROM public.accounts WHERE id=f.workspace_id;
 BEGIN
  PERFORM * FROM public.delete_song_and_release_storage(f.song_id,f.foreign_workspace);
  RAISE EXCEPTION 'Cross-workspace deletion succeeded';
 EXCEPTION WHEN insufficient_privilege THEN INSERT INTO sv_results VALUES('delete RPC rejects foreign workspace',true); END;
 SELECT * INTO deleted FROM public.delete_song_and_release_storage(f.song_id,f.workspace_id);
 INSERT INTO sv_results SELECT 'delete RPC releases finalized bytes and cascades versions',deleted.released_bytes=640 AND storage_bytes_used=0 AND NOT EXISTS(SELECT 1 FROM public.song_versions WHERE song_id=f.song_id) FROM public.accounts WHERE id=f.workspace_id;
END $$;
RESET ROLE;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM sv_results WHERE passed IS DISTINCT FROM true) THEN RAISE EXCEPTION 'Song/version boundary probe failed'; END IF; END $$;
SELECT test_case,passed FROM sv_results ORDER BY test_case;
ROLLBACK;
