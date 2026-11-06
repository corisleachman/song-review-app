-- Synthetic workspaces only. No Auth, provider, email, payment or Storage calls.
-- Every mode rolls back all fixtures, mutations and candidate DDL.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
CREATE TEMP TABLE membership_boundary_results(test_case text,passed boolean) ON COMMIT DROP;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('public.accounts'::regclass,'public.account_members'::regclass)) THEN RAISE EXCEPTION 'Review fixture-table triggers'; END IF;
END $$;
CREATE TEMP TABLE membership_boundary_fixture ON COMMIT DROP AS
 SELECT gen_random_uuid() workspace_id,gen_random_uuid() foreign_workspace,
 ids[1] owner_id,ids[2] admin_id,ids[3] member_id,ids[4] outsider_id
 FROM (SELECT array_agg(id ORDER BY id) ids FROM (SELECT id FROM public.profiles ORDER BY id LIMIT 4) p) x;
DO $$ BEGIN
 IF (SELECT outsider_id IS NULL FROM membership_boundary_fixture) THEN RAISE EXCEPTION 'Need four existing profile-backed identities'; END IF;
END $$;
GRANT SELECT ON membership_boundary_fixture TO anon,authenticated,service_role;
GRANT INSERT,SELECT ON membership_boundary_results TO anon,authenticated,service_role;
CREATE TEMP TABLE membership_boundary_policies ON COMMIT DROP AS
 SELECT policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='account_members';
CREATE TEMP TABLE membership_boundary_grants ON COMMIT DROP AS
 SELECT role_name,table_name,privilege,has_table_privilege(role_name,'public.'||table_name,privilege) allowed
 FROM unnest(array['anon','authenticated','service_role']) role_name,
 unnest(array['accounts','account_members','songs','song_versions']) table_name,
 unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) privilege
 WHERE NOT(role_name IN ('anon','authenticated') AND table_name='account_members' AND privilege IN ('INSERT','UPDATE','DELETE'));
INSERT INTO public.accounts(id,name,created_by_user_id)
 SELECT workspace_id,'Membership boundary rollback-only',owner_id FROM membership_boundary_fixture
 UNION ALL SELECT foreign_workspace,'Foreign membership boundary rollback-only',outsider_id FROM membership_boundary_fixture;
INSERT INTO public.account_members(account_id,user_id,role)
 SELECT workspace_id,owner_id,'owner'::public.account_role FROM membership_boundary_fixture
 UNION ALL SELECT workspace_id,admin_id,'admin'::public.account_role FROM membership_boundary_fixture
 UNION ALL SELECT workspace_id,member_id,'member'::public.account_role FROM membership_boundary_fixture
 UNION ALL SELECT foreign_workspace,outsider_id,'owner'::public.account_role FROM membership_boundary_fixture;

-- MIGRATION_UNDER_TEST

INSERT INTO membership_boundary_results SELECT 'unrelated grants unchanged',bool_and(allowed=has_table_privilege(role_name,'public.'||table_name,privilege)) FROM membership_boundary_grants;
INSERT INTO membership_boundary_results SELECT 'membership policies unchanged',
 NOT EXISTS((SELECT * FROM membership_boundary_policies EXCEPT SELECT policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='account_members')
 UNION ALL (SELECT policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='account_members' EXCEPT SELECT * FROM membership_boundary_policies));
