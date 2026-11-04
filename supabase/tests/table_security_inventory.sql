-- Read-only post-B39 table/policy/ACL baseline, reviewed 4 November 2026.
-- Hashes pin reviewed state; they do not replace behavioural role probes.
BEGIN READ ONLY;
WITH expected(table_name,policy_hash,acl_hash,column_acl_hash,force_rls) AS (VALUES
 ('account_invites','d41d8cd98f00b204e9800998ecf8427e','e4425b6978962d6aa486d041d6e0fa5c','d41d8cd98f00b204e9800998ecf8427e',false),
 ('account_members','7fcc2afd09b32b6abaa2f908d2c413ec','46d83234770ac4adefe1617d8dc0e51f','d41d8cd98f00b204e9800998ecf8427e',false),
 ('accounts','c0250f893144982b3230524a963e7917','46d83234770ac4adefe1617d8dc0e51f','d41d8cd98f00b204e9800998ecf8427e',false),
 ('actions','065b157529670697754ab371401e863a','46d83234770ac4adefe1617d8dc0e51f','d41d8cd98f00b204e9800998ecf8427e',false),
 ('beta_feedback','d41d8cd98f00b204e9800998ecf8427e','46875263bd6598c4534e2df7d1847a5e','d41d8cd98f00b204e9800998ecf8427e',false),
 ('billing_checkout_sessions','d1ed8514e9c7c26691d31ff20c1f4ea6','46d83234770ac4adefe1617d8dc0e51f','d41d8cd98f00b204e9800998ecf8427e',false),
 ('billing_subscriptions','95b4353ac017b285649818dc0a4b9987','46d83234770ac4adefe1617d8dc0e51f','d41d8cd98f00b204e9800998ecf8427e',false),
 ('billing_webhook_events','d41d8cd98f00b204e9800998ecf8427e','46875263bd6598c4534e2df7d1847a5e','d41d8cd98f00b204e9800998ecf8427e',false),
 ('comment_threads','9b02afeddb3007265b7cf4433c0bab43','46d83234770ac4adefe1617d8dc0e51f','d41d8cd98f00b204e9800998ecf8427e',false),
 ('comments','1f6c24bd891d23b7f9a126db9f3298ba','46d83234770ac4adefe1617d8dc0e51f','d41d8cd98f00b204e9800998ecf8427e',false),
 ('email_auth_flows','d41d8cd98f00b204e9800998ecf8427e','e2a3f139fac81e46b7683379c3a60d93','d41d8cd98f00b204e9800998ecf8427e',false),
 ('email_login_rate_limits','d41d8cd98f00b204e9800998ecf8427e','312cabeea5c29d8ea01689048c39a6c6','d41d8cd98f00b204e9800998ecf8427e',false),
 ('mutation_rate_limits','d41d8cd98f00b204e9800998ecf8427e','312cabeea5c29d8ea01689048c39a6c6','d41d8cd98f00b204e9800998ecf8427e',false),
 ('playlist_songs','e73554a2d581ad3d3eb8927dad60c2c6','46d83234770ac4adefe1617d8dc0e51f','d41d8cd98f00b204e9800998ecf8427e',false),
 ('playlists','cb81102e7f2ac51fedf897fa7c96f19d','46d83234770ac4adefe1617d8dc0e51f','d41d8cd98f00b204e9800998ecf8427e',false),
 ('profile_settings','7ff2ec1974e0f72e9736824727ed6cc3','46875263bd6598c4534e2df7d1847a5e','d41d8cd98f00b204e9800998ecf8427e',false),
 ('profiles','3c0eefdb1e4db800bb327938f2a79224','46875263bd6598c4534e2df7d1847a5e','d41d8cd98f00b204e9800998ecf8427e',false),
 ('public_comments','3310b12e75a5a82dc08d69f9c858b49c','e4425b6978962d6aa486d041d6e0fa5c','d41d8cd98f00b204e9800998ecf8427e',false),
 ('referral_codes','d41d8cd98f00b204e9800998ecf8427e','46875263bd6598c4534e2df7d1847a5e','d41d8cd98f00b204e9800998ecf8427e',false),
 ('referrals','d41d8cd98f00b204e9800998ecf8427e','46875263bd6598c4534e2df7d1847a5e','d41d8cd98f00b204e9800998ecf8427e',false),
 ('settings','e71e400fd4e491b81a12cbae51ff6068','46875263bd6598c4534e2df7d1847a5e','d41d8cd98f00b204e9800998ecf8427e',false),
 ('song_tasks','269c4b880608ba0c14854b38c335d1b7','46d83234770ac4adefe1617d8dc0e51f','d41d8cd98f00b204e9800998ecf8427e',false),
 ('song_versions','8faf8d1bc60fa8e9fbdef1c085ac8264','4d7bd5d64ff18271fd6ffc21d5d86117','d41d8cd98f00b204e9800998ecf8427e',false),
 ('songs','99f00f320c28e5a1c27c21c2968b9508','4d7bd5d64ff18271fd6ffc21d5d86117','d41d8cd98f00b204e9800998ecf8427e',false),
 ('stripe_webhook_events','d41d8cd98f00b204e9800998ecf8427e','e4425b6978962d6aa486d041d6e0fa5c','d41d8cd98f00b204e9800998ecf8427e',false)
), actual AS (
 SELECT c.relname::text table_name,c.relrowsecurity rls,c.relforcerowsecurity force_rls,
 md5(coalesce((SELECT string_agg(policyname||permissive||roles::text||cmd||coalesce(qual,'')||coalesce(with_check,''),'|' ORDER BY policyname) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname),'')) policy_hash,
 md5(coalesce(c.relacl::text,'')) acl_hash,
 md5(coalesce((SELECT string_agg(attname||attacl::text,'|' ORDER BY attnum) FROM pg_attribute WHERE attrelid=c.oid AND attacl IS NOT NULL),'')) column_acl_hash
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p')
), checks AS (
 SELECT coalesce(e.table_name,a.table_name) test_case,coalesce(a.rls AND e.force_rls=a.force_rls AND e.policy_hash=a.policy_hash AND e.acl_hash=a.acl_hash AND e.column_acl_hash=a.column_acl_hash,false) passed
 FROM expected e FULL JOIN actual a USING(table_name)
 UNION ALL SELECT 'no public views',NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('v','m'))
 UNION ALL SELECT 'client roles cannot bypass RLS',count(*)=2 AND bool_and(NOT rolbypassrls AND NOT rolsuper) FROM pg_roles WHERE rolname IN ('anon','authenticated')
 UNION ALL SELECT 'runtime roles cannot create public objects',bool_and(NOT has_schema_privilege(r,'public','CREATE')) FROM unnest(array['anon','authenticated','service_role']) r
 UNION ALL SELECT 'private helper schema stays restricted',NOT has_schema_privilege('anon','song_room_private','USAGE') AND bool_and(NOT has_schema_privilege(r,'song_room_private','CREATE')) FROM unnest(array['anon','authenticated','service_role']) r
)
SELECT * FROM checks ORDER BY test_case;
ROLLBACK;
