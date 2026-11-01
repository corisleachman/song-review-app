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
