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