SET LOCAL ROLE authenticated;
DO $$ DECLARE f record; who record; changed integer; allowed boolean:=/* CLIENT_WRITES_ALLOWED */; BEGIN
 SELECT * INTO f FROM membership_boundary_fixture;
 FOR who IN SELECT f.owner_id id,'owner' label UNION ALL SELECT f.admin_id,'admin' UNION ALL SELECT f.member_id,'member' UNION ALL SELECT f.outsider_id,'outsider' LOOP
  PERFORM set_config('request.jwt.claims',json_build_object('sub',who.id,'role','authenticated')::text,true);
  INSERT INTO membership_boundary_results SELECT who.label||' scoped membership reads',count(*)=CASE WHEN who.label='outsider' THEN 0 ELSE 3 END FROM public.account_members WHERE account_id=f.workspace_id;
  IF allowed AND who.label IN ('owner','admin') THEN
   -- Nested blocks deliberately roll back each attack without changing later cases.
   BEGIN
    INSERT INTO public.account_members(account_id,user_id,role) VALUES(f.workspace_id,f.outsider_id,'owner');
    GET DIAGNOSTICS changed=ROW_COUNT;
    IF changed<>1 THEN RAISE EXCEPTION 'Expected baseline owner insertion'; END IF;
    RAISE EXCEPTION USING ERRCODE='P1234';
   EXCEPTION WHEN SQLSTATE 'P1234' THEN INSERT INTO membership_boundary_results VALUES('baseline '||who.label||' adds owner without invitation',true); END;
   BEGIN
    DELETE FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.owner_id;
    GET DIAGNOSTICS changed=ROW_COUNT;
    IF changed<>1 THEN RAISE EXCEPTION 'Expected baseline owner deletion'; END IF;
    RAISE EXCEPTION USING ERRCODE='P1234';
   EXCEPTION WHEN SQLSTATE 'P1234' THEN INSERT INTO membership_boundary_results VALUES('baseline '||who.label||' deletes owner directly',true); END;
  ELSIF NOT allowed THEN
   BEGIN
    INSERT INTO public.account_members(account_id,user_id,role) VALUES(f.workspace_id,f.outsider_id,'owner');
    RAISE EXCEPTION 'Direct membership insert succeeded';
   EXCEPTION WHEN insufficient_privilege THEN INSERT INTO membership_boundary_results VALUES(who.label||' direct membership insert denied',true); END;
   BEGIN
    UPDATE public.account_members SET role='owner' WHERE account_id=f.workspace_id AND user_id=f.member_id;
    RAISE EXCEPTION 'Direct membership update succeeded';
   EXCEPTION WHEN insufficient_privilege THEN INSERT INTO membership_boundary_results VALUES(who.label||' direct membership update denied',true); END;
   BEGIN
    DELETE FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.owner_id;
    RAISE EXCEPTION 'Direct membership delete succeeded';
   EXCEPTION WHEN insufficient_privilege THEN INSERT INTO membership_boundary_results VALUES(who.label||' direct membership delete denied',true); END;
  ELSE
   BEGIN
    INSERT INTO public.account_members(account_id,user_id,role) VALUES(f.workspace_id,f.outsider_id,'owner');
    RAISE EXCEPTION 'Unexpected baseline member/outsider insert';
   EXCEPTION WHEN insufficient_privilege THEN INSERT INTO membership_boundary_results VALUES(who.label||' baseline insert denied',true); END;
   UPDATE public.account_members SET role='owner' WHERE account_id=f.workspace_id AND user_id=f.member_id;
   GET DIAGNOSTICS changed=ROW_COUNT;
   INSERT INTO membership_boundary_results VALUES(who.label||' baseline update denied',changed=0);
   DELETE FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.owner_id;
   GET DIAGNOSTICS changed=ROW_COUNT;
   INSERT INTO membership_boundary_results VALUES(who.label||' baseline delete denied',changed=0);
  END IF;
 END LOOP;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{}',true) IS NOT NULL AS anonymous_claims_reset;
INSERT INTO membership_boundary_results SELECT 'anonymous cannot read memberships',count(*)=0 FROM public.account_members WHERE account_id IN (SELECT workspace_id FROM membership_boundary_fixture UNION ALL SELECT foreign_workspace FROM membership_boundary_fixture);
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ DECLARE f record; changed integer; BEGIN
 SELECT * INTO f FROM membership_boundary_fixture;
 INSERT INTO public.account_members(account_id,user_id,role) VALUES(f.workspace_id,f.outsider_id,'member');
 GET DIAGNOSTICS changed=ROW_COUNT;
 INSERT INTO membership_boundary_results VALUES('server invitation membership insertion retained',changed=1);
 UPDATE public.account_members SET role='admin' WHERE account_id=f.workspace_id AND user_id=f.outsider_id;
 GET DIAGNOSTICS changed=ROW_COUNT;
 INSERT INTO membership_boundary_results VALUES('server membership update retained',changed=1);
 DELETE FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id;
 GET DIAGNOSTICS changed=ROW_COUNT;
 INSERT INTO membership_boundary_results VALUES('server owner-checked removal retained',changed=1);
END $$;
RESET ROLE;
INSERT INTO membership_boundary_results SELECT 'server-only provisioning and invite RPC privileges retained',count(*)=2 AND bool_and(has_function_privilege('service_role',p.oid,'EXECUTE') AND NOT has_function_privilege('anon',p.oid,'EXECUTE') AND NOT has_function_privilege('authenticated',p.oid,'EXECUTE')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('ensure_initial_workspace_membership','accept_workspace_invite_atomically');
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM membership_boundary_results WHERE passed IS DISTINCT FROM true) THEN RAISE EXCEPTION 'Membership boundary probe failed'; END IF;
END $$;
SELECT test_case,passed FROM membership_boundary_results ORDER BY test_case;
ROLLBACK;
