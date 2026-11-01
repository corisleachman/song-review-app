-- STAGING ONLY: ivifkrtupqizyqqsxdty. Compose with the script; always ROLLBACK.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
CREATE TEMP TABLE b21_results (test_case text, passed boolean) ON COMMIT DROP;
-- Four existing profile-backed users are used only in rolled-back fixture workspaces.
DO $guard$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid IN ('public.accounts'::regclass, 'public.account_members'::regclass)
      AND NOT t.tgisinternal
  ) THEN RAISE EXCEPTION 'Review new account/membership triggers before running fixtures'; END IF;
END $guard$;
CREATE TEMP TABLE b21_fixture ON COMMIT DROP AS
WITH eligible AS (
  SELECT DISTINCT member.user_id
  FROM public.account_members AS member
  JOIN public.profiles AS profile ON profile.id=member.user_id
  ORDER BY member.user_id LIMIT 4
), identities AS (
  SELECT array_agg(user_id ORDER BY user_id) AS ids FROM eligible
)
SELECT gen_random_uuid() AS workspace_a, gen_random_uuid() AS workspace_b,
  ids[1] AS owner_id, ids[2] AS member_id, ids[3] AS outsider_id, ids[4] AS extra_id
FROM identities;
DO $guard$ BEGIN
  IF (SELECT extra_id IS NULL FROM b21_fixture) THEN
    RAISE EXCEPTION 'Need four existing staging profile-backed users';
  END IF;
END $guard$;
GRANT SELECT ON b21_fixture TO authenticated, anon;
GRANT SELECT, INSERT ON b21_results TO authenticated, anon;
INSERT INTO public.accounts (id,name,created_by_user_id)
SELECT workspace_a,'B21 rollback-only A',owner_id FROM b21_fixture
UNION ALL SELECT workspace_b,'B21 rollback-only B',outsider_id FROM b21_fixture;
INSERT INTO public.account_members(account_id,user_id,role)
SELECT workspace_a,owner_id,'owner'::public.account_role FROM b21_fixture
UNION ALL SELECT workspace_a,member_id,'member'::public.account_role FROM b21_fixture
UNION ALL SELECT workspace_b,outsider_id,'owner'::public.account_role FROM b21_fixture;
-- MIGRATION_UNDER_TEST
SELECT set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true) FROM b21_fixture;
SET LOCAL ROLE authenticated;
INSERT INTO b21_results SELECT 'owner reads both workspace memberships',count(*)=2 FROM public.account_members WHERE account_id=(SELECT workspace_a FROM b21_fixture);
INSERT INTO b21_results SELECT 'owner cannot read unrelated workspace memberships',count(*)=0 FROM public.account_members WHERE account_id=(SELECT workspace_b FROM b21_fixture);
INSERT INTO b21_results SELECT 'owner can read own workspace',count(*)=1 FROM public.accounts WHERE id=(SELECT workspace_a FROM b21_fixture);
INSERT INTO b21_results SELECT 'private helper cannot inspect another user',NOT song_room_private.is_workspace_member(workspace_b) FROM b21_fixture;
INSERT INTO public.account_members(account_id,user_id,role) SELECT workspace_a,extra_id,'member' FROM b21_fixture;
INSERT INTO b21_results SELECT 'owner insert still allowed',count(*)=1 FROM public.account_members WHERE account_id=(SELECT workspace_a FROM b21_fixture) AND user_id=(SELECT extra_id FROM b21_fixture);
WITH changed AS (UPDATE public.account_members SET role='member' WHERE account_id=(SELECT workspace_a FROM b21_fixture) AND user_id=(SELECT extra_id FROM b21_fixture) RETURNING 1)
INSERT INTO b21_results SELECT 'owner update still allowed',count(*)=1 FROM changed;
WITH removed AS (DELETE FROM public.account_members WHERE account_id=(SELECT workspace_a FROM b21_fixture) AND user_id=(SELECT extra_id FROM b21_fixture) RETURNING 1)
INSERT INTO b21_results SELECT 'owner delete still allowed',count(*)=1 FROM removed;

DO $test$ BEGIN
  UPDATE public.account_members SET account_id=(SELECT workspace_b FROM b21_fixture)
    WHERE account_id=(SELECT workspace_a FROM b21_fixture) AND user_id=(SELECT member_id FROM b21_fixture);
  RAISE EXCEPTION 'Owner moved membership into unrelated workspace';
EXCEPTION WHEN insufficient_privilege THEN
  INSERT INTO b21_results VALUES('owner cannot move membership to unrelated workspace',true);
