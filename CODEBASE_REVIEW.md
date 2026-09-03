# Staged Codebase Review Record

Last updated: 19 August 2026

This is the working evidence record for the staged review that began on `codex/staged-code-review-fixes`. Findings stay here until they are verified, deferred with a reason, or closed. The main review rollout reached production on 13 August 2026; focused follow-up batches continue from that deployed base.

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
- Status: Implemented and measured. The route now uses a paginated combined version read and overlaps independent workspace-name and ordered-membership reads.
- Verification: Targeted lint, TypeScript, production build, both Vercel checks, preview deployment, direct API verification, and the user's first/last-track playback check passed. All three tracks remained present and ordered. The replacement paginates in 500-row pages and batches long song-ID lists.
- Before and after: The two baseline responses took 1,240 ms and 1,409 ms and made three latest-version requests. The verified optimized response took 1,278 ms and made one version request, a 67% query-count reduction and about 9% response-time reduction against the comparable 1,409 ms sample. Similar per-query latency limited the end-to-end change on this three-track playlist.

## Stage 5 production-readiness audit

### Readiness decision

The review rollout is production-complete. The final audit found two permissive database policies and a song-deletion accounting gap; both were fixed, verified on staging, applied migration-first to production, and verified again on the live application before and after PR #2 merged.

The API authorization review did not find a route-level cross-workspace bypass. Authenticated service-role routes resolve the Supabase user server-side, derive the active workspace from validated membership, and compare the target record's workspace before reading or mutating it. Public song and playlist routes keep explicit sharing checks. Stripe events are signature-verified, and internal notification requests use a time-limited HMAC.

### Fixed release blockers

#### SEC-001: Permissive policies overrode scoped song and settings access

- Priority: P1
- Evidence: `supabase/migrations/20260730171202_remote_schema.sql:523` contained a song `SELECT` policy with `USING (true)`. Line 630 contained an authenticated settings policy with unrestricted `USING` and `WITH CHECK` rules. PostgreSQL combines permissive policies with OR, so these rules bypassed the newer member and public-share policies.
- Production evidence: A read-only anonymous Data API check returned an `is_public = false` song row before remediation. No identifiers or song content were logged.
- Fix: `20260812200000_remove_permissive_rls_policies.sql` removes both policies. The earlier policy migration now recreates only workspace-scoped settings policies and explicitly drops the legacy song policy.
- Verification: The migration is applied on staging and production. A service-role check confirmed a private fixture exists, while the same anonymous query returns no rows. Production migration history aligns with all 14 canonical migrations.
- Rollout status: Production complete on 13 August 2026.

#### DATA-001: Song deletion left storage usage and objects behind

- Priority: P1
- Evidence: `app/api/songs/[songId]/route.ts` deleted relational rows but did not remove audio or cover objects and did not decrement `accounts.storage_bytes_used`. Upload finalisation increments that counter in `20260811130000_version_upload_integrity.sql`.
- User impact: Deleting songs could leave paid storage consumed and make a workspace hit its quota even though the songs had gone. Copied raw media URLs could also remain reachable.
- Fix: `20260812201000_song_deletion_storage_accounting.sql` adds a service-role-only transaction that locks the song, versions, and account; releases only finalized bytes; deletes the song through database cascades; and returns the object paths. The API removes those audio paths and the current cover in bounded batches after the transaction.
- Verification: An isolated staging fixture started at 123 bytes. The transaction returned one path and 123 released bytes, deleted the song, and left the temporary workspace at zero bytes. Cleanup removed the temporary workspace afterward. A user-facing preview test then uploaded and deleted a disposable song successfully; the dashboard stayed correct and the song's playlist membership was removed by the database cascade.
- Remaining risk: Database deletion and object removal cannot share one transaction. A storage failure is logged and returned as `storageCleanupPending`; the database and user quota still remain correct.

#### OPS-001: The historical RLS rollback restored blanket access

- Priority: P1
- Evidence: `migrations/20260520_rls_policies_down.sql` removed named policies and recreated `Allow all` rules across core workspace tables. Its ungrouped predicate could also select policies outside the intended schema.
- Fix: The rollback is now an explicit no-op with a notice. Security-policy regressions must be repaired with a forward migration.
- Verification: SQL diff review and linked staging database lint passed.

