# Launch security review

Checkpoint: 1 November 2026. Current stage: [L5 in the launch checklist](LAUNCH_CHECKLIST.md#current-stage-l5-security-closeout).

## Scope and limits

Initial review of release `8f02fb7a01e737974ab2cbbc294eaebf2fe3af9d` on `origin/clone-clean` and read-only production Supabase metadata (`hxtsuhmqrufcdplidtov`). No accounts, grants, policies, schema, provider configuration, secrets or production data changed. This is an inventory checkpoint, not a penetration-test or launch-security signoff.

The older roadmap's assertion that RLS still needs adding across the app is out of date. All 24 ordinary public-schema tables currently have RLS enabled. Policy correctness, grants, views, Storage and privileged API routes still need separate checks.

## Observed findings

| Finding | Evidence | Disposition |
| --- | --- | --- |
| RLS baseline exists | pg_class / pg_namespace inventory: 24 public ordinary tables, all relrowsecurity=true | S1 complete; don't recreate policies blindly |
| Five function search-path warnings | Production Security Advisor names set_updated_at, profile_settings_touch_updated_at, is_account_member, has_account_role and generate_referral_code | S3 pending. All five currently SECURITY INVOKER with unset proconfig, and executable by anon/authenticated. Inspect definitions/dependencies before remediation; no privilege escalation demonstrated |
| Eight RLS-without-policy information findings | account_invites, beta_feedback, billing_webhook_events, email_auth_flows, email_login_rate_limits, referral_codes, referrals, stripe_webhook_events | Consistent with server-only design; confirm grants/intended paths. Don't add broad client policies merely to clear INFO notices |
| Overlapping older/newer membership policies | Read-only pg_policies sample for accounts, account_members, songs and song_versions | S3 pending. Some policies target PUBLIC and some authenticated, but role targeting alone doesn't prove exposure. Evaluate predicates and direct-role behaviour |
| Public version SELECT policy needs scope review | song_versions anon SELECT permits versions of a public song; canonical public API contract limits finalized/public output | S2/S3 pending. Verify table/column grants and intended historical-version privacy before deciding whether this is a defect; don't equate API filtering with direct Data API protection |
| Service-role API client makes route checks essential | lib/supabaseServer.ts uses the server-only key; middleware intentionally skips APIs | S2 pending across all 68 route files. RLS doesn't constrain service-role reads |
| Sampled private thread path checks workspace | threads/create resolves canonical identity, checks version/song relation, then song.account_id against active workspace before inserts | Positive sampled code evidence, not an exhaustive IDOR pass |
| Abuse controls are partial, not absent | Email limiter/Turnstile and feedback throttle exist; no explicit application throttle found in inspected workspace-invite, thread-create and bootstrap routes | S4 pending: verify provider/platform coverage and agree endpoint-specific limits |
| Existing tests cover important boundaries | auth-boundary and critical-contract tests cover sealed intent, public reads/comments, uploads, owner deletion and invite boundary | All 109 current repository tests passed; source contracts don't replace staged owner/member/outsider tests |

Advisor result: zero ERROR findings, five WARN findings and eight INFO findings on 1 November. This isn't an assertion of zero vulnerabilities.

Production-dependency lockfile audit (`npm audit --omit=dev`): four low-severity advisories, zero moderate/high/critical. This audit does not cover development dependencies or independently establish runtime exploitability. The current route inventory is [here](LAUNCH_API_ACCESS_MATRIX.md).

## Next slice: API boundary matrix

1. Agent, repository: classify all route methods as session-protected, public-share, auth entry, signed webhook, admin or internal. Record identity check, workspace/resource predicate, role check and validation for each.
2. Agent, staging: prepare distinct owner/member/outsider fixtures using existing test conventions; no production user creation or mutation. Run allowed and denied reads first, then reversible writes on designated disposable fixtures.
3. Agent, staging Data API: verify private/public row and column visibility, cross-workspace IDs, version history and revoked-share behaviour. Check views and Storage separately from ordinary public tables.
4. Agent, repository: turn confirmed failures into small fixes with regression coverage; retain evidence for intentional public endpoints. Stop if environment parity, permissions or safe fixtures are uncertain.

Expected result: each private route denies unauthenticated and unrelated-workspace requests without returning private data; public routes return only the deliberately shared projection. Report route, method, role, safe request shape, expected/actual status and redacted response on failure.

No security rollout or rollback is needed for this read-only checkpoint. Any later migration needs its own staging verification, exact rollout order and rollback record.

## References

- [Supabase function search-path guidance](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Supabase database function privileges](https://supabase.com/docs/guides/database/functions)
- [RLS enabled without policy guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)


## S2 continuation, 1 November 2026: performance/admin overlap

Sampled dashboard and summary reads, song/version reads, admin feedback GET/PATCH, the internal thread-notification endpoint and the development plan switch. The [API matrix](LAUNCH_API_ACCESS_MATRIX.md#code-review-continuation-1-november-2026) records observed boundaries and a staged negative-access sequence. This advances code review only; no staging fixtures, valid credentials, email or account-plan mutations were used. S2 remains In progress.

The new B18 dashboard-return requirement directly overlaps cache isolation and late-response handling. B06 promotional grants overlap owner-only server authorisation and subscription boundaries. No existing admin permission is broadened here, and a normal workspace owner must not be treated as the application owner. B17/B19 performance work must retain canonical server access checks. The new-version notification audit is distinct from the existing signed internal thread-notification route.


## Executed verification, 1 November 2026

### B21: confirmed staging RLS recursion

A read-only transaction used staging project `ivifkrtupqizyqqsxdty`, an existing account owner, SET LOCAL ROLE authenticated and transaction-local JWT claims. The owner read failed with SQLSTATE `42P17`, `infinite recursion detected in policy for relation "account_members"`. The transaction did not return song content or mutate data.

Root cause: account_members_select_member queries account_members from its own SELECT predicate. Additional membership INSERT/DELETE policies query the same table, while has_account_role/is_account_member are SECURITY INVOKER helpers which also read it. RLS on that read re-enters membership policy evaluation. Production metadata shows the same membership SELECT structure, but no authenticated-role Production probe has run.

This is a confirmed staging correctness failure, not demonstrated cross-workspace exposure and not evidence that all service-role API reads fail. The song-upload page still contains browser-client song-title reads, so direct access cannot simply be assumed unused. Safe repair needs a separate reviewed policy design, preserving member visibility and write roles without broad grants. Do not disable RLS or add an always-true policy.

No database repair is applied. Required next evidence: define desired self/member visibility, inspect all policy/helper dependencies and exposed grants, prepare a narrow migration and rollback that doesn't reintroduce broad access, then verify owner/member/outsider/anon read and write cases on staging before Production. A SECURITY DEFINER helper is not an automatic fix; any such helper needs a private schema, fixed search path, tightly bounded auth.uid lookup and reviewed execute privileges.

### B22: legacy verifier fails open when unconfigured

The real legacy handler returned 200/success for an empty JSON object when SHARED_PASSWORD was absent, because undefined equalled undefined. The regression test reproduced this before the fix. The handler now requires non-empty string input and a non-empty configured value before comparison. Configured valid input retains its existing response; this route creates no Supabase session. Production middleware doesn't trust legacy cookies, so this finding isn't claimed as a demonstrated session bypass. No hosted secret was read or changed.

### Positive checks and limits

- Twelve actual-handler tests pass using mocked I/O; the full suite is 121 passed. TypeScript and focused ESLint pass. These don't replace hosted owner/member/outsider tests.
- Anonymous staging database reads return one public song and zero private songs; three public-song versions are readable and all are finalized. Intended public history/column visibility and revoked-share tests remain open.
- All 68 API files now have an intended boundary classification in the matrix. These classifications aren't a route-by-method security pass.

S2 remains In progress. No hosted migration, grant or policy change has occurred. The legacy-verifier application patch can roll back through its focused commit/previous deployment; doing so restores the documented false-success behaviour.


## B22 production release verified, 1 November 2026

PR #66 merged with exact tested head `a9d598c9` as `6e770973a7e65aee0444d4ef0acca8a4464552b7`. Both Preview builds, Preview Comments and browser CI passed (26 passed, 10 skipped). Protected primary Preview's empty-verifier HTTP probe returned 401/success false with no session cookie.

Production `dpl_iwxMHCuc3D5dxh7q6fGmkPHSauc3` is READY and the live www alias resolves to that exact merge revision. Eight safe HTTP checks passed: homepage/Login/config, signed-out bootstrap/dashboard/admin feedback, empty legacy verifier and unsigned internal notification. Public Email config stays true/false. The deployment-scoped last-ten-minute error/fatal scan returned no matching logs. No password, valid signature, account creation, notification send or payment was submitted.

B22 is Production complete. S2 and B21 remain open. No database migration or service configuration change was needed. Rollback target: previous deployment `dpl_DSGYU6ifueQ6QhDPhCNGWC6X6euM` at `d8621df2`, or focused revert of the application guard; this restores the documented false-success response. No rollback was performed.


## B21/S3 candidate ready for security review, 1 November 2026

[Review and rollout package](B21_SECURITY_REPAIR_REVIEW.md) contains two ordered migrations, reverse-order rollback scripts, first-apply drift checks and a reproducible rollback-only SQL probe. Candidate preserves workspace-member SELECT visibility and existing owner/admin insert/delete and owner-only update rules, using two private SECURITY DEFINER boolean lookups bound to auth.uid(). Five existing public functions get fixed empty search paths without body/grant/owner changes.

The first SELECT-only candidate passed reads but failed an insert; final repair covers all six membership predicates. Final access suite passed 27 checks, duplicate membership application passed, and the combined search-path/access suite passed 34 checks from checked-in composer output. Reverse rollback restored exact policy expressions/roles and function settings. Post-test read-back found no private schema or fixture accounts. No transaction was committed and neither hosted environment was repaired permanently.

Current local suite: 151 passing tests, including 42 real-handler mocked-I/O cases; focused lint and TypeScript pass. Staging/Production policy/body fingerprints match, and staging first-apply preflight passes. These don't replace installed-definition, exposed-schema, hosted API/browser and Production verification. S2/S3 remain In progress; permanent staging installation now requires review of the new privileged lookup boundary.


## Approved staging installation and verification, 1 November 2026

The user approved staging only. Supabase applied the unchanged reviewed SQL as ledger versions `20261101153149_fix_membership_rls_recursion` and `20261101153157_pin_function_search_paths`. Repository migration/rollback names and current links were aligned to that ledger; original candidate timestamps were 20261101112636/20261101113332. SQL bytes were compared with the approved source and are unchanged.

Installed definitions were inspected before tests. The composer now supports `--installed`, which omits candidate DDL. All 34 installed-schema checks and six rollback-only invitation RPC checks passed. Staging Advisor has no errors/warnings; eight existing RLS-without-policy INFO notices remain. PostgREST rejects the private schema with 406/PGRST106, so no new schema exposure was enabled. The root OpenAPI probe required a secret key and wasn't used as exposure evidence; the zero-row table request supplied the decisive schema response. No key value was printed or persisted.

The existing Google session completed Vercel protection and staging login. The checked source `c4652810` Preview points to staging; workspace switching, four-song library, song/version reads, direct upload-page title and collaborator list passed in browser. No new account, audio, comment, real invitation email or paid action occurred. Invitation backend/idempotency was verified in rolled-back fixtures; a fresh invitation-email/browser journey wasn't replayed. Snapshot remained eight users/profiles, seven workspaces, eleven memberships and zero test workspaces. The bounded Preview error/fatal log scan was empty.

Production preflight still returns its five original true baseline checks; it was not migrated. Staging is verified for this repair; S2/S3 remain in progress and Production needs its own approval. See B21_SECURITY_REPAIR_REVIEW.md for rollout/rollback order and remaining limits.


## Approved Production repair, 1 November 2026

B21 and the five function search-path fixes are installed and verified on Production after separate user approval. Sixteen read-only role checks, six metadata checks, private-schema Data API exclusion and eight public HTTP probes pass. Scoped signed-in dashboard/song/version/upload-title/collaborator checks pass. Both environments have zero Security Advisor errors/warnings. PR #67 merged as `a66c24fa`. Earlier pending statements are historical; broader S2/S3 access and Storage checks remain open. See [rollout evidence and cross-environment migration ledger mapping](B21_SECURITY_REPAIR_REVIEW.md#production-verification-1-november-2026).


## Storage and view closeout checkpoint, 1 November 2026

Read-only metadata: no public-schema views/materialized views in staging or Production. Both environments have public song-files/song-images buckets and zero storage.objects policies. Anonymous HEAD for one finalized private staging song audio object returned 200, without downloading content. B23 tracks the confirmed privacy finding; no private Production file request or live share-toggle experiment occurred. Code inspection shows permanent public URLs remain independent of database sharing flags. No hosted access setting changed. See [evidence, repair surface and revocation decision](STORAGE_ACCESS_REVIEW.md). S2/S3 remain open.

## Private media staged checkpoint, 1 November 2026

PR #68 e19c8582 has compatible audio and artwork delivery. Staging buckets are private; audio bucket/app candidate now 50 MB, global/spend cap unchanged. Production media remains unchanged. Two added media route files bring the historical 68-file inventory to 70; this does not complete every route/method/role check. Upload allocation/finalization RPC EXECUTE is service-role-only in both environments. 244 Node tests, TypeScript, four PR checks and 28 browser tests pass (10 skipped). Remaining phone/upload/performance/revocation gates and rollback: [Storage review](STORAGE_ACCESS_REVIEW.md#current-staging-checkpoint-1-november-2026). L5 remains open.

## Production media checkpoint, 2 November 2026

PR #68 is merged/deployed as ff15719f on the primary Production project. Both media buckets are private; audio bucket/global ceiling 50 MB; spend cap unchanged. Scoped live public/owner-private delivery, artwork, playback/seek, signed Range and legacy URL denial pass. Staging adds owner/separate-member/wrong-workspace, live share/entry revocation, timed expiry and boundary uploads. 246 Node tests and exact-head browser CI 30 passed/10 skipped. Broader route/role, abuse and monitoring review remains open; do not mark L5 complete. See [release evidence and limits](STORAGE_ACCESS_REVIEW.md#production-release-2-november-2026).

## S4/S5 inspection and B26 candidate, 2 November 2026

Inspected invite POST, thread create/reply, public comments, feedback, bootstrap and existing durable Email login limiter. Invite POST is owner-only and validates membership/plan, but pending-invite duplicates intentionally resend email each time without an app rate gate. Public comments have a honeypot and five/minute/IP in-memory Map; this is instance-local, not durable distributed enforcement. Feedback counts stored submissions with a read-then-insert window and logs count errors before proceeding. These limitations are confirmed in code, not live spam/concurrency diagnoses. Do not send test invites/notifications without explicit recipient authorisation.

Bootstrap requires a current authenticated identity, reuses canonical membership/workspace rules and upserts the profile on each resolution. Avoid blanket GET throttling that could break routine navigation; repeated write/query cost overlaps B17. Concurrent first-account creation was not tested and is not called a confirmed defect.

Platform attribution remains limited: scoped Vercel active-firewall-config read returned 404 (Seawall Config not found); installed CLI has no firewall subcommand. Neither result proves absence of managed platform/provider protections. No firewall, permission, provider setting, auth flow or quota was changed. S4 remains open for endpoint-specific durable controls.

Separately reproduced B26: malformed public-comment fields/JSON can return 500; thread timestamp coercion/negative/overflow values enter database work. Candidate validates body shape/types and finite nonnegative integer-compatible timestamps before comment/resource reads and writes (canonical identity resolution remains required first). Twenty newly added runtime checks fail against old code. With the fix, 281 Node tests, TypeScript and focused lint pass, including valid rounding/replies, auth/workspace boundaries, honeypot and unchanged five/minute throttle. Notification scheduling is stubbed and counted; no real emails/comments/invites sent. Hosted checks pending.

## B26 released and S4 decision pending, 2 November 2026

PR #69 merged as 1ff2727a797bb800c6cd22f037dc0eff58b134b1 and primary Production deployment dpl_9TMhrEvBcWFypnDY7td9ARFSbt9G is Ready/live. 281 Node tests, TypeScript/focused lint and all four PR checks pass; browser CI 41458296211: 30 passed, 10 skipped. Nine safe Preview and Production probes pass: null/array/unreadable/wrong-type public inputs 400; honeypot 200; unavailable track 403; unauthenticated create/reply with malformed bodies 401. Valid comment/reply writes and scheduling exactly once are covered with stubbed notification I/O. No actual comments, invites, messages or email sends; no migration, environment/provider/quota change.

Rollback for this validation-only release can use prior compatible deployment dpl_FUAPhJbf3t3KfkQnsjR2q5ceXsNY (083c1fad) or revert the PR's application changes. Retain private buckets and 50 MB settings; the prior compatible release already supports them. No down migration is needed. B26 is complete in scope, not all S5 or S4.

S4 rates proposed to the user are not active: durable existing public 5/minute/IP, combined private create/reply 30/minute/user, invite messages 30/hour/workspace and 60-second recipient cooldown. No blanket dashboard/bootstrap/sign-in throttle. Implement only after that product decision; retain authenticated access checks and fail safely before comment writes/email sends.


## S4 approved durable API budgets, 2 November 2026

User approved the proposed rates. The candidate replaces the public in-memory Map with a shared rolling window, adds a combined private-create/reply budget and atomically checks workspace/recipient invite budgets before creation/resend. Raw identities are not stored: server-side HMAC uses the existing service-role key with a separate domain, and recipient scope includes workspace. Key rotation resets these counters. Public IP comes only from Vercel's overwritten visitor header; missing/invalid trusted IP fails closed. No login limiter, auth flags, environment settings or read routes change.

New migration is additive and service-role-only, SECURITY INVOKER with an empty search_path; RLS enabled and no client policies/grants. Bounded arrays hold at most thirty timestamps, with indexed bounded SKIP LOCKED expiry cleanup. Row upserts lock the subject until transaction end, so expiry cleanup cannot remove a counter between creation and locking. Recipients are checked under the workspace lock. Denials don't append hits or extend the cooldown; accepted reservations count even if a later write/provider call fails.

Staging migration installed. Rollback-only SQL verifies RLS/grants, public/private/invite caps, sliding expiry, subject/scope isolation, denial accounting and malformed parameter rejection. Ten independent concurrent RPC calls produce five public allows and one same-recipient invite allow; exactly 5/1/1 timestamps remain before synthetic cleanup. 307 Node tests, TypeScript and focused lint pass. Route tests verify 429/503 before writes or notification/provider calls, successful create/reply scheduling and invitation creation/resend through stubbed I/O. Security Advisor has zero errors/warnings; nine RLS-no-policy INFO tables include the new intentionally server-only table. Hosted application checks and Production migration/release are pending.

Coverage limits: existing authenticated member INSERT policies on comments/comment_threads can permit a direct Data API path outside API budgets; reviewed read-only, not changed here. Public comments has no client INSERT policy. Feedback's read-count-then-write and bootstrap first-setup concurrency remain open. This is durable API control, not completion of all S4. No real invitation/notification email sent.

Rollout: install and verify the additive migration before deploying this app. Stop on failed probes, deployment or smoke checks. Rollback app to the previous private-media-compatible release first; leave the unused table/function in place, or run the companion rollback only after app rollback. Retain private buckets/50 MB settings. Removing the function while this app is live causes mutation 503 responses. No user content is modified by the migration.


## S4 API-budget release, 2 November 2026

PR #70/1352dd8ccf319baa036e865f72656d9829162365 released to primary Production dpl_3gZwUK8rRnpYGodCdi9LQuo3nVQZ, Ready and aliased to www.song-room.live. Exact reviewed source: 4665b5bfa388df2b4cd612143d017edc595a3d88, Preview dpl_2iEqHkjchmvUirP6Y3PFKnNVvCi8. All four PR checks pass; browser CI 41464265520: 30 passed/10 skipped. 307 Node tests, TypeScript and focused lint pass.

Preview client bundle confirmed staging project ivifkrtupqizyqqsxdty before any fixture writes. A disposable account-less public song with no audio accepted five synthetic public comments, then returned 429 on the sixth; GET remained 200 with five comments. Song and comments were removed and zero remaining rows verified. No real invite, notification or email was sent. Production hxtsuhmqrufcdplidtov received the additive migration before the app; installed function body equals source in both environments. Rollback-only SQL passes in both; no production user content was written. Both Security Advisors have zero errors/warnings, nine INFO RLS-without-policy notices (new server-only table intentionally has no client policy). Eight no-write Production probes pass: private create/reply/invite signed-out 401, malformed public input 400, honeypot 200, unavailable track 403. Bounded 15-minute error/fatal scans each return zero rows. Hosted authenticated valid writes and provider email delivery were not replayed; those paths use local fake I/O plus installed RPC verification.

Migration ledger mapping: repository source/rollback timestamp 20261102143515; MCP assigned staging 20261102143647 and Production 20261102144516, all named durable_mutation_rate_limits. Record these equivalents before any future bulk migration reconciliation; don't blindly replay the repository candidate as a missing hosted migration. Function body/search_path/SECURITY INVOKER were verified against source, not assumed from ledger names.

Both environments' read-only metadata confirms authenticated INSERT grants plus member INSERT policies on comments/comment_threads; no public-comments INSERT policy. Repo search finds private comment/thread inserts only in the canonical create/reply API routes. Existing direct database access remains an S2/S4 review item; no access policy was silently removed and no exploit against user content was attempted. Feedback concurrency and bootstrap setup remain open. API budgets are complete in this scope; S4/L5 aren't complete.

Rollback: restore previous compatible Production dpl_E93oc59MkUe7z5fhdY4k59MeEE4V/7d5a0494 first. The additive unused limiter can remain; only run companion down migration after old app restoration. Keep private media buckets/50 MB limits. No external action required from the user for this release.


## S4 private comment INSERT boundary candidate, 2 November 2026

Read-only inventories agree: comments/comment_threads have anon and authenticated table INSERT grants, authenticated member INSERT RLS policies and no explicit column ACL entries; no public function matching a direct insert into these tables was found. Repo search finds writes only in the service-role canonical create/reply handlers. Anonymous direct writes are already denied by RLS; members can bypass API limits for their own workspace. Rolled-back baseline fixtures confirm that behaviour in each environment. No abuse against real content is asserted.

Small repair: revoke table INSERT from PUBLIC, anon and authenticated, leaving service_role unchanged. Guard requires existing service-role INSERT and rejects remaining client column/inherited privileges. Preserve all RLS policies, SELECT/UPDATE/DELETE grants, rows, auth and app logic. Companion rollback restores exactly the observed anon/authenticated INSERT table grants; it deliberately reopens the bypass and should only recover a demonstrated regression.

Rollback-only probes create a synthetic workspace/song/version/thread using existing profile-backed identities after checking for unexpected database triggers. No Storage object or application/provider notification path is invoked. Fifteen checks pass in baseline and candidate mode in both databases; staging rollback mode also passes. Candidate checks require denied owner/member direct INSERT, server root/reply creation and joined reads, preserved member reads, outsider/anonymous denial and identical non-INSERT table privileges. 307 Node tests and focused composer lint pass. Staging installation/Production rollout pending. Apply on staging, rerun installed mode and Advisor, then release to Production only after checks pass. No app deployment is needed for the permission change; the repository PR still gets normal CI builds.

Stop on unexpected ACLs, new triggers, SQL/check failures or API regression. Rollback uses supabase/rollback/20261102145804_restrict_private_comment_inserts.sql against the affected environment; application rollback alone cannot restore database permissions. No credentials, env variables, billing or Storage settings change. S4 remains open for feedback/bootstrap and wider review.


## S4 direct-comment boundary installed/released, 2 November 2026

PR #71 merged as 0565f64bb9a177a52fef165f627075ff5767d6ec from reviewed head 8f0e50631df3cea809d7a60c4f88916380b5c470. Both database migrations are installed. Direct client INSERT/column privileges are false and service-role INSERT privileges remain true on both tables. Fifteen installed probe checks pass per environment. Baseline, candidate and rollback modes pass in each environment, proving the prior member path, repaired denials and recoverability. Other table grants and RLS remain unchanged. Explicit fixture queries show zero remaining test workspaces/songs. No audio objects, real notifications, invitations or provider emails were created; all database fixture work rolled back.

All four PR checks pass. Browser CI 41467570926: 30 passed/10 skipped; Node 307 passed; focused composer lint/diff checks pass. No TypeScript/app/UI logic changed, so no new TypeScript check was needed. Primary Preview dpl_Df5Q8LVDJ3gFnExoo2fLBGtRJT5n is Ready at exact head and signed-out private create/reply return 401. Before Production repair, www.song-room.live was confirmed on the primary project, compatible b2e4deee deployment dpl_5LJ3Vig4xMBsL4QokbZKqFTq1KAV. Eight no-write live HTTP probes pass after database repair. Both Advisors have zero errors/warnings and the same nine RLS-no-policy INFO tables. Positive hosted API comment writes were not replayed to avoid real notification emails; installed service-role writes plus existing runtime handler tests cover that path without sending.

MCP ledger equivalents for repository 20261102145804_restrict_private_comment_inserts.sql: staging 20261102150145, Production 20261102150504. Do not blindly replay the repository source as pending during future migration reconciliation. The effective privileges were verified directly. This database-only repair doesn't require app-code deployment; normal Vercel merge deployment dpl_3ouZssw5wcb3ruUE6ZuQ49TNQ9uQ is separately tracked below.

Rollback in the affected database: supabase/rollback/20261102145804_restrict_private_comment_inserts.sql, which restores only observed anon/authenticated INSERT table grants and reopens the bypass. App rollback alone has no effect on these ACLs. No irreversible data change occurred. The direct INSERT gap is closed; feedback count-then-write/failure behaviour and bootstrap concurrency remain separate S4 work.


Merged-source Production checkpoint: dpl_3ouZssw5wcb3ruUE6ZuQ49TNQ9uQ is Ready at exact merge 0565f64b on the primary project and assigned to www.song-room.live. Post-build create/reply signed-out POSTs return 401. Bounded 15-minute error/fatal scans each have zero rows. The compatible app and repaired database are live; no external action remains for this scoped repair. Remaining S4 work starts with feedback's non-atomic count/failure handling.


## S4 feedback atomic candidate, 2 November 2026

Current feedback route counts then inserts and fails open on count query errors. Controlled hosted HTTP race against existing staging Preview: ten submissions all returned 200 and were saved; synthetic rows were removed. An earlier MCP SQL parallel-submission attempt saved only five, so it wasn't used as race reproduction evidence; HTTP requests supplied the decisive baseline. This is controlled test evidence, not a claim of actual spam.

Candidate: BEFORE INSERT trigger with SECURITY INVOKER, volatile function and empty search_path. Acquire ordered transaction advisory locks for user and available IP hash, then count latest five stored rows within an hour and insert in the same transaction. Signed-in submissions also lock the IP because anonymous checks include all feedback from that address, preserving existing semantics. Existing hashes/FEEDBACK_IP_SALT format and rows remain the ledger, so no quota reset or new secret/table. Fifth-newest timestamp gives Retry-After; created_at is stamped after lock acquisition. Feedback updates/triage remain unchanged. Table RLS/no-client-policies unchanged; trigger function EXECUTE is revoked from PUBLIC/anon/authenticated, service_role only. No SECURITY DEFINER or new RPC surface.

API removes separate count, uses the existing trusted Vercel visitor parser and canonical signed-in identity, rejects anonymous missing-IP requests with 503, maps fixed throttle signal to 429/Retry-After, and hides raw database error details. No dashboard, playback, auth flow, email, billing or provider change. Invalid body/type/length and honeypot behaviour remain covered.

Eight SQL cases pass in staging baseline/candidate/rollback, Production candidate and installed staging modes. They check anonymous/user quotas, IP changes/shared history, expiry, constraint failures, read-permission failure and direct client denial. Fixture work rolls back. 326 Node tests, TypeScript and focused lint pass. Staging Advisor zero errors/warnings, same nine INFO notices. Hosted fixed-route concurrency still pending. Install migration before updated app, then verify hosted staging before Production. During migration-first overlap, old app still enforces the database ceiling but may show a generic error on a concurrent rejected insert until the new mapping is deployed.

Rollback: restore prior route first if needed, normally retain trigger; only remove trigger/function using companion rollback if it caused the regression. Removing it while the new count-free route remains active removes quota enforcement. No feedback rows are deleted by migration/rollback. Stop on failed SQL/hosted checks, unexpected trigger/permissions or app errors.

Design references: https://www.postgresql.org/docs/17/explicit-locking.html#ADVISORY-LOCKS and https://www.postgresql.org/docs/17/trigger-definition.html. The trigger uses the API's default Read Committed transactions; same-identity requests share transaction locks, unrelated reads aren't throttled.


## S4 feedback released and verified, 2 November 2026

PR #72 merged as f95817344195b12b920ffb8e01b1a930fc82bd9c from reviewed 9aa23fee4f4270407dbec22656c975497e44cc70. Primary Preview dpl_5XKeFKAW1L8gXDANB7mNJDQJgkYT is Ready at that exact head; its client bundle confirmed staging ref before writes. Concurrent hosted HTTP replay: five 200/ok true, five 429/ok false with Retry-After 3600; installed database has exactly five synthetic rows. This compares with ten 200/saved on the old route. Both batches and SQL race/probe fixtures removed; final checks show zero remaining test feedback in either environment. Earlier serialized MCP SQL submission attempt wasn't counted as concurrency proof. No email, notification or provider path invoked.

Production trigger was installed/verified before app merge/deployment. Eight installed SQL checks pass in each environment. Staging baseline/candidate/rollback and Production candidate/rollback modes also pass. Function body MD5 equals source in both environments; SECURITY INVOKER, empty search_path and VOLATILE confirmed, no client EXECUTE. Existing RLS/no-client-policies and triage/reward settings unchanged. Both Security Advisors have zero errors/warnings and the same nine INFO notices. 326 Node tests, TypeScript/focused lint and all four PR checks pass; browser CI 41482574372: 30 passed/10 skipped. BetaFeedback UI already displays server error text and returns to retry state; inspected without UI changes.

Primary Production dpl_EhdHroGorkNpavmv2Wo83cR8EPtD is Ready at exact merge and aliased to www.song-room.live. Eight no-write feedback HTTP probes pass: malformed/type/length/email-required inputs 400, honeypot 200. No accepted Production feedback HTTP request or signed-in email journey was replayed; installed database tests use rolled-back synthetic feedback. Bounded 15-minute error/fatal scans each return zero rows. No env/provider/billing/Storage change.

Migration ledger equivalents: repository 20261102162535_atomic_feedback_rate_limit.sql, staging 20261102163146, Production 20261102163620. Reconcile these equivalents before future bulk migration work; don't replay the candidate blindly. Rollback: restore prior compatible app dpl_7VGjTfb9sPPYjpPrexXyxFvuSAZV/e90f87e9 first, usually retain trigger. If the trigger is the regression, run the companion rollback after old-route restoration. Never drop it while the new count-free route stays live. No feedback rows are deleted by migration/rollback; existing comment/media safeguards must remain. No external user action remains. Scoped feedback defect closed; S4/L5 remain open for bootstrap/wider review.


## B27 initial workspace repair staged, 2 November 2026

Inspected bootstrapAccountForUser, activeWorkspace and canonical identity. Workspace/membership creation was separate after a potentially stale membership read. Runtime baseline: six concurrent controlled empty snapshots create six workspaces; failed owner insert leaves one orphan. Original source fails two new tests, while default/active membership and profile cases already pass. No existing production duplicates are diagnosed or removed.

PR #73/4be9c48c95f2bb414b4ac3b272a5d59e9f974184 replaces only first-time creation with ensure_initial_workspace_membership(uuid,text). Service-role-only EXECUTE, SECURITY INVOKER, empty search_path, VOLATILE. Per-user transaction advisory lock, membership recheck, member-first/owner-second ordering, account+owner insert in one transaction. No global unique constraint that would block legitimate multiple workspaces. Only was_created caller invokes existing best-effort referral attribution. Invalid/mismatched RPC response is rejected without falling back to separate writes. Profile upsert/Google photo behaviour, active-cookie validation and returning-user read path are unchanged. Repeated profile write cost remains B17; no blanket read throttle.

Staging is installed as ledger 20261102182049, repository candidate timestamp 20261102165139; reconcile equivalents before future bulk migration work. Function body equals source. Fourteen actual SQL cases pass in staging candidate/installed and Production rollback-only candidate modes; staging down-migration mode adds a fifteenth pass. They prove idempotent stale caller reuse, account/owner completeness, member/owner preference, held per-user transaction lock, rollback on owner INSERT permission failure and recovery, no client EXECUTE, invalid/missing-profile guards and invoker/search_path. 340 Node tests, TypeScript/focused lint pass. Local six-caller test executes the real bootstrap with fake atomic DB I/O; SQL validates actual transaction/lock/roles separately. No claim of completed live multi-session browser signup.

Fixture preflight checked for any triggers on auth.users/profiles/accounts/members. Only passwordless, sessionless synthetic Auth/profile rows within rolled-back transactions were used; no Auth API, provider or email call. Zero fixture users/profiles/workspaces remain in either environment. Staging Advisor zero errors/warnings, existing nine INFO notices. Production function remains absent: candidate DDL was rolled back, no Production rollout. Preview dpl_EA6C9QicgB4ibe4sz15t9DFGrR3y is building; fresh signup/confirmation/first dashboard and existing-user smoke acceptance remain before release.

Rollout after acceptance: install/verify identical RPC on Production, then merge/deploy tested app and verify live boundaries. Stop on fixture triggers, permission/schema mismatch, SQL/CI failure or browser onboarding error. Rollback prior compatible app before optional RPC removal; removing it while new first-setup code is live breaks new-account setup. Existing account/member rows aren't deleted by either direction. No new role, billing/plan, Auth method, credential/env or provider setting. S4/L5 remain open.


B27 Ready Preview checkpoint: dpl_EA6C9QicgB4ibe4sz15t9DFGrR3y Ready on primary project at exact 4be9c48c, all four PR checks green. CI 41499853678: 30 passed/10 skipped. Public bundle confirms staging ref. Signed-out GET /api/auth/bootstrap returns 401, bounded error/fatal scans zero rows. Chrome Google re-login of the existing staging account returns the member workspace and five-song library. A transient browser-inspection timeout was resolved using accessibility state; no app defect is asserted from that tool timeout. No song/account/role change or signup feature flag was made. Preview shows Google-only signup. Fresh Google-account onboarding remains the explicit acceptance gap, to be tested in a private window before release; no email-confirmation flow is expected on this Preview. User should report test email/result; Agent then verifies workspace/member records and performs the already-authorised release if acceptance passes. PR #73 remains open; Production RPC absent and application code unchanged.


## B27 accepted and released, 2 November 2026

User reports both staged Google signup and reload/additional-tab tests passed. The sole new staging account in the test window has Free access, one created workspace, one membership and one correct owner link. Private identity isn't recorded here. Prior existing-user Chrome smoke preserved member-workspace selection/five-song library. Controlled six-caller concurrency remains real-bootstrap/fake-DB I/O evidence; actual database locks/atomicity and membership failure rollback are separately covered by installed SQL. No new multi-session Production signup or provider email was attempted.

Production migration installed before app. All 14 installed SQL cases pass, body equals reviewed source, invoker/search_path/client-denial checks pass and no fixture users/workspaces remain. Production Advisor: zero errors/warnings, same nine intentional INFO findings. Repository source timestamp 20261102165139 maps to staging ledger 20261102182049 and Production 20261102203612; reconcile these equivalents before future bulk migration work.

PR #73 merged as ce34686837991accc175c5808d0a39bc1aeb8af9; primary Production dpl_F19sdasWwV17Qt6den32dWjPh1s5 Ready at that merge, assigned to www.song-room.live. 340 Node tests, TypeScript/focused lint and all four PR checks pass; browser CI 41499853678: 30 passed/10 skipped. Live no-write checks: /api/auth/bootstrap and /api/dashboard/summary signed-out 401, /login 200, bootstrap?redirect=1 sends signed-out users to same-origin login with google=error. Bounded 15-minute error/fatal scans return zero rows.

B27 is Production complete in scope, not all S4/L5. Rollback prior compatible deployment dpl_9PWeKjhM3nw9g1kg5z77wwBiRWM5/6269735c first; normally leave additive RPC unused, only remove via companion down migration after app rollback. Existing data isn't deleted or deduplicated. Media/50 MB and other comment/feedback controls remain. No new billing, Auth method, env/provider/credential configuration. No external action remains for this repair.


## B28 public Data API projection boundary, 2 November 2026

Both environments' anonymous table grants and RLS allow raw reads of all versions of a publicly shared song. Synthetic rolled-back fixtures confirm old/pending versions, internal notes/filenames and ownership metadata are visible. Private songs remain hidden; no real private content was inspected. Public comments already deny raw anonymous reads.

The canonical public song/playlist routes already use service-role projections with latest-finalized and field filtering. Candidate revokes only anonymous/PUBLIC SELECT on songs and song_versions, preserving authenticated/service access and existing policies. Local tests: 342 pass; both environments: baseline 16, candidate 14, rollback 16 pass. Hosted baseline verifies song/playlist/comments JSON, public pages/embeds, audio redirect with one-byte Range and artwork. Staging installation pending. Rollback file restores just the two previous anonymous grants, reopening the confirmed exposure; app rollback is insufficient. L5 remains open.

B28 staging checkpoint, 2 November: migration installed as ledger 20261102222009 (source 20261102220823). All 14 installed SQL cases pass, zero fixtures remain. Actual anonymous REST reads now return 401/42501 for both tables; existing comments denial is unchanged. Public API payloads match baseline, public pages/embeds return 200, audio redirect 307/Range 206 and artwork 200. Advisor has zero errors/warnings. Production remains unchanged pending CI/release.


B28 Production database release, 2 November: PR #74/6288e354 merged, 342 Node tests/focused lint/four PR checks and browser 30 passed/10 skipped. Reviewed migration source 20261102220823 installed as staging 20261102222009 and Production 20261102222433. Installed 14-case probes pass in both environments, alongside baseline16/candidate14/rollback16. Anonymous raw REST denied; public song/playlist/comments payloads match baseline; pages/embeds/audio Range/artwork pass; authenticated history preserved; zero retained fixture workspaces. Advisors zero errors/warnings; bounded Production error/fatal scan empty. Primary merged-source deployment dpl_Dh7UyB4o7sokRPmdcK22mfH8B1aB is Ready/live; no app logic/env/provider change. Companion SQL rollback restores only old anon SELECT and reopens exposure. Broader L5 remains open.


## B29 settings/referral/billing access and error review, 2 November 2026

Sampled canonical settings/referral/Stripe entry handlers. Eight actual-handler paths reproduce verbatim internal Error.message in settings/billing 500 responses. Local candidate reuses existing generic fallback text, retaining diagnostic logs and all success/4xx/business logic. New runtime cases cover signed-out rejection before I/O, non-owner billing denial, foreign/unpaid Stripe session rejection without writes, canonical customer/account selection, user-scoped settings/referrals, masked email projection and owner-only invite listing. All provider and notification I/O is fake. 377 tests/TypeScript pass, lint zero errors/one existing warning. No actual leaked secret or hosted payment claimed; Preview and release pending. Broader route/role and server log safety remain open.


B29 release, 2 November: PR #75/25b96370 primary dpl_7LpTJNzBYxxj6VgfDb9tYMeesAsy Ready/live. 377 Node tests/TypeScript/focused lint (one existing warning), four PR checks and browser 30 passed/10 skipped. Twelve hosted signed-out checks pass on exact-head Preview and released Production; provider/success tests use fake I/O. No live plan/payment/settings mutations. Error/fatal release scan empty. No external action remains; app rollback can restore previous 6288e354 deployment, retaining B28 database boundary. Broader L5 remains open.


S6/S7 read-only checkpoint, 2 November: metadata confirms B30's three existing Config credentials; approval pending, no values decrypted or scope/provider changes. Connector metadata 403 is a connector-permission limit; authorised CLI returns metadata, so no permission broadening required. Scoped current-tree/client-import/public-chunk scans report no credential pattern or client-to-private-env path. No full Git-history scan claimed. 118 API/helper logging calls are inventoried; auth-entry code uses codes/safe fixed messages, but unstructured provider/database exception logging needs review. Production-only dependency audit remains four low, zero moderate/high/critical; no package upgrade attempted. Vercel prebuild already runs npm test, and browser CI is active; an explicit dependency-audit gate and alert/retention verification remain open.


S7 CI candidate, 2 November: add production-only dependency audit to the existing pull-request/manual browser workflow after npm ci. Fail at moderate or above (and on registry/audit failure), retaining visibility of current four low advisories. Exact command passes locally. No schedule, automatic package updates or force-upgrade. Hosted audit step pending; provider alert and retention configuration still unverified.


L5 checkpoint, 2 November: both environments pass the full 63-method/48-session-route signed-out sweep (401, dev-plan403); this adds hosted unauthenticated coverage without claiming signed-in role verification. Current staging browser is suspended at an extension URL, and policy rejected observation. User asked to restore the normal staging dashboard; no bypass attempted. B30 classification approval remains pending. PR #76/9ee73d83 installs the explicit production-dependency audit gate; exact command and all CI checks pass with four low/zero moderate-or-higher; browser30/skip10. Primary deployment dpl_8SrzygQCYuX6o1wcWo33hC6xSHjJ Ready/live; post-build smoke passes. No schedule, package/provider or credential change. Broader signed-in roles, diagnostic logging and alert/retention coverage remain open; L5 is not Done.


3 November scoped continuation: B30 user-approved type-only changes complete with unchanged scopes and verified Production/Preview rebuild/public/media/signed-out checks. Restored staging browser passes owner settings/collaborators/Free-plan reads, member settings/billing gating and own synthetic song read; unrelated private song denied without title. Temporary staging-only workspace/song/version/member fixtures fully cleaned; original owner membership remains. No Auth user or storage object, email, payment or real-user content mutation. Version missing-audio state was expected for the synthetic no-object fixture. Final original-workspace browser view unverified because the extension suspended the tab and policy blocked its extension URL; no workaround. Scoped UI coverage doesn't complete every route/method/role write or provider journey. See current launch checkpoint for deployment IDs and limits.


## B31 diagnostic redaction candidate, 3 November 2026

Three regressions reproduce 85 raw exception/message logger arguments across 59 server files plus legacy/modern CSP retention of synthetic capability paths, malformed/relative URL secrets and arbitrary directive text. Candidate uses a pure safeErrorDetails projection: fixed kind, explicitly known code and integer HTTP status only. Never serializes messages/stacks/causes/headers/bodies or calls getters/toJSON; proxy failures fall back safely. Existing log labels and all business/client-response logic remain unchanged. CSP keeps origins, known protocol labels/directives, numeric fields and existing input/batch limits.

387 Node tests/TypeScript pass, focused lint zero errors/five pre-existing warnings. Bootstrap test loader now resolves the real pure diagnostic helper; CSP source contract updated to origin-only, with actual-handler tests covering old/new reporting formats, capabilities, invalid input and report limits. No actual credentials, provider sends, migration/env or dependency changes. CI/Preview/Production pending. S5's remaining raw response-error paths and broader S7 monitoring/retention are separate open checks; no claim about historical logs or a real compromise.


3 November release checkpoint: B31/PR #77/6ba2c817 primary dpl_C1VQK62tyWRy8ZDiZhTjCf7uyZrx Ready/live. 387 Node tests, TypeScript/lint zero errors/five pre-existing warnings, four PR checks and browser30/skip10 pass. Exact-head Preview and Production public/media projections and twelve signed-out checks pass. Benign CSP204 controls found in actual unfiltered request logs with origins only; warning-only filters missed level-warn records. Production27 retrieved records/zero error-fatal; no real secrets/emails or historical log changes. B30 Secret scopes reread intact; original owner/empty staging dashboard visibly restored and fixtures absent. User accepts Hobby one-hour logs and release-time checks for beta, no paid/recurring setup; revisit at L8. S6 and beta S7 exit conditions met, remaining S2-S5 stay open. Rollback prior ffef2c7b app, retaining B28/B30 boundaries.


## B32 core account write boundary, 3 November 2026

Both environments grant accounts I/U/D to anon/authenticated. Creator INSERT and owner UPDATE/DELETE row policies allow client-controlled plan/Stripe columns: synthetic actual-role proof succeeds for plan/Stripe rewrite, Studio insertion and account deletion, always rolled back. No real plan, subscription or external Stripe access tested. No browser account mutation path exists in current source; canonical service routes cover settings, provisioning, upload accounting and billing/webhooks.

Candidate removes only those client account mutation grants, preserving existing policies/reads and service-role I/U/D. Full SQL baseline16/candidate19/rollback16 pass both DBs; service writes/default Free and owner/member/outsider/anonymous boundaries preserved. 390 Node tests pass, with owner-only field-whitelisted settings and existing fake-provider billing coverage; lint passes. Staging installation/actual owner fixture save and Production pending. No data cleanup/plan reset; restore matching SQL grants only for verified regression. This is a confirmed S2/S3 defect, not a new billing feature or exploitation claim.


B32 staging checkpoint, 3 November: migration source20261103090300 installed as20261103091520;19 installed role checks pass, other grants/policies/read access preserved. Client REST zero-ID read200/empty and PATCH401/42501. Source f619e508 PR #78/four green checks, browser30/skip10, local390 tests/lint pass. One isolated Free owner fixture retained for actual name Save acceptance; no songs or Stripe fields. User has exact checklist steps; extension-suspended URL blocked browser action, no bypass/session extraction. Production permission migration and fixture cleanup pending acceptance. Existing real users/plans unchanged.


B32 Production release, 3 November: user owner-name save accepted; stored fixture name/Free/null Stripe verified, fixture/member cleanup complete. Source20261103090300 installed as staging20261103091520/Production20261103094603;19 installed role cases in both DBs pass, with prior baseline16/candidate19/rollback16. Raw client account PATCH401/42501, zero-ID read200/empty. App signed-out/public/media and post-build login/bootstrap/song checks pass; Advisor zero errors/warnings, nine existing INFO. PR #78/b77a7b66 merged126825bf, primary dpl_BfL9iReAvUBWFemGQaXa9aFvT23W Ready/live;390 Node tests/lint/four exact-head checks pass. No account/plan/provider changes or outstanding user actions. SQL rollback restores old client account mutations and reopens the gap; app rollback alone doesn't undo it. Remaining S2-S5 review stays open.


## B33. Safe unexpected-error responses

- Status: Production complete via PR #79/98f4132f, 3 November; local, CI and hosted checks pass. Existing L5/S5 review.
- Confirmed behaviour: Thirty-two handler catch paths echo raw exceptions and one invite-provider warning echoes provider rejection text. Synthetic private sentinel failures reproduce these paths; no real credential exposure or compromise is claimed.
- Intended outcome: Unexpected failures return existing fixed, useful fallback messages. Keep diagnostic codes/status through B31 safeErrorDetails without returning provider internals.
- Acceptance: Error objects, plain provider objects and thrown strings never reach client messages. Preserve existing HTTP statuses, public invite state=invalid shape, authentication/validation, success paths and data writes. Rejected email retains the created invite, emailSent=false and manual-copy guidance; no duplicate send. Tests use fake providers only. Require CI/Preview and Production smoke checks before completion.
- Dependencies: Application-only change across 26 route files and regression tests; no migration, environment, provider, plan, auth or dependency changes. Private Stripe webhook ledger diagnostics are outside client-response scope and remain unchanged. App rollback can restore prior source; retain existing database permission repairs and Secret classifications.
- Decisions needed: None for scoped fallback messages. Broader validation and cross-workspace review remain open; this item does not finish L5.
- Evidence: 425 Node tests, TypeScript and focused lint pass (zero errors/four existing warnings); original synthetic response/warning regressions reproduced before repair. No hosted deliberately secret-bearing requests or real notifications.


B33 Production complete, 3 November: PR #79/d6ad7f1c merged98f4132f, primary dpl_F65yxwCvh5dPtLMFE6rc8Q7Lf8LG Ready/live www alias. 425 Node tests/TypeScript and focused lint zero errors/four existing warnings; four CI checks/browser30/skip10 pass. Preview and Production63 signed-out methods each pass; public JSON unchanged, pages/artwork/audio redirect and range checks pass. Bounded Production scan50 records/zero error-fatal. No real email, migration/configuration/dependency or billing change. Fake-provider leak regressions tested locally, not injected into hosted providers. App rollback to prior ed5329c2 retains existing account permissions and Secret types. Remaining validation/function/membership review stays open; no user action.


## Membership mutation review: B34 candidate, 3 November 2026

Read-only function inventory finds all public mutation RPCs deny anon/authenticated EXECUTE. Public lookup helpers remain invoker functions with fixed paths; private membership/role helpers use current auth.uid(), an empty search_path and bounded definer lookups. This is metadata evidence, not full body/route closeout.

Membership policies are identical in both environments. Direct owner/admin membership INSERT accepts role=owner, and DELETE accepts the existing owner row. Rolled-back baseline21 reproduces both without touching real memberships. This bypasses owner-only invitation/removal, collaborator quotas and self/owner-removal guards. No browser account_members writer exists in current TS/TSX source; canonical writes use supabaseServer or service-only RPCs.

Prepared migration/rollback, guarded composer and synthetic SQL probe. Candidate23 blocks client owner/admin/member/outsider INSERT/UPDATE/DELETE; preserves scoped membership reads, unrelated table grants, membership RLS and service INSERT/UPDATE/DELETE plus service-only provisioning/invite EXECUTE. Baseline21/candidate23/rollback21 pass on staging ivifkrtupqizyqqsxdty and Production hxtsuhmqrufcdplidtov. Every run ends ROLLBACK. Readback confirms zero matching fixture accounts and unchanged original grants. No Auth user, provider email, payment, Storage operation or persistent DB change.

Permanent staging installation needs approval under AGENTS.md security-boundary rules. Then run installed mode and real isolated canonical journeys before Production installation. Rollback companion restores observed grants, reopening the defect; app rollback alone is insufficient. Further function bodies, hosted signed-in route roles, S4 and S5 remain open. See B34 backlog for execution order.


### B34 approved installation checkpoint, 3 November 2026

User approved B34. Migration source20261103154727 installed on staging ledger20261103161024, Production20261103161305. Installed23, bootstrap14 and canonical-invite4 checks pass in each environment. Added supabase/tests/membership_server_journey_probe.sql for actual invite acceptance/replay/mismatch and server removal regression checks. All synthetic transaction rows roll back. Existing signed-in staging settings/member reads pass; disposable fixture member removed through owner UI, owner retained; original workspace restored and guarded fixture cleanup confirmed. Zero fixture accounts/invites remain. No provider email, payment, Storage or real membership mutation. Seven Production login/signed-out HTTP checks pass. PR #80/cbe475aa had four green checks, 433 local tests and focused lint pass. App source unchanged; no deploy needed to enforce grants. Repository closeout pending.

Production owner writes and new provider-delivered invitation journeys weren't exercised. Companion rollback restores observed client grants, reopening the gap; application rollback cannot restore grants. Broader S2/S3 and L5 remain In progress.


## B35 function-body review candidate, 3 November 2026

Reviewed upload-allocation/finalization, song-deletion/storage-accounting and Stripe-ledger function source plus live function inventory. Mutation RPC EXECUTE remains denied to anonymous/authenticated roles. Staging public-schema CREATE denied to anon/authenticated/service_role; no permission change proposed for fixed public search paths. These observations aren't whole-route or concurrency signoff.

Found accepted-invitation rejoin defect: original accepted_by_user_id branch inserts membership after an owner has removed it. Accepted state precedes pending expiry, so expired accepted tokens also restore it. Canonical signed-in acceptance route forwards authenticated id/email to this RPC and treats already_accepted as success.

Installed definition hash matches in staging/Production. Rollback-only baseline11 confirms removed membership restoration, candidate11 blocks restoration, rollback11 reproduces original behaviour in both environments. Candidate retains current-member idempotence and fresh owner-issued re-invitation; preserves RPC mode, owner, search_path and grants. Four real-handler/fake-I/O tests preserve canonical user/email and forbid workspace read/cookie writes on already_used/expired denial. All437 local Node tests/focused lint pass. Zero synthetic accounts/invites and unchanged original function hashes read back. No actual email, Storage, billing or permanent DB changes.

B35 permanent installation awaits security-boundary approval. Exact rollout, verification limits and rollback are recorded in PRODUCT_BACKLOG.md. Broader S2/S3 function and signed-in route coverage remain open.


### B35 approved Production installation, 3 November 2026

User approved B35. Reviewed0828e58b/PR #81 passed four checks. Source migration20261103162107 installed as staging20261103170224 and Production20261103170410; both function hashes460ec500c96eded2a8d09f69bf3e77e5 match. Installed11 replay, membership23 and bootstrap14 cases pass in each environment. Existing437 local tests/focused lint pass; no application source change.

Actual staging accept/remove/stale-accept flow passed: first invitation accepted, one disposable member created; guarded SQL removed only that synthetic membership; second pending browser copy's POST returned existing already-accepted error and did not restore membership. Only owner remained. Refresh restored original COris owner dashboard. Guarded cleanup deleted the one fixture invite, owner link and account; zero matching accounts remain. No provider emails, payments, Storage, new Auth users or real membership changes. Five Production login/signed-out HTTP checks pass. Both security advisors zero ERROR/WARN with nine existing INFO notices. Production signed-in positive journey wasn't repeated.

B35 Production complete in this scope. No app deployment needed for database enforcement. Rollback matching SQL restores original function and reopens the gap; app rollback alone can't undo function changes. Broader L5/S2/S3 remain open.


## B36 upload and song-deletion boundary review, 3 November 2026

Reviewed allocation/finalization/deletion RPCs and canonical routes. Routes enforce active-workspace match before Storage or mutations; song DELETE is owner-only; version PATCH whitelists label/notes. Actual DB RPCs reject cross-workspace song/version IDs. Media delivery already refuses paths outside the parent song prefix; no foreign audio leak is claimed.

Found direct-table bypass: synthetic role probes allow client song/version INSERT/UPDATE and owner/admin DELETE, bypassing API fields, finalization and byte accounting. Members can insert metadata as finalized and alter file size/finalized status. Direct deletions leave storage_bytes_used unchanged. Admin deletion contradicts the owner-only server route. Both environments have matching policy fingerprint ca4532c9ffc86d8818b45227bb44ce5b and observed client I/U/D grants. No active client song/version mutation writer found in source; canonical server writes exist.

B36 candidate denies only client I/U/D on both tables, preserving reads, RLS, server and unrelated grants. Baseline40/candidate40/rollback40 pass both databases. Service RPC checks include foreign-workspace refusal, pending allocation, exactly-once finalization and release-on-delete. Fourteen real-handler fake-I/O cases cover workspace/owner boundaries and metadata whitelist. All 451 local tests/focused lint pass. Zero fixtures and unchanged original policy/grant readback verified. No actual Storage file, email, payment, Auth identity or real song/version mutation. Permanent permission change awaits approval; installed/hosted acceptance remains pending. Broader S2/S3 remain open.


### B36 approved Production installation, 3 November 2026

User approved B36. Source migration20261103171426 installed as staging20261103191138 and Production20261103191415. Installed40 pass each environment; reads, policies and server writes preserved; client mutation denied. Security advisors zero ERROR/WARN, nine existing INFO. Reviewed6d94da6c/PR #82 passed four checks; existing451 local tests/focused lint pass.

Actual staging owner app acceptance passed: generated 2-second WAV creates disposable song, finalizes88244 bytes, with version size=Storage object size=account counter. Song rename and version-label edit read back correctly. Playback reached2 seconds/error null and ended paused. Owner app deletion removed song/version/Storage object and restored counter0; original empty workspace visible. No real content, membership, Auth user, email or payment mutation. Eleven safe Production login/signed-out/public checks pass, including song/listen/artwork200 and one-byte audio Range206. An initial missing-title probe correctly returned400; corrected valid-shaped unauthenticated request returned401. No fresh Production positive write or physical-device acceptance claimed.

B36 Production complete in this scope; no app implementation/deployment needed for grant enforcement. Matching SQL rollback restores observed grants and reopens bypass; application rollback alone can't restore permissions. Broader L5/S2/S3 remain open.


## B37 collaboration direct-write candidate, 3 November 2026

Reviewed action source/comment/assignee/resolution checks, task parent/field whitelists and playlist-song same-account route checks. Canonical writes already use supabaseServer; no browser mutation writer found. Public-comment mutation is already blocked by RLS; no grant change proposed there or for playlist headers.

Synthetic owner/admin/member raw writes reproduce action foreign linkage, task-account mismatch, playlist foreign-song linkage and private comment/thread attribution spoofing. RLS scopes to one parent/account, not the full related chain. This doesn't prove foreign media exposure: public/media routes retain separate relationship checks. Candidate denies client I/U/D on the five affected tables and keeps all existing server CRUD, reads, RLS and unrelated privileges. Rollback preserves B26's already-denied client INSERT on private comments/threads.

Baseline81/candidate81/rollback81 pass both DBs. Actual server I/U/D included; sixteen real-handler/fake-I/O cases cover canonical source/assignment/creator/task/playlist restrictions. All 467 local tests/focused lint pass. Read-only six relationship mismatch counts all zero in both DBs (nonnull account contexts only); no data correction done. Zero probe accounts; original DML mask/policy hash15131089686223ffc3c9abdabc1f932d match afterward. No installed permission, real row, Auth, Storage, provider email or payment change. Permanent installation awaits approval. Broader S2/S3 and S5 remain open.


### B37 approved Production installation, 3 November 2026

User approved B37. Source20261103194256 installed staging20261103211609/Production20261103212159. Installed81 pass both DBs, preserving reads, server CRUD, RLS and B26 client comment INSERT denial. Security advisors zero ERROR/WARN, nine existing INFO. Candidatecb879571/PR #83 had four green checks; existing467 local tests/focused lint pass; no app implementation change.

Actual staging owner flow passes: comment/reply, source-linked action create/resolve, task create/complete, playlist create/name and two-song add/reorder/remove. Stored creator/source/resolved version/status/order read back correctly. Workspace had only the actor; deployed env snapshot has no forced notification-recipient override. No provider delivery tested. Vercel connector environment read403 recovered via authorized read-only CLI; no config/security changes. Fixtures used no audio objects; missing-audio state was expected.

Guarded cleanup removed fixture playlist and two songs plus dependent version/thread/comments/action/task. All fixture counts zero, original storage0; original empty COris owner dashboard restored visibly. No real content/membership/Auth/payment/credential mutation. Production16 safe signed-out/public checks pass. No Production positive write or email journey claimed. B37 Production complete in scope; SQL rollback restores original grants and reopens context/attribution gaps while preserving earlier comment INSERT restrictions. App rollback cannot undo SQL. L5/S2/S3 remain In progress.


## Remaining account/profile and B38 legacy billing review, 3 November 2026

Live inventory both DBs:25 public tables/all RLS, zero public views/materialized views, no untrusted public CREATE and no client-callable public SECURITY DEFINER function. Legacy unrestricted settings policy is absent. Profile/preferences own-row read/update and foreign-row denial pass for owner/admin/member/outsider; workspace legacy-theme RLS and anonymous denials pass. This tests table policies, not every service fallback: legacy theme migration remains display-name based and returns only colours; it wasn't changed under B38.

Canonical current-user code uses verified Auth getUser id/email. Editable user_metadata supplies display name/avatar only; app admin gates consume Auth email. Four real-helper/fake-I/O tests cover metadata claim spoofing, verification failure, no verified user and refresh-cookie write restrictions. Existing server-handler billing/settings/referral scope tests remain relevant; no new provider acceptance claimed.

Confirmed owner/admin client forgery of legacy billing_subscriptions and billing_checkout_sessions facts. Both empty in staging/Production; no current runtime reference found. Primary accounts/Stripe entitlement remains unchanged in probes, so no paid-access bypass asserted. Candidate denies only client I/U/D on these two legacy tables. Baseline84/candidate84/rollback84 pass each DB; preserves RLS/reads, actual service CRUD and other grants. All471 local tests/focused lint pass. Original DML and policy hash176478a7cf0aa72c404c785fe254dda9 match; zero synthetic users/profiles/accounts/legacy billing rows remain. No real user, plan, payment, external Auth/Stripe/email/Storage operation. Installation awaits approval.

S2/S3 remain open for final route/role evidence reconciliation and remaining privileged-function body closeout; public auth/provider journeys and payment acceptance retain their existing L6 boundaries. This hardening doesn't silently expand launch requirements.


4 November 2026 installed checkpoint: user approved B38. Staging ledger20261104070929 and Production ledger20261104071135 installed; installed84 pass each. Staging signed-in Workspace/Free plan reads pass. Production login200; auth bootstrap/settings summary GET401 and billing checkout/portal/activate POST401. Unsupported workspace/plan GET405 excluded from auth evidence. Zero synthetic identities/accounts and zero legacy billing rows remain. Security advisors zero ERROR/WARN, nine existing INFO each. No provider/payment acceptance claimed; DB enforcement complete, PR84 records source/evidence.


## Function body closeout, 4 November 2026

Read-only live review at release4940085c: all17 public functions and both song_room_private functions have matching definitions, owners and effective client/service EXECUTE grants in staging and Production. Checked-in `supabase/tests/function_security_inventory.sql` pins the reviewed19 signatures, full-definition hashes, postgres ownership and effective role grants. Missing/extra/changed functions fail. The query invokes no function and writes no data; all19 checks pass in each environment. Hashes are drift evidence for this review, not a general proof of function safety.

| Functions | Reviewed authority and body |
| --- | --- |
| create_song_version_upload, finalize_song_version_upload, delete_song_and_release_storage | Service-only definer RPCs; explicit song/account joins and row locks. Allocation is pending, finalization is idempotent and locks account usage, deletion releases finalized bytes. These RPCs trust server arguments rather than independently authenticate an end user. Routes verify canonical workspace; delete also requires owner. Finalize derives size/type/signature from Storage and plan limit from account. Existing B36 installed40 and hosted upload/delete evidence cover the state transitions. |
| claim_stripe_webhook_event, complete_stripe_webhook_event, fail_stripe_webhook_event | Service-only definer RPCs, restricted to event ledger. Claim uses unique event ID and conditional retry for failed/stale processing; completion/failure require processing status. Failure text capped1000. Webhook verifies Stripe signature before claim. No dynamic SQL, HTTP or provider call in these bodies. This is not payment acceptance or exactly-once provider side-effect proof. |
| song_room_private.is_workspace_member, song_room_private.has_workspace_role | Authenticated-only definer boolean lookups; no supplied user ID, auth.uid() nonnull/current-user predicate, qualified membership relation, empty path, stable. No writes/dynamic SQL. Private schema denies anon USAGE and all three runtime roles CREATE; prior B21 exposed-schema and role evidence remains applicable. |
| accept_workspace_invite_atomically | Service-only invoker; locked token, normalized email, status/expiry checks, member role on insert. Accepted retry cannot restore removed membership (B35). |
| ensure_initial_workspace_membership | Service-only invoker; validates profile, serializes per user, rechecks existing membership before atomic owner creation. B27 installed/bootstrap evidence remains applicable. |
| consume_email_login_attempt, consume_mutation_attempt, enforce_beta_feedback_rate_limit | Service-only invoker functions/trigger. Validated scopes/hashes, bounded cleanup or feedback count, atomic limiter rows/ordered locks, denial preserves budget. Existing B26/B27 and feedback installed/concurrency evidence applies. |
| is_account_member, has_account_role | Client-callable invoker lookups, auth.uid() predicate, empty path; underlying RLS applies. They cannot accept another user ID or elevate writes. |
| generate_referral_code | Client-callable invoker, at most10 random-code collision attempts against RLS-protected referral_codes; no insert or grant. It grants no reward or entitlement. |
| account_invites_sync_derived_fields, profile_settings_touch_updated_at, set_updated_at | Trigger-only invoker bodies set normalized email/timestamps on NEW and return NEW; no arbitrary relation access. Public EXECUTE on the timestamp functions does not turn trigger-return functions into normal callable row mutation RPCs. |

Six public definer RPCs retain fixed search_path=public with qualified application relations. Both DBs deny public-schema CREATE to anon/authenticated/service_role. No empty-path conversion is required by this review; migration-only owners remain trusted. All other reviewed functions use an empty path. PostgreSQL/platform schemas, including PgBouncer's platform-owned authentication function, are outside application-function scope and weren't invoked or modified.

Function-body review is complete in this recorded scope with no new defect confirmed. S3 remains In progress for final policy/table coverage reconciliation; S2 hosted method/role matrix, S4 mutation coverage and S5 validation remain open. No database, runtime, provider, credentials or membership changes were made. Rollback is a source/document revert only.


## B39 remaining table/policy coverage, 4 November 2026

All25 public tables have RLS; policies and effective client/service CRUD grants match across staging/Production. Nine server-only no-policy tables rely on RLS denial (broad grants alone do not authorize rows). Previously repaired account/member/song/version/collaboration/legacy billing paths retain their boundaries. Profiles/preferences are own-user scoped; legacy colours are workspace scoped with the previously recorded service fallback limitation. Playlist headers retain client writes.

Confirmed synthetic B39: dual-workspace member changes playlist.account_id from A to B while its playlist_songs entry still links A's private song. B-only user sees that source song ID through playlist-song RLS while direct source-song SELECT is empty. Inspected private playlist GET first resolves header ownership then service-fetches linked song metadata without account filter, so the transferred header can expose title/status across the workspace boundary. Public playlist projection and media have separate predicates; no media-access claim. Existing mismatch count0 in both environments.

Candidate denies only raw client playlist I/U/D, preserving canonical server operations and reads. No current client-side mutation writer found. Baseline26/candidate25/rollback26 each pass both DBs; service CRUD/role reads/policies/other grants preserved. Zero fixture rows and unchanged original grants/policy hash67e1c849af01f1063b56ac6d8a295570 verified. All471 Node tests, composer lint and whitespace pass. No permanent installation or real-content/provider operation. S3 coverage closure waits for this approved repair and remaining evidence reconciliation; S2 hosted role/method and S4/S5 remain open. See B39 backlog for staged acceptance/rollback.


## S3 table/policy exit and B39 installed,4 November2026

B39 approved and installed staging20261104085737/Production20261104090003; installed25 pass each. Actual staged owner playlist creation derives correct creator/account, rename and public/draft saves persist, two-song add/reorder/remove persist. Cleanup removes playlist/links/two synthetic songs, storage0 and original empty UI verified. No delete control exists in playlist UI; SQL service DELETE is covered, hosted DELETE acceptance not claimed. Production login200, unauthenticated playlist GET/PATCH/DELETE401, existing public playlist projection200. No real Production content/provider mutation. Matching SQL restores old grants and reopens the bypass.

All25 public tables map to these reviewed boundaries:

| Tables | Effective boundary / evidence |
| --- | --- |
| account_invites, beta_feedback, billing_webhook_events, email_auth_flows, email_login_rate_limits, mutation_rate_limits, referral_codes, referrals, stripe_webhook_events | Nine server-only tables: RLS/no client policy; some retain table grants, which do not bypass RLS. Restricted RPCs/canonical service handlers provide intended operations. No untrusted public definer function can expose these rows. |
| accounts, account_members | Workspace member reads; client writes denied B32/B34. Canonical owner/invite/bootstrap controls covered by installed19/23, B35 replay11 and bootstrap14 evidence. |
| songs, song_versions | Member reads; anonymous raw reads and client writes denied B28/B36. Public projection/media routes retain explicit scope. Installed40 and real upload/finalize/accounting/delete acceptance. |
| actions, song_tasks, comments, comment_threads, playlist_songs | Parent/workspace reads; client mutation denied B37, preserving earlier private-comment INSERT denial. Installed81 and staged collaboration acceptance. |
| playlists | Workspace member reads; client writes now denied B39. Installed25 and actual staged playlist flow recorded above. |
| billing_subscriptions, billing_checkout_sessions | Workspace member reads; client writes denied B38. Empty legacy tables, no active entitlement reader; installed84 and settings/plan reads. |
| profiles, profile_settings | Own-user SELECT/INSERT/UPDATE, no client DELETE policy. B38 four-role own/foreign read/update probes; profile metadata isn't canonical Auth/admin identity. |
| settings | Workspace membership SELECT/UPDATE and membership/own-user INSERT; no DELETE policy. Colour-only legacy settings; B38 scoped probes. Display-name-based server migration fallback remains an explicit limited legacy behaviour, not proof of arbitrary cross-workspace service reads. |
| public_comments | Direct client SELECT/I/U/D absent; canonical shared-song projection/submission path only, B28/B26. |

Post-repair checked-in table_security_inventory.sql pins25 tables' RLS/force state, full policy expressions/roles/permissiveness, table ACL and column ACL plus four schema/view/role checks. All29 pass both DBs. No public views/materialized views, untrusted schema CREATE or client superuser/BYPASSRLS role. Function19 body/grant checks previously match. Security advisors zero ERROR/WARN, nine expected no-policy INFO. Hash checks detect reviewed-state drift, not a substitute for behavioural tests.

S3 Done in recorded database review scope. S2 hosted API role/method verification, S4 abuse coverage and S5 validation remain open. Future findings can reopen S3. No new provider/payment acceptance, platform-internal audit or universal concurrency guarantee is claimed.


## S4 provider attribution and mutation coverage,4 November2026

Read-only Supabase dashboards in both environments show Turnstile CAPTCHA enabled and leaked-password protection enabled. Current displayed limits: signup/sign-in30 per5min/IP, verification30 per5min/IP, refresh150 per5min/IP, per-user custom SMTP interval60seconds; IP forwarding off. Email/hour field redacted by browser tooling, so its current numeric value isn't asserted (September staging record was30/hour). No secret was revealed, setting saved, email sent or quota intentionally exhausted. Dashboard evidence is configuration, not a load/captcha/provider-delivery test. Existing login app limiter remains15/5min/trusted Vercel IP and fails closed.

| Mutation family | Existing effective control / remaining limit |
| --- | --- |
| Public/private comments, invitation creation/resend | Approved shared DB budgets5/min/IP public,30/min/user private,30/hour/workspace and60sec/recipient invitations; failure closes before write/send. B26/B34/B37 remove raw write bypass; existing SQL/hosted/fake-I/O evidence applies. |
| Feedback | DB trigger atomic5/hour with ordered user/IP locks, honeypot and trusted visitor hash; prior hosted concurrency and installed proof. |
| Signup/recover/resend/reset and password login | Same-origin,16KiB typed input, Turnstile/provider controls; login adds app-level per-IP budget. Resend also needs matching sealed signup intent. Provider requests use public key from server; effective end-user provider IP attribution isn't proven. Signup/recovery create temporary auth-flow rows before provider rejection, so provider CAPTCHA alone is not proof of an app flow-creation quota. No new quota/forwarding policy silently installed. |
| Signed internal notifications and Stripe webhook | Body ceiling/HMAC and Stripe signature respectively; unsigned requests denied before external action. Source comment budget gates scheduler. No email/payment acceptance claimed. |
| Song/version/image uploads | Canonical workspace/role checks, signed paths, byte/type/signature ceilings and plan/storage limits. No blanket new request-rate gate. |
| Actions/tasks/playlists/profile/workspace mutations and billing | Canonical identity/resource/role/field gates; server-owned tables where recorded. No claim every authenticated operation has a request quota. B40 closes malformed action/task input, not request-rate policy. |
| CSP reports and plan telemetry | CSP16KiB/10-report/type/safe projection ceiling; plan event enum whitelist and log-only action. No app-level durable rate budget on either public logging route. Managed platform firewall configuration couldn't previously be established; don't infer its absence or coverage. |

S4 stays open for the bounded auth flow/proxy acceptance and decision on remaining telemetry/privileged mutation budgets. No blanket dashboard/bootstrap/login throttle or provider configuration change authorized by this inventory.

## B40 collaboration validation,4 November2026

35 actual-handler/fake-I/O regression failures on old code;44 new cases/all515 local tests now pass, TypeScript/focused lint/whitespace clean. Five action/task handlers use authenticated16KiB JSON-object input and typed fields before database work; timestamp bounds match existing comments. Task reorder checks returned database errors rather than claiming success. Canonical workspace/source/assignee/attribution rules preserved. No migration/provider/auth boundary change. Exact-head hosted valid-flow/release checks pending; partial parallel reorder writes remain an explicit limit. S5 not yet complete.


### 4 November 2026: B40 acceptance and hosted read revocation complete

User accepted member view and drag reorder; DB readback task B sort_order0/A1. Existing selected password identity successfully reads fixture song, version, song tasks and version threads as member. After guarded deletion of only its synthetic membership, the same browser session immediately receives explicit denial JSON for all four reads, without fixture title. Bootstrap falls back to original workspace3498b4a6-c0df-4bc6-b2db-14e8213cbcfa as Owner. These are12 hosted browser projection observations across outsider/member/removed states, not independent HTTP-status capture or all-method S2 completion.

Guarded cleanup removed disposable account1ee43543-b6a2-4397-9679-518dd62fec30 and its exact synthetic song/related version/thread/comment/action/two tasks and owner membership. All eight fixture counts0; participant original membership count1, planFree/storage0/null Stripe unchanged. No Auth identity, real workspace/content, email/provider, payment or actual Storage object deleted. Browser returned to original dashboard. B40 application release proceeds after final PR87 checks; remaining S2 role/method, S4 and S5 review stays open.


## B40 Production and B41 remaining metadata validation,4 November2026

B40 primary dpl_BCGgcjLmtjcATiUaFuKpE17wpkRJ Ready/live at merge613a1426; www alias/source confirmed. Seven safe live checks pass: login200, five changed malformed signed-out methods401, existing public playlist projection200. Production email config enabled=true/passwordManagementEnabled=false preserved; no fresh positive write/payment/email. Staging member read/reorder and revocation acceptance complete; fixtures0. Rollback prior4e8a2750 app retaining B39 SQL.

B41 local remaining metadata pass reuses bounded object input for nine route files/ten methods, typed fields and playlist ID list checks. Reorder stops and returns generic500 on reported update/header errors rather than false200; may partially update serial positions before failure.44 before-fix regression failures across two batches,66 new cases/all581 local tests pass; TypeScript/focused lint0errors, one existing unused-variable warning. Valid defaults/nullable version metadata/whitelists and auth/workspace/owner predicates preserved. No schema/config/provider/auth-boundary change. Hosted Preview/CI/normal-flow acceptance pending. Existing public invite lookup/accept already validates token format; old malformed-token roadmap note doesn't justify another repair. S2/S4/S5 stay open.


4 November S4 beta scope accepted: user explicitly chose Accept for current beta for the recorded limits. Retain approved comment/invite/feedback quotas and existing Auth CAPTCHA/provider controls; no new general quotas. Public telemetry lacks an app quota and provider end-user IP attribution remains unverified. S4 Done for current beta; re-evaluate before wider launch at L8. Acceptance doesn't assert stress/provider-delivery verification or change a service setting.

4 November B41 Preview source3ff0656c/Ready dpl_8ZWim3zUJA3wek9usGL35LEnCdJM, existing email alias and staging project verified. Ten malformed signed-out methods401 and existing invalid-invite lookup404 pass;581 local tests/four source checks pass. Browser URL policy blocks unsupported-protocol current frame reload, so normal metadata UI acceptance requires user. Only isolated account/owner link/two pending metadata songs/versions seeded, no actual audio/provider action. Original workspace/plan unchanged. No B41 Production deployment or universal hosted field coverage claimed.
