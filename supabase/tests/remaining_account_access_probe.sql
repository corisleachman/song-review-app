-- Passwordless/sessionless synthetic identities and rows, always rolled back.
-- No Auth API, actual Stripe/API/email calls, Storage or real user writes.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('auth.users'::regclass,'public.profiles'::regclass,'public.accounts'::regclass,'public.account_members'::regclass,'public.settings'::regclass,'public.billing_subscriptions'::regclass,'public.billing_checkout_sessions'::regclass)) THEN RAISE EXCEPTION 'Review identity/account/billing fixture triggers'; END IF;
 IF (SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid='public.profile_settings'::regclass)<>1
 OR md5(pg_get_functiondef('public.profile_settings_touch_updated_at()'::regprocedure))<>'b37f6346ca34757138a7e8e57306f6c6' THEN RAISE EXCEPTION 'Review profile timestamp trigger'; END IF;
END $$;
CREATE TEMP TABLE remaining_results(test_case text,passed boolean) ON COMMIT DROP;
CREATE TEMP TABLE remaining_fixture ON COMMIT DROP AS SELECT
 gen_random_uuid() a,gen_random_uuid() b,gen_random_uuid() c,
 gen_random_uuid() owner_id,gen_random_uuid() admin_id,gen_random_uuid() member_id,gen_random_uuid() outsider_id,
 gen_random_uuid() sub_a,gen_random_uuid() sub_b,gen_random_uuid() cs_a,gen_random_uuid() cs_b,
 gen_random_uuid() setting_a,gen_random_uuid() setting_b;
GRANT SELECT ON remaining_fixture TO authenticated,anon,service_role;
GRANT SELECT,INSERT ON remaining_results TO authenticated,anon,service_role;
CREATE TEMP TABLE remaining_policies ON COMMIT DROP AS SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('billing_subscriptions','billing_checkout_sessions','profiles','profile_settings','settings');
CREATE TEMP TABLE remaining_grants ON COMMIT DROP AS
 SELECT r,t,p,has_table_privilege(r,'public.'||t,p) allowed FROM unnest(array['anon','authenticated','service_role']) r,
 unnest(array['billing_subscriptions','billing_checkout_sessions','profiles','profile_settings','settings','accounts','account_members']) t,
 unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
 WHERE NOT(r IN ('anon','authenticated') AND t IN ('billing_subscriptions','billing_checkout_sessions') AND p IN ('INSERT','UPDATE','DELETE'));
INSERT INTO auth.users(id,email,aud,role)
 SELECT id,'b38-probe+'||id::text||'@example.invalid','authenticated','authenticated' FROM remaining_fixture,LATERAL unnest(array[owner_id,admin_id,member_id,outsider_id]) id;
INSERT INTO public.profiles(id,email,display_name)
 SELECT id,'b38-probe+'||id::text||'@example.invalid','B38 synthetic profile' FROM remaining_fixture,LATERAL unnest(array[owner_id,admin_id,member_id,outsider_id]) id;
INSERT INTO public.profile_settings(user_id,primary_color,accent_color,background_color)
 SELECT id,'#123456','#654321','#0d0914' FROM remaining_fixture,LATERAL unnest(array[owner_id,admin_id,member_id,outsider_id]) id;
INSERT INTO public.accounts(id,name,created_by_user_id)
 SELECT a,'B38 rollback-only A',owner_id FROM remaining_fixture UNION ALL SELECT b,'B38 rollback-only B',outsider_id FROM remaining_fixture UNION ALL SELECT c,'B38 rollback-only C',owner_id FROM remaining_fixture;
INSERT INTO public.account_members(account_id,user_id,role)
 SELECT a,owner_id,'owner'::public.account_role FROM remaining_fixture UNION ALL SELECT a,admin_id,'admin'::public.account_role FROM remaining_fixture UNION ALL SELECT a,member_id,'member'::public.account_role FROM remaining_fixture UNION ALL SELECT b,outsider_id,'owner'::public.account_role FROM remaining_fixture
 UNION ALL SELECT c,owner_id,'owner'::public.account_role FROM remaining_fixture UNION ALL SELECT c,admin_id,'admin'::public.account_role FROM remaining_fixture UNION ALL SELECT c,member_id,'member'::public.account_role FROM remaining_fixture;
INSERT INTO public.settings(id,account_id,user_id,user_identity,primary_color)
 SELECT setting_a,a,owner_id,'b38-owner-'||owner_id::text,'#123456' FROM remaining_fixture UNION ALL SELECT setting_b,b,outsider_id,'b38-owner-'||outsider_id::text,'#123456' FROM remaining_fixture;
INSERT INTO public.billing_subscriptions(id,account_id,stripe_customer_id,stripe_subscription_id)
 SELECT sub_a,a,'cus_b38_'||a::text,'sub_b38_'||a::text FROM remaining_fixture UNION ALL SELECT sub_b,b,'cus_b38_'||b::text,'sub_b38_'||b::text FROM remaining_fixture;