### Closed focused follow-ups

- UPLOAD-001: Production complete. Playlist-cover upload rejects oversized requests before multipart parsing, rejects empty, over-5 MB, and non-JPEG/PNG/WebP files before buffering, and caps Sharp decoding at 40 megapixels. The corrected flow preserves the saved cover and presents a focus-managed dialog with a specific recovery action. The user confirmed the normal-image persistence and sharing flow, then the oversized-file dialog, unchanged thumbnail, Escape dismissal, and choose-another-image flow. PR #15 merged as `da9330ce` on 13 August 2026.
- A11Y-001: Production complete across the semantic-controls, dialog-focus, contrast, and touch-target follow-ups. Native buttons and labelled state cover the primary upload, playlist, dashboard, and public-player journeys. Active dialogs share Escape dismissal, Tab containment, initial focus, and focus return. The text-only red token measures from 5.37:1 on `#0E0A0A` to 4.53:1 on `#261C1C`, while the darker brand red remains available for CTA backgrounds and borders. Compact controls on audited authenticated and public surfaces receive at least a 44-pixel target on coarse-pointer devices without changing mouse-oriented desktop density. PRs #17, #18, and #19 merged as `0401508c`, `923372a8`, and `800fc8dd`. The user passed the preview interaction checks, both PR #19 Vercel production checks passed, the live privacy and login routes returned `200`, and the production privacy response contained the new readable-red artifact.
- A11Y-002: Production complete. The homepage feature numbers now use a muted readable red at 3.50:1, the small footer wordmark uses the readable red at 4.90:1, and footer links and copyright text use a minimally lighter neutral at 4.61:1. The exact-selector Axe baseline has been removed. PR #29 squash-merged as `d3d78f8c`; both production deployments passed, the live homepage and login returned `200`, and a live desktop Axe scan found no serious or critical violations.
- TEST-001: Production complete. The Playwright suite exercises the public homepage, Google-only login, primary keyboard journeys, cookie rejection persistence, reduced motion, and phone-width overflow in desktop and mobile Chromium. Axe fails pull requests on serious or critical WCAG findings, and failed jobs retain screenshots, traces, test results, and an HTML report. PR #28 squash-merged as `0cc61bf6`; the browser job and both preview deployments passed before merge, both production deployments passed afterward, and the live homepage and login returned `200`.

### Remaining findings

#### P2

- PRIV-001: Both media buckets remain public by design. Turning off an app share link blocks the app route, but a raw storage URL copied earlier remains reachable. Private media delivery needs a separate migration and rollout.
- ABUSE-001: Public comment throttling is stored in process memory. It limits a single serverless instance but can be bypassed across instances or cold starts. Database constraints, a honeypot, and length validation still apply.
- CONFIG-001: Enforcement candidate verified in PR #47 Preview on `codex/csp-enforcement-readiness`. The report-only policy has been live since PR #30; the available seven-day production logs contain no CSP warnings, a fresh live crawl of the marketing, login, legal, blog, invite, public-listen, and embed surfaces found no policy violations, and the source audit found no new browser origin since the allowlist was tuned. The candidate changes only the route-aware header from reporting to enforcement, keeps the bounded sanitized report endpoint, and preserves `frame-ancestors *` for `/embed/*`. Local browser checks and the authenticated Preview journey passed. The only blocked Preview request was Vercel's injected Toolbar script, which is not part of Song Room and remains intentionally excluded; the remaining console messages came from browser extensions. Production rollout remains pending.

#### P3

- PERF-005: The dashboard and authenticated version route still ship about 193 kB and 194 kB of first-load JavaScript. Their client components are 2,406 and 3,509 lines, and 16 raw image elements remain. The measured request-path work is much better, but component splitting and image loading remain useful follow-ups.
- THEME-001: The brand is consistent, but CSS contains substantially more literal color declarations than token references. This makes contrast fixes and future theme changes harder to apply consistently.

