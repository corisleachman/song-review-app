# Song Room launch checklist

Last reconciled: 2 November 2026. This is the current progress page. Keep this URL in every completion update so we can always see what's left.

## Where we are

Public beta is live. Five foundation stages are done. Security closeout is in progress, followed by launch QA, discoverability closeout and the wider-launch decision. Stage counts describe scope, not a percentage of engineering effort.

| Stage | Status | What it covers | Evidence or exit condition |
| --- | --- | --- | --- |
| L0. One current plan | Done | Reconcile roadmap, release notes and backlog; establish this page and update rules | Reconciliation recorded on 1 November; older plans explicitly marked historical |
| L1. Public account foundation | Done | Google sign-in, canonical profiles, workspaces, membership and invites | Existing production releases; [rollout history](public-mvp-roadmap.md) |
| L2. Collaboration, plans and sharing | Done | Song/version feedback, uploads, playback, Free/Pro/Studio billing, public playlists and playlist embeds | Production rollout history; playback acceptance in [release log](UPDATE_LOG.md) |
| L3. Public email login and recovery | Done | Signup, confirmation, password login, recovery/reset alongside Google | Controlled production journey passed 25 October; [auth completion record](EMAIL_PASSWORD_STAGING_ROLLOUT.md#current-status-1-november-2026) |
| L4. Homepage readiness | Done | Clear login, repaired links, responsive presentation, local assets and initial-load improvements | PRs [53](https://github.com/corisleachman/song-review-app/pull/53), [61](https://github.com/corisleachman/song-review-app/pull/61), [62](https://github.com/corisleachman/song-review-app/pull/62); performance follow-up [63](https://github.com/corisleachman/song-review-app/pull/63) merged 31 October; final measurements belong to L6 |
| L5. Security closeout | In progress | Access boundaries, database warnings, abuse protection, validation, secrets and monitoring | Initial live inventory complete; remaining checks below must be resolved or explicitly accepted |
| L6. Performance and final launch QA | Not started | Dashboard loading/return and song-navigation performance work, then consolidated journey, browser/device, accessibility, links and payment sandbox checks | Recorded pass/fail matrix; no unresolved launch-blocking defects |
| L7. Discoverability closeout | Not started | Verify shipped SEO baseline, canonical host, alt text, FAQ scope and pending article | Production metadata/link checks and content decisions recorded; sitemap, robots and trust page already shipped |
| L8. Wider-launch decision | Not started | Review evidence, remaining risks, rollback and support readiness | L5-L7 complete; user records go/no-go for wider promotion |

Done means the named scope has recorded evidence, not that every future improvement in that area is finished. Later findings reopen the relevant stage. L8 does not authorise a marketing campaign or messages to others.

## Current stage: L5 security closeout

| ID | Check | Status | Evidence / next action | Owner |
| --- | --- | --- | --- | --- |
| S1 | Establish current security baseline | Done | Read-only production inventory: RLS on all 24 public tables; advisor has zero ERROR findings, five WARN findings and eight INFO findings. [Review record](LAUNCH_SECURITY_REVIEW.md) | Agent |
| S2 | Cross-workspace API and direct-database access | In progress | Canonical identity, thread path and eight dashboard/song/admin/internal route samples inspected; 42 local handler tests pass; B21 is installed on staging: 34 installed-definition SQL checks, six invitation checks and scoped browser checks pass. Production repair verified; broader API coverage remains. [Inventory of all 70 API route files](LAUNCH_API_ACCESS_MATRIX.md) created; exercise owner/member/outsider/public boundaries on staging. RLS enabled alone isn't a pass | Agent |
| S3 | Database function and policy review | In progress | Five search-path fixes and B21 migration installed on staging; zero staging security errors/warnings; 40 SQL checks and browser checks pass. [Review package](https://github.com/corisleachman/song-review-app/pull/67). Production repair verified; no public views in either environment. B23 original public Storage defect reproduced; compatible audio/artwork candidate and private staging cutover verified in scope. B23/B24/B25 are deployed and verified in Production in recorded scope; broader function/policy and route coverage remains open | Agent |
| S4 | Abuse protection coverage | In progress | Approved comment/invite limits implemented locally; shared database installed and tested on staging. Preview/Production rollout pending. Bootstrap, feedback concurrency and direct-database mutation coverage remain open | Agent |
| S5 | Input validation and safe errors | In progress | Audit mutation inputs, size/type limits, numeric bounds and error responses. Upload validation already has regression coverage | Agent |
| S6 | Secret handling and log safety | Not started | Recheck variable classification/scopes without exposing values; inventory logging and confirm redaction. Earlier Config-vs-Secret concern is unverified, not a proven leak | Agent |
| S7 | Monitoring, dependency and CI closeout | Not started | Production dependency audit: four low, zero moderate/high/critical advisories. Confirm alerts/retention; review open PRs and missing audit workflow | Agent |

Performance is the user's main MVP concern. B17-B19 are queued as the leading L6 workstream; capture does not interrupt the current L5 task. B06 six-month Free-to-Pro beta grants have confirmed product rules; implementation and expiry/billing boundary tests remain open.

Next action: continue the remaining L5 access/abuse-protection review, beginning with the broader S2 route matrix and S4 mutation coverage. B23/B24/B25 are released; no repeat phone/upload test is requested. B17-B19 remain the leading L6 performance workstream after security closeout.

## L6 acceptance checklist

| Check | Status | Successful result / stop condition |
| --- | --- | --- |
| Google and Email signup/login/recovery | Not started for consolidated pass | Existing users retain their identities and workspaces; stop for duplicate account, wrong-host mail or lost recovery |
| Invites and workspace separation | Not started for consolidated pass | Only intended membership changes; another workspace's private data remains inaccessible |
| Upload, first Play, seeking, commenting, restart, repeat and version changes | Not started for consolidated pass | Supported files work; no competing audio or wrong-version feedback; include phone background/lock screen |
| Free/paid limits, upgrade, checkout, cancellation and webhook reconciliation | Not started for consolidated pass | Use isolated Stripe test environment; correct plan/interval and preserved data; no live payment required |
| Forms, feedback, public sharing and embed revocation | Not started for consolidated pass | Clear validation; private material stays private; revocation removes public access |
| Accessibility and desktop/phone/tablet coverage | Not started for consolidated pass | Keyboard/focus/dialog checks, readable layouts and no overflow; physical 11-inch iPad remains additional coverage |
| Link crawl and SEO endpoints | Not started for consolidated pass | Intended internal links resolve; protected routes stay protected |
| Production performance after PR #63 | Not started | Repeat named mobile/desktop measurements; distinguish lab runs from field data; inspect LCP, CLS and transferred bytes |

Run local checks before staging journeys, then safe production smoke checks. Stop the affected rollout on failure and record environment, URL, step, expected/actual result, safe error/log excerpt and screenshot where useful. Never attach credentials or full auth links.

## Backlog and MVP requirements

Every new request gets a row here with a stable ID, status and stage assignment (or Later). Detail can stay in [PRODUCT_BACKLOG.md](PRODUCT_BACKLOG.md). Adding a request doesn't silently make it a launch blocker.

| ID | Item | Status | Stage / priority |
| --- | --- | --- | --- |
| B01 | Signed-in Account security: Add/Change password | Gated off; core recovery works | Separate auth release; explicit activation approval and verification required |
| B02 | Google return shows repeated loading experiences | Needs measurement | Later, P2 UX |
| B03 | Embed individual publicly shared songs | Not started; plan/access decision required | Later, P2 sharing; playlist embeds already done |
| B04 | Contextual upgrade prompts and durable funnel events | Foundation partly exists; event work pending | Review beta minimum during L6; automation later |
| B05 | Lifecycle and behavioural email | Deferred | Later; consent, events, deduplication and frequency controls first |
| B06 | [Owner signup directory/alerts and promotional Pro grants](PRODUCT_BACKLOG.md#b06-application-owner-admin-signups-and-promotional-pro-access) | Rules confirmed: Free-first beta testers, six months, manual owner grant; alerts to Coris for new accounts on any tier; not implemented/tested | MVP queue; S2 owner-only checks overlap; no activation yet |
| B07 | AIFF/AIF playback and waveform support | Deferred; new uploads blocked | Later, P3; preserve existing stored files |
| B08 | Microsoft login | Deferred by user | Later; revisit with traction/income |
| B09 | Physical 11-inch iPad Safari/Chrome coverage | Not yet recorded | L6 additional coverage; existing tablet release accepted |
| B10 | Dependency/workflow update PRs | Awaiting review | L5/S7; eight open update PRs at reconciliation |
| B11 | SEO article PR #12 | Awaiting review | L7 |
| B12 | Automated SEO content-engine draft PR #3 | Draft; not a launch commitment | Later |
| B13 | FAQ | Scope/implementation pending | L7 |
| B14 | Marketing image alt-text audit | Pending | L7 |
| B15 | Canonical host consistency | Pending verification | L7 |
| B16 | Remaining empty states, typography, workspace-switcher contrast and accessibility polish | Needs current-state triage; old plan isn't evidence of an open defect | L6; split confirmed defects into new rows |
| B17 | [Dashboard loading speed](PRODUCT_BACKLOG.md#b17-dashboard-measure-and-reduce-time-to-useful-songs-and-artwork) | User report; baseline and target pending | L6 leading performance workstream after current security slice |
| B18 | [Dashboard blank on return](PRODUCT_BACKLOG.md#b18-dashboard-retain-valid-songs-and-artwork-when-returning) | Reported defect; trigger unverified | L6 reliability; S2 cache isolation overlaps |
| B19 | [Dashboard-to-song navigation speed](PRODUCT_BACKLOG.md#b19-dashboard-to-song-measure-and-reduce-navigation-delay) | User report; baseline pending | L6 performance; canonical access must remain intact |
| B20 | [New-version collaboration notifications](PRODUCT_BACKLOG.md#b20-verify-notifications-for-new-version-uploads) | All-workspace-member delivery confirmed; capability/delivery untested | L6 dependability audit; no new channel assumed |
| B21 | [Membership RLS recursion](PRODUCT_BACKLOG.md#b21-membership-rls-recursively-evaluates-itself) | Production complete; staging and live checks pass | L5/S2-S3, P1 |
| B23 | [Private media public Storage access](PRODUCT_BACKLOG.md#b23-private-song-media-remains-accessible-through-permanent-public-storage-urls) | Production complete in verified scope via PR #68/ff15719f: buckets private; authorised public/private delivery works; legacy URLs refused. Cache/coverage limits recorded | L5/S2-S3, P1 privacy |
| B22 | [Unconfigured legacy password false success](PRODUCT_BACKLOG.md#b22-legacy-password-verifier-reports-success-when-unconfigured) | Production complete via PR #66; 121 tests and eight live smoke checks pass | L5/S2, P2 |

| B24 | [Align new audio uploads to 50 MB](PRODUCT_BACKLOG.md#b24-align-new-audio-uploads-to-50-mb) | Production complete: app/bucket/global ceiling 50 MB; exact/oversize upload verified on staging; Production configuration readback passes | L5/S5, P2; overlaps B23 |

| B25 | [Mobile first Play needs a second tap](PRODUCT_BACKLOG.md#b25-mobile-first-play-needs-a-second-tap) | Production deployed and live desktop playback verified; physical Chrome/iPhone fix accepted on staging with identical player code | L5/B23 staging acceptance, P1 playback |

| B26 | [Malformed comment requests and invalid timestamps](PRODUCT_BACKLOG.md#b26-comment-input-validation-and-timestamp-bounds) | Production complete via PR #69/1ff2727a: 281 tests and nine Preview/Production no-write probes pass; existing comment/throttle behaviour covered | L5/S5, P2 validation |

Exploratory ideas in ROADMAP.md (typing indicators, pinned comments, comparison view, waveform regions, exports, Slack, native mobile app, multitrack and video) remain unscheduled ideas. They aren't approved launch work. Delete/edit/auth/invite ideas in that old file must be checked against existing features before creating tasks.

## Keeping this page current

- Update this page in the same change as a completed stage or backlog item. Include implementation status separately from rollout status, dated evidence and any remaining limit.
- Include a link to this page in every completed-action reply. Use the same current page; add a dated checkpoint below so progress history remains visible.
- Add every new backlog request to the table above and its detailed record. Assign a stage or Later, owner where known, and a clear next action. Keep Done rows visible.
- Never replace evidence with a tick. A local pass, merged PR and verified production release are different states.
- Keep detailed security findings in repository review records. Don't publish this planning page as a new unauthenticated application route.

## Checkpoints

| Date | Completed action | Current stage | Remaining launch stages |
| --- | --- | --- | --- |
| 1 November 2026 | Staging connection verified from deployed client/server behaviour; waveform same-origin cookie fix tested; public/private playback, playlist transitions, Range and expired/fresh URL probes checked. Production and buckets unchanged | L5 Security closeout | L5, L6, L7, L8 |
| 1 November 2026 | Short expiry accepted; audio candidate passes 181 tests, TypeScript/lint/build locally. Staging configuration confirmation, artwork and hosted expiry/playback gates remain; no hosted change | L5 Security closeout | L5, L6, L7, L8 |
| 1 November 2026 | Storage review: zero public views in both environments; B23 private staging audio access confirmed by anonymous HEAD 200. Both buckets public in both environments; no hosted changes made | L5 Security closeout | L5, L6, L7, L8 |
| 1 November 2026 | Approved Production B21/S3 repairs installed; 16 read-only role checks, six metadata checks, private-schema exclusion and eight HTTP probes pass; authenticated song/version, upload title and collaborators verified. PR #67 merged | L5 Security closeout | L5, L6, L7, L8 |
| 1 November 2026 | Approved staging migrations installed; 34 installed-definition and six invitation SQL checks pass; scoped authenticated browser checks pass; staging advisor has zero errors/warnings. Production unchanged | L5 Security closeout | L5, L6, L7, L8 |
| 1 November 2026 | B21/S3 repair package prepared; 34 staging transaction checks, rollback verification and 151 local tests pass. Awaiting security-boundary review; no permanent DB change | L5 Security closeout | L5, L6, L7, L8 |
| 1 November 2026 | B22 deployed and verified live; 121 tests, four PR checks and eight production smoke checks passed. B21 remains open | L5 Security closeout | L5, L6, L7, L8 |
| 1 November 2026 | Executed staging role probes; found B21 membership recursion; added 12 handler tests and B22 fail-closed patch | L5 Security closeout | L5, L6, L7, L8 |
| 1 November 2026 | Confirmed B06 six-month Free-first manual grants, owner signup alerts for every tier, and B20 all-member version alerts; no feature activated | L5 Security closeout | L5, L6, L7, L8 |
| 1 November 2026 | MVP performance/notification requirements captured as B17-B20; existing admin B06 extended; security code review continued | L5 Security closeout | L5, L6, L7, L8 |
| 1 November 2026 | Records reconciled; current checklist established; live database security inventory completed | L5 Security closeout | L5, L6, L7, L8 |

## Source precedence

This page controls current priorities and stage status. PRODUCT_BACKLOG.md retains task detail; EMAIL_PASSWORD_STAGING_ROLLOUT.md and UPDATE_LOG.md retain dated release evidence. public-mvp-roadmap.md is historical phase planning. ROADMAP.md is an early ideas/implementation guide. When evidence conflicts, investigate and correct the current table instead of copying an old status forward.

## Private-media staging checkpoint, 1 November 2026

PR #68 source e19c8582: four green checks, 244 Node tests and hosted browser suite 28 passed/10 skipped. Both staging buckets are private; audio bucket 52428800 bytes, global 50 MB unchanged. Direct legacy audio/image URL probes fail after cutover; intended app delivery remains available in scoped checks. No Production media/configuration change. L5 remains in progress; L6-L8 remain not started. B17-B19 measurements are still pending. See Storage review for remaining acceptance and rollback.

## Mobile acceptance report, 2 November 2026

User reports the staging tests pass except repeatable first-play permission failure after new uploads on mobile, clarified as Chrome on iPhone. Second tap plays. Preserve this as user-reported acceptance, not independent proof of each row or final Production readiness. B25 tracks the confirmed symptom; delayed playback after waveform fetch/decode is the working cause found in code. Fix and phone retest come before B23 Production rollout. L5 remains in progress.

B25 candidate e5dd6435 is Ready on [new staging Preview](https://song-review-app-v2-d1qnlsvnw-corisleachmans-projects.vercel.app). CI run 41412981282 passes: 30 browser cases, 10 skipped; 245 Node tests and TypeScript pass. Hosted login/config/public song/artwork return 200; signed-out dashboard/private audio 401 and invalid artwork 404. Retest first Play in Chrome on the same iPhone before Production rollout.

## First-play acceptance, 2 November 2026

After the older e19 Preview was identified and the user switched to the corrected e5dd6435 Preview, the user confirmed “That worked”. B25 first-play phone retest is accepted on staging. This closes the specific first-tap defect gate, not every remaining agent-owned B23 test or Production rollout. Earlier broad staging acceptance remains user-reported. Next: finish outstanding B23 agent verification (controlled revocation/role coverage, upload boundary/cleanup and delivery-performance checks), then roll out compatible app before Production bucket changes. No repeat phone test requested now. L5 remains in progress.

## Live media verification and performance checkpoint, 2 November 2026

On accepted staging player e5dd6435: synthetic 52428800-byte WAV uploaded/finalized/played on first tap; database and Storage sizes match. A 52428802-byte WAV is rejected with no matching song/version/object. Account storage counter matches finalized versions through their parent songs. Both existing owner and a separate existing member play the private fixture; changing to another active workspace refuses its media request. Signed-out private requests are 401. No accounts or memberships were created/changed.

Public-song disable and playlist-entry removal refuse new authorisation; the playlist returns zero tracks after removal. An already-issued 600-second audio signature returns Range 206 while valid and 400 at expiry+3 seconds, before fixture deletion. This is one origin/region probe, not a global cache invalidation claim.

Current source 89bdf552 joins version/song and playlist/entry reads and parallelises independent public checks. Same-object interleaved transport samples after two warmups each, five samples per version: handler median 1067.8 → 748.0 ms (29.9% lower); HTTP median 1.273 → 1.078 s (15.3% lower). No dashboard/phone baseline claim. 246 Node tests, TypeScript, focused lint and both Vercel builds pass; browser CI 41422213111 has 30 passed/10 skipped. [Current measured Preview](https://song-review-app-v2-gp7sfh7t3-corisleachmans-projects.vercel.app). Phone-accepted player code is unchanged. Hosted current-source public playlist/song access and signed-out/revoked/removed-entry denials pass.

User approved deleting only the synthetic song and test playlist after verification. Cleanup is pending because Chrome automation is blocked by an open extension panel; close that panel to resume. Do not touch the separate existing upload flow in the in-app browser. Production app and bucket settings remain unchanged. L5 is still in progress; B17-B19 remain leading L6 work, not completed by these media measurements.

## Final candidate verification, 2 November 2026

Head 62ba8881 merges the current launch records; application code is identical to measured source 89bdf552. Primary Preview https://song-review-app-v2-65bhbnyrn-corisleachmans-projects.vercel.app is Ready at that exact head. Browser CI 41423050784 passes 30 cases/10 skipped. Exact-head HTTP checks pass: signed-out private 401, revoked synthetic share 404, intended public media 307 targeting staging. The separate secondary-project deployment check was still pending at this checkpoint. PR #68 is mergeable and remains draft. Approved fixture cleanup is still waiting on the Chrome extension panel; Production is unchanged. No repeat phone/upload test is requested.

## Staging closeout, 2 November 2026

The user closed Chrome's extension panel and browser access resumed. Approved synthetic song deletion used the app; its version and Storage audio object were removed. The empty approved test playlist has no UI delete control and was removed by a narrowly guarded staging SQL statement. Targeted readback confirms zero matching song/version/object/playlist/entry rows. Workspace storage counter fell by exactly 52428800 bytes to 64762207, equal to remaining finalized version sizes. Other songs and the separate in-app upload flow were preserved. All four PR checks now pass at 62ba8881. Code/staging closeout complete in recorded scope; Production rollout starts under standing release authority, with no migration required. L5 overall remains in progress.

## Production media release, 2 November 2026

PR #68 merged as ff15719f868442ae2f6690119d57981f8b93531a. Primary Vercel project song-review-app-v2 deployed that exact commit as dpl_5DUjouXJFu6ueiEuXwBgSkMHx6xW and serves [the live app](https://www.song-room.live/). Compatible app verification preceded bucket cutover. Both Production media buckets are now private; audio bucket 52428800 bytes; global 50 MB and enabled spend cap verified unchanged. No migration, new variable, dependency, account, membership, billing change or Production file deletion/upload was required.

Live checks: homepage/login/config/public song/public playlist 200; existing auth flags preserved; signed-out private media 401 and invalid artwork 404. Authorised audio 307 targets Production Storage; Range 206. Legacy public audio Range and previously primed artwork HEAD/GET return 400. Public artwork and three playlist images return 200. Signed-in owner dashboard shows 25 songs, all 23 delivered artwork images loaded; existing public and confirmed-private song playback advances on first Play, seek-to-zero works, playback left paused. Bounded Production error-log scan has zero matching rows. Physical phone acceptance is from staging; Production has no fresh upload/payment test. This is scoped verification, not every L5 route/role or a global CDN purge guarantee.

B23/B24/B25 released in that scope; L5 as a whole remains In progress. Earlier Production-pending statements are historical. Approved staging fixtures are fully removed. Rollback must retain compatible serving while buckets are private; prefer fix-forward, never silently reopen public access. Full evidence and limitations: [Storage review](STORAGE_ACCESS_REVIEW.md#production-release-2-november-2026).

## Comment-validation checkpoint, 2 November 2026

S4 inspection confirms owner-only invite creation can resend a pending invite on every successful POST, public comment throttling is per-instance best effort, and authenticated bootstrap upserts the profile on repeated reads. These are control/performance findings, not evidence of a live spam incident. Endpoint-specific durable limiting remains S4; bootstrap write cost overlaps B17 and no read throttle was added. B26 fixes independently reproduced malformed comment/timestamp inputs, with 281 local tests/TypeScript/focused lint passing. Staging/Production checks pending. No actual invite, comment or notification was sent.

## B26 Production checkpoint, 2 November 2026

PR #69 merged as 1ff2727a797bb800c6cd22f037dc0eff58b134b1. Primary Production deployment dpl_9TMhrEvBcWFypnDY7td9ARFSbt9G is Ready and serves www.song-room.live. 281 Node tests, TypeScript/focused lint and four PR checks pass; browser CI 41458296211 has 30 passed/10 skipped. Nine no-write probes pass on both Preview and Production: malformed public inputs 400, honeypot 200 without data access, unavailable-track 403, signed-out create/reply 401. Valid writes and notification scheduling are covered by stubbed local I/O; no real comment/invite/email was submitted.

S4 remains open. Proposed limits are awaiting user input, not implemented: existing public five/minute per visitor IP made durable; private create/reply share 30/minute per user; invite messages 30/hour per workspace with a 60-second per-recipient cooldown. Dashboard/sign-in reads stay outside these mutation budgets. L5 overall remains In progress; B17-B19 still lead L6.


## S4 approved-limit checkpoint, 2 November 2026

User approved public comments 5/minute/IP, private comments/replies shared 30/minute/user, and invitation attempts 30/hour/workspace plus a 60-second recipient cooldown. Code is local; the new service-role-only database function is installed on staging. Rolling-budget/permission/expiry probes pass and roll back. Ten concurrent staging requests allow exactly five public reservations and one same-recipient invitation reservation; synthetic counter rows removed. 307 Node tests, TypeScript and focused lint pass. No real invitation or notification was sent. Preview and Production release are pending; S4 remains in progress. Existing member direct-comment INSERT policies, feedback concurrency and bootstrap setup still need review. Dashboard/bootstrap/sign-in reads remain outside these budgets.
