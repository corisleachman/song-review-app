# Launch API access inventory

1 November 2026, release source `8f02fb7a`. Part of [S2 security closeout](LAUNCH_CHECKLIST.md#current-stage-l5-security-closeout).

This inventory classifies all 68 API route files by intended boundary; forwarded settings GET/POST methods are included. Helper references are text matches to guide inspection, not proof of authentication or authorisation. Public, auth-entry, webhook and internal routes need their own boundary classification. No negative-access test is marked passed by this inventory.

For each method, record the final route class, identity check, resource/workspace predicate, role requirement, input validation and owner/member/outsider/public staging result before S2 can finish. See [review procedure](LAUNCH_SECURITY_REVIEW.md#next-slice-api-boundary-matrix).

| Route | Class | Exported methods | Boundary reference to inspect | Negative-access verification |
| --- | --- | --- | --- |
| `/api/actions/[actionId]` | Session + resource/workspace scope | PATCH | `resolveCanonicalIdentity` | Local signed-out PATCH tests pass; hosted matrix pending |
| `/api/actions/by-song/[songId]` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Local signed-out GET tests pass; hosted matrix pending |
| `/api/actions/create` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Local signed-out POST tests pass; hosted matrix pending |
| `/api/actions` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Local signed-out GET tests pass; hosted matrix pending |
| `/api/admin/feedback/[id]` | Application admin | PATCH | `getCurrentAuthenticatedUser`, `isAdmin` | Local handler tests pass; hosted negatives pending |
| `/api/admin/feedback` | Application admin | GET | `getCurrentAuthenticatedUser`, `isAdmin` | Local handler tests pass; hosted negatives pending |
| `/api/auth/bootstrap` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/auth/email/config` | Public auth/config; feature gates | GET | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/login` | Public auth/config; feature gates | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/manage/request` | Gated signed-in password management | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/manage/update` | Gated signed-in password management | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/recover` | Public auth/config; feature gates | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/resend` | Public auth/config; feature gates | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/reset` | Public auth/config; feature gates | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/signup` | Public auth/config; feature gates | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/verify-password` | Legacy shared-password verifier | POST | Inspect route / delegated helper | Local handler tests pass; hosted negatives pending |
| `/api/billing/activate` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/billing/checkout` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/billing/portal` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/csp-report` | Public submission / optional identity | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/dashboard` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Code sampled; staging negative tests pending |
| `/api/dashboard/summary` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Local handler tests pass; hosted negatives pending |
| `/api/email/notify-thread` | Signed internal request | POST | `verifyInternalRequest` | Local handler tests pass; hosted negatives pending |
| `/api/feedback` | Public submission / optional identity | POST | `getCurrentAuthenticatedUser` | Not yet exercised |
| `/api/invites/[token]/accept` | Session + resource/workspace scope | POST | `getCurrentAuthenticatedUser` | Not yet exercised |
| `/api/invites/[token]` | Public token lookup | GET | Inspect route / delegated helper | Not yet exercised |
| `/api/plan-events` | Public submission / optional identity | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/playlists/[id]/image` | Session + resource/workspace scope | POST, DELETE | `resolvePlaylistAccess` | Not yet exercised |
| `/api/playlists/[id]` | Session + resource/workspace scope | GET, PATCH, DELETE | `resolvePlaylistAccess` | Local signed-out GET, PATCH, DELETE tests pass; hosted matrix pending |
| `/api/playlists/[id]/songs/[songId]` | Session + resource/workspace scope | DELETE | `resolvePlaylistAccess` | Local signed-out DELETE tests pass; hosted matrix pending |
| `/api/playlists/[id]/songs` | Session + resource/workspace scope | POST, PATCH | `resolvePlaylistAccess` | Local signed-out POST, PATCH tests pass; hosted matrix pending |
| `/api/playlists` | Session + resource/workspace scope | GET, POST | `resolveCanonicalIdentity` | Local signed-out GET, POST tests pass; hosted matrix pending |
| `/api/profile/settings` | Session + resource/workspace scope | GET, POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/profile/visualizer` | Session + resource/workspace scope | GET, POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/public/playlist/[id]` | Public-share projection | GET | Inspect route / delegated helper | Not yet exercised |
| `/api/public/song/[songId]/comments` | Public-share projection | GET, POST | Inspect route / delegated helper | Not yet exercised |
| `/api/public/song/[songId]` | Public-share projection | GET | Inspect route / delegated helper | Not yet exercised |
| `/api/referrals/code` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/referrals/summary` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/settings` | Session + resource/workspace scope | GET, POST (forwarded to profile/settings) | Inspect route / delegated helper | Not yet exercised |
| `/api/settings/summary` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/songs/[songId]/public-comments/[commentId]` | Session + resource/workspace scope | DELETE | `resolveCanonicalIdentity` | Local signed-out DELETE tests pass; hosted matrix pending |
| `/api/songs/[songId]/public-comments` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Local signed-out GET tests pass; hosted matrix pending |
| `/api/songs/[songId]` | Session + resource/workspace scope | GET, PATCH, DELETE | `resolveCanonicalIdentity` | Local signed-out PATCH, DELETE tests pass; hosted matrix pending |
| `/api/songs/[songId]/tasks` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Local signed-out GET tests pass; hosted matrix pending |
| `/api/songs/[songId]/versions` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Local signed-out GET tests pass; hosted matrix pending |
| `/api/songs/[songId]/visibility` | Session + resource/workspace scope | PATCH | `resolveCanonicalIdentity` | Local signed-out PATCH tests pass; hosted matrix pending |
| `/api/songs/create` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Local signed-out POST tests pass; hosted matrix pending |
| `/api/songs/upload-image` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/stripe/webhook` | Signed Stripe webhook | POST | `stripe.webhooks.constructEvent` | Not yet exercised |
| `/api/tasks/[taskId]` | Session + resource/workspace scope | PATCH, DELETE | `resolveCanonicalIdentity` | Local signed-out PATCH, DELETE tests pass; hosted matrix pending |
| `/api/tasks/create` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Local signed-out POST tests pass; hosted matrix pending |
| `/api/tasks/reorder` | Session + resource/workspace scope | PATCH | `resolveCanonicalIdentity` | Local signed-out PATCH tests pass; hosted matrix pending |
| `/api/threads/create` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Local signed-out POST tests pass; hosted matrix pending |
| `/api/threads/reply` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Local signed-out POST tests pass; hosted matrix pending |
| `/api/versions/[versionId]/finalize` | Session + resource/workspace scope | POST, DELETE | `resolveCanonicalIdentity` | Local signed-out POST, DELETE tests pass; hosted matrix pending |
| `/api/versions/[versionId]` | Session + resource/workspace scope | GET, PATCH | `resolveCanonicalIdentity` | Local signed-out PATCH tests pass; hosted matrix pending |
| `/api/versions/[versionId]/threads` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Local signed-out GET tests pass; hosted matrix pending |
| `/api/versions/create` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/workspace/invites/[inviteId]` | Session + resource/workspace scope | PATCH | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/workspace/invites` | Session + resource/workspace scope | GET, POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/workspace/members/[userId]` | Session + resource/workspace scope | DELETE | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/workspace/members` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/workspace/plan` | Session + resource/workspace scope | PATCH | `resolveCanonicalIdentity` | Code sampled; staging negative tests pending |
| `/api/workspace/settings` | Session + resource/workspace scope | PATCH, POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/workspaces/create` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/workspaces` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/workspaces/switch` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Not yet exercised |

## Code-review continuation, 1 November 2026

These are sampled paths, not completed dynamic access verification. Every method still needs staged negative tests.

| Path | Observed boundary |
| --- | --- |
| `/api/dashboard` | Session + resource/workspace scope | GET: canonical identity; songs filtered by active workspace |
| `/api/dashboard/summary` | Session + resource/workspace scope | Local handler tests pass; hosted negatives pending |
| `/api/songs/[songId]` | Session + resource/workspace scope | Local signed-out PATCH, DELETE tests pass; hosted matrix pending |
| `/api/versions/[versionId]` | Session + resource/workspace scope | Local signed-out PATCH tests pass; hosted matrix pending |
| `/api/admin/feedback` | Application admin | Local handler tests pass; hosted negatives pending |
| `/api/admin/feedback/[id]` | Application admin | Local handler tests pass; hosted negatives pending |
| `/api/email/notify-thread` | Signed internal request | Local handler tests pass; hosted negatives pending |
| `/api/workspace/plan` | Session + resource/workspace scope | PATCH: production refusal; local canonical owner test path only |

### Staging test order

1. Confirm the exact staging project/deployment and designated owner, member and unrelated-workspace fixtures. Do not reuse Production users, tokens or content. Capture only safe fixture labels in the result matrix.
2. Check signed-out requests and owner/member/outsider GETs for dashboard, summary, song and version resources. Denied calls must not return private artwork URLs or audio URLs. Exercise a valid ID belonging to another workspace, not just nonexistent IDs.
3. Confirm that an ordinary workspace owner cannot read or PATCH admin feedback; separately test the authorised application-owner fixture. Check direct API access as well as page gating.
4. Submit only synthetic unsigned/expired-signature internal notification requests and expect rejection without sending mail. Keep development plan testing unavailable on production-mode staging builds.
5. Before any mutation test, designate disposable staging records and expected side effects. Use them for owner/member/outsider writes, then inspect exact records. Don't delete fixtures or send mail as incidental cleanup without explicit scope.
6. Carry B18 cache-isolation coverage into the performance harness: logout/user change/workspace switch while a request is in flight must never populate the new view with the previous account's songs.

Stop if fixtures, test destination or expected permissions aren't established. Record expected/actual HTTP status and redacted projection, not tokens or private content. No staged request is claimed to have run in this checkpoint.

## Verification checkpoint: handler execution and staging SQL roles

- `tests/api-access-boundaries.test.mjs` executes actual compiled handlers with mocked identity/database/framework boundaries. Twelve tests cover owner/member allow and outsider deny song/version reads, signed-out denial, dashboard summary scoping, admin denial with an authorised-user positive control, mixed-workspace task reorder with an allowed-write control, unsigned internal notification rejection, and unconfigured legacy password rejection. These are local handler tests, not hosted sessions, browser cookies or live database tests.
- A read-only staging transaction with SET LOCAL ROLE authenticated and transaction-local JWT claims for an existing owner failed with SQLSTATE 42P17: infinite recursion in the account_members policy. No returned rows or mutations. The transaction is rolled back/aborted; no role or claim is persisted.
- A separate read-only staging anon-role transaction returned one public song, zero private songs and three versions, all three finalized by a separate privileged aggregate. This is row-count evidence only, not a full column/projection or revocation test.
- Production policy metadata has the same self-referential membership SELECT structure. No authenticated-role Production execution, policy change or user-data mutation was performed.
- The recursion blocks a successful member/outsider database matrix. S2 is incomplete; B21 tracks the repair and required tests.


## Production signed-out smoke, 1 November 2026

On PR #66 merge revision `6e770973`, unauthenticated bootstrap/dashboard GETs returned 401, admin feedback GET returned 404, unsigned internal notification POST returned 401 and empty legacy verification POST returned 401 with success false and no session cookie. These narrow hosted checks don't constitute owner/member/outsider coverage or an RLS repair.

## Expanded checks and migration review, 1 November 2026

API runtime coverage is now 42 passing mocked-I/O tests, adding 30 signed-out method checks across action, task, thread, song, version/upload and playlist handlers. The harness models NextRequest.nextUrl and resolves existing .mjs helpers; initial harness failures were corrected without changing application access behaviour. Full suite: 151 passed.

B21/S3 SQL candidates passed 34 actual staging role/function checks inside transactions that rolled back, plus idempotency and reverse rollback checks. No installed migration or full hosted API/browser pass is claimed. [Review gate](B21_SECURITY_REPAIR_REVIEW.md) is the next step.


## Installed staging repair checks, 1 November 2026

Following explicit staging approval, both reviewed migrations are installed. The installed-mode probe passed 34 role/function checks without reapplying DDL; six further rolled-back invitation acceptance/idempotency checks passed. Authenticated browser checks passed for switching between existing member/owner workspaces, dashboard songs, song/version reads, the direct upload-title read and collaborator listing. No new invitation email/browser acceptance was replayed. This scoped gate doesn't replace all route-by-method owner/member/outsider API tests. Production remains on its original policies.


## Approved Production repair, 1 November 2026

B21 and the five function search-path fixes are installed and verified on Production after separate user approval. Sixteen read-only role checks, six metadata checks, private-schema Data API exclusion and eight public HTTP probes pass. Scoped signed-in dashboard/song/version/upload-title/collaborator checks pass. Both environments have zero Security Advisor errors/warnings. PR #67 merged as `a66c24fa`. Earlier pending statements are historical; broader S2/S3 access and Storage checks remain open. See [rollout evidence and cross-environment migration ledger mapping](B21_SECURITY_REPAIR_REVIEW.md#production-verification-1-november-2026).


## Storage and view closeout checkpoint, 1 November 2026

Read-only metadata: no public-schema views/materialized views in staging or Production. Both environments have public song-files/song-images buckets and zero storage.objects policies. Anonymous HEAD for one finalized private staging song audio object returned 200, without downloading content. B23 tracks the confirmed privacy finding; no private Production file request or live share-toggle experiment occurred. Code inspection shows permanent public URLs remain independent of database sharing flags. No hosted access setting changed. See [evidence, repair surface and revocation decision](STORAGE_ACCESS_REVIEW.md). S2/S3 remain open.
