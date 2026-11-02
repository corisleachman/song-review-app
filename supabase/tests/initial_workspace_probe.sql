-- Fresh identities exist only in this transaction; no password, session, Auth
-- API, email, provider call or committed user/workspace is created. Always ROLLBACK.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN (
    'auth.users'::regclass,'public.profiles'::regclass,'public.accounts'::regclass,'public.account_members'::regclass
  )) THEN RAISE EXCEPTION 'Review account/identity triggers before rollback-only fixtures'; END IF;
END $$;
CREATE TEMP TABLE bootstrap_probe_fixture ON COMMIT DROP AS
 SELECT gen_random_uuid() AS user_a,gen_random_uuid() AS user_b,gen_random_uuid() AS user_c,gen_random_uuid() AS user_d,
   gen_random_uuid() AS owned_id,gen_random_uuid() AS shared_id;
CREATE TEMP TABLE bootstrap_probe_results(test_case text,passed boolean) ON COMMIT DROP;
GRANT SELECT ON bootstrap_probe_fixture TO service_role,anon,authenticated;
GRANT SELECT,INSERT ON bootstrap_probe_results TO service_role,anon,authenticated;
INSERT INTO auth.users(id,email,aud,role)
 SELECT id,'agent-bootstrap-probe+'||id::text||'@example.invalid','authenticated','authenticated'
 FROM bootstrap_probe_fixture, LATERAL unnest(array[user_a,user_b,user_c,user_d]) AS id;
INSERT INTO public.profiles(id,email,display_name)
 SELECT id,'agent-bootstrap-probe+'||id::text||'@example.invalid','Agent rollback probe'
 FROM bootstrap_probe_fixture, LATERAL unnest(array[user_a,user_b,user_c,user_d]) AS id;
INSERT INTO public.accounts(id,name,created_by_user_id)
 SELECT owned_id,'Agent rollback owned',user_b FROM bootstrap_probe_fixture
 UNION ALL SELECT shared_id,'Agent rollback shared',user_c FROM bootstrap_probe_fixture;
INSERT INTO public.account_members(account_id,user_id,role,joined_at)
 SELECT owned_id,user_b,'owner'::public.account_role,'2026-01-01'::timestamptz FROM bootstrap_probe_fixture
 UNION ALL SELECT shared_id,user_b,'member'::public.account_role,'2026-02-01'::timestamptz FROM bootstrap_probe_fixture
 UNION ALL SELECT shared_id,user_c,'owner'::public.account_role,'2026-01-01'::timestamptz FROM bootstrap_probe_fixture;

-- MIGRATION_UNDER_TEST

INSERT INTO bootstrap_probe_results SELECT 'RPC is invoker with empty search path',
 NOT prosecdef AND proconfig=ARRAY['search_path=""']::text[] FROM pg_proc
 WHERE oid='public.ensure_initial_workspace_membership(uuid,text)'::regprocedure;
INSERT INTO bootstrap_probe_results SELECT 'no client execute grants',
 NOT has_function_privilege('anon','public.ensure_initial_workspace_membership(uuid,text)','EXECUTE')
 AND NOT has_function_privilege('authenticated','public.ensure_initial_workspace_membership(uuid,text)','EXECUTE');