END $test$;
RESET ROLE;
SELECT set_config('request.jwt.claims',json_build_object('sub',member_id,'role','authenticated')::text,true) FROM b21_fixture;
SET LOCAL ROLE authenticated;
INSERT INTO b21_results SELECT 'member reads both workspace memberships',count(*)=2 FROM public.account_members WHERE account_id=(SELECT workspace_a FROM b21_fixture);
INSERT INTO b21_results SELECT 'member cannot read unrelated workspace memberships',count(*)=0 FROM public.account_members WHERE account_id=(SELECT workspace_b FROM b21_fixture);
WITH changed AS (UPDATE public.account_members SET role='owner' WHERE account_id=(SELECT workspace_a FROM b21_fixture) AND user_id=(SELECT member_id FROM b21_fixture) RETURNING 1)
INSERT INTO b21_results SELECT 'member cannot promote self',count(*)=0 FROM changed;
WITH removed AS (DELETE FROM public.account_members WHERE account_id=(SELECT workspace_a FROM b21_fixture) AND user_id=(SELECT owner_id FROM b21_fixture) RETURNING 1)
INSERT INTO b21_results SELECT 'member cannot delete owner',count(*)=0 FROM removed;
DO $test$ BEGIN
  INSERT INTO public.account_members(account_id,user_id,role) SELECT workspace_a,extra_id,'member' FROM b21_fixture;
  RAISE EXCEPTION 'Member insert unexpectedly allowed';
EXCEPTION WHEN insufficient_privilege THEN
  INSERT INTO b21_results VALUES('member cannot insert another member',true);
END $test$;
RESET ROLE;
SELECT set_config('request.jwt.claims',json_build_object('sub',outsider_id,'role','authenticated')::text,true) FROM b21_fixture;
SET LOCAL ROLE authenticated;
INSERT INTO b21_results SELECT 'outsider cannot read target workspace memberships',count(*)=0 FROM public.account_members WHERE account_id=(SELECT workspace_a FROM b21_fixture);
INSERT INTO b21_results SELECT 'outsider helper returns false',NOT song_room_private.is_workspace_member(workspace_a) FROM b21_fixture;
DO $test$ BEGIN
  INSERT INTO public.account_members(account_id,user_id,role) SELECT workspace_a,outsider_id,'owner' FROM b21_fixture;
  RAISE EXCEPTION 'Outsider self-add unexpectedly allowed';
EXCEPTION WHEN insufficient_privilege THEN
  INSERT INTO b21_results VALUES('outsider cannot add self as owner',true);
END $test$;

RESET ROLE;
INSERT INTO public.account_members(account_id,user_id,role) SELECT workspace_a,extra_id,'admin' FROM b21_fixture;
SELECT set_config('request.jwt.claims',json_build_object('sub',extra_id,'role','authenticated')::text,true) FROM b21_fixture;
SET LOCAL ROLE authenticated;
INSERT INTO public.account_members(account_id,user_id,role) SELECT workspace_a,outsider_id,'member' FROM b21_fixture;
INSERT INTO b21_results SELECT 'existing admin insert semantics preserved',count(*)=1 FROM public.account_members WHERE account_id=(SELECT workspace_a FROM b21_fixture) AND user_id=(SELECT outsider_id FROM b21_fixture);
WITH removed AS (DELETE FROM public.account_members WHERE account_id=(SELECT workspace_a FROM b21_fixture) AND user_id=(SELECT outsider_id FROM b21_fixture) RETURNING 1)
INSERT INTO b21_results SELECT 'existing admin delete semantics preserved',count(*)=1 FROM removed;
WITH changed AS (UPDATE public.account_members SET role='owner' WHERE account_id=(SELECT workspace_a FROM b21_fixture) AND user_id=(SELECT extra_id FROM b21_fixture) RETURNING 1)
INSERT INTO b21_results SELECT 'admin cannot promote self under owner-only update rule',count(*)=0 FROM changed;
RESET ROLE;
SELECT set_config('request.jwt.claims','{}',true);
SET LOCAL ROLE anon;
INSERT INTO b21_results SELECT 'anonymous cannot read memberships',count(*)=0 FROM public.account_members WHERE account_id IN (SELECT workspace_a FROM b21_fixture UNION ALL SELECT workspace_b FROM b21_fixture);
DO $test$ BEGIN
  PERFORM song_room_private.is_workspace_member(workspace_a) FROM b21_fixture;
  RAISE EXCEPTION 'Anonymous helper execution unexpectedly allowed';
EXCEPTION WHEN insufficient_privilege THEN
  INSERT INTO b21_results VALUES('anonymous cannot execute private helper',true);
