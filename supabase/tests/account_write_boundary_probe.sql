-- Synthetic records only, no Auth creation, Stripe/API/email/Storage calls.
-- Compose via the script. Every mode, including candidate DDL, rolls back.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
CREATE TEMP TABLE account_boundary_results(test_case text,passed boolean) ON COMMIT DROP;
CREATE TEMP TABLE account_boundary_fixture ON COMMIT DROP AS
 SELECT gen_random_uuid() workspace_id,gen_random_uuid() foreign_workspace,
 gen_random_uuid() client_insert_id,gen_random_uuid() service_insert_id,
 ids[1] owner_id,ids[2] member_id,ids[3] outsider_id
 FROM (SELECT array_agg(id ORDER BY id) ids FROM (SELECT id FROM public.profiles ORDER BY id LIMIT 3) p) x;
GRANT SELECT ON account_boundary_fixture TO anon,authenticated,service_role;
GRANT INSERT,SELECT ON account_boundary_results TO anon,authenticated,service_role;
DO $$ BEGIN
 IF (SELECT outsider_id IS NULL FROM account_boundary_fixture) THEN RAISE EXCEPTION 'Need three existing profile-backed identities'; END IF;
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('public.accounts'::regclass,'public.account_members'::regclass)) THEN RAISE EXCEPTION 'Review fixture-table triggers'; END IF;
END $$;
CREATE TEMP TABLE account_boundary_grants ON COMMIT DROP AS
 SELECT role_name,table_name,privilege,has_table_privilege(role_name,'public.'||table_name,privilege) allowed
 FROM unnest(array['anon','authenticated','service_role']) role_name,
 unnest(array['accounts','account_members','songs','song_versions']) table_name,
 unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) privilege
 WHERE NOT(role_name IN ('anon','authenticated') AND table_name='accounts' AND privilege IN ('INSERT','UPDATE','DELETE'));
CREATE TEMP TABLE account_boundary_policies ON COMMIT DROP AS
 SELECT policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='accounts';
INSERT INTO public.accounts(id,name,created_by_user_id,plan)
 SELECT workspace_id,'Account boundary rollback-only',owner_id,'free' FROM account_boundary_fixture
 UNION ALL SELECT foreign_workspace,'Foreign account boundary rollback-only',outsider_id,'free' FROM account_boundary_fixture;
INSERT INTO public.account_members(account_id,user_id,role)
 SELECT workspace_id,owner_id,'owner'::public.account_role FROM account_boundary_fixture
 UNION ALL SELECT workspace_id,member_id,'member'::public.account_role FROM account_boundary_fixture
 UNION ALL SELECT foreign_workspace,outsider_id,'owner'::public.account_role FROM account_boundary_fixture;

-- MIGRATION_UNDER_TEST

INSERT INTO account_boundary_results SELECT 'other table privileges unchanged',bool_and(allowed=has_table_privilege(role_name,'public.'||table_name,privilege)) FROM account_boundary_grants;
INSERT INTO account_boundary_results SELECT 'account RLS policies unchanged',
 NOT EXISTS((SELECT * FROM account_boundary_policies EXCEPT SELECT policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='accounts')
 UNION ALL (SELECT policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='accounts' EXCEPT SELECT * FROM account_boundary_policies));
