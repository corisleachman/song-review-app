# Song Room launch checklist

Last reconciled: 5 November 2026. This is the current progress page. Keep this URL in every completion update so we can always see what's left.

## Where we are

Public beta is live. Five foundation stages are done. Security closeout is accepted for the current beta. Performance and launch QA are next, followed by discoverability closeout and the wider-launch decision. Stage counts describe scope, not a percentage of engineering effort.

| Stage | Status | What it covers | Evidence or exit condition |
| --- | --- | --- | --- |
| L0. One current plan | Done | Reconcile roadmap, release notes and backlog; establish this page and update rules | Reconciliation recorded on 1 November; older plans explicitly marked historical |
| L1. Public account foundation | Done | Google sign-in, canonical profiles, workspaces, membership and invites | Existing production releases; [rollout history](public-mvp-roadmap.md) |
| L2. Collaboration, plans and sharing | Done | Song/version feedback, uploads, playback, Free/Pro/Studio billing, public playlists and playlist embeds | Production rollout history; playback acceptance in [release log](UPDATE_LOG.md) |
| L3. Public email login and recovery | Done | Signup, confirmation, password login, recovery/reset alongside Google | Controlled production journey passed 25 October; [auth completion record](EMAIL_PASSWORD_STAGING_ROLLOUT.md#current-status-1-november-2026) |
| L4. Homepage readiness | Done | Clear login, repaired links, responsive presentation, local assets and initial-load improvements | PRs [53](https://github.com/corisleachman/song-review-app/pull/53), [61](https://github.com/corisleachman/song-review-app/pull/61), [62](https://github.com/corisleachman/song-review-app/pull/62); performance follow-up [63](https://github.com/corisleachman/song-review-app/pull/63) merged 31 October; final measurements belong to L6 |
| L5. Security closeout | Done for current beta | Access boundaries, database warnings, abuse protection, validation, secrets and monitoring | User accepted S2/S5 limits on 4 November; recorded S3/S4/S6/S7 scopes retained. Named consolidated checks carry to L6 and limits to L8 |
| L6. Performance and final launch QA | In progress (baseline) | Dashboard loading/return and song-navigation performance work, then consolidated journey, browser/device, accessibility, links and payment sandbox checks | Recorded pass/fail matrix; no unresolved launch-blocking defects |
| L7. Discoverability closeout | Done in recorded scope | Canonical host, article, FAQ and scoped image audit | Live canonical metadata, sitemap, article links, FAQ keyboard interaction and corrected image descriptions verified |
| L8. Wider-launch decision | Evidence review started | Review evidence, remaining risks, rollback and support readiness | L5-L7 complete; user records go/no-go for wider promotion |

Done means the named scope has recorded evidence, not that every future improvement in that area is finished. Later findings reopen the relevant stage. L8 does not authorise a marketing campaign or messages to others.

<a id="current-stage-l5-security-closeout"></a>

## L5 security closeout: accepted for current beta

| ID | Check | Status | Evidence / next action | Owner |
| --- | --- | --- | --- | --- |
| S1 | Establish current security baseline | Done | Read-only production inventory: RLS on all 24 public tables; advisor has zero ERROR findings, five WARN findings and eight INFO findings. [Review record](LAUNCH_SECURITY_REVIEW.md) | Agent |
| S2 | Cross-workspace API and direct-database access | Done for current beta | User accepted 4 November: 581 tests, installed database-role probes and staged owner/member/revocation flows. Exhaustive hosted role/method combinations remain untested; some legacy bad requests return safe generic500. Consolidated checks remain L6. [Accepted scope](LAUNCH_SECURITY_REVIEW.md#remaining-l5-beta-closeout-proposal4-november2026) | Agent |
| S3 | Database function and policy review | Done in recorded scope | All25 public table policies/ACLs and19 application functions reviewed; B21/B23/B28/B32/B34-B39 repaired in recorded scope. Post-B39 table29 and function19 drift checks pass both DBs; zero advisor ERROR/WARN. Hosted API roles remain S2. [Review record](LAUNCH_SECURITY_REVIEW.md) | Agent |
| S4 | Abuse protection coverage | Done for current beta | User accepted4 Nov: approved comment/invite/feedback budgets and Auth CAPTCHA/provider controls; no new general quotas. Public telemetry has no app quota; provider end-user IP attribution unverified. Revisit at L8. [Review record](LAUNCH_SECURITY_REVIEW.md) | Agent |
| S5 | Input validation and safe errors | Done for current beta | User accepted 4 November: 581 tests, installed database-role probes and staged owner/member/revocation flows. Exhaustive hosted role/method combinations remain untested; some legacy bad requests return safe generic500. Consolidated checks remain L6. [Accepted scope](LAUNCH_SECURITY_REVIEW.md#remaining-l5-beta-closeout-proposal4-november2026) | Agent |
| S6 | Secret handling and log safety | Done in recorded scope | B30 approved and complete: three credentials converted to Secret with values/scopes preserved; Production/Preview rebuilds and scoped smoke checks pass. 483 tracked-file scan and 13 public chunks show no credential-pattern matches; 43 client-root import paths do not reach private-env modules. B31/PR #77 is Production verified: 85 raw diagnostic arguments projected safely, CSP capabilities/paths omitted; actual Preview/Production control logs verified. Historical logs and response-error review are separate | Agent |
| S7 | Monitoring, dependency and CI closeout | Done for current beta | 2 November audit reconfirms four low, zero moderate/high/critical advisories. Existing Vercel prebuild runs unit tests; dependency audit gate merged/verified via PR #76; open PRs triaged. Hobby one-hour logs and release-time checks explicitly accepted for beta; no paid monitoring. Revisit at L8 | Agent |

Performance is the user's main MVP concern. B17-B19 are the active leading L6 workstream; L5 beta scope is accepted. B06 six-month Free-to-Pro beta grants have confirmed product rules; implementation and expiry/billing boundary tests remain open.

## Current stage: L6 performance and final launch QA

Next action: measure B17-B19 dashboard loading, return/cache isolation and song navigation. Two-song staging baseline and scoped B18/B19 releases recorded. Production25-song timings and approved Dublin trial recorded; user reports much faster/more responsive. Provider-origin tails remain open; proceed to [physical-device playback](LAUNCH_DEVICE_ACCEPTANCE.md). L5 beta exit was explicitly accepted on 4 November; unperformed matrix checks remain unperformed.

## L6 acceptance checklist

| Check | Status | Successful result / stop condition |
| --- | --- | --- |
| Google and Email signup/login/recovery | 25 Oct Production Email journey and 4 Nov staging password login carried forward. User confirmed fresh Production Google sign-in with existing workspace and songs | Existing users retain their identities and workspaces; stop for duplicate account, wrong-host mail or lost recovery |
| Invites and workspace separation | Prior hosted B35 accept/remove/replay and B40 outsider/member/removal checks carried forward. Wider matrix open | Only intended membership changes; another workspace's private data remains inaccessible |
| Upload, first Play, seeking, commenting, restart, repeat and version changes | iPhone17 Pro Max/Chrome requested audio flow reported functional; B42 metadata handoff reproduced outside app. Broader consolidated pass open | Supported files work; no competing audio or wrong-version feedback; include phone background/lock screen |
| Free/paid limits, upgrade, checkout, cancellation and webhook reconciliation |5 Nov: Sandbox Pro monthly payment and activation passed;2 songs preserved. Portal paid invoice verified. Cancellation independently confirmed for5 Dec2026; database/dashboard retain Pro and2 songs. B43 isolated expiry and replay passed. Persistent hosted delivery open | Use isolated Stripe test environment; correct plan/interval and preserved data; no live payment required |
| Forms, feedback, public sharing and embed revocation | Scoped local contracts and Production read checks passed. Staging negative form checks and playlist revocation passed in recorded scope. Issued audio URLs remain usable until expiry | Clear validation; private material stays private; revocation removes public access |
| Accessibility and desktop/phone/tablet coverage |5 Nov scoped desktop feedback-dialog keyboard pass; 6 Nov local public browser suite 20 passed, 8 expected skips. Physical iPad and wider accessibility remain open | Keyboard/focus/dialog checks, readable layouts and no overflow; physical 11-inch iPad remains additional coverage |
| Link crawl and SEO endpoints | Scoped Production pass5 Nov:14 public URLs, static anchors and4 signed-out protected routes; broader dynamic links remain open | Intended internal links resolve; protected routes stay protected |
| Production performance after PR #63 | 8 Nov homepage lab baseline recorded. Field performance remains open | Repeat named mobile/desktop measurements; distinguish lab runs from field data; inspect LCP, CLS and transferred bytes |

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
| B09 | Physical 11-inch iPad Safari/Chrome coverage | Open. Physical iPad unavailable | L6 additional coverage; existing tablet release accepted |
| B10 | Dependency/workflow update PRs | Awaiting review | L5/S7; eight open update PRs at reconciliation |
| B11 | SEO article PR #12 | Production complete, 8 Nov. PR #12 merged and live article, metadata, links and sitemap verified | L7 |
| B12 | Automated SEO content-engine draft PR #3 | Draft; not a launch commitment | Later |
| B13 | FAQ | Production complete in PR #108. Live keyboard interaction verified | L7 |
| B14 | Marketing image alt-text audit | Scoped live inventory: 19 homepage images with alt attributes. Two lock-screen captions and alt descriptions corrected and verified in Production in PR #107 | L7 |
| B15 | [Canonical host consistency](PRODUCT_BACKLOG.md#b15-canonical-host-consistency) | Production complete: PR89/0eb8b70c, primary www alias/source verified; six pages200 and canonical/OG metadata, nine sitemap entries and two redirects pass | Existing L7 verification/alignment |
| B16 | Remaining empty states, typography, workspace-switcher contrast and accessibility polish | Needs current-state triage; old plan isn't evidence of an open defect | L6; split confirmed defects into new rows |
| B17 | [Dashboard loading speed](PRODUCT_BACKLOG.md#b17-dashboard-measure-and-reduce-time-to-useful-songs-and-artwork) | 25-song Production baseline3.72-4.45s; app iad1/database Ireland mismatch verified. [Primary-region test](B17_FUNCTION_REGION_REVIEW.md) approved; primary dub1 live after passed staging/crossover; user reports much faster/more responsive; provider-origin stalls persist in both regions. B17 remains open | L6 leading performance workstream after current security slice |
| B18 | [Dashboard blank on return](PRODUCT_BACKLOG.md#b18-dashboard-retain-valid-songs-and-artwork-when-returning) | Scoped refresh fix Production complete via PR91/f189c38b; user cards-visible pass. Broader lifecycle/error/isolation matrix open | L6 reliability; S2 cache isolation overlaps |
| B19 | [Dashboard-to-song navigation speed](PRODUCT_BACKLOG.md#b19-dashboard-to-song-measure-and-reduce-navigation-delay) | Scoped join fix Production complete: PR92/b0542d48; audio pass/paused verified. DB calls2-to-1; broader timing target/device QA open | L6 performance; canonical access must remain intact |
| B20 | [New-version collaboration notifications](PRODUCT_BACKLOG.md#b20-verify-notifications-for-new-version-uploads) | One allowlisted staging email delivered and correct version link verified. Draft PR #110 defaults off. Production activation pending | L6 dependability audit |
| B21 | [Membership RLS recursion](PRODUCT_BACKLOG.md#b21-membership-rls-recursively-evaluates-itself) | Production complete; staging and live checks pass | L5/S2-S3, P1 |
| B23 | [Private media public Storage access](PRODUCT_BACKLOG.md#b23-private-song-media-remains-accessible-through-permanent-public-storage-urls) | Production complete in verified scope via PR #68/ff15719f: buckets private; authorised public/private delivery works; legacy URLs refused. Cache/coverage limits recorded | L5/S2-S3, P1 privacy |
| B22 | [Unconfigured legacy password false success](PRODUCT_BACKLOG.md#b22-legacy-password-verifier-reports-success-when-unconfigured) | Production complete via PR #66; 121 tests and eight live smoke checks pass | L5/S2, P2 |

| B24 | [Align new audio uploads to 50 MB](PRODUCT_BACKLOG.md#b24-align-new-audio-uploads-to-50-mb) | Production complete: app/bucket/global ceiling 50 MB; exact/oversize upload verified on staging; Production configuration readback passes | L5/S5, P2; overlaps B23 |

| B25 | [Mobile first Play needs a second tap](PRODUCT_BACKLOG.md#b25-mobile-first-play-needs-a-second-tap) | Production deployed and live desktop playback verified; physical Chrome/iPhone fix accepted on staging with identical player code | L5/B23 staging acceptance, P1 playback |

| B26 | [Malformed comment requests and invalid timestamps](PRODUCT_BACKLOG.md#b26-comment-input-validation-and-timestamp-bounds) | Production complete via PR #69/1ff2727a: 281 tests and nine Preview/Production no-write probes pass; existing comment/throttle behaviour covered | L5/S5, P2 validation |
| B27 | [First-time workspace race/orphan repair](PRODUCT_BACKLOG.md#b27-first-time-workspace-creation-race-and-orphan-risk) | Production complete via PR #73/ce346868; both user tests passed, one Free workspace/owner link verified, live checks pass | Existing L5/S4 setup review; no new launch policy |
| B28 | [Anonymous raw song/version projection bypass](PRODUCT_BACKLOG.md#b28-anonymous-raw-songversion-data-bypasses-public-projections) | Production complete via PR #74/6288e354; installed-role, raw REST and public-sharing checks pass | Existing L5/S2/S3 access review |
| B29 | [Safe settings/billing exception responses and access checks](PRODUCT_BACKLOG.md#b29-raw-exception-messages-in-settings-and-billing-responses) | Production complete via PR #75/25b96370; 377 tests, CI and 12 post-release signed-out checks pass | Existing L5/S2/S5 |
| B30 | [Credential Config-to-Secret classification](PRODUCT_BACKLOG.md#b30-credential-config-to-secret-classification) | Complete in approved scope: three existing credentials now Secret; scopes preserved, rebuilds/live checks pass | Existing L5/S6 |
| B31 | [Safe server diagnostics and CSP URL redaction](PRODUCT_BACKLOG.md#b31-raw-exception-and-csp-url-content-in-server-diagnostics) | Production complete via PR #77/6ba2c817; 387 tests, CI and hosted redaction/public/media checks pass | Existing L5/S6 logging review |
| B32 | [Server-only core account writes](PRODUCT_BACKLOG.md#b32-direct-client-writes-bypass-core-account-and-billing-controls) | Production complete via PR #78/126825bf; actual owner save accepted, fixture removed, installed19 checks and live REST/public/media checks pass | Existing L5/S2/S3; resolve before L5 closeout |
| B33 | [Safe unexpected-error responses](PRODUCT_BACKLOG.md#b33-safe-unexpected-error-responses) | Production complete via PR #79/98f4132f; 425 tests, four CI checks and Preview/Production access/public/media checks pass | Existing L5/S5 |

| B34 | [Server-only membership writes](PRODUCT_BACKLOG.md#b34-direct-client-membership-writes-bypass-owner-controls) | Production installed/verified: installed23, bootstrap14 and invite4 checks pass in each environment; staging owner removal accepted; fixture removed; [PR #80](https://github.com/corisleachman/song-review-app/pull/80) | Existing L5/S2/S3, P1; remaining broader coverage open |

| B35 | [Accepted invite restores removed membership](PRODUCT_BACKLOG.md#b35-accepted-invitation-recreates-removed-membership) | Production complete in recorded scope: installed11, membership23 and bootstrap14 pass both environments; actual staging accept/remove/replay rejected; fixture removed; PR #81 | Existing L5/S2/S3, P1 access revocation |

| B36 | [Server-only song/version writes](PRODUCT_BACKLOG.md#b36-direct-songversion-writes-bypass-upload-and-accounting-controls) | Production complete in recorded scope: installed40 pass both; actual staging upload/finalize/play/rename/version edit/delete pass; object/counter cleanup verified; PR #82 | Existing L5/S2/S3, P1 upload/accounting |

| B37 | [Server-only collaboration mutations](PRODUCT_BACKLOG.md#b37-direct-collaboration-writes-bypass-parent-and-author-checks) | Production complete in recorded scope: installed81 pass both; actual staging comment/reply/action/task/playlist lifecycle passes; fixtures removed; PR #83 | Existing L5/S2/S3, P1 context/attribution |

| B38 | [Server-owned legacy billing records](PRODUCT_BACKLOG.md#b38-client-writes-can-forge-unused-legacy-billing-records) | Production complete, 4 Nov: installed84 pass both; settings/plan reads preserved | Existing L5/S3 P2 hardening; no demonstrated paid-access bypass or new launch blocker |
| B39 | [Preserve playlist workspace/song linkage](PRODUCT_BACKLOG.md#b39-direct-playlist-header-writes-can-transfer-foreign-song-links) | Production complete,4 Nov: installed25 pass both; staged playlist flow/cleanup verified | Existing L5/S2-S3 security defect; approval required for permanent permission change |
| B40 | [Action/task mutation input validation](PRODUCT_BACKLOG.md#b40-actiontask-mutations-accept-malformed-input) | Production complete:PR87/613a1426 live; user member/reorder accepted; fixtures0; seven safe live checks pass | Existing L5/S5 validation |
| B41 | [Remaining metadata request validation](PRODUCT_BACKLOG.md#b41-metadata-requests-accept-malformed-input-and-playlist-reorder-hides-failure) | Production complete:PR88/1d8fe5a7 live; user playlist accepted, fixtures0, ten live malformed methods401 and public/auth checks pass | Existing L5/S5 validation |
| B42 | [First lock-screen Pause metadata handoff](PRODUCT_BACKLOG.md#b42-first-lock-screen-pause-shows-another-apps-metadata) | Initial metadata handoff reproduced in Google reference player too; audio stays paused. Follow-up wake also clears reference artwork. Platform/UI limitation monitored; no app patch | L6 targeted device follow-up; no new launch-blocker classification |
| B43 | [Staging Stripe webhook verification gap](PRODUCT_BACKLOG.md#b43-staging-stripe-webhook-verification-gap) | Isolated Test mode expiry and duplicate replay passed on protected Preview. Persistent provider endpoint open | Existing L6 payment reconciliation check |
| B44 | [Older Stripe subscription events overwrite current plan](PRODUCT_BACKLOG.md#b44-older-stripe-subscription-events-overwrite-current-plan) | Linked-subscription guard passed local stale-event cases and genuine Test mode expiry on Preview. Production rollout pending | L6 billing reconciliation |

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


## S4 API-limit Production checkpoint, 2 November 2026

PR [#70](https://github.com/corisleachman/song-review-app/pull/70) merged as 1352dd8c; primary Production deployment dpl_3gZwUK8rRnpYGodCdi9LQuo3nVQZ is Ready and assigned to www.song-room.live. The additive database migration was installed and verified first in both environments. Installed function bodies match repository source; permissions/rolling-budget/expiry probes pass and roll back. 307 Node tests, TypeScript/focused lint, all four PR checks and browser CI 41464265520 (30 passed/10 skipped) pass. Hosted staging accepted five synthetic public comments, blocked the sixth with 429 and still served the five comments with GET 200. The disposable track/comments are removed. No real invitation or notification email was sent; invite/private valid paths use stubbed provider/notification I/O. Eight Production no-write HTTP checks pass; bounded error/fatal log scans have zero rows. No new environment/provider configuration or user action is required.

These approved API budgets are released in scope. S4 and L5 remain In progress: both environments retain authenticated member INSERT policies/grants on private comments/threads, which allow a separate Data API path outside API budgets. No live abuse incident is claimed. Feedback concurrency, bootstrap setup and broader security checks remain. Rollback is the preceding compatible dpl_E93oc59MkUe7z5fhdY4k59MeEE4V (7d5a0494); roll app back before optional limiter removal, retaining private media and 50 MB limits. B17-B19 remain first in L6.


## S4 direct-comment write candidate, 2 November 2026

Repository search confirms all current private comment/thread inserts use the canonical server create/reply routes. Both environments grant INSERT directly to anon/authenticated; member RLS then permits same-workspace inserts outside API limits. Baseline rolled-back tests reproduced owner/member direct writes. Candidate revokes only table INSERT from PUBLIC/anon/authenticated, guards against surviving column/inherited INSERT permissions, and preserves service-role writes, policies, other table privileges and rows. Fifteen candidate checks pass on each database, including denied client writes, server root/reply writes, owner/member reads, outsider/anonymous denial and unchanged SELECT/UPDATE/DELETE grants. Staging rollback mode passes another fifteen checks. All fixtures roll back. 307 Node tests and focused composer lint pass; no app TypeScript/UI change. Staging installation and Production rollout pending. S4/L5 remain In progress.


## S4 direct-comment boundary Production checkpoint, 2 November 2026

PR [#71](https://github.com/corisleachman/song-review-app/pull/71) merged as 0565f64b. Database repair is installed and verified in staging and Production: client table/column INSERT is denied on comments/comment_threads; existing service-role writes, RLS policies, non-INSERT privileges and member reads are preserved. Fifteen checks pass in each environment in installed mode; baseline, candidate and rollback modes also pass on both. Synthetic fixtures roll back, and zero fixture workspaces/songs remain. No Storage or email/notification path was invoked.

307 Node tests and composer lint pass; browser CI 41467570926 records 30 passed/10 skipped and all four PR checks pass. Preview signed-out create/reply stay 401; eight no-write live checks pass after the permission change. Both Security Advisors have zero errors/warnings, with the same nine intentional INFO notices. No app-code/env change was needed; the existing compatible Production app was confirmed before the repair. Vercel's merged-source Production rebuild dpl_3ouZssw5wcb3ruUE6ZuQ49TNQ9uQ is Ready/live on www.song-room.live at 0565f64b; post-build private signed-out checks pass and bounded error/fatal scans are empty. Rollback must run the companion SQL against the affected database; reverting an app deployment alone doesn't restore grants. S4/L5 remain In progress for feedback/bootstrap and wider review; performance B17-B19 still lead L6.


## S4 feedback race candidate, 2 November 2026

Confirmed with ten simultaneous HTTP requests to the old staging route: all ten were saved despite the existing five/hour policy. Synthetic feedback removed and zero remaining verified. Candidate moves the check into the database insert, taking ordered transaction locks on the user/visitor hash and counting existing feedback rows. It preserves history and quota, fails closed on a failed quota read, trusts Vercel visitor IP and returns 429/Retry-After. No new counter table, secret or provider. Eight rollback-only SQL checks pass in staging baseline/candidate/rollback and Production candidate; installed staging mode passes. 326 Node tests, TypeScript/focused lint pass. Staging Advisor zero errors/warnings. New Preview hosted race and Production release pending; S4/L5 remain In progress.


## S4 feedback Production checkpoint, 2 November 2026

PR [#72](https://github.com/corisleachman/song-review-app/pull/72) merged as f9581734; primary Production dpl_EhdHroGorkNpavmv2Wo83cR8EPtD is Ready/live on www.song-room.live. Database trigger installed/verified before app deployment in both environments. Existing five/hour history is the quota ledger; no new counter table/secret. Installed function bodies equal source. Eight installed SQL cases pass per environment, covering user/anonymous quotas, expiry, shared IP history, failed ledger reads/constraints and direct client denial.

Hosted staging: old route saved ten of ten simultaneous submissions; fixed route saved five and returned five 429 responses with Retry-After. SQL confirmed five saved. Both batches and all probe feedback are removed; zero fixtures remain in staging or Production. No notifications/emails invoked. Production used rollback-only SQL plus eight no-write HTTP probes (seven invalid requests 400, honeypot 200), all pass. 326 Node tests, TypeScript/focused lint, all four PR checks and browser CI 41482574372 (30 passed/10 skipped) pass. Both Advisors have zero errors/warnings; bounded release error/fatal scans are empty.

Feedback repair is Production complete in scope, not all S4/L5. No external action required. Rollback restores the previous app route first, normally retaining the trigger; only remove trigger/function with the companion down migration if it caused the regression. Removing the trigger while the new count-free route is active removes enforcement. B17-B19 still lead L6; bootstrap concurrency and wider security review remain open.


## B27 initial-workspace staging checkpoint, 2 November 2026

Original bootstrap runtime tests with controlled I/O reproduce six workspaces from six stale first-request snapshots, plus one orphan when owner creation fails. No claim that existing users' data contains these defects. PR [#73](https://github.com/corisleachman/song-review-app/pull/73), source 4be9c48c, replaces only the empty-membership creation branch with a service-role-only atomic operation. It locks/rechecks the canonical user, commits workspace and owner together, and reports which caller actually created it for existing referral attribution. Existing membership/active-workspace/profile/avatar paths are preserved; repeated profile-write performance stays in B17.

340 Node tests, TypeScript/focused lint pass. Fourteen database checks pass in staging candidate/installed and Production rollback-only candidate mode; staging rollback adds a fifteenth pass. They verify one workspace/owner, stale caller reuse, membership preference, held transaction lock, failed owner rollback/retry and client denial. Fixtures used uncommitted passwordless identities with no Auth API/email calls; zero fixture users/profiles/workspaces remain. Staging Advisor zero errors/warnings. Function is installed only on staging, source body verified; Production RPC is absent and app unchanged.

Preview dpl_EA6C9QicgB4ibe4sz15t9DFGrR3y and CI are building. Fresh browser signup/confirmation and first workspace acceptance remain before merging/releasing this candidate. This entry is code complete, not Production complete; L5/S4 remain In progress. Current candidate: https://song-review-app-v2-mwmzuszfv-corisleachmans-projects.vercel.app/signup/free . Rollback app before optional RPC removal; existing workspaces are never deleted/deduplicated by this repair.


## B27 Ready Preview and user-test handoff, 2 November 2026

Primary Preview dpl_EA6C9QicgB4ibe4sz15t9DFGrR3y is Ready at exact 4be9c48c. All four PR checks pass; browser CI 41499853678: 30 passed/10 skipped. Signed-out bootstrap stays 401; bounded Preview error/fatal scans are empty. Existing Google account returned to its selected member workspace and five-song library in Chrome. Preview client bundle confirms staging ref ivifkrtupqizyqqsxdty. The signup page currently offers Google only; no email feature flag or provider setting was changed.

Remaining acceptance: in a private browser window, open [staging signup](https://song-review-app-v2-mwmzuszfv-corisleachmans-projects.vercel.app/signup/free) and use a Google account that hasn't used this staging app. Complete signup and confirm one empty Free workspace. Refresh/open the dashboard in another tab; expect the same workspace without a duplicate. Return the test account email and result so Agent can verify one workspace/owner membership before Production migration/merge/deployment. If any step fails, stop and return the Preview URL, error text and screenshot. This is a fresh-account browser acceptance gap, not another deployment permission request. Production app/RPC remain unchanged and PR #73 is unmerged. B27/S4/L5 aren't Done.


## B27 user acceptance and Production migration, 2 November 2026

User reports both fresh-signup/reload tests passed. The sole new staging workspace from the test window has one workspace for its creator and one owner membership; no duplicates observed. No test email or private identifier is recorded here. Production migration installed and all 14 installed database checks pass; function body equals reviewed source, zero fixture users/workspaces remain. Advisor has zero errors/warnings. PR #73 merged as ce346868; app deployment dpl_F19sdasWwV17Qt6den32dWjPh1s5 is building. B27 remains rollout-in-progress until live checks pass.


## B27 Production-complete checkpoint, 2 November 2026

User reports both fresh Google signup/reload tests passed. Read-only staging verification shows Free plan, one creator workspace, one total membership and one correct owner link. No private test identifier is stored here. Production RPC installed before app rollout; its body equals source and all 14 installed SQL checks pass. No fixture users/workspaces remain; Advisor reports zero errors/warnings.

PR [#73](https://github.com/corisleachman/song-review-app/pull/73) merged as ce346868; primary deployment dpl_F19sdasWwV17Qt6den32dWjPh1s5 is Ready/live on www.song-room.live at that exact merge. Live no-write checks pass: bootstrap 401, dashboard-summary 401, login 200 and signed-out bootstrap redirects to same-origin login. Bounded 15-minute error/fatal scans are empty. 340 Node tests, TypeScript/focused lint, all four PR checks and browser CI 41499853678 (30 passed/10 skipped) pass. Fresh signup acceptance is staging evidence; Production used rolled-back database fixtures and no-write HTTP checks.

B27 is Production complete in this scope. No external action remains. Rollback restores prior compatible app dpl_9PWeKjhM3nw9g1kg5z77wwBiRWM5/6269735c before optional RPC removal; retain existing data, media/50 MB settings and other controls. No existing workspace cleanup/deduplication. L5 and S4 remain In progress for remaining access/abuse/monitoring work; B17-B19 still lead L6.


## B28 database release checkpoint, 2 November 2026

PR [#74](https://github.com/corisleachman/song-review-app/pull/74), reviewed head caf47134, merged as 6288e354. Source migration 20261102220823 maps to staging ledger 20261102222009 and Production 20261102222433. It revokes only anonymous raw SELECT on songs/song_versions. No app-code, environment or provider change.

Both environments: baseline 16, candidate 14, rollback 16 and installed 14 SQL cases pass; zero fixture workspaces remain. Actual anonymous REST reads return 401/42501; authenticated owner/member history and outsider denial pass. Public song/playlist/comments payloads match baseline, public pages and embeds return 200, audio redirects 307 with signed one-byte Range 206 and artwork returns 200. No real private content read, retained fixtures or emails. Advisors have zero errors/warnings.

342 Node tests, focused lint, four PR checks and browser CI 41536540817 (30 passed/10 skipped) pass. Exact-head primary Preview Ready, signed-out bootstrap 401/public song 200. Bounded Production error/fatal scan empty. Database rollout is verified; merged-source primary deployment dpl_Dh7UyB4o7sokRPmdcK22mfH8B1aB is Ready/live on www.song-room.live at exact 6288e354. Post-build bootstrap 401, public song 200/version5 and login 200 pass; bounded release error/fatal scan empty. B28 is Production complete in scope.

Rollback: companion SQL restores only the previous two anonymous SELECT grants, reopening the confirmed exposure. Reverting the app alone doesn't restore grants. Previous compatible app is dpl_7x4APpdWUSJ9owWRAsbTh4Et7dY1/b9836cdb. No external action required. L5/S2/S3 remain In progress for broader route/function coverage; B17-B19 still lead L6.


## B29 Production-complete checkpoint, 2 November 2026

PR [#75](https://github.com/corisleachman/song-review-app/pull/75), reviewed head d2238ac8, merged as 25b96370. Primary deployment dpl_7LpTJNzBYxxj6VgfDb9tYMeesAsy is Ready/live on www.song-room.live at that exact merge. Eight reproduced internal-error echo paths now return their existing generic fallback text. No schema, billing model, credential or provider change.

377 Node tests, TypeScript and focused lint pass (zero errors, one pre-existing unused checkout import warning); four PR checks pass, browser CI 41538040473: 30 passed/10 skipped. Twelve signed-out settings/referral/billing checks pass in baseline staging/Production, exact-head Preview and released Production. Role/success cases use fake provider I/O; no real payment, subscription or settings mutation. Bounded release error/fatal logs empty.

No external rollout action remains. Rollback is previous compatible deployment dpl_Dh7UyB4o7sokRPmdcK22mfH8B1aB/6288e354 or focused app revert, which restores the exception-echo risk. B28 database controls stay installed. L5 remains In progress; S6/B30 configuration decision is pending independently.


## L5 access and CI checkpoint, 2 November 2026

All 63 session-route methods across 48 route files deny signed-out requests in both staging and Production (401; deployed development-plan route 403). Valid nonempty title is used for the song-create auth probe; resource IDs are zero UUIDs. No signed-in writes, payments or email sends. This does not close the hosted owner/member/outsider matrix.

PR [#76](https://github.com/corisleachman/song-review-app/pull/76), reviewed 737d47d6, merged as 9ee73d83. Existing PR/manual browser job now runs `npm audit --omit=dev --audit-level=moderate` after npm ci. Exact command passes locally and in GitHub CI 41539277781, reporting four low and zero moderate/high/critical; browser 30 passed/10 skipped, all four checks pass. No dependency upgrade, new schedule or provider change. Primary dpl_8SrzygQCYuX6o1wcWo33hC6xSHjJ is Ready/live at exact 9ee73d83; login 200, bootstrap 401 and public song 200 pass. Workflow rollback is removal/revert of this audit step; previous compatible app is dpl_7LpTJNzBYxxj6VgfDb9tYMeesAsy/25b96370.

L5 stays In progress. Pending user input: B30 credential classification approval and restoration of the existing staging Chrome tab, which Browser Use cannot access while it is an extension suspended-page URL. No policy workaround attempted. Agent can resume signed-in tests after restoration. Diagnostic log review and provider monitoring/retention remain open; no full security signoff. L6 remains Not started, with B17-B19 first once L5 exit conditions are met.


## B30 Secret classification and staged role checkpoint, 3 November 2026

User approved the three type-only edits. Primary Vercel project prj_GoSvIjynlundQRAjTe4NIrwY0Gz0 now stores Production SUPABASE_SERVICE_ROLE_KEY and SHARED_PASSWORD as sensitive (Secret), and RESEND_API_KEY as Secret across its unchanged Production/Preview/Development targets. Each exact entry was freshly scoped, patched with only `{type: sensitive}`, and reread. No credential values supplied, decrypted, printed, rotated or written to disk; no provider or scope change. Connector environment listing still lacks permission; authorised CLI is the established fallback.

Production rebuild dpl_FAvY4Fbm9Mdt28jZ6EZc9VXXLvBw is Ready at unchanged d3e505cd; Preview dpl_9ZSL6A7stxJtpEKKv7G1kjEi5AKp is Ready at reviewed d2238ac8. Both public song/playlist/comments projections match baseline; public pages/embeds return200, audio307/one-byte Range206 and artwork200. Twelve signed-out settings/referral/billing method probes pass in each environment. Bounded deployment error/fatal scans empty. No real mail send or positive legacy-password check replayed. Prior Production dpl_8sTiELb9g7FE6tbqcigpWZ2aCW27 is the compatible app rollback; retain the Secret types on rollback and don't downgrade/rotate values without a separate decision. B30 is complete in this scope, not a full S6 signoff.

Restored Chrome staging session: owner workspace/collaborators/Free-plan view pass; isolated temporary member workspace hides owner settings and shows owner-managed billing. Member dashboard shows its single synthetic song and the version page loads; unrelated workspace song shows access denied without its private title. No storage object/audio uploaded; the synthetic version's missing-audio state is expected, not a playback regression. These scoped journeys ran on the existing B27-compatible staging build, not the rebuilt Preview.

Browser extension suspended the tab during the final return to the original workspace, and policy rejected access to its extension URL. No workaround attempted. Guarded staging cleanup removed both fixture workspaces, both songs/versions and three fixture memberships. Read-back confirms zero fixture accounts/songs and the original single owner membership intact. Browser restoration completion remains unverified; user asked to keep the normal staging tab active. No Auth users, real emails or payments created. L5/S2/S6 remain In progress; L6 is not yet started.


## S6 and beta S7 closeout checkpoint, 3 November 2026

B31/PR [#77](https://github.com/corisleachman/song-review-app/pull/77), reviewed 8f0e757a, merged as 6ba2c817. Primary Production dpl_C1VQK62tyWRy8ZDiZhTjCf7uyZrx is Ready/live at that exact source. 387 Node tests, TypeScript and lint pass (zero errors/five pre-existing warnings); four PR checks pass, browser CI 41605461797: 30 passed/10 skipped, production dependency audit four low/zero moderate-or-higher. Programmatic comparison confirms the 59 existing logger files contain only logging/import changes; CSP output normalization is the other intentional change.

Exact-head Preview and Production pass twelve signed-out method checks and unchanged public song/playlist/comments payloads, pages/embeds, artwork200, audio307 and one-byte Range206. Benign CSP controls return204 and their actual stored messages contain origins without test paths/queries. Warning-only filters missed the controls; unfiltered CLI request logs find them as level warn. Use deployment-scoped unfiltered retrieval when checking CSP controls; don't equate empty filtered results with healthy logging. Production release scan: 27 retrieved records, zero error/fatal entries, expected control warning present. No real secrets submitted, emails sent or historical logs deleted.

B30 metadata reread confirms all three approved entries remain Secret with unchanged scopes. Original Chrome staging dashboard is visibly back on its Owner workspace with the original empty state; earlier fixture cleanup is verified. This supersedes the temporary browser-restoration gap. No user action remains for B30/B31. App rollback is dpl_37hrt28imvnZ6tARDAXdvwtRGL4L/ffef2c7b or focused revert, retaining B28 permissions and B30 Secret types.

User explicitly accepts current monitoring for beta: no paid upgrade or recurring monitoring. Team metadata confirms Hobby; [runtime log retention](https://vercel.com/docs/logs/runtime) is one hour, and [Vercel anomaly alerts](https://vercel.com/docs/alerts) require a higher plan with Observability Plus. Revisit these limits at L8 before wider promotion. Dependency PR #59 touches SSR/auth and test tooling; defer to a separate maintenance release. Major Next16/TypeScript7/ESLint10/Node-types26 updates are not current audit fixes. Remaining action updates affect SEO automation and belong to L7; content PRs #12/#3 are outside this security release. No unrelated PR merged or closed.

S6 is Done in this recorded scope and S7 Done for the accepted current beta. L5 remains In progress for S2-S5; B32 direct account-write gap is repaired and verified in both environments, followed by remaining validation/response boundaries. L6/B17-B19 remain next after L5 exit conditions.


## B32 confirmed account-write boundary candidate, 3 November 2026

Synthetic role probes in both databases confirm direct owner plan/Stripe rewrites, direct creator Studio account insertion and direct owner account deletion. All transactions roll back; no real customer/account/subscription is modified and no Stripe call is made. Existing row ownership policies don't protect server-managed columns. Source account mutations are all canonical server-backed; no browser account writer found.

Migration source 20261103090300 revokes only anon/authenticated/PUBLIC INSERT/UPDATE/DELETE on accounts, keeps reads/RLS/other grants and service operations. Full baseline16, candidate19 and rollback16 pass in both DBs; local390 Node tests and focused lint pass. No permanent grant change yet. Next: staging installation and actual isolated owner settings save, then installed checks and reviewed release. No account/plan model change or historical plan reset. Rollback companion SQL restores the observed old six client mutation grants and reopens the gap; app rollback alone is insufficient. L5 remains In progress.


## B32 staging handoff, 3 November 2026

PR [#78](https://github.com/corisleachman/song-review-app/pull/78), reviewed source f619e508, has four green checks; browser CI 41609466782 records 30 passed/10 skipped. Local390 tests/lint pass. Staging migration source20261103090300 is installed as ledger20261103091520. All19 installed role checks pass; baseline16/candidate19/rollback16 pass in both DBs, with zero rolled-back probe fixtures left. Actual public-client REST zero-ID account read returns200/empty and raw account PATCH returns401/42501.

One disposable Free workspace, “Agent account boundary staging acceptance”, is retained solely for the actual owner settings-save check. It has one owner membership, no songs and no Stripe customer/subscription. In [existing staging dashboard](https://song-review-app-v2-mwmzuszfv-corisleachmans-projects.vercel.app/dashboard), choose that fixture, open Settings → Workspace, rename it to “Agent account boundary staging saved” and click Save, then switch back to the original workspace. Return Saved or exact error text. Change only that fixture; no plan changes, invitations or payment. Agent will verify stored name/Free/null Stripe fields and remove the fixture afterward.

Browser policy blocked the extension-suspended page before this save; no alternate mechanism or session extraction was used. All other scoped checks are complete; actual owner save is the remaining staged acceptance gate. Production accounts permissions and real account data are unchanged. Install reviewed Production migration only after acceptance and final exact-head checks; app deployment alone does not apply/undo this permission change. L5 remains In progress; S6 and beta S7 are Done, L6 not started.


## B32 Production-complete checkpoint, 3 November 2026

User reports Saved. Database confirms the exact expected fixture name, Free plan, null Stripe fields, one owner and no songs. Guarded cleanup removes that fixture and membership; zero acceptance workspaces remain. No real plan/customer/subscription is altered.

Source migration20261103090300 maps to staging ledger20261103091520 and Production20261103094603. Both installed19-case probes pass, alongside baseline16/candidate19/rollback16 in each environment. Actual Production raw-client zero-ID GET returns200/empty and PATCH returns401/42501. Twelve signed-out app methods, unchanged public song/playlist/comments projections, public pages/embeds, artwork200 and audio307/Range206 pass. Security Advisor zero errors/warnings (nine existing server-only INFO notices).

PR [#78](https://github.com/corisleachman/song-review-app/pull/78), exact tested head b77a7b66 (migration/tests unchanged from f619e508), merged as126825bf. Primary dpl_BfL9iReAvUBWFemGQaXa9aFvT23W is Ready/live on www.song-room.live at that exact merge. Local390 tests/lint and all four exact-head checks pass. Post-build login200/bootstrap401/public-song200 pass. Account data, policies, reads and service privileges are preserved; client accounts I/U/D is denied.

B32 is Production complete in this scope. No user action remains. If a verified regression needs account permissions restored, use the companion SQL against that database; app rollback alone doesn't restore grants. Prior compatible app dpl_C6NGTs4vHatzgv2kYGd8cDZU4JLC/c17e7bf1 remains available. Retain other permissions and Secret types; don't reset/reconcile existing plans automatically. L5 remains In progress for remaining S2-S5 checks; next S5 slice removes remaining unexpected response-error echoes.


## B33 response-error candidate, 3 November 2026

Thirty-two handler catch paths and one invite-provider warning reproduce raw synthetic exception/provider text. Fixed existing fallback messages replace the echoes across 26 route files. Status codes, public invite invalid-state shape and invite persistence are preserved; diagnostics reuse B31 safe projection. All 425 Node tests pass, TypeScript passes, focused lint zero errors/four existing warnings. No real email, schema/configuration/dependency or billing change. CI and hosted verification remain pending; L5 stays In progress.


## B33 Production-complete checkpoint, 3 November 2026

PR #79/d6ad7f1c merged98f4132f. Primary Production dpl_F65yxwCvh5dPtLMFE6rc8Q7Lf8LG Ready at that exact commit, www.song-room.live alias verified. All 425 Node tests and TypeScript pass; focused lint zero errors/four existing warnings. Four PR checks green; browser30/skip10. Exact-head Preview dpl_ciG3gs77gCS8JGB41uENyD4BiCYG and Production each pass63 signed-out method checks plus unchanged public song/playlist/comments, listen/embed pages, artwork200 and signed audio307/range206. Production bounded unfiltered scan50 records/zero error-fatal. Synthetic provider-error acceptance is local/fake only; no actual email or deliberately secret-bearing hosted request.

No migration or external setup remains. Roll back the application to compatible dpl_FUhtAgwo21ncnEmT3TafH3mjtCA9/ed5329c2 if a verified regression requires it; retain account permissions and Secret types. B33 complete, broader S2-S5 still open. No user action required.


## B34 membership boundary candidate, 3 November 2026

Rolled-back synthetic probes confirm owner/admin direct INSERT can add an owner without invitation and direct DELETE can remove the existing owner in staging and Production. This bypasses the canonical API's owner-only/self/owner-removal guards. Baseline21, candidate23 and rollback21 checks pass in each database. Zero synthetic workspaces remain and original hosted grants are unchanged. The candidate revokes only client membership INSERT/UPDATE/DELETE, preserving reads/RLS, server grants and data. Permanent installation requires security-boundary approval; no claim of staging/Production completion or hosted invitation/removal acceptance. S2/S3 and L5 stay In progress.


## B34 approved installation, 3 November 2026

User approved B34. Reviewed source cbe475aa, PR #80, four green checks. Migration source20261103154727 maps to staging ledger20261103161024 and Production20261103161305. Installed23, initial-workspace14 and canonical-invite4 SQL checks pass in both environments; synthetic transaction fixtures roll back. Existing staging owner bootstrap/settings/member-list reads pass on the existing compatible host. Disposable staging workspace owner removed its only collaborator through the app; Saved state “Member removed”, database confirms one owner remains. Original COris workspace restored visibly; guarded cleanup removed the disposable account/membership. Zero probe accounts/invites remain. No real email, payment, Storage or existing membership mutation.

Seven safe live checks pass: login200, bootstrap/members/workspaces GET401, member DELETE401, create/invite POST401. Production owner write was not exercised; staged app removal and actual installed database/RPC checks provide scoped acceptance. No application source changed or new deployment is required for enforcement. Both migrations are installed; repository merge/automated build remains to record. Rollback companion restores the old grants and reopens B34; app rollback alone doesn't undo permissions. L5/S2/S3 remain open.

B34 final verification: both security advisors report zero ERROR/WARN findings and nine existing server-only INFO notices. Client membership INSERT/UPDATE/DELETE denied, member reads retained and zero fixtures verified in both environments. B34 is Production complete for this database permission repair; no application deployment is needed for enforcement. PR #80 carries the migration, rollback and evidence.


## B35 accepted-invite replay candidate, 3 November 2026

Installed invite RPC bodies match in both environments. Original recipient can replay an accepted link after owner removal and restore membership, including after the accepted invite expires. Baseline11 reproduces this, candidate11 blocks it and rollback11 reproduces original behaviour in both databases. Every run rolls back. Four actual-handler tests confirm canonical user/email input, success/current-member retry and already-used/expired denial without workspace reads/cookie changes. All437 local tests and focused lint pass. No app handler, installed function, grant or real data changed. Candidate migration/rollback and regression probes await security-boundary approval. Zero probe accounts/invites remain; original function hash unchanged in both environments. L5/S2/S3 remain In progress.


## B35 approved Production installation, 3 November 2026

User approved B35. Reviewed source0828e58b/PR #81 had four green checks. Migration source20261103162107 installed as staging20261103170224 and Production20261103170410; installed body hash460ec500c96eded2a8d09f69bf3e77e5 matches in both. Installed11 replay, membership23 and bootstrap14 checks pass in each environment.

Actual staging browser acceptance on existing compatible host: two pending copies of a disposable invite were loaded; first acceptance created one member and joined the synthetic workspace. Guarded SQL removed only that test membership. The second, stale page's Accept POST was rejected with “This invite has already been accepted.” Readback confirms only owner remains. Refresh restored original COris owner dashboard; guarded cleanup removed fixture invitation/account/owner link and verified zero fixture accounts. No email, payment, Storage, Auth creation or real membership mutation.

Five safe Production HTTP checks pass; security advisors zero ERROR/WARN and nine existing INFO notices in each environment. Production positive user journeys weren't repeated; installed SQL and staging signed-in acceptance provide scoped evidence. No application code changed or deployment is required for enforcement. B35 Production complete; PR #81 contains repository source/evidence. Rollback companion restores original function and reopens removed-member rejoin; app rollback cannot undo the SQL. L5/S2/S3 remain In progress.


## B36 upload/accounting boundary candidate, 3 November 2026

Direct client song/version writes bypass canonical mutation routes: owner/admin/member can insert finalized version rows or rewrite upload fields; owner/admin direct song/version deletion leaves account stored-byte totals unchanged. Admin deletion also bypasses the owner-only API gate. Synthetic baseline40/candidate40/rollback40 pass in both databases. Canonical allocation/finalize/delete RPCs reject foreign workspace IDs, keep pending allocations uncounted, finalize bytes once and release finalized bytes on delete. Candidate preserves authenticated reads, all RLS, service grants and unrelated privileges, while denying client INSERT/UPDATE/DELETE on songs/song_versions. No current browser song/version writer found; canonical API/RPC writes already exist.

Fourteen added real-handler/fake-I/O cases cover foreign allocation/finalization/cancel denial before Storage, version-metadata field whitelist and owner-only delete. All 451 Node tests and focused lint pass. Zero fixtures and original grants/policy hashes read back. No installed migration, Storage object, Auth user, email, payment or real content mutation. Await approval for permanent staging installation. L5/S2/S3 remain In progress.


## B36 approved Production installation, 3 November 2026

User approved B36. Reviewed source6d94da6c/PR #82 had four green checks. Migration source20261103171426 installed as staging20261103191138 and Production20261103191415. Installed40 database checks pass in each environment; authenticated song/version reads remain, client mutation grants denied, policies unchanged and zero rollback-probe fixtures. Both security advisors zero ERROR/WARN and nine existing INFO notices.

Actual signed-in staging owner flow on the existing compatible host: created a disposable song from generated 2-second WAV, upload finalized with size88244, database bytes=Storage object bytes=account counter88244. Song renamed and version label changed through app; readback matches. Playback reached2/2 seconds, no media error, paused at end. Owner deleted only this fixture through app; zero song/version/object rows remain and original workspace counter returned0. Dashboard visibly restored to original empty workspace. No real song/version, membership, Auth user, email, payment or provider configuration changed.

Eleven safe Production login/signed-out/public checks pass, including public song projection, listen page, artwork200 and one-byte audio Range206. Initial missing-title creation probe returned correct validation400; valid-shaped signed-out request returned401. No Production upload/edit/delete or fresh physical-device test. Installed database checks and staged signed-in acceptance provide scoped evidence. No application source or deployment required for database enforcement. B36 Production complete; PR #82 carries source/evidence. Rollback companion restores old grants/reopens bypass; app rollback alone cannot undo grants. L5/S2/S3 remain In progress.


## B37 collaboration boundary candidate, 3 November 2026

Rolled-back probes reproduce action links to foreign song/comment/version/assignee, task-account mismatch, foreign songs in own playlists, and comment/thread author spoofing through direct writes. Five affected tables: actions, song_tasks, playlist_songs, comments and comment_threads. Candidate denies client mutations while preserving reads, RLS and actual server CRUD; earlier private-comment INSERT denial remains intact, including rollback. Playlist headers/public comments remain unchanged.

Baseline81/candidate81/rollback81 pass in staging/Production; all 467 local Node tests and focused lint pass. Six checked existing relationship-mismatch counts are zero in each environment. Zero fixtures; original DML mask and matching policy hash15131089686223ffc3c9abdabc1f932d verified. No permanent grant, row, Auth, Storage, email or payment change. Sixteen actual-handler fake-I/O cases cover source/assignee/resolution context, canonical creator, task fields and foreign playlist entries. Permanent installation awaits approval. L5/S2/S3 remain In progress.


## B37 approved Production installation, 3 November 2026

User approved B37. Reviewed sourcecb879571/PR #83 had four green checks. Migration source20261103194256 installed as staging20261103211609 and Production20261103212159. Installed81 database checks pass each environment; all five tables retain authenticated reads and server CRUD, deny both client roles' DML; existing policies and earlier comment INSERT denial remain. Security advisors zero ERROR/WARN and nine existing INFO notices in each environment.

Actual signed-in staging owner acceptance on the existing compatible host: comment and reply saved with canonical author; action created from source comment then resolved against the fixture version; task created and completed; playlist created/named, two disposable songs added, actual order swapped and read back, both entries removed through app. A single-owner workspace plus the deployed environment snapshot's absent EMAIL_NOTIFICATIONS_FORCE_TO means no notification recipients; no provider delivery was tested. Connector environment-list403 was resolved through read-only CLI inspection; no configuration or permissions were broadened.

Guarded SQL cleanup removed only the disposable playlist and two songs, cascading the fixture version/thread/two comments/action/task. Readback: zero fixture songs/versions/threads/comments/actions/tasks/playlist/entries; original storage counter0, no Storage objects created. Original COris owner dashboard visibly restored empty. No real content, membership, Auth, billing or credential mutation. Sixteen safe Production login/signed-out/public checks pass, including public song/playlist/listen200. No fresh Production signed-in writes or email-delivery acceptance. No application source/deployment needed for database enforcement. B37 Production complete; PR #83 carries migration/evidence. Rollback restores observed collaboration grants, preserving B26 private comment INSERT denial, but reopens context/attribution bypasses. App rollback alone can't restore grants. Broader L5/S2/S3 remain In progress.


## Remaining account/profile and legacy billing candidate, 3 November 2026

Current read-only inventory matches both environments:25 public tables with RLS, no public views/materialized views, no anon/authenticated public-schema CREATE and no client-callable public SECURITY DEFINER function. Own-profile/preferences isolation and legacy-theme workspace RLS pass in rollback-only synthetic fixtures. Four real current-user helper tests verify Auth getUser rather than cached session/metadata authority, verification failure denial and refresh-cookie handling.

B38: owner/admin raw writes can forge legacy billing_subscriptions and billing_checkout_sessions facts. Both tables contain0 rows in each environment, and current application code doesn't read/write them for entitlements; this isn't evidence of paid-access bypass. Candidate denies only their client I/U/D, preserving member reads/RLS, service CRUD and current accounts/Stripe flow. Baseline84/candidate84/rollback84 pass each DB; all471 local tests/focused lint pass. Zero synthetic users/profiles/accounts and legacy billing rows remain, original grants and matching policy hash176478a7cf0aa72c404c785fe254dda9 verified. No permanent change, Stripe/Auth API/email/Storage calls or real-user mutation. Approval required before installation. S2/S3 remain In progress; this doesn't introduce a new launch requirement.


### 4 November 2026: B38 approved and installed

User approved B38. Exact migration installed staging ledger20261104070929 and Production ledger20261104071135. Installed84 pass each DB; client legacy billing writes denied, member reads/RLS and service CRUD preserved. Signed-in staging Workspace and Plan & Billing load correctly (Free, zero usage). Production login200, auth bootstrap/settings summary401 and signed-out billing checkout/portal/activate POST401. GET workspace/plan returns405 (unsupported method), not an auth assertion. Zero synthetic users/profiles/accounts or legacy billing rows remain. Security advisors: zero ERROR/WARN, nine existing server-only-table INFO per DB. No payment/provider journey, Stripe call or application implementation change. SQL enforcement is Production complete; source/evidence merge follows passing PR84 checks. S2/S3 remain open for recorded coverage closeout.


### 4 November 2026: application function review complete

Read-only review closes the function-body portion of S3:17 public and two private application functions match in both DBs;19 definition/owner/grant drift checks pass each. Service mutation RPCs reject client execution; private boolean helpers bind to auth.uid(). No installed change or new defect. See LAUNCH_SECURITY_REVIEW.md for body findings and limits. S3 remains In progress for policy/table coverage; S2/S4/S5 remain open.

### 4 November 2026: B39 playlist-header boundary candidate

Table/policy inventory covers all25 public RLS tables with matching staging/Production policies and client/service CRUD grants. Nine no-policy tables deny clients through RLS (some retain table grants); no policy absence is treated as an access grant. Existing B21/B28/B32/B34-B38 evidence covers the repaired data surfaces. Remaining direct client writes reviewed on profiles/preferences/theme and playlist headers. B39 confirms a dual-workspace member can move a playlist header without its linked song, exposing the source song ID to a destination-only member; private playlist GET's service query can then return the source metadata. This is synthetic DB reproduction plus code trace, not a hosted exploit or media-access claim. Both environments have zero current mismatched playlist links.

Candidate20261104100000 denies only playlist client I/U/D, preserving reads/RLS/server CRUD/other privileges. Baseline26/candidate25/rollback26 pass each DB. All471 Node tests, composer lint and whitespace checks pass. Zero fixture accounts/playlists/songs; original grants and policy hash67e1c849af01f1063b56ac6d8a295570 restored. No installed change. Approval required before permanent staging/Production installation; S2/S3 remain In progress.

### 4 November 2026: B39 approved rollout and S3 exit

User approved B39. Exact source20261104100000 installed staging ledger20261104085737 and Production20261104090003. Installed25 pass both environments. Staging owner browser create/rename/public/draft/add/reorder/remove pass, creator/account/flag/order read back correctly; guarded cleanup removed playlist/links/two synthetic songs and restored storage0/empty playlist view. No playlist-delete UI exists; actual service DELETE is covered in SQL, not claimed as a hosted browser method. Five safe Production checks pass: login200, signed-out playlist list/PATCH/DELETE401, existing public playlist projection200. No Production positive content write, email, payment or Storage operation. Original grant rollback reopens header-transfer bypass; app rollback alone cannot change grants. Source/evidence PR86 merge follows CI.

S3 exit verified in scoped review:25/25 public table policies/ACLs mapped,19/19 application function bodies reviewed, private Storage and controlled delivery evidence retained. New read-only table inventory passes29 checks each DB; no public views, runtime public/private-schema CREATE or client superuser/BYPASSRLS role. Both advisors have zero ERROR/WARN and nine intentional no-policy INFO. Behavioural role evidence remains in the named B21/B28/B32/B34-B39 probes; hashes detect drift, not arbitrary security guarantees. Remaining hosted route roles are S2 and provider/payment journeys are L6, not hidden S3 completion claims.

## Model choices for remaining work

Reviewed4 November2026 against [official model-selection guidance](https://developers.openai.com/api/docs/guides/model-selection). Use the lightest setting that meets the named checks; avoid re-researching identical task types. These are task recommendations, not measured savings or proof the current chat model changed. Current tools cannot switch this chat's model. No extra agent is authorized solely by this table.

| Remaining work | Starting model/effort | Escalation condition |
| --- | --- | --- |
| Checklist/evidence reconciliation, dependency PR inventory, link/alt-text inventory B10/B14/B15 | Luna Low | Ambiguous behaviour or conflicting evidence |
| S2 cross-workspace/auth review and B06 promotional billing/owner boundaries | GPT-6.1 Sol Medium | Unresolved security architecture needs Astra review |
| S4 mutation budgets/provider attribution | GPT-6.1 Sol Medium | Concurrency/security boundary unclear |
| S5 bounded field/type fixes and regression tests | GPT-6.1 Terra Medium | Cross-route/data-model impact needs Sol |
| Staging browser acceptance and repeatable L6 journey checks | GPT-6.1 Terra Low | Reproducible multi-system failure needs Sol |
| B17-B19 dashboard performance/cache isolation | GPT-6.1 Sol Medium | Scoped implementation can move to Terra after root cause established |
| B20 notification delivery review and isolated test harness | GPT-6.1 Sol Medium | Provider/security behaviour remains uncertain |
| B09 physical iPad/browser/lock-screen acceptance | User executes named checks; Terra summarizes | Actual device access required |
| B16 confirmed UI fixes/accessibility and FAQ B13 | GPT-6.1 Terra Medium | Broad redesign is a separate scope decision |
| B11 article review and L7 supplied-copy edits | GPT-6.1 Terra Low with write-like-coris | Unsupported factual claims need research |
| L8 evidence compilation | Luna Low; User owns go/no-go | Conflicting release evidence needs Sol |
| Explicitly deferred B01/B03/B05/B07/B08/B12 | Select when activated | Do not spend tokens implementing deferred work |

Execution preference, clarified4 November: continue independent authorized work when an item awaits approval. Pause dependent rollout without approval; keep progressing elsewhere. Pause for user-executed acceptance when required. Never treat silence as approval.


### 4 November 2026: B40 email-account staging handoff

User approved making existing plus-address password accounts usable for the remaining staging checks. Existing Turnstile widget is restricted to the original email-staging hostname, so no new branch flag/secret or hostname permission was introduced. Rebuilt original Preview deployment dpl_EtDYXsoE9t3YUpxUmpBvD1VHtowT with its inherited staging environment and exact tested B40 source7284fae597f131acc6c9db691b249f4451bacc7e, producing Ready dpl_H9gAkTGS5G6PiNoD9rftSuK156XS. Existing stable alias now serves that source: https://song-review-app-v2-git-codex-ema-c75749-corisleachmans-projects.vercel.app/login . No git branch history, provider configuration, environment variable or Production deployment changed.

Verified alias deployment/source/Preview target, email config enabled=true/passwordManagementEnabled=true, public login bundle staging project ivifkrtupqizyqqsxdty, invalid empty login400 before provider use, and visible expanded Email/Password fields. Normal automated browser failed Turnstile with300030; no CAPTCHA was solved/bypassed, credentials submitted or auth email sent. Successful real-user password login remains pending. User should open the stable alias, expand email form, use an existing staging plus-address/password, complete security check, and report dashboard/workspace result or visible error without credentials/tokens. Original immutable B40 Preview remains Google-only; use stable email alias for password accounts.

Rollback for this staging code change is reassigning this same stable alias to dpl_EtDYXsoE9t3YUpxUmpBvD1VHtowT; do not disable existing email login or remove secrets while password test accounts exist. B40 remains Preview-only pending manual acceptance and guarded fixture cleanup. Disposable B40 hosted acceptance workspace and two pending tasks remain from the recorded reorder handoff; membership is only the designated Google actor, so a different password identity won't see it until an explicitly scoped fixture membership is arranged.


4 November hosted S2 checkpoint: selected email account login accepted by user. Four actual outsider song/version/task/thread GET projections denied with no fixture title. Temporary Member role added only in B40 disposable workspace; positive member view/reorder awaits user test because Chrome extension UI blocks automation. Existing workspace/plan unchanged. Details in LAUNCH_API_ACCESS_MATRIX.md; S2 remains In progress.


4 November B40 acceptance complete: user reports member view/reorder passed; DB verifies task B0/A1. Actual same-session fixture reads: four outsider denials, four member successes, four post-removal denials with no fixture-title leakage. Bootstrap returns participant's original Owner workspace. Guarded cleanup removes synthetic account/member/song/version/thread/comment/action/task rows, all counts0. Original workspace remains Free/storage0/null Stripe, original membership count1. Normal dashboard restored. No Auth identity deleted, email/provider/Storage/payment operation. Application-only release after final PR87 checks; rollback prior4e8a2750 retaining B39 SQL. Broader S2/S4/S5 remain open.


4 November Production checkpoint: B40/PR87 merged613a1426; primary dpl_BCGgcjLmtjcATiUaFuKpE17wpkRJ Ready and www alias verified at exact merge. Five malformed signed-out mutation methods401, login200 and existing public playlist200; email enabled/password management off preserved. Staging owner/member/reorder/revocation evidence and zero fixtures recorded above. No fresh Production positive content write. Rollback prior4e8a2750 app, retaining B39 grants. B41 follows for remaining metadata input and truthful playlist-reorder errors; S2/S4/S5 remain In progress.


4 November beta decision: user accepted recorded S4 limits for current beta. S4 exit met in that scope; wider-launch quota/provider-IP review remains at L8. No new controls/configuration installed by accepting the scope.

4 November B41 handoff: Ready dpl_8ZWim3zUJA3wek9usGL35LEnCdJM serves tested3ff0656c at the existing email-staging alias; source/target and staging project verified. Ten signed-out malformed methods401, invalid invite lookup404 and email readiness pass. Browser URL policy rejected reload of an unsupported-protocol frame; no alternate browser workaround attempted. User test required on normal HTTPS page. Disposable B41 hosted acceptance account03c0d215-842d-4464-a4f5-65b31492cfa6 contains two seeded songs/versions, one Owner link for the designated test actor, Free/storage0, no actual audio or notifications. Original account/plan untouched; retain fixtures until playlist create/name/add/reorder acceptance and guarded cleanup. B41 stays Preview-only/unmerged.


4 November B41 Production checkpoint: user playlist acceptance passed; stored title B41 acceptance and B0/A1 confirmed. Guarded cleanup removed isolated account/owner link/two songs/two versions/playlist/links, all six counts0. Bootstrap restored original Owner workspace; original Free/storage0/null Stripe and membership count1 preserved. PR88 merged1d8fe5a7; primary dpl_3ENwd7uEfZYkDqxHt3QcudGteQXy Ready/www alias verified. Ten changed malformed signed-out methods401, login/public projection200 and email enabled/password management off preserved. No fresh Production positive write/provider/payment/Storage-object operation. Rollback613a1426 app retaining DB restrictions.

4 November B15 local checkpoint: homepage is rewritten to public/marketing.html. Corrected apex URLs only in six static HTML heads and article generator default, plus sitemap /blog path to avoid existing /blog/308. Six canonical heads, eight JSON-LD blocks and nine sitemap URLs parse/align; source comparison proves copy/dates/content unchanged. Syntax/lint/whitespace pass. No app auth/billing origins, environment variables, domains or redirects changed. Preview/Production metadata verification pending. A recorded S2/S5 beta closeout proposal is in LAUNCH_SECURITY_REVIEW.md; those rows stay open until accepted or remaining checks completed.

## L5 beta exit accepted, 4 November 2026

User explicitly accepted recorded S2/S5 limits for current beta. L5 is Done for that scope, not exhaustive hosted coverage. Device, payment, notification and performance checks carry to L6; quota/provider-IP and monitoring limits remain for L8. No configuration or security boundary changed by this decision. B15 Preview metadata checks pass; Production release follows final exact-head CI.

## B15 Production completion and L6 baseline, 4 November 2026

PR89 merged0eb8b70c; primary Production dpl_BNKywRcu3MVwnhDFuuiqKiBeVaaU Ready/www exact source verified. Six live pages200 with matching canonical/OG URLs, nine www sitemap entries and apex/blog-slash308 redirects pass. Preview eight JSON-LD blocks parse; final source four CI checks pass. No migration/configuration change. Rollback prior compatible app1d8fe5a7; no external step required.

B17-B19 investigation uses optimize skill and existing opt-in timing hooks. Empty staging workspace, desktop Chrome, ordinary unthrottled connection, repeated reloads: visible empty-state1663.5/1827.2/1944.9ms; network1654.1/1817.4/1938.9ms; server total1406.6/1522.8/1693.7ms. Identity1107.7-1410.6ms dominates server time. This is not a populated song/artwork baseline or a performance improvement. Entry waits for full payload before displaying songs; focus refresh after five-minute cache expiry sets loading true. Both are reproduction leads, not established incident causes. User asked to prepare staging test songs/audio/artwork; no performance source change. Sol Medium recommended for diagnosis, Terra for a scoped fix once measured.

4 November populated baseline: user prepared two songs/audio/artwork. Three staging runs reach content1.69-2.20s, identity0.93-1.28s server time. First version-page core initialization2.73s; not click-to-paint. Artwork complete when inspected, precise readiness unmeasured. See [measurement conditions and limits](DASHBOARD_PERFORMANCE_REVIEW.md). No performance fix released; actual tab-return reproduction pending. PR90 documentation merged61537fc1.

4 November B18 reproduction: user returned to staging dashboard with opt-in cache bypass. New refresh trace started; DOM showed All songs2 plus loading paragraph and no artwork. Candidate keeps loaded cards mounted during refresh by gating loading placeholder on no songs. No fetch/cache/auth change; B18 broader lifecycle/error/isolation checks remain open.

## B18 scoped Production fix and B19 candidate, 4 November 2026

User reports cards stayed visible on fixed staging return. Actual refresh trace200, All songs2 and both artwork images retained; initial empty load still shows loading. PR91 mergedf189c38b; primary dpl_CniVe1QvDfn3kir5LsXMAvNZhHCZ Ready/www exact source verified. Production login200, dashboard signed-out401, email config enabled/password-management off preserved.581 tests/TypeScript/four CI checks pass. No fresh Production signed-in test, fetch/cache/auth change or universal B18 lifecycle completion claim. Rollback61537fc1 app; no migration/configuration needed.

B19 candidate joins version and parent workspace in the existing canonical helper, preserving access checks and stripping joined-only data from output. FK verified both DBs; staging read-only equivalent join plan0.210ms (not hosted HTTP timing). Two new before-fix query-count failures; four new handler cases/all585 tests, TypeScript/lint/whitespace pass. No installed schema/permission change; hosted comparison pending.

4 November B19 staging: dae4cc97/Ready dpl_5CH7iQjENyBzaWGutEdYsgVCoUAh exact email alias verified. Hosted version payload and song metadata load; joined-only workspace property absent. Four CI checks pass. Three after timings overlap baseline; only reduced DB round-trip count is confirmed. Audio started loading when Play clicked, then URL policy blocked follow-up; no bypass. User playback/pause check pending; PR92 not released.

## B19 scoped Production release, 4 November 2026

User confirmed Audio passed, paused; normal HTTPS song page observed paused at0:08/4:19 with correct metadata. PR92 mergedb0542d48 (commit b0542d48b0a0d28d3e2c7eca19e1d21991370a89); primary dpl_9QJjHQh86P4Rrfi5nXE9gfW3S2vJ Ready/www exact source verified. Final four CI checks pass;585 tests, TypeScript/focused lint and staging joined payload evidence retained. Six safe live checks pass: login200, dashboard401, version GET/PATCH401, version-list401 and email config enabled/password management off. No fresh Production positive metadata/audio write or live playback test. Rollback f189c38b app; no migration/configuration. B19 broader performance targets/device/navigation matrix remains open.

B17 continuation: staging artwork metadata44,817/42,928 bytes, JPEG; this rules out large source files in the small test workspace, not delivery latency. Browser read-only evaluation does not expose resource timing, so no download-duration claim. User asked to open normal Production dashboard for representative read-only timings.

4 November B17 Production checkpoint: user supplied normal signed-in workspace for read-only timings;25 songs/15 actions/2 assignees. Content3.72-4.45s, server3.46-4.15s; identity and member lookups dominate assembly2.5-5.5ms. Primary functions iad1, Production DB eu-west-1. Dublin project-only experiment prepared in B17_FUNCTION_REGION_REVIEW.md; approval required because it changes deployment configuration. No setting/region/schema changed.

4 November B17 configuration decision: user approved staged primary-project Dublin rollout. Accepted API payload uses only current region field; both aliases read back dub1, unrelated resource fields unchanged. Existing Production alias/source/iad1 deployment unchanged. Protected staging dpl_6S8gUybaC7fP7CuptP4RHii4UHsV building in dub1/b0542d48; Preview pass required before Production redeploy.

4 November independent B20 audit: only comment/thread routes schedule thread email; version_uploaded appears as dashboard activity, not upload-email dispatch. Installed song_versions has0 noninternal triggers in both DBs. This is source/trigger evidence only, not delivered-mail/provider-job proof. Existing all-member upload-alert requirement remains open; no email sent or feature activated.

4 November Dublin Preview checkpoint: dpl_6S8gUybaC7fP7CuptP4RHii4UHsV Ready at exact b0542d48, primary project, Preview target, dub1 and stable email alias verified. Runtime headers confirm dub1. Login200, dashboard/version signed-out401, unavailable public playlist404 and staging email true/true pass. Chrome extension UI blocks automation; user asked for song/artwork/play-pause check. No positive performance benefit or Production-region completion claimed. Keep PR93/Production redeploy held until Preview gates pass.

## Dublin region rollout checkpoint, 4 November 2026

User reports Dublin staging passed; three content samples0.309-0.363s vs earlier1.69-2.20s. Primary dub1 Production b0542d48/dpl_8gBeW82QBbWxGmeruVr8dJNA6UwL live/www verified. Same-code Production crossover: dub1 samples2.19-5.56s, restored iad1 control3.20-6.73s; approximately2s provider profile/member origin stalls occur in both. Dublin retained for ordinary-path/database proximity benefit; B17 is not Done and no field-wide speed promise. Full table/limits in B17_FUNCTION_REGION_REVIEW.md. Existing iad1 deployment remains rollback. No unrelated resource/env/schema/plan change.

Safe auth/public checks and one-byte public audio206 pass; signed-in25-song dashboard and normal song artwork/comments/actions/tasks visible. No Production playback/content writes. User Production perception/device test remains next; B18/B19 broader matrices and L6 provider/payment/device checks stay open.

## Production feedback and next L6 test, 4 November 2026

User reports Production feels much faster and more responsive. This confirms perceived improvement, not a waiver of provider-tail/device limits. PR93/7d1e2ae0 documentation-only primary deployment dpl_kCewMGEp61D5bN2Xm6ny8utGShBK Ready/live in dub1, application unchanged. Physical-device playback/seek/lock-screen checklist prepared in LAUNCH_DEVICE_ACCEPTANCE.md; no physical pass claimed yet. No new app/configuration change in this checkpoint.

## First mobile playback result and B42, 4 November2026

User reports other requested playback steps worked on iPhone17 Pro Max/Chrome tab. First locked Pause per song hands title/artwork to an unrelated track after2-3seconds; no unrelated audio plays. Repeat pause after replay retains the Song Room item. Preserve this correction and partial-pass scope. B42 records the device-specific UI issue; browser/OS routing versus first-play registration remains unproven. Safari same-phone comparison is next; no app/configuration change or full device-stage completion.

4 November B42 Safari comparison: same first-pause metadata handoff on same iPhone, then Now Playing card clears after dim/wake. No unintended audio; blank view is the phone lock screen, not the app. Cause still unconfirmed because both browser tests use the same app code. Official Google plain-audio Media Session sample selected for the independent hardware control; user test pending. No application/configuration change or full mobile-stage completion claim.

4 November B42 independent-control result: Google native-audio Media Session demo in Safari also hands title/artwork to an unrelated track after Pause without playing it. Its card persists after wake, while Song Room Safari cleared it. Strong platform involvement evidence, not proof of an exact OS cause or identical lifecycle. B42 retained as monitored platform/UI limitation; no app patch or extra repetition of this control. Read-only internal-link crawl is the next independent L6 slice.

5 November B42 correction: independent demo artwork also clears after a later wake, following about one second of visibility. Earlier retained-card report was an intermediate observation. Audio remains paused; no speculative app patch or further repetition requested.

5 November L6 link checkpoint: all14 inventoried public destinations return200, including expected redirects; no missing static fragment targets. Nine sitemap pages and12 unique internal link targets covered. Signed-out dashboard/settings/playlists/upload redirect to login. Free/Pro/Studio signup redirects preserve plan and annual billing intent. Robots sitemap uses the canonical WWW host. Read-only HTTP/static scope only; private dynamic links, client interactions and external destinations are not claimed passed. Payment Sandbox readiness is next.

5 November L6 cancellation checkpoint: Sandbox portal independently shows “Cancels Dec 5” and service ending5 December2026 after user cancellation pass. Staging retains Pro subscription linkage and both songs. No automatic expiry/downgrade or webhook claim; B43 remains open. Feedback dialog on staging upload page passes initial focus, Shift+Tab/Tab wrap, Escape dismissal and return focus; no feedback sent or file selected. This narrow check is not a contrast, screen-reader or full keyboard audit. Physical11-inch iPad coverage is next.

L6 sharing checkpoint: 457 access and critical contract tests passed. In Production, a known public playlist and its embed returned HTTP 200. An unknown playlist returned HTTP 404 through the public API and showed the unavailable view in the embed. Hosted revocation still requires a disposable staging playlist. Physical iPad coverage remains open because the device is unavailable.

L6 hosted revocation checkpoint: published an empty staging playlist, observed HTTP 200 on the public API, listener and embed, then switched it to Draft. The public API returned 404 and both views displayed the unavailable state. The fixture remains private and empty. Existing media URLs and already-open players were outside this check.

6 November L6 audio revocation: a staging playlist contained only a generated eight-second tone. Before revocation, the audio endpoint returned 307 and storage returned 206. After switching to Draft, fresh audio access returned 404, the issued storage URL still returned 206 and the open player reached 0:08. Reload showed the unavailable view. The configured URL lifetime is 10 minutes from issuance. Expiry itself was not timed. Fixtures remain private in staging.

6 November L6 form checkpoint: hosted staging rejected malformed feedback, unknown feedback type, short message and missing signed-out email with HTTP 400. Invalid comment field type returned 400 and a comment on an unavailable track returned 403. Empty signup returned 403 without Origin and a field-specific 400 with the staging Origin. Negative API scope only. Successful submission and delivery were outside this check.

6 November L6 evidence reconciliation: retained the recorded 25 October Production Email signup, confirmation, login and recovery pass and the staging password login confirmation. Retained B35 and B40 hosted workspace separation evidence. No fresh provider round trip claimed. Public accessibility browser suite passed 20 cases with 8 expected skips, including the emulated iPad layout check. L7 technical inspection of PR #12 found article canonical, Open Graph and structured-data URLs on the apex host rather than the current www canonical host.

8 November homepage lab baseline: three fresh Chromium contexts each at desktop and iPhone 13 emulated sizes, unthrottled. Desktop LCP 1460/264/276 ms, CLS 0.003/0/0, browser-reported transfer 409873 bytes per load. Mobile LCP 428/356/332 ms, CLS 0/0/0, reported transfer 465501 bytes. These are bounded lab observations, not field data or an estimate of every cross-origin byte.

8 November B14 inventory: the live homepage served 19 img elements and each had an alt attribute. Blog index, Trust and Login served none. Two homepage lock-screen screenshots use notification promises as alt text and captions. Review the copy alongside B20 before wider promotion. This is an attribute inventory, not a full descriptive-alt audit.

8 November L7 B11 checkpoint: PR #12 merged as 6830bafa. Primary Production deployment dpl_D5gb4bvDoQt8QonQjxtjUAdWpqgV was Ready on www.song-room.live. Verified article, both linked guides, blog index link, canonical/Open Graph/Article URLs and canonical sitemap entry in Preview and Production. Rollback is a revert of the article merge or restoration of the previous Production deployment. L7 remains open for FAQ and screenshot copy.

8 November B14 follow-up: checked both lock-screen screenshots visually. They show media playback, so the captions, accessible labels and image descriptions now describe playback. Four relevant local browser checks passed, with two viewport-specific skips. B20 remains open.


## Wider-launch decision evidence

Keep the current beta running while L6 remains open. The recorded checks cover existing-account Google and Email access, staged workspace separation, playback on the tested phone, sandbox checkout and scheduled cancellation, and revocation of new playlist audio requests.

Before wider promotion, resolve or explicitly accept the remaining limits:

| Item | Evidence and next decision |
| --- | --- |
| B20 version notifications | No new-version email dispatch found in the inspected code or database triggers. Confirm and verify delivery to the intended recipients before making a delivery promise. |
| B43 billing reconciliation | Sandbox checkout and portal cancellation passed. Signed expiry and downgrade passed through an isolated CLI relay. Persistent provider endpoint delivery remains open. |
| B17 performance | The Dublin rollout improved the user's experience. Intermittent provider waits remain, and homepage measurements are lab samples. |
| Device and access coverage | The physical iPad was unavailable. Scoped browser checks passed. Broader accessibility and hosted access coverage remain open. |
| Sharing and support | New audio requests are denied after revocation. Previously issued storage URLs have a configured 10-minute lifetime. The current beta monitoring limits were accepted for beta and need a fresh decision before wider promotion. |

Use the prior Ready deployment for an application rollback. For database changes, use the matching migration rollback only after reviewing which access boundary it reopens. The app feedback form is the existing reporting path. The owner retains the wider-promotion decision once the remaining limits have been reviewed.

8 November L7 exit checkpoint: PR #107 and #108 merged. Verified the FAQ and two corrected lock-screen image descriptions on www.song-room.live at Ready Production deployment dpl_3jeM77q7iwEB8aYHY3SZX2o7KbNt, source ea3449cb. A narrow Chromium viewport passed the live Enter/Space FAQ interaction. Rollback is the previous Ready deployment or a revert of the affected homepage change. L8 evidence review has started. L6 remains open.

8 November B20 controlled test: protected Preview dpl_CFnT6qSRbm5Ks1NLDqDGxsR3AW7K ran exact source 50992b5d on the password-enabled staging branch. One synthetic v2 finalized, provider logs counted one accepted submission for one allowed member, and one matching inbox email arrived with the correct staging version link. After restoring the previous staging alias, the link still opened the version. Removed the two branch-scoped test values and the unaliased temporary deployment. The existing Production deployment stayed in place. Local tests cover duplicate-finalization suppression and the all-member rule. The hosted test used one recipient and did not replay the finalize request. PR #110 stays draft with production activation open.

B43/B44 follow-up: B44 protected Preview rejects unsigned requests with HTTP 400. Signed local fixtures verify the linked-subscription guard. To test actual Sandbox delivery without sharing a project-wide Vercel bypass credential, use Stripe CLI in Sandbox with a local listener and a disposable staging workspace. Forward only subscription update and deletion events. Confirm the matching subscription and processed ledger event before and after expiry, and replay the same event to check idempotency. This checks provider event forwarding and the handler with staging data. A persistent hosted webhook remains a separate configuration decision.

8 November B43/B44 acceptance: confirmed the CLI Test mode account contains the existing staging subscription, which remains scheduled for 5 December. The approved test used a separate trial subscription and disposable staging workspace. Protected Preview dpl_GCZjCkZM8kpRFVKKNNUrVJVyksjM at 4e39fa9a received two genuine Stripe Test mode events through the local filtered CLI relay. The scheduling update returned 200 and the fixture stayed Pro. After clock advance, the deletion returned 200, set the fixture to Free, and cleared its subscription link. Replaying the deletion returned duplicate true. Both events were processed once in the ledger. The original staging account retained Pro and its subscription link. Restored the Preview alias, removed the temporary signing variable and test deployment, stopped the relay, and verified zero staging fixture accounts and ledger rows. Stripe confirmed the test clock was absent and its customer deleted. B44 [draft PR #111](https://github.com/corisleachman/song-review-app/pull/111) remains Preview-only. A permanent Stripe-to-Preview endpoint was outside the isolated test.
