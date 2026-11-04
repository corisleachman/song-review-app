# Launch API access inventory

1 November 2026, release source `8f02fb7a`. Part of [S2 security closeout](LAUNCH_CHECKLIST.md#current-stage-l5-security-closeout).

This inventory classifies all 68 API route files by intended boundary; forwarded settings GET/POST methods are included. Helper references are text matches to guide inspection, not proof of authentication or authorisation. Public, auth-entry, webhook and internal routes need their own boundary classification. No negative-access test is marked passed by this inventory.

For each method, record the final route class, identity check, resource/workspace predicate, role requirement, input validation and owner/member/outsider/public staging result before S2 can finish. See [review procedure](LAUNCH_SECURITY_REVIEW.md#next-slice-api-boundary-matrix).

| Route | Class | Exported methods | Boundary reference to inspect | Negative-access verification |
| --- | --- | --- | --- |
| `/api/actions/[actionId]` | Session + resource/workspace scope | PATCH | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out PATCH tests pass; signed-in hosted matrix pending |
| `/api/actions/by-song/[songId]` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out GET tests pass; signed-in hosted matrix pending |
| `/api/actions/create` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out POST tests pass; signed-in hosted matrix pending |
| `/api/actions` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out GET tests pass; signed-in hosted matrix pending |
| `/api/admin/feedback/[id]` | Application admin | PATCH | `getCurrentAuthenticatedUser`, `isAdmin` | Local handler tests pass; hosted negatives pending |
| `/api/admin/feedback` | Application admin | GET | `getCurrentAuthenticatedUser`, `isAdmin` | Local handler tests pass; hosted negatives pending |
| `/api/auth/bootstrap` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity`; server-only atomic initial provisioning | Hosted signed-out methods 401 in staging/Production (2 Nov); B27/PR #73: existing and fresh staged Google journeys pass; 14 installed SQL checks both DBs; Production signed-out 401 and same-origin login redirect pass. Controlled first-request concurrency is local; no fresh Production user created |
| `/api/auth/email/config` | Public auth/config; feature gates | GET | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/login` | Public auth/config; feature gates | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/manage/request` | Gated signed-in password management | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/manage/update` | Gated signed-in password management | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/recover` | Public auth/config; feature gates | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/resend` | Public auth/config; feature gates | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/reset` | Public auth/config; feature gates | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/signup` | Public auth/config; feature gates | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/verify-password` | Legacy shared-password verifier | POST | Inspect route / delegated helper | Local handler tests pass; hosted negatives pending |
| `/api/billing/activate` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); B29: hosted signed-out 401 in both environments; local canonical-user/workspace and billing-role cases pass with fake I/O. B29 safe settings/billing responses are Production verified. No hosted positive payment/write claimed |
| `/api/billing/checkout` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); B29: hosted signed-out 401 in both environments; local canonical-user/workspace and billing-role cases pass with fake I/O. B29 safe settings/billing responses are Production verified. No hosted positive payment/write claimed |
| `/api/billing/portal` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); B29: hosted signed-out 401 in both environments; local canonical-user/workspace and billing-role cases pass with fake I/O. B29 safe settings/billing responses are Production verified. No hosted positive payment/write claimed |
| `/api/csp-report` | Public submission / optional identity | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/dashboard` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Code sampled; signed-in staging checks pending |
| `/api/dashboard/summary` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local handler tests pass; signed-in role matrix pending |
| `/api/email/notify-thread` | Signed internal request | POST | `verifyInternalRequest` | Local handler tests pass; hosted negatives pending |
| `/api/feedback` | Public submission / optional identity | POST | Canonical optional user; trusted visitor IP; DB atomic five/hour; RLS denies direct clients | PR #72: staging HTTP ten simultaneous -> five saved/five 429; SQL quota/expiry/failure/direct-role cases pass both DBs. Production no-write validation/honeypot pass. Fixtures removed; no provider emails |
| `/api/invites/[token]/accept` | Session + resource/workspace scope | POST | `getCurrentAuthenticatedUser` | Hosted signed-out methods 401 in staging/Production (2 Nov); Signed-in role checks pending |
| `/api/invites/[token]` | Public token lookup | GET | Inspect route / delegated helper | Not yet exercised |
| `/api/plan-events` | Public submission / optional identity | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/playlists/[id]/image` | Session + resource/workspace scope | POST, DELETE | `resolvePlaylistAccess` | Hosted signed-out methods 401 in staging/Production (2 Nov); Signed-in role checks pending |
| `/api/playlists/[id]` | Session + resource/workspace scope | GET, PATCH, DELETE | `resolvePlaylistAccess` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out GET, PATCH, DELETE tests pass; signed-in hosted matrix pending |
| `/api/playlists/[id]/songs/[songId]` | Session + resource/workspace scope | DELETE | `resolvePlaylistAccess` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out DELETE tests pass; signed-in hosted matrix pending |
| `/api/playlists/[id]/songs` | Session + resource/workspace scope | POST, PATCH | `resolvePlaylistAccess` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out POST, PATCH tests pass; signed-in hosted matrix pending |
| `/api/playlists` | Session + resource/workspace scope | GET, POST | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out GET, POST tests pass; signed-in hosted matrix pending |
| `/api/profile/settings` | Session + resource/workspace scope | GET, POST | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); B29: hosted signed-out 401 in both environments; local canonical-user/workspace and billing-role cases pass with fake I/O. B29 safe settings/billing responses are Production verified. No hosted positive payment/write claimed |
| `/api/profile/visualizer` | Session + resource/workspace scope | GET, POST | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); B29: hosted signed-out 401 in both environments; local canonical-user/workspace and billing-role cases pass with fake I/O. B29 safe settings/billing responses are Production verified. No hosted positive payment/write claimed |
| `/api/public/playlist/[id]` | Public-share projection | GET | Service projection; sharing, same-workspace membership, latest finalized versions | B28: local projection tests; synthetic DB owner/member/outsider cases; both-environment live playlist/embeds/audio/artwork pass. Raw anon table bypass now denied |
| `/api/public/song/[songId]/comments` | Public-share projection | GET, POST | Sharing/comment flags; honeypot; typed body | B26 input checks pass. PR #70 shared 5/min/IP: hosted staging five synthetic 201, sixth 429; GET 200; fixtures removed. Production no-write input/share checks pass |
| `/api/public/song/[songId]` | Public-share projection | GET | Service projection; sharing flag, latest finalized version and explicit fields | B28: local projection tests, both-environment public JSON unchanged/pages/media pass; raw anon songs/versions now denied. Broader method/role matrix remains open |
| `/api/referrals/code` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); B29: hosted signed-out 401 in both environments; local canonical-user/workspace and billing-role cases pass with fake I/O. B29 safe settings/billing responses are Production verified. No hosted positive payment/write claimed |
| `/api/referrals/summary` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); B29: hosted signed-out 401 in both environments; local canonical-user/workspace and billing-role cases pass with fake I/O. B29 safe settings/billing responses are Production verified. No hosted positive payment/write claimed |
| `/api/settings` | Session + resource/workspace scope | GET, POST (forwarded to profile/settings) | Inspect route / delegated helper | Hosted signed-out methods 401 in staging/Production (2 Nov); B29: hosted signed-out 401 in both environments; local canonical-user/workspace and billing-role cases pass with fake I/O. B29 safe settings/billing responses are Production verified. No hosted positive payment/write claimed |
| `/api/settings/summary` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); B29: hosted signed-out 401 in both environments; local canonical-user/workspace and billing-role cases pass with fake I/O. B29 safe settings/billing responses are Production verified. No hosted positive payment/write claimed |
| `/api/songs/[songId]/public-comments/[commentId]` | Session + resource/workspace scope | DELETE | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out DELETE tests pass; signed-in hosted matrix pending |
| `/api/songs/[songId]/public-comments` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out GET tests pass; signed-in hosted matrix pending |
| `/api/songs/[songId]` | Session + resource/workspace scope | GET, PATCH, DELETE | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out PATCH, DELETE tests pass; signed-in hosted matrix pending |
| `/api/songs/[songId]/tasks` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out GET tests pass; signed-in hosted matrix pending |
| `/api/songs/[songId]/versions` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out GET tests pass; signed-in hosted matrix pending |
| `/api/songs/[songId]/visibility` | Session + resource/workspace scope | PATCH | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out PATCH tests pass; signed-in hosted matrix pending |
| `/api/songs/create` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out POST tests pass; signed-in hosted matrix pending |
| `/api/songs/upload-image` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Signed-in role checks pending |
| `/api/stripe/webhook` | Signed Stripe webhook | POST | `stripe.webhooks.constructEvent` | Not yet exercised |
| `/api/tasks/[taskId]` | Session + resource/workspace scope | PATCH, DELETE | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out PATCH, DELETE tests pass; signed-in hosted matrix pending |
| `/api/tasks/create` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out POST tests pass; signed-in hosted matrix pending |
| `/api/tasks/reorder` | Session + resource/workspace scope | PATCH | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out PATCH tests pass; signed-in hosted matrix pending |
| `/api/threads/create` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); B26 input/auth/workspace cases pass; PR #70 shared private 30/min limiter denial/outage gates writes/scheduling. Production signed-out 401; valid writes/notifications use fake I/O |
| `/api/threads/reply` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); B26 input/auth/workspace cases pass; PR #70 shared private 30/min limiter denial/outage gates writes/scheduling. Production signed-out 401; valid writes/notifications use fake I/O |
| `/api/versions/[versionId]/finalize` | Session + resource/workspace scope | POST, DELETE | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out POST, DELETE tests pass; signed-in hosted matrix pending |
| `/api/versions/[versionId]` | Session + resource/workspace scope | GET, PATCH | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out PATCH tests pass; signed-in hosted matrix pending |
| `/api/versions/[versionId]/threads` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Local signed-out GET tests pass; signed-in hosted matrix pending |
| `/api/versions/create` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Signed-in role checks pending |
| `/api/workspace/invites/[inviteId]` | Session + resource/workspace scope | PATCH | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Signed-in role checks pending |
| `/api/workspace/invites` | Session + resource/workspace scope | GET, POST | `resolveCanonicalIdentity`; owner-only | Hosted signed-out methods 401 in staging/Production (2 Nov); PR #70 runtime owner/member/signed-out and create/resend budget gates pass with fake email I/O. Production POST signed-out 401; hosted valid email journey not replayed |
| `/api/workspace/members/[userId]` | Session + resource/workspace scope | DELETE | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Signed-in role checks pending |
| `/api/workspace/members` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Signed-in role checks pending |
| `/api/workspace/plan` | Session + resource/workspace scope | PATCH | `resolveCanonicalIdentity` | Hosted signed-out methods 403 in staging/Production (2 Nov); Code sampled; signed-in staging checks pending |
| `/api/workspace/settings` | Session + resource/workspace scope | PATCH, POST | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Signed-in role checks pending |
| `/api/workspaces/create` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Signed-in role checks pending |
| `/api/workspaces` | Session + resource/workspace scope | GET | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Signed-in role checks pending |
| `/api/workspaces/switch` | Session + resource/workspace scope | POST | `resolveCanonicalIdentity` | Hosted signed-out methods 401 in staging/Production (2 Nov); Signed-in role checks pending |


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


## Local audio candidate, 1 November 2026

New /api/media/audio/[versionId] GET/HEAD is local only, checking canonical identity or explicit public song/playlist scope before signing a bounded song-owned path for 600 seconds. Public contexts require current sharing, same-workspace playlist membership and latest finalized version. Thirty added handler tests pass: 72 boundary cases, 181 total tests. The older route inventory counted 68 files before this addition. Hosted Range/expiry/background gates and artwork remain open; neither bucket changed. See STORAGE_ACCESS_REVIEW.md.


## Scoped media Preview checks, 1 November 2026

PR #68 source 6823574d is Ready on confirmed staging, with four green checks. Public song 200, authorised public media 307 to staging Storage, signed-out private 401 and wrong public context 404 are checked. Browser wrong-active-workspace private request displays Not found; owner private playback/seek/restart pass. Public waveform and two-track playlist play/advance after changing their media fetch credentials to same-origin. Valid HEAD/Range and expired-versus-fresh Storage token probes are recorded in STORAGE_ACCESS_REVIEW.md. This is not all-role/all-route coverage or a private-bucket fix. No Production media change.

## Private media staged checkpoint, 1 November 2026

PR #68 e19c8582 has compatible audio and artwork delivery. Staging buckets are private; audio bucket/app candidate now 50 MB, global/spend cap unchanged. Production media remains unchanged. Two added media route files bring the historical 68-file inventory to 70; this does not complete every route/method/role check. Upload allocation/finalization RPC EXECUTE is service-role-only in both environments. 244 Node tests, TypeScript, four PR checks and 28 browser tests pass (10 skipped). Remaining phone/upload/performance/revocation gates and rollback: [Storage review](STORAGE_ACCESS_REVIEW.md#current-staging-checkpoint-1-november-2026). L5 remains open.

## Production media checkpoint, 2 November 2026

PR #68 is merged/deployed as ff15719f on the primary Production project. Both media buckets are private; audio bucket/global ceiling 50 MB; spend cap unchanged. Scoped live public/owner-private delivery, artwork, playback/seek, signed Range and legacy URL denial pass. Staging adds owner/separate-member/wrong-workspace, live share/entry revocation, timed expiry and boundary uploads. 246 Node tests and exact-head browser CI 30 passed/10 skipped. Broader route/role, abuse and monitoring review remains open; do not mark L5 complete. See [release evidence and limits](STORAGE_ACCESS_REVIEW.md#production-release-2-november-2026).


## Direct private-comment write boundary, 2 November 2026

PR #71/0565f64b removes client INSERT privileges on comments/comment_threads in staging and Production, preserving canonical service-role writes, RLS and other table privileges. Baseline fixtures proved the direct same-workspace member path outside API limits; 15 installed checks per environment now prove denial, server creation/replies and owner/member reads. Baseline/candidate/rollback modes pass in both environments. No live notifications or audio objects created, all fixtures rolled back. This closes that direct table INSERT gap; it doesn't complete all route/method/role coverage. Broader UPDATE/DELETE policies aren't newly certified by this INSERT-only repair.


## B27 bootstrap candidate, 2 November 2026

Common server bootstrap helper's empty-membership creation branch uses a staged service-role-only atomic RPC in PR #73. Existing identity/active membership read path is preserved. Local real-handler concurrency and failure cases plus 14 installed staging SQL checks pass; client RPC execution is denied. Fresh browser signup/confirmation acceptance is pending; Production is unchanged. This isn't a pass for every route that calls canonical identity. Repeated profile-write performance remains B17.


B27 release checkpoint, 2 November: PR #73/ce346868 live, both user staging tests passed and Free/one workspace/one owner membership verified. Installed Production RPC checks pass; no-write bootstrap/dashboard/login probes and bounded logs pass. Initial creation gap closed in scope; broader route/method/role coverage remains open.


B28 Production database release, 2 November: PR #74/6288e354 merged, 342 Node tests/focused lint/four PR checks and browser 30 passed/10 skipped. Reviewed migration source 20261102220823 installed as staging 20261102222009 and Production 20261102222433. Installed 14-case probes pass in both environments, alongside baseline16/candidate14/rollback16. Anonymous raw REST denied; public song/playlist/comments payloads match baseline; pages/embeds/audio Range/artwork pass; authenticated history preserved; zero retained fixture workspaces. Advisors zero errors/warnings; bounded Production error/fatal scan empty. Primary merged-source deployment dpl_Dh7UyB4o7sokRPmdcK22mfH8B1aB is Ready/live; no app logic/env/provider change. Companion SQL rollback restores only old anon SELECT and reopens exposure. Broader L5 remains open.

B29 pre-release hosted baseline: 12 signed-out method checks pass with 401 in existing staging and Production. No database/provider writes or real payments; valid/denied role scenarios are runtime tests with fake I/O.


B29 release, 2 November: PR #75/25b96370 primary dpl_7LpTJNzBYxxj6VgfDb9tYMeesAsy Ready/live. 377 Node tests/TypeScript/focused lint (one existing warning), four PR checks and browser 30 passed/10 skipped. Twelve hosted signed-out checks pass on exact-head Preview and released Production; provider/success tests use fake I/O. No live plan/payment/settings mutations. Error/fatal release scan empty. No external action remains; app rollback can restore previous 6288e354 deployment, retaining B28 database boundary. Broader L5 remains open.


## Expanded hosted signed-out sweep, 2 November 2026

All 63 private/session-class method checks across 48 route files pass in staging Preview dpl_E4Mf9aAeYA55CjmbU2XnVhqTLyhs and Production (25b96370 code). Use no auth/cookies, application/json, `{}` for mutations and zero UUID placeholders for resource IDs. Song creation needs a harmless nonempty title to reach its existing auth gate; empty payload correctly returns validation 400 before auth. Forwarded settings POST is an HTTP POST, not the table's explanatory label. After correcting those two probe assumptions, both full sweeps pass 63/63.

Expected result: 401 JSON error for session routes; development-only workspace plan returns 403 under deployed NODE_ENV=production, before identity/provider work. No signed-in write, real invitation recipient, payment or public media content is submitted. This is signed-out HTTP coverage, not owner/member/outsider hosted authorisation or a proof of all validation paths.

Signed-in continuation: existing Chrome staging tab is an extension suspended-page URL. Browser policy rejected access to that protocol; no workaround attempted. User asked to restore the existing staging dashboard before more authenticated browser checks. No logout, credentials or unrelated tabs accessed.


3 November scoped continuation: B30 user-approved type-only changes complete with unchanged scopes and verified Production/Preview rebuild/public/media/signed-out checks. Restored staging browser passes owner settings/collaborators/Free-plan reads, member settings/billing gating and own synthetic song read; unrelated private song denied without title. Temporary staging-only workspace/song/version/member fixtures fully cleaned; original owner membership remains. No Auth user or storage object, email, payment or real-user content mutation. Version missing-audio state was expected for the synthetic no-object fixture. Final original-workspace browser view unverified because the extension suspended the tab and policy blocked its extension URL; no workaround. Scoped UI coverage doesn't complete every route/method/role write or provider journey. See current launch checkpoint for deployment IDs and limits.


3 November release checkpoint: B31/PR #77/6ba2c817 primary dpl_C1VQK62tyWRy8ZDiZhTjCf7uyZrx Ready/live. 387 Node tests, TypeScript/lint zero errors/five pre-existing warnings, four PR checks and browser30/skip10 pass. Exact-head Preview and Production public/media projections and twelve signed-out checks pass. Benign CSP204 controls found in actual unfiltered request logs with origins only; warning-only filters missed level-warn records. Production27 retrieved records/zero error-fatal; no real secrets/emails or historical log changes. B30 Secret scopes reread intact; original owner/empty staging dashboard visibly restored and fixtures absent. User accepts Hobby one-hour logs and release-time checks for beta, no paid/recurring setup; revisit at L8. S6 and beta S7 exit conditions met, remaining S2-S5 stay open. Rollback prior ffef2c7b app, retaining B28/B30 boundaries.


B32 Production release, 3 November: user owner-name save accepted; stored fixture name/Free/null Stripe verified, fixture/member cleanup complete. Source20261103090300 installed as staging20261103091520/Production20261103094603;19 installed role cases in both DBs pass, with prior baseline16/candidate19/rollback16. Raw client account PATCH401/42501, zero-ID read200/empty. App signed-out/public/media and post-build login/bootstrap/song checks pass; Advisor zero errors/warnings, nine existing INFO. PR #78/b77a7b66 merged126825bf, primary dpl_BfL9iReAvUBWFemGQaXa9aFvT23W Ready/live;390 Node tests/lint/four exact-head checks pass. No account/plan/provider changes or outstanding user actions. SQL rollback restores old client account mutations and reopens the gap; app rollback alone doesn't undo it. Remaining S2-S5 review stays open.


3 November status reconciliation: B31 safe diagnostics/CSP and B32 server-only account writes are Production verified in recorded scope. B32 actual owner settings name save accepted, installed role checks pass, disposable fixture removed. B33 safe response errors are Production verified via PR #79/98f4132f; 425 tests and exact-head Preview/Production63 signed-out methods each pass. These results extend earlier rows but do not imply every signed-in mutation/provider journey was exercised; broader role/function/input checks remain open. No repeat user Save is pending.


## Upload/deletion local boundary slice, 3 November 2026

B36 adds real-handler/fake-I/O owner/admin/member cases: versions/create refuses foreign song before signing; version finalize POST/DELETE refuses foreign finalized versions before Storage; version PATCH permits only label/notes despite injected server-owned fields; song DELETE refuses admin/member before RPC. Actual SQL allocation/finalize/delete RPCs reject foreign workspace IDs and preserve canonical accounting in baseline/candidate/rollback probes. This does not replace the remaining hosted signed-in route matrix or complete S2. B36 direct-table permission candidate is pending approval.


B36 installed acceptance, 3 November: actual staging canonical song creation/upload/finalization/rename, version label update, playback and owner deletion pass under client-write revocation. Version/object/account byte88244 agree; fixture cleanup returns all zero/counter0. Installed40 DB cases pass staging/Production, including owner/admin/member/outsider boundaries and RPC accounting. Production11 safe signed-out/public checks pass. This remains scoped coverage, not every hosted role/method or full S2 completion.


## Collaboration local boundary slice, 3 November 2026

Sixteen new actual-handler/fake-I/O owner/member cases: action creation rejects foreign source comment/assignee and stamps canonical creator/workspace; action PATCH rejects foreign resolved version/assignee; playlist add rejects another account's song; task PATCH ignores injected parent/account/creator and rejects foreign-song task. Raw SQL direct writes bypass these checks; B37 groups actions/tasks/playlist entries/private comments/threads into one permission candidate. Baseline81/candidate81/rollback81 pass both databases, no permanent changes. Remaining hosted signed-in matrix is not marked complete.


B37 installed acceptance, 3 November: actual staging owner comment/reply, action create/resolve, task create/complete and playlist two-entry add/reorder/remove pass. Creator/source/version/status/order verified from stored fixture records. Cleanup all zero; original workspace restored. Installed81 role/grant/CRUD cases pass both DBs, Production16 safe signed-out/public checks pass. This covers the named flows; remaining hosted role/method coverage and S5 validation are not marked complete.


## Remaining identity/profile/billing evidence, 3 November 2026

Real getCurrentAuthenticatedUser helper/fake-SSR-I/O tests verify Auth id/email authority, deny metadata/cached-session authority and preserve verified refresh-cookie behaviour. Actual-role DB probes cover four-role own/foreign profiles/preferences, legacy-theme workspace RLS and legacy billing-record boundary. Baseline84/candidate84/rollback84 pass both DBs; B38 only changes the two unused legacy billing-table client write grants. Existing current billing/settings/referral handler scope tests remain unchanged. No fresh hosted provider/payment journey or whole S2 completion claimed.


4 November 2026 installed checkpoint: user approved B38. Staging ledger20261104070929 and Production ledger20261104071135 installed; installed84 pass each. Staging signed-in Workspace/Free plan reads pass. Production login200; auth bootstrap/settings summary GET401 and billing checkout/portal/activate POST401. Unsupported workspace/plan GET405 excluded from auth evidence. Zero synthetic identities/accounts and zero legacy billing rows remain. Security advisors zero ERROR/WARN, nine existing INFO each. No provider/payment acceptance claimed; DB enforcement complete, PR84 records source/evidence.


### 4 November 2026: remaining playlist-header authority

B39 DB/code trace confirms raw dual-workspace client header transfer can leave foreign song links; private playlist GET's linked metadata service query trusts the header/link invariant. Current mismatches0 in both DBs. Canonical create derives account/creator from current identity, PATCH accepts only title/is_public, DELETE scopes through resolvePlaylistAccess. Candidate makes raw headers server-owned; baseline26/candidate25/rollback26 pass each DB, no installed or hosted exploit claim. S2 cannot close this path until installed/hosted acceptance. Details and exact approval rollout are in PRODUCT_BACKLOG.md#b39-direct-playlist-header-writes-can-transfer-foreign-song-links.


4 November2026 B39 installed acceptance: installed25 pass staging/Production; actual staged owner create/rename/public/draft/add/reorder/remove and stored creator/account/order verification pass, fixtures removed. No UI playlist DELETE exists; service SQL DELETE tested. Production signed-out playlist GET/PATCH/DELETE401 and existing public projection200 pass. S3 database review exit met; hosted method/role coverage remains S2.