SET LOCAL ROLE authenticated;
DO $$ DECLARE f record; who record; changed integer; allow_client boolean:=/* CLIENT_ACCOUNT_WRITES_ALLOWED */; BEGIN
 SELECT * INTO f FROM account_boundary_fixture;
 FOR who IN SELECT f.owner_id id,'owner' label UNION ALL SELECT f.member_id,'member' LOOP
  PERFORM set_config('request.jwt.claims',json_build_object('sub',who.id,'role','authenticated')::text,true);
  INSERT INTO account_boundary_results SELECT who.label||' reads member workspace account',count(*)=1 FROM public.accounts WHERE id=f.workspace_id;
  IF allow_client AND who.label='owner' THEN
   UPDATE public.accounts SET plan='studio',stripe_customer_id='cus_fixture_'||f.workspace_id::text,stripe_subscription_id='sub_fixture_'||f.workspace_id::text WHERE id=f.workspace_id;
   GET DIAGNOSTICS changed=ROW_COUNT;
   INSERT INTO account_boundary_results VALUES('baseline owner rewrites plan and Stripe linkage directly',changed=1);
   INSERT INTO public.accounts(id,name,created_by_user_id,plan) VALUES(f.client_insert_id,'Direct Studio account rollback-only',f.owner_id,'studio');
   GET DIAGNOSTICS changed=ROW_COUNT;
   INSERT INTO account_boundary_results VALUES('baseline authenticated creator inserts Studio directly',changed=1);
  ELSIF allow_client THEN
   UPDATE public.accounts SET plan='studio' WHERE id=f.workspace_id;
   GET DIAGNOSTICS changed=ROW_COUNT;
   INSERT INTO account_boundary_results VALUES('baseline member cannot edit core account',changed=0);
  ELSE
   BEGIN
    UPDATE public.accounts SET plan='studio',stripe_customer_id='cus_untrusted_fixture' WHERE id=f.workspace_id;
    RAISE EXCEPTION 'Client account update succeeded';
   EXCEPTION WHEN insufficient_privilege THEN INSERT INTO account_boundary_results VALUES(who.label||' direct account update denied',true); END;
   BEGIN
    INSERT INTO public.accounts(id,name,created_by_user_id,plan) VALUES(f.client_insert_id,'Denied Studio fixture',who.id,'studio');
    RAISE EXCEPTION 'Client account insert succeeded';
   EXCEPTION WHEN insufficient_privilege THEN INSERT INTO account_boundary_results VALUES(who.label||' direct account insert denied',true); END;
   BEGIN
    DELETE FROM public.accounts WHERE id=f.workspace_id;
    RAISE EXCEPTION 'Client account delete succeeded';
   EXCEPTION WHEN insufficient_privilege THEN INSERT INTO account_boundary_results VALUES(who.label||' direct account delete denied',true); END;
  END IF;
 END LOOP;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',f.outsider_id,'role','authenticated')::text,true);
 INSERT INTO account_boundary_results SELECT 'outsider cannot read fixture account',count(*)=0 FROM public.accounts WHERE id=f.workspace_id;
 IF allow_client THEN
  UPDATE public.accounts SET plan='studio' WHERE id=f.workspace_id;
  GET DIAGNOSTICS changed=ROW_COUNT;
  INSERT INTO account_boundary_results VALUES('baseline outsider cannot edit fixture account',changed=0);
 ELSE
  BEGIN
   UPDATE public.accounts SET plan='studio' WHERE id=f.workspace_id;
   RAISE EXCEPTION 'Outsider direct update succeeded';
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO account_boundary_results VALUES('outsider direct account update denied',true); END;
 END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{}',true) IS NOT NULL AS anon_claims_reset;
DO $$ DECLARE f record; BEGIN
 SELECT * INTO f FROM account_boundary_fixture;
 INSERT INTO account_boundary_results SELECT 'anonymous cannot read fixture accounts',count(*)=0 FROM public.accounts WHERE id IN(f.workspace_id,f.foreign_workspace);
 BEGIN
  INSERT INTO public.accounts(id,name,created_by_user_id,plan) VALUES(f.client_insert_id,'Denied anonymous fixture',f.owner_id,'studio');
  RAISE EXCEPTION 'Anonymous account insert succeeded';
 EXCEPTION WHEN insufficient_privilege THEN INSERT INTO account_boundary_results VALUES('anonymous account insertion denied',true); END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ DECLARE f record; changed integer; BEGIN
 SELECT * INTO f FROM account_boundary_fixture;
 UPDATE public.accounts SET name='Server settings update fixture',notification_mode='all_members',plan='pro',stripe_customer_id='cus_server_fixture_'||f.workspace_id::text,stripe_subscription_id='sub_server_fixture_'||f.workspace_id::text WHERE id=f.workspace_id;
 GET DIAGNOSTICS changed=ROW_COUNT;
 INSERT INTO account_boundary_results VALUES('server settings and billing updates remain available',changed=1);
 INSERT INTO account_boundary_results SELECT 'server account values persist correctly',plan='pro' AND notification_mode='all_members' AND stripe_customer_id='cus_server_fixture_'||f.workspace_id::text AND stripe_subscription_id='sub_server_fixture_'||f.workspace_id::text FROM public.accounts WHERE id=f.workspace_id;
 INSERT INTO public.accounts(id,name,created_by_user_id) VALUES(f.service_insert_id,'Server provisioning fixture',f.owner_id);
 INSERT INTO account_boundary_results SELECT 'server provisioning retains Free default',plan='free' FROM public.accounts WHERE id=f.service_insert_id;
 DELETE FROM public.accounts WHERE id=f.service_insert_id;
 GET DIAGNOSTICS changed=ROW_COUNT;
 INSERT INTO account_boundary_results VALUES('server account cleanup remains available',changed=1);
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ DECLARE f record; changed integer; allow_client boolean:=/* CLIENT_DELETE_ALLOWED */; BEGIN
 SELECT * INTO f FROM account_boundary_fixture;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',f.owner_id,'role','authenticated')::text,true);
 IF allow_client THEN
  DELETE FROM public.accounts WHERE id=f.workspace_id;
  GET DIAGNOSTICS changed=ROW_COUNT;
  INSERT INTO account_boundary_results VALUES('baseline owner deletes account outside canonical lifecycle',changed=1);
 ELSE
  INSERT INTO account_boundary_results SELECT 'client denial leaves server-updated account intact',count(*)=1 FROM public.accounts WHERE id=f.workspace_id AND plan='pro';
 END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM account_boundary_results WHERE NOT passed) THEN RAISE EXCEPTION 'Account write boundary check failed'; END IF;
END $$;
SELECT * FROM account_boundary_results ORDER BY test_case;
ROLLBACK;
