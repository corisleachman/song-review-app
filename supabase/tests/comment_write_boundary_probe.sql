-- Emits only rolled-back synthetic database work. No audio, Storage requests,
-- API notification scheduling or provider email calls. Compose via the script.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
CREATE TEMP TABLE comment_boundary_results(test_case text, passed boolean) ON COMMIT DROP;
CREATE TEMP TABLE comment_boundary_fixture ON COMMIT DROP AS
  SELECT gen_random_uuid() as workspace_id, gen_random_uuid() as song_id,
    gen_random_uuid() as version_id, gen_random_uuid() as thread_id,
    gen_random_uuid() as comment_id, gen_random_uuid() as reply_id,
    ids[1] as owner_id, ids[2] as member_id, ids[3] as outsider_id
  FROM (SELECT array_agg(id order by id) as ids FROM
    (SELECT id FROM public.profiles order by id limit 3) eligible) identities;
GRANT SELECT ON comment_boundary_fixture TO authenticated, anon, service_role;
GRANT SELECT, INSERT ON comment_boundary_results TO authenticated, anon, service_role;
DO $$ BEGIN
  IF (SELECT outsider_id is null FROM comment_boundary_fixture) THEN
    RAISE EXCEPTION 'Need three existing profile-backed identities';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN (
    'public.accounts'::regclass,'public.account_members'::regclass,'public.songs'::regclass,
    'public.song_versions'::regclass,'public.comment_threads'::regclass,'public.comments'::regclass
  )) THEN RAISE EXCEPTION 'Review new triggers before synthetic writes'; END IF;
END $$;
CREATE TEMP TABLE comment_boundary_other_grants ON COMMIT DROP AS
  SELECT role_name, table_name, privilege,
    has_table_privilege(role_name, 'public.' || table_name, privilege) AS allowed
  FROM unnest(array['anon','authenticated','service_role']) role_name,
    unnest(array['comments','comment_threads']) table_name,
    unnest(array['SELECT','UPDATE','DELETE']) privilege;
INSERT INTO public.accounts(id,name,created_by_user_id)
  SELECT workspace_id,'Comment boundary rollback-only',owner_id FROM comment_boundary_fixture;
INSERT INTO public.account_members(account_id,user_id,role)
  SELECT workspace_id,owner_id,'owner'::public.account_role FROM comment_boundary_fixture
  UNION ALL SELECT workspace_id,member_id,'member'::public.account_role FROM comment_boundary_fixture;
INSERT INTO public.songs(id,title,account_id)
  SELECT song_id,'Comment boundary rollback-only',workspace_id FROM comment_boundary_fixture;
INSERT INTO public.song_versions(id,song_id,account_id,version_number,file_path,file_name,created_by,upload_finalized_at)
  SELECT version_id,song_id,workspace_id,1,'not-a-storage-object','probe.wav','Agent probe',null FROM comment_boundary_fixture;

-- MIGRATION_UNDER_TEST

INSERT INTO comment_boundary_results SELECT 'non-INSERT table privileges unchanged',
  bool_and(allowed=has_table_privilege(role_name,'public.' || table_name,privilege)) FROM comment_boundary_other_grants;
SET LOCAL ROLE service_role;
INSERT INTO public.comment_threads(id,song_version_id,account_id,timestamp_seconds,created_by,created_by_user_id)
  SELECT thread_id,version_id,workspace_id,0,'Agent probe',owner_id FROM comment_boundary_fixture;
INSERT INTO public.comments(id,thread_id,account_id,author,author_user_id,body)
  SELECT comment_id,thread_id,workspace_id,'Agent probe',owner_id,'Root note' FROM comment_boundary_fixture
  UNION ALL SELECT reply_id,thread_id,workspace_id,'Agent probe',member_id,'Reply note' FROM comment_boundary_fixture;
INSERT INTO comment_boundary_results SELECT 'server creates root and reply',count(*)=2 FROM public.comments
  WHERE id IN (SELECT comment_id FROM comment_boundary_fixture UNION ALL SELECT reply_id FROM comment_boundary_fixture);
