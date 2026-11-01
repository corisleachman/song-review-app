-- First-apply preflight only. Run against the explicitly selected target.
-- Stop if any of these booleans is false. Does not print user data or secrets.
SELECT
  (SELECT md5(jsonb_agg(jsonb_build_object('name',policyname,'roles',roles,'cmd',cmd,'qual',qual,'check',with_check) ORDER BY policyname)::text)
   FROM pg_policies WHERE schemaname='public' AND tablename='account_members')
    = 'dab55d62d83cb2ebe87ae89aea07ac1a' AS membership_policies_match_reviewed_baseline,
  (SELECT jsonb_object_agg(p.proname,md5(p.prosrc))
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN ('set_updated_at','profile_settings_touch_updated_at','is_account_member','has_account_role','generate_referral_code'))
    = '{"set_updated_at":"9b1889f56258bf9d6554213c05019c76","has_account_role":"fa92f51603966a9db8819ec3079d1ba7","is_account_member":"a540798d4c612aa16c476713fb783afa","generate_referral_code":"704c204347f3b5344062aa473f7507b7","profile_settings_touch_updated_at":"1c4318bee4240d4113d86fad7eb15623"}'::jsonb AS function_bodies_match_reviewed_baseline,
  NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='song_room_private') AS private_schema_is_unused,
  (SELECT count(*)=5 AND bool_and(NOT p.prosecdef AND p.proconfig IS NULL AND pg_get_userbyid(p.proowner)='postgres')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN ('set_updated_at','profile_settings_touch_updated_at','is_account_member','has_account_role','generate_referral_code'))
    AS public_helpers_match_reviewed_mode_and_settings,
  (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname='postgres')
    AS helper_owner_can_perform_bounded_lookup;