INSERT INTO public.billing_checkout_sessions(id,account_id,stripe_checkout_session_id)
 SELECT cs_a,a,'cs_b38_'||a::text FROM remaining_fixture UNION ALL SELECT cs_b,b,'cs_b38_'||b::text FROM remaining_fixture;

-- MIGRATION_UNDER_TEST

INSERT INTO remaining_results SELECT 'other grants and reads unchanged',bool_and(allowed=has_table_privilege(r,'public.'||t,p)) FROM remaining_grants;
INSERT INTO remaining_results SELECT 'billing/profile/theme RLS unchanged',NOT EXISTS(
 (SELECT * FROM remaining_policies EXCEPT SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('billing_subscriptions','billing_checkout_sessions','profiles','profile_settings','settings')) UNION ALL
 (SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('billing_subscriptions','billing_checkout_sessions','profiles','profile_settings','settings') EXCEPT SELECT * FROM remaining_policies));
SET LOCAL ROLE authenticated;
DO $$ DECLARE f record; who record; op record; changed integer; foreign_user uuid; allowed boolean:=/* CLIENT_WRITES_ALLOWED */; expected boolean; BEGIN
 SELECT * INTO f FROM remaining_fixture;
 FOR op IN SELECT r,t FROM unnest(array['anon','authenticated']) r,unnest(array['billing_subscriptions','billing_checkout_sessions']) t LOOP
  INSERT INTO remaining_results VALUES(op.r||' '||op.t||' DML grants match mode',has_any_column_privilege(op.r,'public.'||op.t,'INSERT')=allowed AND has_any_column_privilege(op.r,'public.'||op.t,'UPDATE')=allowed AND has_table_privilege(op.r,'public.'||op.t,'DELETE')=allowed);
 END LOOP;
 FOR who IN SELECT f.owner_id id,'owner' label UNION ALL SELECT f.admin_id,'admin' UNION ALL SELECT f.member_id,'member' UNION ALL SELECT f.outsider_id,'outsider' LOOP
  PERFORM set_config('request.jwt.claims',json_build_object('sub',who.id,'role','authenticated')::text,true);
  foreign_user:=CASE WHEN who.label='outsider' THEN f.owner_id ELSE f.outsider_id END;
  INSERT INTO remaining_results SELECT who.label||' own profile read',count(*)=1 FROM public.profiles WHERE id=who.id;
  INSERT INTO remaining_results SELECT who.label||' foreign profile read denied',count(*)=0 FROM public.profiles WHERE id=foreign_user;
  UPDATE public.profiles SET display_name='B38 own edit' WHERE id=who.id; GET DIAGNOSTICS changed=ROW_COUNT;
  INSERT INTO remaining_results VALUES(who.label||' own profile update',changed=1);
  UPDATE public.profiles SET display_name='B38 forbidden edit' WHERE id=foreign_user; GET DIAGNOSTICS changed=ROW_COUNT;
  INSERT INTO remaining_results VALUES(who.label||' foreign profile update denied',changed=0);
  INSERT INTO remaining_results SELECT who.label||' own preference read',count(*)=1 FROM public.profile_settings WHERE user_id=who.id;
  INSERT INTO remaining_results SELECT who.label||' foreign preference read denied',count(*)=0 FROM public.profile_settings WHERE user_id=foreign_user;
  UPDATE public.profile_settings SET visualizer_enabled=false WHERE user_id=who.id; GET DIAGNOSTICS changed=ROW_COUNT;
  INSERT INTO remaining_results VALUES(who.label||' own preference update',changed=1);
  UPDATE public.profile_settings SET visualizer_enabled=false WHERE user_id=foreign_user; GET DIAGNOSTICS changed=ROW_COUNT;
  INSERT INTO remaining_results VALUES(who.label||' foreign preference update denied',changed=0);
  INSERT INTO remaining_results SELECT who.label||' legacy theme workspace boundary',count(*)=CASE WHEN who.label='outsider' THEN 0 ELSE 1 END FROM public.settings WHERE id=f.setting_a;
  FOR op IN SELECT 'billing_subscriptions' t,f.sub_a id UNION ALL SELECT 'billing_checkout_sessions',f.cs_a LOOP
   EXECUTE format('SELECT count(*) FROM public.%I WHERE id=%L',op.t,op.id) INTO changed;
   INSERT INTO remaining_results VALUES(who.label||' '||op.t||' workspace read',changed=CASE WHEN who.label='outsider' THEN 0 ELSE 1 END);
  END LOOP;
  FOR op IN
   SELECT 'subscription INSERT' label,format('INSERT INTO public.billing_subscriptions(account_id,stripe_customer_id,stripe_subscription_id,status) VALUES(%L,%L,%L,%L)',f.c,'cus_forged_'||who.id::text,'sub_forged_'||who.id::text,'active') sql,true owner_admin
   UNION ALL SELECT 'subscription UPDATE',format('UPDATE public.billing_subscriptions SET status=%L,stripe_customer_id=%L WHERE id=%L','active','cus_forged_'||who.id::text,f.sub_a),true
   UNION ALL SELECT 'subscription DELETE',format('DELETE FROM public.billing_subscriptions WHERE id=%L',f.sub_a),false
   UNION ALL SELECT 'checkout INSERT',format('INSERT INTO public.billing_checkout_sessions(account_id,stripe_checkout_session_id,status) VALUES(%L,%L,%L)',f.a,'cs_forged_'||who.id::text,'complete'),true
   UNION ALL SELECT 'checkout UPDATE',format('UPDATE public.billing_checkout_sessions SET status=%L WHERE id=%L','complete',f.cs_a),false
   UNION ALL SELECT 'checkout DELETE',format('DELETE FROM public.billing_checkout_sessions WHERE id=%L',f.cs_a),false
  LOOP
   expected:=allowed AND op.owner_admin AND who.label IN ('owner','admin');
   BEGIN
    EXECUTE op.sql; GET DIAGNOSTICS changed=ROW_COUNT;
    IF NOT allowed THEN RAISE EXCEPTION 'Client billing statement still permitted'; END IF;
    IF (changed=1) IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Unexpected baseline billing write count'; END IF;
    RAISE EXCEPTION USING ERRCODE='P1234';
   EXCEPTION WHEN SQLSTATE 'P1234' THEN INSERT INTO remaining_results VALUES(who.label||' baseline '||op.label,true);
   WHEN insufficient_privilege THEN
    IF expected THEN RAISE EXCEPTION 'Expected baseline billing write denied'; END IF;
    INSERT INTO remaining_results VALUES(who.label||' denied '||op.label,true);
   END;
  END LOOP;
 END LOOP;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{}',true) IS NOT NULL AS anonymous_claims_reset;