UPDATE public.comment_threads SET updated_at=clock_timestamp() WHERE id=(SELECT thread_id FROM comment_boundary_fixture);
INSERT INTO comment_boundary_results SELECT 'server canonical joined read',count(*)=2
  FROM public.comments c JOIN public.comment_threads t ON t.id=c.thread_id
  JOIN public.song_versions v ON v.id=t.song_version_id JOIN public.songs s ON s.id=v.song_id
  WHERE s.id=(SELECT song_id FROM comment_boundary_fixture);
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $$
DECLARE who record; v_allow boolean := /* CLIENT_INSERT_ALLOWED */;
BEGIN
  FOR who IN SELECT owner_id AS uid,'owner' AS label FROM comment_boundary_fixture
    UNION ALL SELECT member_id,'member' FROM comment_boundary_fixture LOOP
    PERFORM set_config('request.jwt.claims',json_build_object('sub',who.uid,'role','authenticated')::text,true);
    BEGIN
      INSERT INTO public.comment_threads(song_version_id,account_id,timestamp_seconds,created_by)
        SELECT version_id,workspace_id,1,'Direct probe' FROM comment_boundary_fixture;
      IF NOT v_allow THEN RAISE EXCEPTION 'Direct thread insert bypassed API'; END IF;
    EXCEPTION WHEN insufficient_privilege THEN
      IF v_allow THEN RAISE EXCEPTION 'Baseline thread insert was unexpectedly denied'; END IF;
    END;
    INSERT INTO comment_boundary_results VALUES(who.label || ' thread insert expected result',true);
    BEGIN
      INSERT INTO public.comments(thread_id,account_id,author,author_user_id,body)
        SELECT thread_id,workspace_id,'Direct probe',who.uid,'Direct probe' FROM comment_boundary_fixture;
      IF NOT v_allow THEN RAISE EXCEPTION 'Direct comment insert bypassed API'; END IF;
    EXCEPTION WHEN insufficient_privilege THEN
      IF v_allow THEN RAISE EXCEPTION 'Baseline comment insert was unexpectedly denied'; END IF;
    END;
    INSERT INTO comment_boundary_results VALUES(who.label || ' comment insert expected result',true);
    INSERT INTO comment_boundary_results SELECT who.label || ' reads existing root and reply',count(*)=2
      FROM public.comments WHERE id IN (SELECT comment_id FROM comment_boundary_fixture UNION ALL SELECT reply_id FROM comment_boundary_fixture);
    INSERT INTO comment_boundary_results SELECT who.label || ' reads existing thread',count(*)=1
      FROM public.comment_threads WHERE id=(SELECT thread_id FROM comment_boundary_fixture);
  END LOOP;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',outsider_id,'role','authenticated')::text,true) FROM comment_boundary_fixture;
  INSERT INTO comment_boundary_results SELECT 'outsider cannot read comments',count(*)=0 FROM public.comments
    WHERE id IN (SELECT comment_id FROM comment_boundary_fixture UNION ALL SELECT reply_id FROM comment_boundary_fixture);
  BEGIN
    INSERT INTO public.comments(thread_id,account_id,author,body)
      SELECT thread_id,workspace_id,'Outsider','Denied' FROM comment_boundary_fixture;
    RAISE EXCEPTION 'Outsider comment insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO comment_boundary_results VALUES('outsider insert denied',true);
  END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims','{}',true);
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.comments(thread_id,account_id,author,body)
      SELECT thread_id,workspace_id,'Anonymous','Denied' FROM comment_boundary_fixture;
    RAISE EXCEPTION 'Anonymous comment insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO comment_boundary_results VALUES('anonymous insert denied',true);
  END;
END $$;
INSERT INTO comment_boundary_results SELECT 'anonymous cannot read comments',count(*)=0 FROM public.comments
  WHERE id IN (SELECT comment_id FROM comment_boundary_fixture UNION ALL SELECT reply_id FROM comment_boundary_fixture);
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM comment_boundary_results WHERE NOT passed) THEN
    RAISE EXCEPTION 'Comment boundary check failed';
  END IF;
END $$;
SELECT * FROM comment_boundary_results ORDER BY test_case;
ROLLBACK;
