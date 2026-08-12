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
| Dashboard data path after query consolidation | Signed in, same four-song preview workspace | 617 ms after identity | Down from 1,027 ms on the closest comparable trace |
| Dashboard after single-request initialization | Signed in, local dashboard cache bypassed | 1,750 ms server, 3,084 ms until songs visible | One dashboard request; no separate bootstrap request |
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
- Status: Implemented and measured. The authorized dashboard response carries the canonical identity and workspace plan it already resolved, removing the initial client request waterfall without starting competing account-bootstrap requests.
- Verification: Targeted lint, TypeScript, production build, both Vercel checks, preview deployment, the user's cold dashboard check, and switching into both preview workspaces passed. The trace contained one dashboard request and no bootstrap request. The first-login creation path remains ordered inside one request but has not been exercised with a new account.
- Before and after: The closest preceding preview spent about 2,825 ms of server time across bootstrap and dashboard requests. The verified single request took 1,750 ms, a 38% reduction in total server work. The browser reported songs visible at 3,084 ms on that cold, cache-bypassed visit; network and cold-start variability mean this isn't compared directly with the older request-chain figure.

### PERF-002: Repeated and sequential account bootstrap work

- Severity: High
- Evidence: `lib/bootstrapAccount.ts` writes the profile and resolves membership on every canonical identity call. The first concurrency batch overlapped those operations and stopped the all-memberships fallback after a valid active membership. Preview switching then showed active membership validation and workspace loading still taking consecutive 112 to 117 ms waits.
- User impact: Every authenticated route pays the canonical identity cost. After the dashboard waterfall fix, it accounted for 1,063 ms of the 1,750 ms cold server response and about 350 ms of warm active-workspace responses.
- Recommended fix: Use the HTTP-only active-workspace cookie to start the candidate workspace read alongside membership validation, but do not use or return that workspace until membership passes. Keep invalid-cookie fallback and first-account creation ordered.
- Fix risk: Low to medium. A stale or invalid cookie may cause one discarded workspace read, but must still fall back to the user's valid memberships without exposing candidate workspace data.
- Status: Implemented and measured. Profile sync, active membership validation, and candidate workspace loading now overlap. Candidate workspace data remains gated behind successful membership validation.
- Verification: Targeted lint, TypeScript, production build, both Vercel checks, preview deployment, runtime error scan, workspace switching, and the user's cold four-song dashboard check passed. The verified response retained four songs, five versions, two threads, and three comments.
- Before and after: The first overlap removed 125 to 312 ms of serialized database waiting per canonical identity call. On the verified cold active-workspace trace, identity fell from 1,063 ms to 652 ms, a 39% reduction, and the full dashboard response fell from 1,750 ms to 1,188 ms, a 32% reduction. Warm traces are more variable because one concurrent Supabase read sometimes queues, so no universal warm percentage is claimed.

### PERF-003: Dashboard data is assembled in multiple dependent query waves

- Severity: High
- Evidence: `app/api/dashboard/route.ts:84-138` loads songs, then versions/actions/members, then threads, then comments. The measured route spent 479 ms on identity, 120 ms on songs, 621 ms on related data, 307 ms on threads, and 110 ms on comments in the cold trace.
- User impact: Database round trips accumulate even though only four songs, five versions, two threads, and three comments were returned.
- Recommended fix: Avoid loading the full workspace directory when the initial dashboard needs names only for assigned actions. Continue reducing dependent comment query waves after measuring that change.
- Fix risk: Medium. Activity, action, version, and workspace boundaries must stay intact.
- Status: Implemented and measured for the current zero-action staging workspace. Full member loading is skipped when it is not needed, and finalized versions now carry their threads and comments in one related-data request.
- Verification: Targeted lint, TypeScript, production builds, both Vercel checks, preview deployments, authenticated responses, and the user's cold dashboard check passed. The final trace retained four songs, five versions, two threads, and three comments. It contained no separate `threads` or `comments` timing stage. The assigned-action name path still needs a staging regression when suitable data is available.
- Before and after: The member batch reduced a comparable `related` stage from 606 ms to 360 ms, or 41%. Embedding threads then reduced a comparable whole dashboard route from 2,236 ms to 1,980 ms, or 11%, while identity time stayed within 10 ms. After comments were embedded as well, the comparable post-identity data path fell from about 1,027 ms to 617 ms, a 40% reduction. The whole route was 1,366 ms in that sample, but identity variability means the data-path comparison is the reliable result.

### PERF-004: Public playlist latest-version lookup scales with song count

- Severity: Medium
- Evidence: `app/api/public/playlist/[id]/route.ts:97-105` calls `getLatestPlayableVersion` once per playlist song. The calls run concurrently but still create one database request per song.
- User impact: Larger public playlists create more database traffic and can become slower or less reliable under load.
- Recommended fix: Replace the per-song lookups with a paginated, workspace-constrained version read that preserves pending-upload filtering and song order without relying on the server response row limit.
- Fix risk: Medium. A combined limit or incorrect grouping could select the wrong version or expose a cross-workspace song.
- Status: Baseline measured. The paginated combined version read and independent metadata-read overlap are in local verification.
- Verification: The user's cold and warm public playlist checks retained three ordered, playable tracks. The original combined read previously dropped a newest track after hitting the response row limit, so the replacement paginates in 500-row pages and batches long song-ID lists.
- Before and after: The two baseline responses took 1,240 ms and 1,409 ms. Each made three latest-version requests and spent 319 ms in that stage. The optimized result is not yet measured.

## Console observations

- `Could not establish connection. Receiving end does not exist.` does not come from the app code found in this repository and is consistent with a browser extension messaging failure. The traced application requests still returned 200.
- The generated Next.js CSS preload warning did not correspond to a failed stylesheet request or a blocked dashboard render. There is no manual dashboard CSS preload in the repository. It is being tracked as low-priority console noise, not as the cause of the delay.

## Verification status

- Stage 1 foundation checks: passed.
- Stage 2 functional safety checks: passed, including collaboration notifications and workspace access separation.
- Stage 3 baseline: captured for public routes and the authenticated dashboard request chain. Authenticated song/version journey timings still need to be captured during later batches.
- Stage 4 fixes: account bootstrap, active-workspace identity, all four dashboard query batches, and single-request dashboard initialization are implemented and measured. The public-playlist query pattern is next; the assigned-action name path still needs a data-backed regression check.
- Stage 5 regression and production readiness: not started.
