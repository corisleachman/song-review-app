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


SET LOCAL ROLE service_role;
DO $$ DECLARE f record; token uuid:=gen_random_uuid(); result record; BEGIN
 SELECT * INTO f FROM membership_boundary_fixture;
 INSERT INTO public.account_invites(account_id,email,invited_by_user_id,invite_token)
 VALUES(f.workspace_id,'b34-rollback@example.invalid',f.owner_id,token);
 SELECT * INTO result FROM public.accept_workspace_invite_atomically(token,f.outsider_id,'wrong@example.invalid');
 INSERT INTO membership_boundary_results VALUES('invite email mismatch does not create membership',result.result='email_mismatch' AND NOT EXISTS(SELECT 1 FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id));
 SELECT * INTO result FROM public.accept_workspace_invite_atomically(token,f.outsider_id,'b34-rollback@example.invalid');
 INSERT INTO membership_boundary_results VALUES('canonical invite RPC creates member after client revocation',result.result='accepted' AND result.account_id=f.workspace_id AND EXISTS(SELECT 1 FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id AND role='member'));
 SELECT * INTO result FROM public.accept_workspace_invite_atomically(token,f.outsider_id,'b34-rollback@example.invalid');
 INSERT INTO membership_boundary_results VALUES('canonical invite replay retains one membership',result.result='already_accepted' AND (SELECT count(*) FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id)=1);
 DELETE FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id AND role<>'owner';
 INSERT INTO membership_boundary_results VALUES('server removal retains owner',NOT EXISTS(SELECT 1 FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id) AND EXISTS(SELECT 1 FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.owner_id AND role='owner'));
END $$;
RESET ROLE;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM membership_boundary_results WHERE passed IS DISTINCT FROM true) THEN RAISE EXCEPTION 'Canonical membership journey failed'; END IF; END $$;
SELECT test_case,passed FROM membership_boundary_results ORDER BY test_case;
ROLLBACK;
