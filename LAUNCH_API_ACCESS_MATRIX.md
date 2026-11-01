# Launch API access inventory

1 November 2026, release source `8f02fb7a`. Part of [S2 security closeout](LAUNCH_CHECKLIST.md#current-stage-l5-security-closeout).

This generated inventory lists all 68 API route files. Helper references are text matches to guide inspection, not proof of authentication or authorisation. Public, auth-entry, webhook and internal routes need their own boundary classification. No negative-access test is marked passed by this inventory.

For each method, record the final route class, identity check, resource/workspace predicate, role requirement, input validation and owner/member/outsider/public staging result before S2 can finish. See [review procedure](LAUNCH_SECURITY_REVIEW.md#next-slice-api-boundary-matrix).

| Route | Exported methods | Boundary reference to inspect | Negative-access verification |
| --- | --- | --- | --- |
| `/api/actions/[actionId]` | PATCH | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/actions/by-song/[songId]` | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/actions/create` | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/actions` | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/admin/feedback/[id]` | PATCH | `getCurrentAuthenticatedUser`, `isAdmin` | Code sampled; staging negative tests pending |
| `/api/admin/feedback` | GET | `getCurrentAuthenticatedUser`, `isAdmin` | Code sampled; staging negative tests pending |
| `/api/auth/bootstrap` | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/auth/email/config` | GET | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/login` | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/manage/request` | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/manage/update` | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/recover` | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/resend` | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/reset` | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/email/signup` | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/auth/verify-password` | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/billing/activate` | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/billing/checkout` | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/billing/portal` | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/csp-report` | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/dashboard` | GET | `resolveCanonicalIdentity` | Code sampled; staging negative tests pending |
| `/api/dashboard/summary` | GET | `resolveCanonicalIdentity` | Code sampled; staging negative tests pending |
| `/api/email/notify-thread` | POST | `verifyInternalRequest` | Code sampled; staging negative tests pending |
| `/api/feedback` | POST | `getCurrentAuthenticatedUser` | Not yet exercised |
| `/api/invites/[token]/accept` | POST | `getCurrentAuthenticatedUser` | Not yet exercised |
| `/api/invites/[token]` | GET | Inspect route / delegated helper | Not yet exercised |
| `/api/plan-events` | POST | Inspect route / delegated helper | Not yet exercised |
| `/api/playlists/[id]/image` | POST, DELETE | `resolvePlaylistAccess` | Not yet exercised |
| `/api/playlists/[id]` | GET, PATCH, DELETE | `resolvePlaylistAccess` | Not yet exercised |
| `/api/playlists/[id]/songs/[songId]` | DELETE | `resolvePlaylistAccess` | Not yet exercised |
| `/api/playlists/[id]/songs` | POST, PATCH | `resolvePlaylistAccess` | Not yet exercised |
| `/api/playlists` | GET, POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/profile/settings` | GET, POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/profile/visualizer` | GET, POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/public/playlist/[id]` | GET | Inspect route / delegated helper | Not yet exercised |
| `/api/public/song/[songId]/comments` | GET, POST | Inspect route / delegated helper | Not yet exercised |
| `/api/public/song/[songId]` | GET | Inspect route / delegated helper | Not yet exercised |
| `/api/referrals/code` | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/referrals/summary` | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/settings` | Inspect exports | Inspect route / delegated helper | Not yet exercised |
| `/api/settings/summary` | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/songs/[songId]/public-comments/[commentId]` | DELETE | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/songs/[songId]/public-comments` | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/songs/[songId]` | GET, PATCH, DELETE | `resolveCanonicalIdentity` | Code sampled; staging negative tests pending |
| `/api/songs/[songId]/tasks` | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/songs/[songId]/versions` | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/songs/[songId]/visibility` | PATCH | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/songs/create` | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/songs/upload-image` | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/stripe/webhook` | POST | `stripe.webhooks.constructEvent` | Not yet exercised |
| `/api/tasks/[taskId]` | PATCH, DELETE | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/tasks/create` | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/tasks/reorder` | PATCH | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/threads/create` | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/threads/reply` | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/versions/[versionId]/finalize` | POST, DELETE | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/versions/[versionId]` | GET, PATCH | `resolveCanonicalIdentity` | Code sampled; staging negative tests pending |
| `/api/versions/[versionId]/threads` | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/versions/create` | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/workspace/invites/[inviteId]` | PATCH | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/workspace/invites` | GET, POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/workspace/members/[userId]` | DELETE | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/workspace/members` | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/workspace/plan` | PATCH | `resolveCanonicalIdentity` | Code sampled; staging negative tests pending |
| `/api/workspace/settings` | PATCH, POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/workspaces/create` | POST | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/workspaces` | GET | `resolveCanonicalIdentity` | Not yet exercised |
| `/api/workspaces/switch` | POST | `resolveCanonicalIdentity` | Not yet exercised |

## Code-review continuation, 1 November 2026

These are sampled paths, not completed dynamic access verification. Every method still needs staged negative tests.

| Path | Observed boundary |
| --- | --- |
| `/api/dashboard` | GET: canonical identity; songs filtered by active workspace |
| `/api/dashboard/summary` | GET: canonical identity; songs filtered by active workspace |
| `/api/songs/[songId]` | GET sampled: canonical identity and song workspace comparison; mutations need separate review |
| `/api/versions/[versionId]` | GET sampled: version/song workspace resolution and comparison; mutations need separate review |
| `/api/admin/feedback` | GET: authenticated email checked with deny-default ADMIN_EMAILS gate |
| `/api/admin/feedback/[id]` | PATCH: same admin gate; changes reward eligibility, not entitlement |
| `/api/email/notify-thread` | POST: bounded payload and internal HMAC verification before dispatch |
| `/api/workspace/plan` | PATCH: production refusal; local canonical owner test path only |

### Staging test order

1. Confirm the exact staging project/deployment and designated owner, member and unrelated-workspace fixtures. Do not reuse Production users, tokens or content. Capture only safe fixture labels in the result matrix.
2. Check signed-out requests and owner/member/outsider GETs for dashboard, summary, song and version resources. Denied calls must not return private artwork URLs or audio URLs. Exercise a valid ID belonging to another workspace, not just nonexistent IDs.
3. Confirm that an ordinary workspace owner cannot read or PATCH admin feedback; separately test the authorised application-owner fixture. Check direct API access as well as page gating.
4. Submit only synthetic unsigned/expired-signature internal notification requests and expect rejection without sending mail. Keep development plan testing unavailable on production-mode staging builds.
5. Before any mutation test, designate disposable staging records and expected side effects. Use them for owner/member/outsider writes, then inspect exact records. Don't delete fixtures or send mail as incidental cleanup without explicit scope.
6. Carry B18 cache-isolation coverage into the performance harness: logout/user change/workspace switch while a request is in flight must never populate the new view with the previous account's songs.

Stop if fixtures, test destination or expected permissions aren't established. Record expected/actual HTTP status and redacted projection, not tokens or private content. No staged request is claimed to have run in this checkpoint.
