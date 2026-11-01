# Membership policy repair: review and rollout

1 November 2026. [Current launch checklist](LAUNCH_CHECKLIST.md). The user separately approved staging and Production installation. Both migrations are installed and verified in both environments; PR #67 merged as `a66c24fa`. Broader S2/S3 work remains open.

## Reviewed design

The current membership policies read account_members while evaluating account_members access, producing infinite recursion. The replacement uses two private, fixed-search-path SECURITY DEFINER functions. Each returns only whether auth.uid() belongs to the requested workspace, optionally with one of the existing workspace roles. Neither accepts a user ID, returns membership rows, changes data or uses editable profile metadata for authorisation.

This introduces a privileged lookup boundary. The user approved staging installation after reviewing this package. The initial tests used uncommitted staging transactions followed by ROLLBACK. Other sessions could not see the candidate definitions; brief policy locks were bounded with a three-second lock timeout.

| Behaviour | Before | Candidate |
| --- | --- | --- |
| Read workspace members | Intended for workspace members; fails recursively | Current workspace members can read memberships |
| Insert/delete memberships | Existing workspace owner/admin rules; recursive dependencies | Same owner/admin rules through bounded lookup |
| Update memberships | Existing owner-only rule | Owner-only USING and WITH CHECK retained |
| Anonymous membership access | No intended access | Denied; no private schema/function access |
| Execute new helpers | No helpers exist | authenticated can call own-membership boolean checks only; PUBLIC/anon/service_role execution revoked |
| Create objects in private schema | Schema absent | postgres owns schema; authenticated has USAGE, no CREATE |
| Existing five public functions | Unset search_path, invoker mode | Empty search_path; bodies, owner, invoker mode and grants unchanged |

The legacy workspace admin database role is preserved, not newly assigned to anyone. It is separate from the application-owner admin panel in B06. No user, workspace, plan, payment, email or hosted Auth setting is modified by these migrations.

## Files to review

Apply in order after approval:

1. [Membership recursion migration](supabase/migrations/20261101153149_fix_membership_rls_recursion.sql)
2. [Five function search-path fixes](supabase/migrations/20261101153157_pin_function_search_paths.sql)

Supporting files: [first-apply preflight](supabase/tests/membership_rls_preflight.sql), [rollback-only test template](supabase/tests/membership_rls_probe.sql), [SQL composer](scripts/compose-membership-rls-probe.mjs), [API handler tests](tests/api-access-boundaries.test.mjs).

## Evidence already collected

- Baseline authenticated staging owner read reproduced SQLSTATE 42P17 before repair.
- Initial SELECT-only repair fixed reads but failed an insert test; the final candidate removes all six membership-policy self-references.
- All 27 access/privilege checks passed: own/member/outsider/anon reads, owner insert/update/delete, owner move rejection, member self-promotion/insert/delete denial, outsider self-add denial, legacy admin insert/delete with update denial, missing identity, fixed helper path/owner, execution grants and schema CREATE denial.
- Applying the membership candidate twice passed the same 27 checks.
- Combined candidate passed 34 checks, adding existing public helper behaviour, five pinned search paths, unchanged owner/invoker/client grants, referral-code format and both timestamp-trigger functions.
- The checked-in composer output itself was executed against staging and all 34 checks passed. It emits SQL only and rejects an unspecified or non-staging project argument.
- Reverse-order rollback restored the exact baseline policy expressions/roles and function settings and removed the private helpers. The full 34-case assertion passed before rollback.
- Post-transaction read-back found no private schema, no B21 fixture workspaces and unchanged RLS. The existing test accounts were not altered; all temporary workspaces/memberships were rolled back.
- Read-only staging/Production fingerprints match for the six membership policies and bodies of the five public functions. First-apply preflight checks also verify owner/settings and unused private schema; recheck immediately before applying.
- Local checks: 151 tests pass, including 42 actual-handler tests with mocked I/O. TypeScript and focused lint pass. These are not hosted authenticated API/browser tests.

The original candidate evidence above is historical. Installed staging and Production results follow below.

## Approved staging sequence (completed)

The approved sequence was executed. The ledger versions below were assigned by Supabase; the reviewed SQL bytes are unchanged. Historical candidate file versions 20261101112636/20261101113332 were renamed to match the hosted ledger 20261101153149/20261101153157.

The reproducible installed check is `node scripts/compose-membership-rls-probe.mjs ivifkrtupqizyqqsxdty --installed`. It omits candidate DDL and always rolls back fixture writes. Default `--candidate` mode remains for pre-install testing.

Sequence and acceptance criteria:

