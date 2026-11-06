-- Synthetic workspaces only. No Auth, provider, email, payment or Storage calls.
-- Every mode rolls back all fixtures, mutations and candidate DDL.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
CREATE TEMP TABLE invite_replay_results(test_case text,passed boolean) ON COMMIT DROP;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('public.accounts'::regclass,'public.account_members'::regclass)) THEN RAISE EXCEPTION 'Review fixture-table triggers'; END IF;
END $$;
CREATE TEMP TABLE invite_replay_fixture ON COMMIT DROP AS
 SELECT gen_random_uuid() workspace_id,gen_random_uuid() foreign_workspace,
 ids[1] owner_id,ids[2] admin_id,ids[3] member_id,ids[4] outsider_id
 FROM (SELECT array_agg(id ORDER BY id) ids FROM (SELECT id FROM public.profiles ORDER BY id LIMIT 4) p) x;
DO $$ BEGIN
 IF (SELECT outsider_id IS NULL FROM invite_replay_fixture) THEN RAISE EXCEPTION 'Need four existing profile-backed identities'; END IF;
END $$;
GRANT SELECT ON invite_replay_fixture TO anon,authenticated,service_role;
GRANT INSERT,SELECT ON invite_replay_results TO anon,authenticated,service_role;
CREATE TEMP TABLE invite_replay_policies ON COMMIT DROP AS
 SELECT policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='account_members';
CREATE TEMP TABLE invite_replay_grants ON COMMIT DROP AS
 SELECT role_name,table_name,privilege,has_table_privilege(role_name,'public.'||table_name,privilege) allowed
 FROM unnest(array['anon','authenticated','service_role']) role_name,
 unnest(array['accounts','account_members','songs','song_versions']) table_name,
 unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) privilege
 WHERE NOT(role_name IN ('anon','authenticated') AND table_name='account_members' AND privilege IN ('INSERT','UPDATE','DELETE'));
INSERT INTO public.accounts(id,name,created_by_user_id)
 SELECT workspace_id,'Invite replay rollback-only',owner_id FROM invite_replay_fixture
 UNION ALL SELECT foreign_workspace,'Foreign invite replay rollback-only',outsider_id FROM invite_replay_fixture;
INSERT INTO public.account_members(account_id,user_id,role)
 SELECT workspace_id,owner_id,'owner'::public.account_role FROM invite_replay_fixture
 UNION ALL SELECT workspace_id,admin_id,'admin'::public.account_role FROM invite_replay_fixture
 UNION ALL SELECT workspace_id,member_id,'member'::public.account_role FROM invite_replay_fixture
 UNION ALL SELECT foreign_workspace,outsider_id,'owner'::public.account_role FROM invite_replay_fixture;


CREATE TEMP TABLE invite_replay_rpc_before ON COMMIT DROP AS
 SELECT p.prosecdef,p.proconfig,p.proowner,p.proacl FROM pg_proc p
 WHERE p.oid='public.accept_workspace_invite_atomically(uuid,uuid,text)'::regprocedure;
-- MIGRATION_UNDER_TEST
INSERT INTO invite_replay_results SELECT 'RPC security mode owner search path and grants unchanged',
 ROW(p.prosecdef,p.proconfig,p.proowner,p.proacl) IS NOT DISTINCT FROM ROW(b.prosecdef,b.proconfig,b.proowner,b.proacl)
 FROM pg_proc p CROSS JOIN invite_replay_rpc_before b WHERE p.oid='public.accept_workspace_invite_atomically(uuid,uuid,text)'::regprocedure;
