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