1. Supabase staging `ivifkrtupqizyqqsxdty`: rerun the preflight file. Expect every boolean true. Stop on drift; return project ref, failed boolean and safe definition difference.
2. Apply migration 20261101153149, then 20261101153157 to staging using migration tooling. No application deployment is needed first. Do not change grants beyond these reviewed files or alter Data API exposed schemas.
3. Run access/privilege checks against the installed definitions with rollback-only fixture transactions. Do not mistakenly claim the composer installed anything: it always rolls back. The existing composer reapplies candidates transactionally, so additionally read back the installed definitions/grants before the fixture test.
4. Check staging Security Advisor, expected removal of the five search-path warnings, private helper fixed paths/owners and denied anonymous execution. Confirm the new namespace is absent from Data API exposed schemas. Expected existing server-only RLS INFO notices can remain.
5. Verify staging authenticated upload-page title, workspace switch, collaborator list/invite acceptance and ordinary song/version reads. These require real sessions; use existing controlled test accounts. Stop on recursion, unexpected access, invitation/membership changes or session failures and return URL, role, step, redacted error and screenshot where useful.
6. Record staging results and request the Production gate separately. No Production migration, test user or mutation is authorised merely by approving the staging step.

## Production gate and rollback

The separately approved Production rollout is complete. All five first-apply drift checks passed immediately before installation. The unchanged reviewed migrations were applied in order, followed by read-only role/privilege and authenticated app checks. No real users were created or deleted.

Rollback scripts are [search paths](supabase/rollback/20261101153157_pin_function_search_paths.sql), then [membership](supabase/rollback/20261101153149_fix_membership_rls_recursion.sql). They were verified inside a rolled-back staging transaction. Rollback restores the known recursion and five warnings, so prefer fix-forward unless a regression makes rollback necessary. It doesn't restore permissive policies, drop tables or delete member data. The private schema drop uses RESTRICT, never CASCADE; stop if later objects depend on it.

An app deployment rollback cannot undo database policies. Don't run hosted configuration push, rotate secrets, disable RLS or broaden access to work around an error.

## Staging verification results, 1 November 2026

- Applied both migrations via Supabase migration tooling to staging only. Ledger versions: `20261101153149` and `20261101153157`. Installed read-back confirms six non-recursive membership predicates, two bounded private helpers, correct owner/path/grants and five pinned public function paths.
- All 34 checks passed against installed definitions without reapplying the migrations in the test transaction. Six additional invitation-service checks passed: first acceptance, idempotent retry, wrong-email rejection, one membership, no outsider membership and correct accepted-user attribution. Fixture writes rolled back; no invitation email was sent.
- Staging Security Advisor: zero ERROR and zero WARN findings; eight existing server-only-table INFO notices remain. The private schema is excluded from the Data API, confirmed by its HTTP 406/PGRST106 `Invalid schema: song_room_private` response.
- Existing Google session passed Vercel protection and signed into the confirmed staging Preview at source `c4652810`. Its client bundle contains the staging project reference and no Production reference. Workspace switch from existing member workspace to owner workspace loaded all four existing songs; song/version view, direct authenticated upload-title lookup and two-person collaborator list passed in browser.
- No audio upload, playback, edit, real invitation/email or billing action occurred. The invitation backend was tested, not a fresh email-link/browser invite journey. All eight Auth users/profiles, seven workspaces and eleven memberships remain; zero test workspaces remain. The checked Preview's ten-minute error/fatal scan is empty.
- Production's five original preflight checks still pass, confirming that its membership/private-schema/public-function baseline is unchanged.

## Production verification, 1 November 2026

- Sixteen read-only owner/member/outsider/anonymous checks passed against existing identities, with transaction-local roles and claims. Own workspace/membership reads succeeded and unrelated rows stayed hidden. No customer fixtures or membership writes were used.
- Six installed metadata checks passed. Staging/Production policy, helper, ownership, settings and grant fingerprints match. Private namespace Data API access returns 406/PGRST106. Production Security Advisor has zero ERROR/WARN findings and eight existing INFO notices.
- Existing signed-in Production session loaded the 25-song owner dashboard, song/version, direct upload title and collaborators. The switcher displayed only its authorised current workspace; actual multi-workspace switching was verified on staging, not Production.
- Eight signed-out HTTP probes passed. Email remains enabled and Account security remains off. Bounded live error/fatal scan found no matching logs. No fresh login/recovery email, audio upload, playback, invitation, plan change or payment was performed.
- Production counts remain seven users, seven profiles, seven workspaces and ten memberships. This is the rollout baseline, not the older October snapshot.
- Previous app deployment: `dpl_2pgxJRR9nzXC2qH2Kv8SmFSag4Ak` at `1fb97802`. Application rollback cannot undo these database changes. Use the reviewed reverse-order SQL rollback only if required; it restores the known defect/warnings.

## Migration history mapping

Supabase MCP assigned timestamps at application time. SQL bytes are identical across environments, but ledger versions differ:

| Migration | Repository / staging ledger | Production ledger |
| --- | --- | --- |
| fix_membership_rls_recursion | 20261101153149 | 20261101160651 |
| pin_function_search_paths | 20261101153157 | 20261101160657 |

Before any future CLI database push, compare the target ledger with this map and stop on unmatched versions. Do not blindly replay these files or silently repair hosted history. Repository filenames remain aligned with staging; no hosted ledger was rewritten. Both SQL files are already installed in Production.