SET LOCAL ROLE service_role;
DO $$ DECLARE f record; token uuid:=gen_random_uuid(); fresh_token uuid:=gen_random_uuid(); revoked_token uuid:=gen_random_uuid(); expired_token uuid:=gen_random_uuid(); result record; replay_allowed boolean:=/* REPLAY_RESTORES_MEMBERSHIP */; BEGIN
 SELECT * INTO f FROM invite_replay_fixture;
 INSERT INTO public.account_invites(account_id,email,invited_by_user_id,invite_token)
 VALUES(f.workspace_id,'b35-rollback@example.invalid',f.owner_id,token);
 SELECT * INTO result FROM public.accept_workspace_invite_atomically(token,f.outsider_id,'wrong@example.invalid');
 INSERT INTO invite_replay_results VALUES('email mismatch denied',result.result='email_mismatch' AND result.account_id IS NULL);
 SELECT * INTO result FROM public.accept_workspace_invite_atomically(token,f.outsider_id,'b35-rollback@example.invalid');
 INSERT INTO invite_replay_results VALUES('fresh invite creates member',result.result='accepted' AND NOT result.already_member AND EXISTS(SELECT 1 FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id AND role='member'));
 SELECT * INTO result FROM public.accept_workspace_invite_atomically(token,f.outsider_id,'b35-rollback@example.invalid');
 INSERT INTO invite_replay_results VALUES('current-member replay remains idempotent',result.result='already_accepted' AND result.already_member AND (SELECT count(*) FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id)=1);
 DELETE FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id;
 SELECT * INTO result FROM public.accept_workspace_invite_atomically(token,f.outsider_id,'b35-rollback@example.invalid');
 IF replay_allowed THEN
  INSERT INTO invite_replay_results VALUES('baseline old accepted link recreates removed membership',result.result='already_accepted' AND EXISTS(SELECT 1 FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id));
 ELSE
  INSERT INTO invite_replay_results VALUES('removed member cannot replay accepted link',result.result='already_used' AND result.account_id IS NULL AND NOT result.already_member AND NOT EXISTS(SELECT 1 FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id));
 END IF;
 DELETE FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id;
 UPDATE public.account_invites SET expires_at=now()-interval '1 day' WHERE invite_token=token;
 SELECT * INTO result FROM public.accept_workspace_invite_atomically(token,f.outsider_id,'b35-rollback@example.invalid');
 IF replay_allowed THEN
  INSERT INTO invite_replay_results VALUES('baseline expired accepted link restores removed member',result.result='already_accepted' AND EXISTS(SELECT 1 FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id));
 ELSE
  INSERT INTO invite_replay_results VALUES('expired accepted link cannot restore removed member',result.result='already_used' AND NOT EXISTS(SELECT 1 FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id));
 END IF;
 DELETE FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id;
 INSERT INTO public.account_invites(account_id,email,invited_by_user_id,invite_token)
 VALUES(f.workspace_id,'b35-rollback@example.invalid',f.owner_id,fresh_token);
 SELECT * INTO result FROM public.accept_workspace_invite_atomically(fresh_token,f.outsider_id,'b35-rollback@example.invalid');
 INSERT INTO invite_replay_results VALUES('new owner-issued invitation can rejoin removed member',result.result='accepted' AND EXISTS(SELECT 1 FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id AND role='member'));
 DELETE FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id;
 INSERT INTO public.account_invites(account_id,email,invited_by_user_id,invite_token,status)
 VALUES(f.workspace_id,'b35-rollback@example.invalid',f.owner_id,revoked_token,'revoked');
 SELECT * INTO result FROM public.accept_workspace_invite_atomically(revoked_token,f.outsider_id,'b35-rollback@example.invalid');
 INSERT INTO invite_replay_results VALUES('revoked invite remains denied',result.result='revoked' AND result.account_id IS NULL);
 INSERT INTO public.account_invites(account_id,email,invited_by_user_id,invite_token,expires_at)
 VALUES(f.workspace_id,'b35-rollback@example.invalid',f.owner_id,expired_token,now()-interval '1 day');
 SELECT * INTO result FROM public.accept_workspace_invite_atomically(expired_token,f.outsider_id,'b35-rollback@example.invalid');
 INSERT INTO invite_replay_results VALUES('expired pending invite remains denied',result.result='expired' AND result.account_id IS NULL);
 INSERT INTO invite_replay_results SELECT 'owner retained and removed member remains absent',
 EXISTS(SELECT 1 FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.owner_id AND role='owner') AND NOT EXISTS(SELECT 1 FROM public.account_members WHERE account_id=f.workspace_id AND user_id=f.outsider_id);
END $$;
RESET ROLE;
INSERT INTO invite_replay_results SELECT 'anonymous and authenticated RPC execution remain denied',NOT has_function_privilege('anon','public.accept_workspace_invite_atomically(uuid,uuid,text)','EXECUTE') AND NOT has_function_privilege('authenticated','public.accept_workspace_invite_atomically(uuid,uuid,text)','EXECUTE');
DO $$ BEGIN IF EXISTS(SELECT 1 FROM invite_replay_results WHERE passed IS DISTINCT FROM true) THEN RAISE EXCEPTION 'Invite replay probe failed'; END IF; END $$;
SELECT test_case,passed FROM invite_replay_results ORDER BY test_case;
ROLLBACK;
