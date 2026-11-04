-- Read-only function drift check. Reviewed 4 November 2026 after B38.
-- Fingerprints include body, signature, search_path and security mode.
-- Missing, extra, changed or re-granted functions fail closed. No function is invoked.
BEGIN READ ONLY;
WITH expected(schema_name,function_name,args,fingerprint,definer,anon_exec,auth_exec,service_exec) AS (VALUES
 ('public','accept_workspace_invite_atomically','p_invite_token uuid, p_user_id uuid, p_user_email text','460ec500c96eded2a8d09f69bf3e77e5',false,false,false,true),
 ('public','account_invites_sync_derived_fields','','a004125ef2ee82b37cddacb1a3d755dc',false,false,false,true),
 ('public','claim_stripe_webhook_event','p_event_id text, p_event_type text','de8be4a56daef327a4f607887e5c6a06',true,false,false,true),
 ('public','complete_stripe_webhook_event','p_event_id text','74625121d4d32e44845acca452e5ef40',true,false,false,true),
 ('public','consume_email_login_attempt','p_client_hash text','892ffd9f8bf830f312379b5926bb0f99',false,false,false,true),
 ('public','consume_mutation_attempt','p_scope text, p_subject_hash text, p_recipient_hash text','2adbb709925f06bf0a3cd649b4df9827',false,false,false,true),
 ('public','create_song_version_upload','p_song_id uuid, p_account_id uuid, p_label text, p_notes text, p_file_path text, p_file_name text, p_file_size_bytes bigint, p_created_by text','47e4a2b85d85b3d7bac71b0bde2ef3f8',true,false,false,true),
 ('public','delete_song_and_release_storage','p_song_id uuid, p_account_id uuid','8318a346cd24898e6105010d18448e55',true,false,false,true),
 ('public','enforce_beta_feedback_rate_limit','','bb1f5b42bc3656ae9aa34f12debf420a',false,false,false,true),
 ('public','ensure_initial_workspace_membership','p_user_id uuid, p_workspace_name text','9ab175348d7b93afac07ec7788b4366a',false,false,false,true),
 ('public','fail_stripe_webhook_event','p_event_id text, p_error text','84c9b60e55498be3852b0661160bd919',true,false,false,true),
 ('public','finalize_song_version_upload','p_version_id uuid, p_account_id uuid, p_file_size_bytes bigint, p_storage_limit_bytes bigint','de46dabb67cc9768f685e84b8e217c37',true,false,false,true),
 ('public','generate_referral_code','','80f470b833ab3c9edfb37414c1852f57',false,true,true,true),
 ('public','has_account_role','target_account_id uuid, allowed_roles account_role[]','e7b7626e4ba25c4b700ac83762084218',false,true,true,true),
 ('public','is_account_member','target_account_id uuid','09e1d90f1da1051583271e685cd5c016',false,true,true,true),
 ('public','profile_settings_touch_updated_at','','b37f6346ca34757138a7e8e57306f6c6',false,true,true,true),
 ('public','set_updated_at','','63f977f8e2e3db6a119fcbe248bf3314',false,true,true,true),
 ('song_room_private','has_workspace_role','target_account_id uuid, allowed_roles account_role[]','4a0d440d28a60c2fe01e9eccee7fc777',true,false,true,false),
 ('song_room_private','is_workspace_member','target_account_id uuid','4659cd8a52d52e66a776e45241cf5914',true,false,true,false)
), actual AS (
 SELECT n.nspname::text schema_name,p.proname::text function_name,
 pg_get_function_identity_arguments(p.oid) args,md5(pg_get_functiondef(p.oid)) fingerprint,
 p.prosecdef definer,has_function_privilege('anon',p.oid,'execute') anon_exec,
 has_function_privilege('authenticated',p.oid,'execute') auth_exec,
 has_function_privilege('service_role',p.oid,'execute') service_exec,
 pg_get_userbyid(p.proowner) owner
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('public','song_room_private') AND p.prokind='f'
)
SELECT coalesce(e.schema_name,a.schema_name)||'.'||coalesce(e.function_name,a.function_name)||'('||coalesce(e.args,a.args)||')' test_case,
 coalesce(e.fingerprint=a.fingerprint AND e.definer=a.definer AND e.anon_exec=a.anon_exec AND e.auth_exec=a.auth_exec AND e.service_exec=a.service_exec AND a.owner='postgres',false) passed
FROM expected e FULL JOIN actual a USING(schema_name,function_name,args)
ORDER BY 1;
ROLLBACK;