END $test$;
RESET ROLE;
INSERT INTO b21_results SELECT 'helper fixed search path and definer owner',p.prosecdef AND p.proconfig=ARRAY['search_path=""'] AND pg_get_userbyid(p.proowner)='postgres'
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='song_room_private' AND p.proname='is_workspace_member';

SET LOCAL ROLE authenticated;
INSERT INTO b21_results SELECT 'authenticated with no subject sees no memberships',count(*)=0 FROM public.account_members WHERE account_id IN (SELECT workspace_a FROM b21_fixture UNION ALL SELECT workspace_b FROM b21_fixture);
INSERT INTO b21_results SELECT 'helper denies missing subject and null target',NOT song_room_private.is_workspace_member(workspace_a) AND NOT song_room_private.is_workspace_member(NULL) AND NOT song_room_private.has_workspace_role(workspace_a,ARRAY['owner'::public.account_role]) FROM b21_fixture;
RESET ROLE;
INSERT INTO b21_results SELECT 'both helpers have fixed path and owner',count(*)=2 AND bool_and(p.prosecdef AND p.proconfig=ARRAY['search_path=""'] AND pg_get_userbyid(p.proowner)='postgres') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='song_room_private' AND p.proname IN ('is_workspace_member','has_workspace_role');
INSERT INTO b21_results SELECT 'anonymous and service-role cannot execute helpers',bool_and(NOT has_function_privilege('anon',p.oid,'EXECUTE') AND NOT has_function_privilege('service_role',p.oid,'EXECUTE') AND has_function_privilege('authenticated',p.oid,'EXECUTE')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='song_room_private';
INSERT INTO b21_results SELECT 'authenticated has no schema create rights',NOT has_schema_privilege('authenticated','song_room_private','CREATE');
SELECT set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true) FROM b21_fixture;
SET LOCAL ROLE authenticated;
INSERT INTO b21_results SELECT 'fixed-path public helpers preserve own and outsider checks',
  public.is_account_member(workspace_a) AND NOT public.is_account_member(workspace_b)
  AND public.has_account_role(workspace_a,ARRAY['owner'::public.account_role])
  AND NOT public.has_account_role(workspace_b,ARRAY['owner'::public.account_role]) FROM b21_fixture;
RESET ROLE;
INSERT INTO b21_results SELECT 'all five public helper paths pinned',count(*)=5 AND bool_and(p.proconfig=ARRAY['search_path=""']) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('set_updated_at','profile_settings_touch_updated_at','is_account_member','has_account_role','generate_referral_code');
INSERT INTO b21_results SELECT 'public helper ownership and invoker mode unchanged',count(*)=5 AND bool_and(NOT p.prosecdef AND pg_get_userbyid(p.proowner)='postgres') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('set_updated_at','profile_settings_touch_updated_at','is_account_member','has_account_role','generate_referral_code');
INSERT INTO b21_results SELECT 'public helper client grants unchanged',count(*)=5 AND bool_and(has_function_privilege('anon',p.oid,'EXECUTE') AND has_function_privilege('authenticated',p.oid,'EXECUTE')) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('set_updated_at','profile_settings_touch_updated_at','is_account_member','has_account_role','generate_referral_code');
INSERT INTO b21_results SELECT 'referral code generation still returns expected format',public.generate_referral_code() ~ '^TSR-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$';
CREATE TEMP TABLE b21_timestamp_a(id int,updated_at timestamptz) ON COMMIT DROP;
CREATE TEMP TABLE b21_timestamp_b(id int,updated_at timestamptz) ON COMMIT DROP;
CREATE TRIGGER touch_a BEFORE UPDATE ON b21_timestamp_a FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER touch_b BEFORE UPDATE ON b21_timestamp_b FOR EACH ROW EXECUTE FUNCTION public.profile_settings_touch_updated_at();
INSERT INTO b21_timestamp_a VALUES(1,'1970-01-01');
INSERT INTO b21_timestamp_b VALUES(1,'1970-01-01');
UPDATE b21_timestamp_a SET id=2;
UPDATE b21_timestamp_b SET id=2;
INSERT INTO b21_results SELECT 'updated-at trigger works with fixed path',updated_at=now() FROM b21_timestamp_a;
INSERT INTO b21_results SELECT 'profile-settings trigger works with fixed path',updated_at=now() FROM b21_timestamp_b;
DO $assert$ BEGIN
  IF (SELECT count(*) <> 34 OR bool_or(passed IS DISTINCT FROM true) FROM b21_results) THEN
    RAISE EXCEPTION 'B21 probe failed or did not run all 34 checks';
  END IF;
END $assert$;
SELECT json_agg(json_build_object('test',test_case,'passed',passed)) AS results FROM b21_results;
ROLLBACK;