### Interface audit score

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Accessibility | 3/4 | Global focus, reduced-motion, primary-control semantics, dialog focus, and coarse-pointer targets are in place. The browser gate covers public flows with no serious or critical homepage baseline remaining. |
| Performance | 3/4 | Dashboard and public-playlist query waves were measured and reduced; large client routes and raw images remain. |
| Theming | 2/4 | Distinctive shared palette and typography, with extensive literal color duplication. |
| Responsive design | 3/4 | Eighteen CSS modules include mobile breakpoints and the staged mobile journeys passed; a few compact targets and fixed-size controls remain. |
| Anti-pattern resistance | 4/4 | Pass. The industrial music-workspace character, typography, squared geometry, and waveform-led interaction feel specific to Song Room rather than generic template UI. |
| **Total** | **15/20** | **Strong foundation; remaining work is recorded above.** |

### Positive findings

- Workspace ownership checks are consistently enforced before service-role mutations.
- Upload allocation and finalisation are idempotent, quota-aware, and hide pending uploads from normal reads.
- Public responses return narrow fields, preserve explicit share gates, and do not expose private comment or version history through app routes.
- Reduced-motion support is global, key modal components use a reusable focus trap, and mobile layouts exist for every main user journey reviewed.
- `npm audit --omit=dev` reports zero known production dependency vulnerabilities.

### PR, rollout, and rollback state

- PR #2 was squash-merged into `clone-clean` as `648019f9` after both Vercel checks passed.
- All eight pending migrations were applied to production in timestamp order before the application deployment. Production and local migration history now align.
- The validated preview tree matched the squash-merge tree exactly and was promoted as production deployment `dpl_Eo9XPBCMdnxLUXJFYxwHMHcuiLXj`.
- The playlist-cover hardening follow-up merged through PR #15 as `da9330ce`.
- The accessibility follow-ups merged through PRs #17, #18, and #19 as `0401508c`, `923372a8`, and `800fc8dd`. Both Vercel production checks passed for the final merge and the live artifact check confirmed the readable-red update.
- The mobile interface follow-ups merged through PRs #21 to #26 as `779501d5`, `d3237af0`, `ec006494`, `a3afc4b1`, `b056cdc9`, and `d5181516`. Both Vercel checks passed for every merge, the affected phone flows passed real-device preview checks, and the final live homepage served the approved Song Room hero spacing.
- The browser regression suite merged through PR #28 as `0cc61bf6`. Its GitHub Actions job and both Vercel checks passed, and both live public routes remained available after production deployment.
- The homepage contrast closeout merged through PR #29 as `d3d78f8c`. Both production deployments passed, the live public routes and exact colour artifacts were present, and the live Axe scan remained clear of serious or critical violations.
- Application rollback uses the previous Vercel deployment. Leave the two security migrations applied during an app rollback. Restoring the permissive policies is not a safe rollback.
- The song-deletion function has a down migration, but it should be dropped only after the application has been rolled back to code that does not call it.

## Console observations

- `Could not establish connection. Receiving end does not exist.` does not come from the app code found in this repository and is consistent with a browser extension messaging failure. The traced application requests still returned 200.
- The generated Next.js CSS preload warning did not correspond to a failed stylesheet request or a blocked dashboard render. There is no manual dashboard CSS preload in the repository. It is being tracked as low-priority console noise, not as the cause of the delay.
- The first post-release log scan found one already-used Supabase refresh token on `/icon.svg`. It returned `307`, caused no `5xx`, and did not interrupt the successful signed-in smoke test. The middleware matcher now excludes paths ending in a file extension, keeping authentication work on application routes rather than static assets.

## Verification status

- Stage 1 foundation checks: passed.
- Stage 2 functional safety checks: passed, including collaboration notifications and workspace access separation.
- Stage 3 baseline: captured for public routes and the authenticated dashboard request chain. Authenticated song/version journey timings still need to be captured during later batches.
- Stage 4 fixes: account bootstrap, active-workspace identity, all four dashboard query batches, single-request dashboard initialization, and public-playlist query consolidation are implemented and measured. Assigned-action and playlist playback regression checks passed in preview.
- Stage 5 regression and production readiness: production complete. Public playlist playback, song deletion, playlist cascade cleanup, signed-in dashboard loading, song opening, and playback all passed. The database and application rollout checks are recorded above, and the remaining P2/P3 findings stay documented for focused follow-up work.
- Focused upload, accessibility, mobile interface, browser-test, and homepage-contrast follow-ups: production complete through PRs #15, #17 to #26, #28, and #29. CONFIG-001 passed its enforced PR #47 Preview journey and console review; production rollout remains pending. No confirmed P1 issue remains from this review.
