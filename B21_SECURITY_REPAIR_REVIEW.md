# Membership policy repair: review and rollout

1 November 2026. [Current launch checklist](LAUNCH_CHECKLIST.md). B21 and S3 are review-ready, not installed. No Production database change has occurred.

## What needs review

The current membership policies read account_members while evaluating account_members access, producing infinite recursion. The replacement uses two private, fixed-search-path SECURITY DEFINER functions. Each returns only whether auth.uid() belongs to the requested workspace, optionally with one of the existing workspace roles. Neither accepts a user ID, returns membership rows, changes data or uses editable profile metadata for authorisation.

This introduces a privileged lookup boundary, so it needs explicit review before being installed permanently. The current tests used uncommitted staging transactions followed by ROLLBACK. Other sessions could not see the candidate definitions; brief policy locks were bounded with a three-second lock timeout.

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

1. [Membership recursion migration](supabase/migrations/20261101112636_fix_membership_rls_recursion.sql)
2. [Five function search-path fixes](supabase/migrations/20261101113332_pin_function_search_paths.sql)

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

No permanent advisor improvement is claimed. The original policy failure and five warnings remain until a reviewed migration is installed and checked again.

## Approved-next-step proposal: staging only

After explicit review approval, Agent should:

1. Supabase staging `ivifkrtupqizyqqsxdty`: rerun the preflight file. Expect every boolean true. Stop on drift; return project ref, failed boolean and safe definition difference.
2. Apply migration 20261101112636, then 20261101113332 to staging using migration tooling. No application deployment is needed first. Do not change grants beyond these reviewed files or alter Data API exposed schemas.
3. Run access/privilege checks against the installed definitions with rollback-only fixture transactions. Do not mistakenly claim the composer installed anything: it always rolls back. The existing composer reapplies candidates transactionally, so additionally read back the installed definitions/grants before the fixture test.
4. Check staging Security Advisor, expected removal of the five search-path warnings, private helper fixed paths/owners and denied anonymous execution. Confirm the new namespace is absent from Data API exposed schemas. Expected existing server-only RLS INFO notices can remain.
5. Verify staging authenticated upload-page title, workspace switch, collaborator list/invite acceptance and ordinary song/version reads. These require real sessions; use existing controlled test accounts. Stop on recursion, unexpected access, invitation/membership changes or session failures and return URL, role, step, redacted error and screenshot where useful.
6. Record staging results and request the Production gate separately. No Production migration, test user or mutation is authorised merely by approving the staging step.

## Production gate and rollback

Production remains unchanged. Before any later Production approval, rerun first-apply fingerprints, review staging results, confirm recovery/Google and role scopes, and record the current app/database rollback boundary. Install the same migrations in the same order; repeat safe role/privilege checks and the authenticated app checks. Do not create or delete real users as a smoke test.

Rollback scripts are [search paths](supabase/rollback/20261101113332_pin_function_search_paths.sql), then [membership](supabase/rollback/20261101112636_fix_membership_rls_recursion.sql). They were verified inside a rolled-back staging transaction. Rollback restores the known recursion and five warnings, so prefer fix-forward unless a regression makes rollback necessary. It doesn't restore permissive policies, drop tables or delete member data. The private schema drop uses RESTRICT, never CASCADE; stop if later objects depend on it.

An app deployment rollback cannot undo database policies. Don't run hosted configuration push, rotate secrets, disable RLS or broaden access to work around an error.

## Reviewer decision

Approve installation on staging only, or identify concerns in the migration diff. The current review does not ask for Production activation, billing/admin-panel changes or new notification sends.