INSERT INTO remaining_results SELECT 'anonymous fixture profile read denied',count(*)=0 FROM public.profiles WHERE id IN (SELECT owner_id FROM remaining_fixture UNION ALL SELECT outsider_id FROM remaining_fixture);
INSERT INTO remaining_results SELECT 'anonymous fixture theme read denied',count(*)=0 FROM public.settings WHERE id IN (SELECT setting_a FROM remaining_fixture UNION ALL SELECT setting_b FROM remaining_fixture);
INSERT INTO remaining_results SELECT 'anonymous fixture billing read denied',count(*)=0 FROM public.billing_subscriptions WHERE id IN (SELECT sub_a FROM remaining_fixture UNION ALL SELECT sub_b FROM remaining_fixture);
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ DECLARE f record; new_id uuid; changed integer; BEGIN
 SELECT * INTO f FROM remaining_fixture;
 INSERT INTO public.billing_subscriptions(account_id,stripe_customer_id,stripe_subscription_id) VALUES(f.c,'cus_server_'||f.c::text,'sub_server_'||f.c::text) RETURNING billing_subscriptions.id INTO new_id;
 INSERT INTO remaining_results VALUES('server subscription insert retained',new_id IS NOT NULL);
 UPDATE public.billing_subscriptions SET status='active' WHERE billing_subscriptions.id=new_id; GET DIAGNOSTICS changed=ROW_COUNT;
 INSERT INTO remaining_results VALUES('server subscription update retained',changed=1);
 DELETE FROM public.billing_subscriptions WHERE billing_subscriptions.id=new_id; GET DIAGNOSTICS changed=ROW_COUNT;
 INSERT INTO remaining_results VALUES('server subscription delete retained',changed=1);
 INSERT INTO public.billing_checkout_sessions(account_id,stripe_checkout_session_id) VALUES(f.c,'cs_server_'||f.c::text) RETURNING billing_checkout_sessions.id INTO new_id;
 INSERT INTO remaining_results VALUES('server checkout insert retained',new_id IS NOT NULL);
 UPDATE public.billing_checkout_sessions SET status='complete' WHERE billing_checkout_sessions.id=new_id; GET DIAGNOSTICS changed=ROW_COUNT;
 INSERT INTO remaining_results VALUES('server checkout update retained',changed=1);
 DELETE FROM public.billing_checkout_sessions WHERE billing_checkout_sessions.id=new_id; GET DIAGNOSTICS changed=ROW_COUNT;
 INSERT INTO remaining_results VALUES('server checkout delete retained',changed=1);
 INSERT INTO remaining_results SELECT 'legacy fact writes never change account entitlement',bool_and(plan='free' AND stripe_customer_id IS NULL AND stripe_subscription_id IS NULL) FROM public.accounts WHERE accounts.id IN (f.a,f.b,f.c);
END $$;
RESET ROLE;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM remaining_results WHERE passed IS DISTINCT FROM true) THEN RAISE EXCEPTION 'Remaining account boundary probe failed'; END IF; END $$;
SELECT test_case,passed FROM remaining_results ORDER BY test_case;
ROLLBACK;
