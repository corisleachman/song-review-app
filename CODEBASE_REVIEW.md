# Staged Codebase Review Record

Last updated: 12 August 2026

This is the working evidence record for the staged review on `codex/staged-code-review-fixes`. Findings stay here until they are verified, deferred with a reason, or closed. Production has not been changed.

## Performance baseline

Measurements used the protected Vercel preview backed by the staging Supabase branch. Browser journeys were repeated on the same desktop and connection. Authenticated server timings came from opt-in `?perf=1` requests and structured Vercel runtime logs. Route bundle sizes came from a production build.

| Journey | Condition | Measured result | Main observation |
| --- | --- | ---: | --- |
| Dashboard | Signed in, local dashboard cache bypassed | 2,349 ms request chain | Bootstrap finished before the dashboard request started |
| Dashboard after bootstrap concurrency | Signed in, repeated preview visits | 2,124 to 4,146 ms request chain | The targeted database wait fell, but total time remains variable |
| Dashboard API revalidation | Signed in, three traced requests | 1,637 ms median, 1,308 to 2,383 ms | Server and database work dominate |
| Public song | Warm navigation | 697 ms navigation, 1,260 ms until Play was visibly ready | Usable readiness trails navigation |
| Public playlist | Warm navigation | 1,118 ms navigation, 1,470 ms until content was ready | Server data assembly is the likely next target |
| Login | Warm navigation | 595 ms | Not a current priority |

The dashboard route ships about 193 kB of first-load JavaScript. The authenticated version route ships about 194 kB. Public song and playlist routes ship about 111 kB and 108 kB respectively.

The cold dashboard trace at 13:33:41 UTC used anonymous trace `94bee373-a5f4-458a-9d9d-72a76b7d6a89`. `/api/auth/bootstrap` took 509 ms. The following `/api/dashboard` request took 1,637 ms and began 712 ms after bootstrap began, putting the end of the request chain about 2,349 ms after the first request started. The client-side `songs-visible` timestamp was not available in server logs, so this is a request-chain measurement rather than a paint claim.

## Active findings

### PERF-001: Dashboard bootstrap and data waterfall

- Severity: High
- Evidence: `app/dashboard/page.tsx:284-312` awaits `/api/auth/bootstrap` before calling `loadAll`, which starts `/api/dashboard`. The cold preview trace recorded a 2,349 ms request chain.
- User impact: A routine dashboard visit waits for two authenticated server operations in series before fresh songs can appear.
- Recommended fix: Reduce the repeated canonical identity cost first. Then test a combined or safely coordinated response that cannot race first-account creation and does not weaken workspace validation.
- Fix risk: Starting both current routes together can create two initial workspaces during a first-ever login. A combined response can also delay the existing workspace-scoped warm cache if implemented carelessly.
- Status: Partially implemented. The shared bootstrap now overlaps independent profile and membership work. The client request waterfall remains.
- Verification: Targeted lint, TypeScript, production build, preview deployment, and authenticated 200 responses passed. The first-login creation path was preserved in code but was not exercised with a new account.
- Before and after: Before was 2,349 ms for the cold request chain. After traces ranged from 2,124 to 4,146 ms, so no stable whole-page percentage is claimed. The client request waterfall remains the larger problem.

### PERF-002: Repeated and sequential account bootstrap work

- Severity: High
- Evidence: `lib/bootstrapAccount.ts:151-202` writes the profile and resolves membership on every canonical identity call. Before this batch those independent operations ran serially. A valid active membership was followed by a second all-memberships query.
- User impact: Every authenticated route pays avoidable database latency. The dashboard pays it in both bootstrap and data requests.
- Recommended fix: Run independent reads concurrently and stop once a valid active workspace membership has been found. Keep account creation ordered after both checks finish.
- Fix risk: Low for the implemented change. Query error handling and default workspace selection must remain identical.
- Status: Implemented in the current batch.
- Verification: Targeted lint, TypeScript, production build, both Vercel checks, and preview runtime traces passed. Each after trace shows profile and membership stages overlapping.
- Before and after: The new overlap removed 125 to 312 ms of serialized database waiting from each canonical identity call in the sampled traces. Because the dashboard calls identity twice, that removed 307 to 425 ms of serialized work per initial visit. Infrastructure variability masked that saving in some whole-page samples.

### PERF-003: Dashboard data is assembled in multiple dependent query waves

- Severity: High
- Evidence: `app/api/dashboard/route.ts:84-138` loads songs, then versions/actions/members, then threads, then comments. The measured route spent 479 ms on identity, 120 ms on songs, 621 ms on related data, 307 ms on threads, and 110 ms on comments in the cold trace.
- User impact: Database round trips accumulate even though only four songs, five versions, two threads, and three comments were returned.
- Recommended fix: Avoid loading the full workspace directory when the initial dashboard needs names only for assigned actions. Continue reducing dependent comment query waves after measuring that change.
- Fix risk: Medium. Activity, action, version, and workspace boundaries must stay intact.
- Status: Partially implemented and measured. The member-query reduction is verified. A third batch now embeds threads in the existing finalized-version query, removing the separate thread request while preserving the later comments lookup.
- Verification: The member batch passed targeted lint, TypeScript, production build, both Vercel checks, preview deployment, and an authenticated zero-action response. The embedded-thread batch passes targeted lint and TypeScript locally; preview verification is pending. The assigned-action name path still needs a staging regression.
- Before and after: On comparable samples where other database stages were about 300 ms, `related` fell from 606 ms to 360 ms, a 41% reduction. The separate `threads` stage still cost 310 ms in that after trace and is the target of the current batch.

### PERF-004: Public playlist latest-version lookup scales with song count

- Severity: Medium
- Evidence: `app/api/public/playlist/[id]/route.ts:97-105` calls `getLatestPlayableVersion` once per playlist song. The calls run concurrently but still create one database request per song.
- User impact: Larger public playlists create more database traffic and can become slower or less reliable under load.
- Recommended fix: Replace the per-song lookups with one workspace-constrained latest-version query that preserves pending-upload filtering and song order.
- Fix risk: Medium. A combined limit or incorrect grouping could select the wrong version or expose a cross-workspace song.
- Status: Open.
- Verification: Static data-flow review confirmed the per-song query pattern. No fix measured yet.
- Before and after: Warm public playlist content readiness is 1,470 ms. No fix measured yet.

## Console observations

- `Could not establish connection. Receiving end does not exist.` does not come from the app code found in this repository and is consistent with a browser extension messaging failure. The traced application requests still returned 200.
- The generated Next.js CSS preload warning did not correspond to a failed stylesheet request or a blocked dashboard render. There is no manual dashboard CSS preload in the repository. It is being tracked as low-priority console noise, not as the cause of the delay.

## Verification status

- Stage 1 foundation checks: passed.
- Stage 2 functional safety checks: passed, including collaboration notifications and workspace access separation.
- Stage 3 baseline: captured for public routes and the authenticated dashboard request chain. Authenticated song/version journey timings still need to be captured during later batches.
- Stage 4 fixes: shared dashboard bootstrap concurrency implemented and measured. The dashboard query waterfall is next.
- Stage 5 regression and production readiness: not started.