SET LOCAL ROLE service_role;
DO $$
DECLARE f record; a record; b record; k bigint;
BEGIN
 SELECT * INTO f FROM bootstrap_probe_fixture;
 SELECT * INTO a FROM public.ensure_initial_workspace_membership(f.user_a,'Agent rollback fresh');
 ASSERT a.was_created AND a.role='owner' AND a.user_id=f.user_a,'First owner creation';
 SELECT * INTO b FROM public.ensure_initial_workspace_membership(f.user_a,'Must not create a second workspace');
 ASSERT NOT b.was_created AND b.account_id=a.account_id,'Stale caller created duplicate';
 INSERT INTO bootstrap_probe_results VALUES('first create and repeated stale caller share one membership',true);
 INSERT INTO bootstrap_probe_results SELECT 'exactly one new workspace and owner',
 (SELECT count(*) FROM public.accounts WHERE created_by_user_id=f.user_a)=1
 AND (SELECT count(*) FROM public.account_members WHERE user_id=f.user_a)=1;
 k := hashtextextended('song-room-initial-workspace:'||f.user_a::text,0);
 INSERT INTO bootstrap_probe_results SELECT 'per-user lock held until transaction end',EXISTS(
  SELECT 1 FROM pg_locks WHERE pid=pg_backend_pid() AND locktype='advisory' AND granted
   AND classid=((k>>32)&4294967295)::oid AND objid=(k&4294967295)::oid
 );
 SELECT * INTO a FROM public.ensure_initial_workspace_membership(f.user_b,'Must not create');
 ASSERT NOT a.was_created AND a.account_id=f.shared_id AND a.role='member','Member-first preference changed';
 INSERT INTO bootstrap_probe_results VALUES('existing member wins over older owner without creation',true);
 SELECT * INTO a FROM public.ensure_initial_workspace_membership(f.user_c,'Must not create');
 ASSERT NOT a.was_created AND a.account_id=f.shared_id AND a.role='owner','Existing owner changed';
 INSERT INTO bootstrap_probe_results VALUES('existing owner is returned without creation',true);
 BEGIN
  PERFORM * FROM public.ensure_initial_workspace_membership(NULL,'Invalid');
  RAISE EXCEPTION 'Null user accepted';
 EXCEPTION WHEN invalid_parameter_value THEN INSERT INTO bootstrap_probe_results VALUES('null user rejected',true); END;
 BEGIN
  PERFORM * FROM public.ensure_initial_workspace_membership(f.user_d,' ');
  RAISE EXCEPTION 'Blank workspace name accepted';
 EXCEPTION WHEN invalid_parameter_value THEN INSERT INTO bootstrap_probe_results VALUES('blank name rejected',true); END;
 BEGIN
  PERFORM * FROM public.ensure_initial_workspace_membership(gen_random_uuid(),'Missing profile');
  RAISE EXCEPTION 'Missing profile accepted';
 EXCEPTION WHEN invalid_parameter_value THEN INSERT INTO bootstrap_probe_results VALUES('missing profile rejected',true); END;
END $$;
RESET ROLE;
DO $$ BEGIN
 ASSERT has_table_privilege('service_role','public.account_members','INSERT'),'Review unexpected server grants';
END $$;
REVOKE INSERT ON public.account_members FROM service_role;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN
  PERFORM * FROM public.ensure_initial_workspace_membership((SELECT user_d FROM bootstrap_probe_fixture),'Agent rollback failed owner');
  RAISE EXCEPTION 'Owner failure did not abort creation';
 EXCEPTION WHEN insufficient_privilege THEN
  INSERT INTO bootstrap_probe_results SELECT 'owner failure rolls back workspace insert',count(*)=0
   FROM public.accounts WHERE created_by_user_id=(SELECT user_d FROM bootstrap_probe_fixture);
 END;
END $$;
RESET ROLE;
GRANT INSERT ON public.account_members TO service_role;
SET LOCAL ROLE service_role;
DO $$ DECLARE result record; BEGIN
 SELECT * INTO result FROM public.ensure_initial_workspace_membership((SELECT user_d FROM bootstrap_probe_fixture),'Agent rollback recovered');
 ASSERT result.was_created AND result.role='owner','Retry did not recover';
 INSERT INTO bootstrap_probe_results VALUES('retry after failure creates a complete workspace',true);
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN
  PERFORM * FROM public.ensure_initial_workspace_membership((SELECT user_a FROM bootstrap_probe_fixture),'Denied');
  RAISE EXCEPTION 'Anonymous provisioned a workspace';
 EXCEPTION WHEN insufficient_privilege THEN INSERT INTO bootstrap_probe_results VALUES('anonymous RPC denied',true); END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM * FROM public.ensure_initial_workspace_membership((SELECT user_a FROM bootstrap_probe_fixture),'Denied');
  RAISE EXCEPTION 'Member provisioned another user workspace';
 EXCEPTION WHEN insufficient_privilege THEN INSERT INTO bootstrap_probe_results VALUES('member RPC denied',true); END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM bootstrap_probe_results WHERE NOT passed) THEN RAISE EXCEPTION 'Initial workspace probe failed'; END IF;
END $$;
-- ROLLBACK_UNDER_TEST
SELECT * FROM bootstrap_probe_results ORDER BY test_case;
ROLLBACK;
