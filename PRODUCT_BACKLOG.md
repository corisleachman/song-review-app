# Product Backlog

> Current progress: [Launch checklist](LAUNCH_CHECKLIST.md). Updated 2 November 2026. This document retains historical detail; the checklist controls current stage status and priorities.


Bugs and feature ideas for beta readiness and later product work. The current priority order below identifies the near-term queue; other entries remain unscheduled. Track active stages and every new backlog request in `LAUNCH_CHECKLIST.md`; keep detailed task evidence here.

---

## Current priority order

1. L5: close the remaining security findings, beginning with API and direct-database workspace isolation. The 1 November read-only inventory confirms RLS is already enabled on all 24 public tables; correctness checks remain.
2. L6: run consolidated launch QA, including payments in an isolated test environment and production performance after PR #63.
3. L7: finish discoverability, then L8: review the evidence for wider launch.

Core public Email signup/login/recovery is Production complete (25 October); signed-in Add/Change password remains separately gated off. Homepage/iPad work and player restart/loop fixes are shipped. A physical 11-inch iPad check remains useful additional coverage. Microsoft login stays deferred.

Current checklist IDs and all later items: [Launch checklist](LAUNCH_CHECKLIST.md).

## MVP performance and dependability intake, 1 November 2026

Capture and organise only. These requirements don't authorise implementation or a change to the current L5 security task. Performance is the user's main concern for inviting more people; B17-B19 are the leading performance workstream after the current security slice, tracked in L6. No fixed timing promise is set before measurement. All five requirements below remain untested and open.

### B17. Dashboard: measure and reduce time to useful songs and artwork

- Status: User-reported performance problem, not instrumented or independently reproduced. Investigation queued; no fix complete.
- Reported behaviour: Opening the dashboard takes roughly 5-6 seconds before artwork and all songs appear. This is a user estimate, not a measured baseline.
- Intended outcome: Show useful song content quickly and load artwork promptly without blocking the rest of the dashboard.
- Implementation inspected: `app/dashboard/page.tsx` initializes through `/api/dashboard`, reuses its payload in `loadAll`, and already has opt-in performance tracing; `app/api/dashboard/route.ts` has request timing. A separate summary route exists. These facts don't establish which path is slow or justify introducing another fetching path.
- Investigate: Trace auth/bootstrap, song data, related-version/action queries, response size, client processing/render and artwork discovery/download/decode independently. Check sequential or repeated requests, oversized artwork, unnecessary processing and cache effectiveness as hypotheses only. Record whether artwork unnecessarily waits for data or vice versa.
- Acceptance criteria:
  - Establish a reproducible baseline on a representative multi-song account before editing code; document account size (without private content), environment, device/browser, network/CPU conditions and cache state.
  - Measure first visits and repeat visits; separate time to useful song content, data-request duration and artwork readiness. Use repeated comparable runs and show variability, not one favourable sample.
  - Identify the main delays with evidence, explain the scoped changes and demonstrate before/after improvement under comparable conditions.
  - Avoid repeated fetching/processing without a reason; preserve the canonical server-backed path, correct loading/empty/error states and account/workspace isolation.
  - Propose a realistic performance target after baseline measurement. No fixed target has been supplied or silently chosen.
- Dependencies: Safe access to a representative account; trace capture; B18 lifecycle checks; S2 cache/access isolation. Reuse existing timing tools where useful.
- Decisions still needed: Target after measurement; representative test account/device/network to record. No product decision blocks initial diagnosis.

### B18. Dashboard: retain valid songs and artwork when returning

- Status: User-reported blank-content defect, not yet reproduced with a known trigger or absence interval. Investigation queued; no fix complete.
- Reported behaviour: After time away, the page shell remains but the song/artwork area is blank, then reloads. The user doesn't know how long away causes it.
- Intended outcome: Keep valid populated content visible while checking for updates; stale data must never cross users or workspaces.
- Implementation inspected: `app/dashboard/page.tsx` registers both focus and visibility listeners, with a one-second reload coalescing guard. Its viewer/workspace-scoped localStorage cache has a five-minute freshness limit. On a cache miss/expiry, `loadAll` sets loading true, and the song region switches to loading UI. This is a concrete reproduction lead, not proof that it explains the user's incident. Sign-out removes the active scoped song cache; switching, expired sessions and in-flight responses still need testing.
- Investigate: Distinguish a background tab return from an in-app dashboard remount. Inspect cache expiry/invalidation, focus refetches, session refresh, component remounts, request races and artwork URL validity; don't assume one is responsible.
- Acceptance criteria:
  - Test background-tab return and in-app navigation separately after 1, 5, 15 and 30 minutes; record the actual trigger. Include cache-expiry boundaries and a request failure.
  - Previously loaded songs/artwork remain visible during valid background refresh; actual additions, edits and deletions still appear correctly.
  - Expired sessions and inaccessible/expired artwork show appropriate recovery states; valid content isn't hidden just for a freshness check.
  - Logout, sign-in as another user and workspace switching cannot expose prior private content, including late responses. Preserve loading, empty and error states for genuine initial/unauthorised loads.
- Dependencies: B17 shared performance harness, session/cache boundary review under S2, controlled song updates and separate test identities. Don't weaken authentication or stretch signed-URL validity as a speculative fix.
- Decisions still needed: Freshness/revalidation policy after reproduction; don't choose a larger TTL merely to conceal the symptom. No additional user decision is needed to begin diagnosis.

### B19. Dashboard to song: measure and reduce navigation delay

- Status: User-reported slow transition, not yet instrumented or independently reproduced. No fix complete.
- Reported behaviour: Clicking from the dashboard into a song feels slower than it should; no measured duration supplied.
- Intended outcome: Reach a useful, correct song page promptly, with clear feedback while remaining details load.
- Implementation inspected: `openSongContext` already navigates directly to a known latest-version route when available, falling back to `/songs/[id]`; that entry page looks up the song and latest finalized version in parallel before redirecting. The version page fetches canonical song/version information. Don't assume every click takes the redirect path or that the redirect is the bottleneck.
- Investigate: Measure click-to-feedback, route/data requests, identity/bootstrap, rendering, version selection and audio/waveform readiness separately. Evaluate safe reuse of dashboard metadata and progressive loading without replacing server authorisation or adding duplicate data paths.
- Acceptance criteria:
  - Capture baseline and after-change timings using comparable songs, devices, networks and cache states, including cold/warm navigation.
  - Define and measure when the page becomes useful; show clear transition/loading feedback while remaining content arrives.
  - Preserve song details, finalized/latest-version selection, playback, seeking and version boundaries.
  - Fast song-to-song changes and late responses never display the previous song's details or audio as the current song.
  - Propose the timing target from measurements, rather than making up a threshold.
- Dependencies: B17 measurement setup, S2 canonical access review, representative songs/versions and existing playback regression coverage.
- Decisions still needed: Useful-page milestone and target after measurement; whether metadata reuse is justified by evidence. No redesign is requested.

### B20. Verify notifications for new version uploads

- Status: Capability/delivery unverified, not a confirmed notification failure. Audit first; implement only if a gap is demonstrated.
- Reported need: When someone uploads a new version, the other workspace participants should be notified. The user isn't sure whether this already happens.
- Intended outcome: Confirm the real current upload-to-recipient behaviour, then close only demonstrated gaps.
- Implementation inspected: `lib/threadNotifications.ts` handles thread/comment email and existing `all_members` / `owner_only` recipient policy. No explicit new-version notification dispatch was found in the inspected `versions/create` and `versions/[versionId]/finalize` routes. Thread notifications alone aren't proof of upload notifications; inspect indirect jobs/hooks and delivered-message evidence before deciding a feature is missing.
- Acceptance criteria:
  - Trace a controlled successfully finalized new version from uploader through any event/job/provider to the intended other workspace members; verify delivery evidence and a link to the correct song/version.
  - Notify every member of the workspace under the confirmed 1 November requirement, including the uploader under the literal all-members rule; exclude unrelated workspaces. New-version alerts must not be restricted by the existing owner-only comment-notification setting. Preserve that setting for unrelated comment notifications.
  - No misleading notification for failed/cancelled uploads, and retries/repeated finalization don't generate duplicate messages.
  - Record recipient selection, whether a send was attempted, delivery/failure outcome and safe diagnostics without exposing tokens or private song content in logs.
  - If already working, record the tested evidence; don't replace it or mark complete based only on a code path.
- Dependencies: Existing workspace membership/notification policy, upload finalization, provider configuration and a controlled multi-member test with authorised test email delivery. No real email send is part of this capture task.
- Confirmed decision (2026-11-01): Version-upload alerts notify every workspace member, rather than applying an owner-only recipient policy. Keep the existing email delivery approach in scope; no new push/in-app channel requested. Delivery remains untested and the item remains open.


## Bugs

### B21. Membership RLS recursively evaluates itself
- Logged: 2026-11-01. Priority: P1 security/correctness closeout, L5/S2-S3. Status: Production complete after separate approval on 1 November. Staging: 34 installed-definition SQL checks, six invitation checks and scoped browser checks pass. Production: 16 read-only role checks, six metadata checks, eight HTTP probes and scoped signed-in browser checks pass. Both advisors have zero security errors/warnings. See `B21_SECURITY_REPAIR_REVIEW.md`.
- Observed: an existing staging owner's authenticated database read fails with SQLSTATE 42P17, infinite recursion in account_members. Production has the same SELECT policy structure; live authenticated-role behaviour wasn't probed. No cross-workspace disclosure demonstrated.
- Root cause: membership SELECT queries its own RLS-protected table; related role helpers are SECURITY INVOKER reads of that table. Server service-role reads can mask the failure.
- Intended outcome: legitimate member reads work while outsider reads and unauthorised writes remain denied.
- Acceptance: reproduce with read-only staging role probes; inspect all dependent policies/helpers, table/column grants and client call sites; verify own/member/outsider/anon reads and authorised/denied writes; retain canonical server paths; no broad grants, disabled RLS or added always-true policies. Verify equivalent environment schema and production rollout separately.
- Dependencies/review: candidate preserves existing workspace-member visibility and owner/admin write rules. It adds two private privileged helpers, which received separate staging and Production approval. Two ordered migrations, rollback scripts and 34 passing transaction-only checks are in `B21_SECURITY_REPAIR_REVIEW.md`. Staging and Production repair are installed and verified. See the rollout record for scope and remaining broader security checks.

### B22. Legacy password verifier reports success when unconfigured
- Logged: 2026-11-01. Priority: P2 fail-closed hardening, L5/S2. Status: Production complete. PR #66 merged as `6e770973`; deployment `dpl_iwxMHCuc3D5dxh7q6fGmkPHSauc3` is READY on the live domain. Empty input returns 401/success false without a session cookie; 121 tests and eight production smoke checks pass.
- Observed/root cause: empty JSON input and absent SHARED_PASSWORD compare undefined === undefined, returning success. This endpoint doesn't create a Supabase session; no session-access bypass demonstrated.
- Intended outcome: absent/empty configuration or missing/non-string/incorrect input always fails; valid configured legacy input retains its response.
- Acceptance: test absent/empty configuration, empty/missing/null/non-string input and valid/invalid configured input; verify no session cookie is set; run relevant checks and hosted missing-input smoke.
- Dependencies/decisions: no provider/configuration change required. Removing the legacy endpoint entirely remains outside this narrow fix.


### B23. Private song media remains accessible through permanent public Storage URLs
- Logged: 2026-11-01. Priority: P1 privacy finding, L5/S2-S3. Status: confirmed private-audio reproduction on staging; matching public bucket configuration confirmed on Production. Audio candidate passes local and scoped staging checks after same-origin waveform credential fix; native/mobile expiry, artwork, performance/revocation and bucket cutover remain open.
- Reported/observed: security closeout found both audio/artwork buckets public. Anonymous HEAD for one finalized private staging song audio object returned 200. No file body downloaded or Production private URL requested. No evidence of third-party access or bucket enumeration.
- Root cause: application access checks gate URL issuance, but public Storage retrieval bypasses them. Share toggling changes database flags only. Continued known-URL access after revocation is supported by code/config inspection, not a tested live toggle. Private artwork retrieval is not individually tested.
- Outcome: private media requires authorisation; public sharing works only within its intended scope and agreed revocation window, without breaking playback or slowing the app unnecessarily.
- Acceptance: deny anonymous/outsider private file access, including legacy URLs; allow intended owner/member/public-share media; verify share/playlist revocation and expiry contract; preserve artwork, uploads, finalization, seeking, waveform, background playback and account isolation; record comparable performance and safe error handling. No private URL/token/content in diagnostics.
- Dependencies: compatible server delivery, legacy image-path resolution, playback renewal, both buckets and CDN/cache verification. Don't flip a hosted bucket before serving support passes staging. No file deletion/move or unrelated schema redesign.
- Decision confirmed: user accepts short expiry and prioritises smooth playback. Audio candidate uses 600-second tokens subject to verified CDN/cache behaviour. Existing image cache metadata is one hour and needs separate treatment. Staging target is confirmed through deployed client/server behaviour despite env-list 403 and empty CLI pulls; no permission change was required. See `STORAGE_ACCESS_REVIEW.md` for concrete rollout surface and safeguards. This is a finding within existing L5 security scope, not an unrelated feature.



### Marketing homepage: staged hero fades make first load feel slow
- Priority: P2 beta presentation; keep separate from the active authentication rollout.
- Logged: 2026-10-21
- Status (2026-10-26): Implemented locally on `codex/homepage-first-paint`. Removed staged image/copy/CTA entrance delays, kept later crossfades, and disabled background rotation for reduced motion. Local verification is recorded in `UPDATE_LOG.md`. Not pushed or deployed; cold-cache, throttled-network and physical-device acceptance remain pending.
- Observed: the hero images fade in one after another, and supporting copy appears after several images. Although the page is responding, the sequence makes the homepage feel slow and temporarily incomplete.
- Original code finding: the six hero bento cells start hidden and are deliberately revealed with a 1.4-second stagger. The desktop hero tagline also has a four-second transition delay. This is an intentional presentation sequence rather than enough evidence of slow image delivery, so measure image readiness separately before changing loading behaviour.
- Expected: show the complete opening composition and its essential copy almost immediately on first load. Later background image crossfades can remain if they don't delay initial comprehension or the primary actions.
- Preserve: current responsive compositions, natural image crops, readable overlays, signup and Login routes, reduced-motion behaviour, and stable layout while images become available.
- Acceptance: compare cold and warm loads on desktop, phone, and tablet at representative network speeds; confirm essential text and actions are visible immediately; confirm no blank bento cells, late paragraph gap, cumulative layout shift, broken crop, or large image-download regression. Reduced-motion users must receive the same complete first view without entrance delays.

### Song review: Play from Start and Loop Song controls are missing
- Priority: P1 beta playback regression; keep separate from the active authentication rollout.
- Logged: 2026-10-13
- Status (2026-10-25): Code complete on `codex/song-player-transport-controls`; the user approved a focused commit/push and protected Preview deployment only. Hosted verification is pending. Both controls use the existing media element across WaveSurfer and native fallback. Loop resets on a new version/audio session, survives retry within that session, and exposes its pressed state. The desktop Space shortcut now respects focused native buttons. Phone controls have their own full-width row below title/artwork so both remain beside the timer. Preview and real-device playback verification still precede release.
- Local verification: all 100 repository tests, TypeScript and the optimized build pass; focused ESLint has no errors and five existing warnings. Ten fixture-based browser cases pass across desktop/phone Chromium and WebKit plus 320-pixel Chromium, exercising both audio paths, real media repeat, restart, keyboard activation and version cleanup. Screenshots were inspected. Hosted playback, audible gaplessness and physical-device background/lock-screen behaviour remain unverified for this slice.
- Observed: the authenticated song/version screen currently renders the main Play or Pause button and elapsed/total time, but not the two adjacent transport controls shown in the previous version: Play from Start and Loop Song.
- Code finding: the current hero control row has no buttons or handlers for either action, so this is not a CSS visibility problem. The dashboard mini-player has separate loop behaviour, but that does not restore the missing song-screen controls.
- Expected: restore both compact buttons immediately to the right of the time display, following the previous control order and the current song-screen visual system. Play from Start must seek the current version to zero and start playback. Loop Song must visibly toggle repeat for the current version and expose its state to assistive technology.
- Preserve: first-Play recovery, the WaveSurfer and native-audio fallback paths, single-player coordination, background and lock-screen playback, waveform seeking, timestamped commenting, version switching, and playback cleanup.
- Acceptance: verify both controls with paused and playing audio on desktop and mobile; confirm Loop persists only for the intended current playback session, repeats without an audible second player, and can be switched off; confirm Play from Start works after seeking and near track end. Buttons need keyboard focus, accurate accessible names and state, and at least a 44-pixel touch target without crowding the time display.

### Song review: first Play press can silently do nothing
- Priority: P1 beta journey reliability, ahead of tablet presentation work.
- Logged: 2026-09-18
- Status: ✅ DONE. PR #52 squash-merged into `clone-clean` as `9c483ee1`. Primary Production `dpl_2SyH8hq57prmZeAdfYt4V7oM7Gf3` reached Ready; the public route, security-header and runtime-log checks passed. The user then confirmed the authenticated live first-Play check passed on 2026-09-19.
- Evidence: the first affected Production version is `https://www.song-room.live/songs/48da7337-f2fc-4df4-93e3-d4633aceae30/versions/c8b3db65-6c2a-4102-ac6e-16784bb6719b`, tested in desktop Chrome. The user pressed Play when the button was visible, but exact elapsed initialization time wasn't measured. The first press did nothing; leaving and returning allowed playback. A subsequent MP3 version played on its first press immediately after upload, after approximately three to four seconds of loading. Its URL and browser console/network capture weren't supplied. This is intermittent behaviour, not a consistent post-upload failure.
- Controlled finding: a local harness runs the actual initialization callback, Play handler, retry callback and lifecycle effect extracted with TypeScript's parser. With delayed initialization, enabled Play presses are discarded and aren't resumed when the player appears; a later press loads/plays normally. Without pressing Play, the twelve-second deadline triggers idle failure and automatic retries repeatedly reset their own allowance. A timeout after a requested load creates a new player without resuming that load. Media, timers and module import are mocked; the particular Chrome occurrence remains unconfirmed.
- Earlier evidence: Preview MP3 version `8082846d-c43f-4d8f-9e61-0cab43f02466` played after connectivity recovered, without file or code changes. This still rules out a blanket MP3 incompatibility conclusion; it doesn't establish dependable first-play behaviour.
- Local implementation: preserve a requested first Play through initialization, start deadlines only for actual loading, permit one automatic retry per version/audio session, resume requested loading after retry, ignore stale callbacks and retain a stable recoverable failure. Button and desktop Space use the same handler. The existing native fallback remains, with duplicate fallback and stale-session guards. Upload finalization, canonical reads and background/single-player coordination architecture are unchanged.
- Local checks: 69 tests passed, including 22 new player-lifecycle cases; TypeScript and focused ESLint passed. The optimized build passed with temporary non-production build placeholders and existing lint warnings. Mocked media tests don't establish real browser playback or gesture permissions.
- Verification: initial post-upload navigation and direct version opening, immediate first tap during slow initialization, idle beyond twelve seconds, throttled-network recovery and exhausted retries, manual retry, MP3/WAV playback, version navigation cleanup and background playback.

### Tablet homepage: display headings become dense, blocky shapes
- Priority: P1 beta presentation
- Logged: 2026-09-14
- Status: ✅ PRODUCTION COMPLETE. PR #53 squash-merged into `clone-clean` as `5dc27863`. Primary Production `dpl_DAJqpPQhNMphgGYKTbE1mvb2Bp6M` reached Ready and serves the live aliases. Live homepage/header/WebKit and deployment-scoped runtime checks passed, and the user confirmed the revised page looks great in desktop Safari. Chrome's 11-inch iPad emulation, local WebKit at tablet size and the automated tablet case also passed. A physical 11-inch iPad hasn't been available, so that remains post-rollout coverage rather than claimed evidence.
- Observed: filled Thunder headings such as “You've been doing it the hard way” and “Upload it. Everyone hears it.” become cramped blocks with poor internal definition. The original iPad screenshots and the later desktop Safari screenshot show the same readability problem. The words are much harder to scan than the surrounding body copy and don't look intentionally rendered.
- Working cause: this is a breakpoint inconsistency rather than evidence of a failed font download. Phone and tall-tablet rules select Thunder Bold with a `0.84` line-height, while wide screens still select the much heavier Thunder Black face at `0.74` and allow lead headings to reach 140 pixels. Safari is rendering that specified desktop treatment.
- Expected: carry a deliberately tested display treatment through the tablet range. Keep the established editorial character, but use a readable face, line-height, size, and wrap at every width. Font loading failure must also fall back without collisions or materially changing the section height.
- Local implementation: the main marketing headings and proof quote now use Thunder Bold, a `0.84` line-height, normal kerning and bounded fluid sizes at every breakpoint. Thunder Black remains available for short accents such as section numbers and prices. Reduced-motion users receive the completed outlined hero heading instead of an invisible animation start state.
- Local verification: 71 contract tests passed. The public Chromium suite passed 15 tests with seven expected project skips, including new 1440×900 computed-type coverage and the existing 820×1180 tablet case. Local WebKit renders at both sizes returned 200 with Thunder Bold, a `0.84` line-height, no horizontal overflow, no page errors and no framework overlay; the Problem section captures were inspected. The optimized build passed with its existing warnings. The later desktop Safari Preview comparison passed by user report.
- Follow-up verification: when a physical 11-inch iPad Air becomes available, check portrait and landscape in Safari and Chrome at normal zoom and 200% zoom. Confirm that every word remains distinct and reopen this item if the physical device differs from the verified Preview evidence.

### Tablet homepage: 11-inch iPad falls into an unfinished responsive layout
- Priority: P1 beta presentation
- Logged: 2026-09-14
- Status: ✅ PRODUCTION COMPLETE. PR #53 squash-merged into `clone-clean` as `5dc27863`; primary Production `dpl_DAJqpPQhNMphgGYKTbE1mvb2Bp6M` is Ready. Automated checks, Chrome's 11-inch iPad emulation, local WebKit, live route/header checks and the Production runtime scan passed. A physical 11-inch iPad wasn't available for the revised candidate, so the named physical-device matrix remains honest post-rollout coverage.
- Observed: the hero and later sections look like enlarged phone stacks rather than a composed tablet page. Feature copy sits in a small area of very wide panels, image and text transitions feel disconnected, and excessive empty space makes the page look broken. The signed-out navigation also loses “Sign in”: desktop links are hidden at 900px, while the phone Login action appears only at 600px and below.
- Working cause: the shared `max-width: 900px` rules flatten the hero, problem, feature, product, proof, and pricing layouts to one column. The more considered phone composition is reserved for 600px and below, leaving common iPad portrait widths between those modes.
- Expected: add a content-driven tablet composition for tall touch viewports rather than simply stacking the desktop page. Keep image and copy relationships obvious, constrain readable measures, remove dead space, and retain both account-creation and returning-user routes in the opening view.
- Local implementation: tall tablet portrait now has a two-column hero with one lead image, one supporting image and the descriptive panel instead of the four-row phone stack. Sign in and Start for free stay visible with 44-pixel targets. Problem/chat, product, feature, proof and showcase sections recover their paired compositions; copy measures, spacing and image relationships are bounded for the tablet width. Short viewports retain the existing phone-safe layout, while wider iPad landscape continues to use desktop rules.
- Local verification: an 820×1180 Chromium check confirmed the tablet grids, visible account routes, readable 16-pixel body copy, reduced-motion hero, no horizontal overflow and no blocking accessibility violations. Visual captures of the hero, problem/chat, first feature, proof, showcase and pricing sections were inspected. This isn't a substitute for the named iPad Safari and Chrome gate.
- Verification: test the complete homepage on a real 11-inch iPad Air in portrait and landscape, using Safari and Chrome. Check first load, scrolling, font completion, rotating the device, browser chrome changes, touch targets, and 200% zoom before production rollout.

### Google sign-in return feels stalled and repeats two loading experiences
- Priority: P2 beta authentication UX; unscheduled pending measurement.
- Logged: 2026-09-19
- Status: Captured from a user-observed Production journey. No implementation or technical diagnosis is approved.
- Observed journey: from Login, Google opens the account chooser. After the user selects their existing Google account, the app visibly returns to the Login screen for roughly three to five seconds before redirecting to the intended song. The song route then shows the outlined “Song Room” letter-build loading animation for about another three seconds before its content appears. The complete post-selection wait feels like six to eight seconds.
- User impact: the return to an apparently unchanged Login screen makes a successful account choice look as if it didn't work. The later branded loader creates a second distinct wait, so the journey feels slower and less certain than one continuous sign-in transition even if every request eventually succeeds.
- Cause boundary: these durations are user estimates, not an instrumented trace. Plausible phases include the OAuth callback, session establishment, account/workspace bootstrap, redirect handling, route/data loading and the destination animation, but the backlog must not name one as the cause until the journey is measured.
- Investigation before design: capture timestamps from Google account selection through callback completion, authenticated redirect, bootstrap/server work, song-route navigation, data readiness and meaningful song content. Compare warm and cold sessions, direct Login versus protected-song return, desktop and mobile, and representative network conditions. Check whether the Login page truly renders again or only remains visible while navigation is pending.
- Product direction to assess: replace the misleading Login return with one persistent, accessible “Signing you in” / “Opening your song” transition that preserves the destination context. Separately determine which waits can actually be removed, overlapped or prefetched. Consider shortening or skipping the decorative song loader after an authentication return, but don't hide a slow path behind a longer animation.
- Preserve: Google OAuth security, allowlisted redirects, tier choice, referral attribution, pending workspace-invite priority, existing-account identity, active workspace selection and the exact protected destination. The future email/password flow should reuse the same post-authentication transition rather than create another waiting pattern.
- Acceptance gate: agree baseline measurements before setting a performance target. Verification must show that users never see an actionable Login screen after successful account selection, always receive immediate progress and destination context, and reach usable song content faster without duplicate work or redirect regressions.

### Song review: waveform seeking is coupled to comment creation
- Priority: P1 beta usability
- Logged: 2026-09-01
- Status: ✅ DONE. PR #46 squash-merged into `clone-clean` as `0c78ae81`. The consolidated authenticated desktop and real-device mobile test deck passed before merge, both production deployments passed afterward, the live routes returned the expected responses, and the initial production runtime error scan was clean. The detailed interaction and technical plan is recorded in `COMMENTING_WORKFLOW_REDESIGN.md`.
- Observed: tapping or clicking the waveform both seeks and opens a floating comment composer, so a routine listening action is treated as comment intent and the composer covers the surface being reviewed.
- Expected: an empty waveform interaction seeks only. Comment creation starts through an explicit timestamped action, while existing markers open their conversations.
- Responsive direction: use a stable comments rail beside the complete player area on wide screens, a drawer on compact desktop and tablet, and an accessible full-height sheet on phones.
- Preserve: existing threads, replies, Mark as action, deep links, notifications, version boundaries, workspace permissions, recoverable drafts, and the canonical server-backed data path.
- Boundary: authenticated song/version review only. Public anonymous commenting, database changes, billing, and storage are outside this slice.

### Mobile marketing: signed-out users cannot find Login
- Priority: P1 beta blocker
- Logged: 2026-08-28
- Status: ✅ DONE. PR #42 was squash-merged as `9568e598`; both production deployments and the live routes passed on 2026-08-29.
- Observed on mobile: the homepage presents account-creation calls to action, but an existing user has no visible Login route in the opening view.
- Expected: make Login immediately visible and clearly secondary to the primary signup action, without forcing returning users to hunt through the page or reuse a signup route.
- Design note: treat “Start for free” and “Log in” as two different intents. The mobile opening composition needs both, with Login reachable in the first viewport and a minimum 44-pixel touch target.

### Mobile dashboard: four song-management icons overwhelm each row  ✅ DONE (2026-08-30)
- Priority: P1 beta usability
- Logged: 2026-08-28
- Observed on mobile: Info, Rename, Change image, and Delete remain exposed as four adjacent icons on every compact song row, consuming space and making the primary song journey harder to scan.
- Proposed direction: keep the artwork/title row as the route into the song. Replace the four management icons with one clearly labelled Edit control that opens the existing full-screen song information sheet, extended with rename, cover-image replacement, and delete actions.
- Safety and interaction requirements: do not make the Edit icon the only way to open the song; keep destructive deletion behind an explicit confirmation; preserve play controls, song-stage changes, activity context, keyboard access, and 44-pixel touch targets.
- Preview finding: the consolidated control passed its first mobile check, but the primary Open song action sat below the fold and the floating Feedback control could cover it. The refinement moves Open song onto the artwork, places Delete in a separated danger zone at the end, and ensures the modal sheet covers page-level floating controls.
- Status: Production complete after PR #43 squash-merged as `18d78431`. The single Edit control, artwork-level Open song action, editing controls, separated Delete action, confirmation path, and final label removal passed real-device Preview verification; the production deployment and live route checks passed after merge.

### Global Feedback control is too visually dominant
- Priority: P2 beta polish
- Logged: 2026-08-29
- Observed on mobile and desktop: the large red Feedback button competes with primary page actions and can make already compact views feel cluttered.
- Proposed direction: replace the large labelled button with a discreet bug icon that opens the same feedback dialog. Keep a clear accessible name, visible keyboard focus, a minimum 44-pixel touch target, and enough player and safe-area clearance.
- Status: ✅ DONE. PR #46 squash-merged as `0c78ae81`. The large labelled control is now a 44-pixel bug icon, the existing dialog is unchanged, keyboard behaviour passed, mobile clearance above fixed navigation passed on a real device, and the production deployment checks passed.

### Mobile settings: section navigation wraps into a large link grid
- Priority: P2 beta polish
- Logged: 2026-08-28
- Status: ✅ DONE. Production complete after PR #44 squash-merged as `2fb7cd8e`. The compact selector passed on mobile, the desktop Settings sidebar remained unchanged, the profile image remained present, and the corrected referral route passed in Preview and production.
- Observed on mobile: Workspace, Plan & Billing, Collaborators, Referrals, Appearance, and Privacy & cookies wrap across two loose rows above the current settings page, consuming space and weakening the hierarchy.
- Proposed direction: replace the wrapped mobile links with one compact “Settings section” control that displays the current section and reveals the permitted destinations. Preserve owner-only visibility rules, the active section, keyboard access, and 44-pixel touch targets.
- Desktop boundary: keep the existing persistent left-hand Settings navigation on larger screens.
- Implementation: mobile now uses one labelled native section selector populated from the same permission-filtered navigation items as desktop. The active route remains visible, while larger screens retain the persistent link list.

### Marketing pricing: tier choice is lost during signup  ✅ DONE (2026-08-26)
- Priority: P1 beta blocker
- Logged: 2026-08-23
- Status: Production complete after PR #31 merged as `fad0df1a`. Desktop and real-device mobile Preview verification passed before merge, the production deployment passed afterward, and the later Stripe customer-recovery work preserved the tier-aware route. Durable funnel events remain a separate P2 follow-up under contextual upgrade prompts and lifecycle email.
- Original behaviour: Free, Pro, and Studio pricing buttons all opened the same neutral `/login` route, so the chosen tier and billing period disappeared.
- Expected: use tier-aware signup routes for Free, Pro, and Studio, preserve the selection through Google OAuth and account bootstrap, then send Free to the dashboard and paid choices to a preselected confirmation screen before Stripe.
- Important boundary: a pending workspace invite must take priority over pricing intent, and only a workspace owner may enter checkout.
- Implementation: the homepage now uses distinct tier routes, the billing toggle updates paid links, the chosen plan survives the allowlisted Google callback, and paid choices open a preselected owner-aware confirmation screen before Stripe. Checkout cancellation returns to the same choice.
- Preview result: the owner Google flow reached the Pro annual confirmation, and Stripe Sandbox showed the expected four test prices: Pro at £9/month or £86/year and Studio at £19/month or £190/year. Cancellation returned to the same plan and billing choice with a clear notice. The deployment produced no error or fatal runtime logs during the checks.
- Remaining follow-up: add durable server-backed funnel events before introducing any behavioural upgrade email.
- Detailed product and technical acceptance criteria: `TIER_SIGNUP_AND_UPGRADE_JOURNEY.md`.

### Mobile homepage: descriptive copy appears too late  ✅ DONE (2026-08-20)
- Priority: P2
- Logged: 2026-08-19
- Status: Production complete on 2026-08-20 after PR #22 merged as `d3237af0`.
- Observed on iPhone 16: the paragraph beginning “A collaboration space for artists...” fades in after the rest of the page, leaving a temporary gap that makes the layout look broken.
- Expected: the paragraph should be present when its section first renders. Any remaining entrance motion must not delay the content or leave empty layout space.
- Implementation: phone portrait and short wide layouts now show the description cell from first paint while the other bento cells keep their existing sequence. Reduced-motion users receive the same immediate copy.

### Mobile homepage: bento images crop the subject at the top  ✅ DONE (2026-08-21)
- Priority: P2
- Logged: 2026-08-19
- Status: Production complete on 2026-08-21 after PR #23 merged as `ec006494`.
- Some images inside the bento frames are vertically centred, which can cut off the subject's head or the space above it.
- Preview finding: top-centred cropping exposed too much empty headroom and could leave only part of the subject visible.
- Expected: the lead mobile image should have enough height to frame people naturally using a centred crop, with the explanatory copy over the lower part of that same image.
- Revised implementation: phone layouts promote the existing text-bearing bento cell into a lead panel about half the viewport high, retain centred image framing, and place the four supporting image cells below it. The hidden redundant cell no longer preloads crossfade images. Desktop framing is unchanged.
- Preview check: watch the lead image through several rotations on a real phone and confirm each subject remains recognisable behind the copy.

### Mobile dashboard: song filters consume too much vertical space  ✅ DONE (2026-08-21)
- Priority: P2
- Logged: 2026-08-20
- Status: Production complete on 2026-08-21 after PR #24 merged as `a3afc4b1`.
- Observed on mobile: the song-status filters wrap across three rows, pushing the song list down and making the dashboard toolbar feel clunky.
- Expected: replace the exposed filter grid with one compact, clearly labelled filter control near Sort and New song while preserving every status, count, active state, and keyboard/touch access.
- Implementation: phones use one native song-filter select beside Sort and New song. It reuses the existing filter state and options, keeps every count, and retains 44-pixel touch targets. Desktop continues to show the full filter-pill row.
- Preview result: the compact toolbar, every song-filter option, the filtered list and empty states, Sort, New song, mobile overflow, and the unchanged desktop filter pills all passed manual verification.

### Mobile homepage: primary CTA is clipped and outside the thumb zone  ✅ DONE (2026-08-20)
- Priority: P1
- Logged: 2026-08-19
- Status: Production complete on 2026-08-20 after PR #21 merged as `779501d5`.
- Observed on iPhone 16: the red CTA can be cut off, and its top-right placement makes it difficult to reach one-handed.
- Expected: the primary CTA must remain fully visible inside the safe area and sit in the lower, thumb-reachable part of the opening mobile composition.
- Copy decision remains open between “Start for free” and “See how it works”. Preserve a clear route into account creation whichever label is chosen.
- Implementation: phone portrait and landscape layouts now hide the duplicate navigation CTA, size the hero against the small viewport, reserve iOS safe-area padding, and keep the existing hero CTA centred with a 48-pixel primary target. The approved larger hero exploration remains separate.

### Mobile homepage: display headings lose clarity at small sizes  ✅ DONE (2026-08-21)
- Priority: P2
- Logged: 2026-08-19
- Status: Production complete on 2026-08-21 after PR #25 merged as `b056cdc9`.
- Headings such as “You've been doing it the hard way” look blocky and blur into themselves at the current mobile size.
- Expected: mobile display headings remain distinctive and legible without collisions or muddy letterforms.
- Implementation: phone display headings keep the Thunder family but move from the ultra-black face to Thunder Bold, use two larger fluid size tiers, and relax line-height from `0.74` to `0.84`. Copy, manual line breaks, colours, and desktop typography remain unchanged.
- Local check: 320, 393, 430, and 600-pixel widths showed the intended Thunder Bold face with no heading or page overflow. At 393 pixels the problem heading increased from 64px with a 47.36px line advance to 86.46px with a 72.63px line advance.
- Preview result: every revised heading looked clear on a real phone. No collision or unwanted section height was reported.

### Marketing pricing: stacked order and billing default  ✅ DONE (2026-08-21)
- Priority: P2
- Logged: 2026-08-21
- Status: Production complete after PR #25 merged as `b056cdc9`; the final real-phone check passed on 2026-08-22.
- Observed on mobile: CSS promoted the featured Pro card above Free, producing the sequence Pro, Free, Studio when the pricing cards stacked.
- Expected: plans follow the natural upgrade path Free, Pro, Studio at every viewport. Pro remains visually marked as “Most popular” without changing document order.
- Billing decision: show Annual first so visitors see the lower monthly equivalent and the exact yearly charge, while keeping Monthly one click away.
- Implementation: removed the mobile-only Pro reordering and made Annual the initial active billing period in the markup and toggle controller. Desktop card order remains Free, Pro, Studio.
- Preview result: Free, Pro, Studio appeared in the intended order; Annual was selected initially; and switching to Monthly and back to Annual restored the correct prices and billing states.

### Desktop card view — status dropdown missing  ✅ DONE (2026-08-09)
- Logged: 2026-08-07 · Shipped: 2026-08-09 (commits b9c03461, be268dce)
- On the dashboard **card view** (desktop), the dropdown to change a track's status (In progress / Mixing / Mastered / Completed, etc.) does not appear the way it does in **list view**.
- Expected: the status dropdown should be available in card view, matching list-view behaviour.

---


## Features

### Email/password signup and complete account-recovery journeys
- Priority: P1 active planning, now first in the implementation queue; no dependency on Microsoft login.
- Logged: 2026-09-18
- Current status (2026-11-01): Core public Email signup, verification, password login and recovery/reset are Production complete, with controlled live acceptance on 25 October. Signed-in Account security remains off as a separate release. PR #55 is merged; the earlier staging notes below are historical. See `EMAIL_PASSWORD_STAGING_ROLLOUT.md` current-status checkpoint.
- Controlled Free journey (2026-09-27): the first confirmation click on desktop opened the new empty workspace. Reusing that link on mobile returned to generic Login, where password login reached the same empty dashboard. Code passes `auth=confirmation_failed` on a rejected confirmation token; draft PR #55's current protected Preview now explains an expired or used link behind the Email flag. Synthetic browser checks passed on the hosted Preview, but a real-phone recheck remains open. A cross-device way to request a fresh link, full recovery, referral, invitation, paid-tier, and cross-browser acceptance remain open. Don't treat the second click as a failed initial signup.
- Sender progress (2026-09-25): 123 Reg's duplicate DMARC record was removed; authoritative and public DNS now return only `p=none`. Staging Supabase Auth custom SMTP is enabled through a dedicated Resend sending-only key restricted to `song-room.live`. A real Auth delivery, authentication-header, and bounce-visibility check still precede exposing Email in Preview. Production remains unchanged.
- Template preflight (2026-09-25): all six staging Auth templates and seven disabled security notifications have a dashboard-visible recovery baseline in `STAGING_AUTH_TEMPLATE_BASELINE.md`. With approval, the Confirm signup link was changed to PR #55's `/auth/confirm` contract and the staging Site URL was changed to the stable PR branch alias. Both persisted after reload. The redirect allowlist was left unchanged. A live confirmation, Google callback, and delivery test still need to pass before exposing Email in Preview.
- Password and abuse preflight (2026-09-25): with approval, staging Auth's minimum was raised from 6 to 12 characters and leaked-password protection was enabled; both persisted after reload. Hosted limits remain 30 Auth emails per hour, 30 signup/sign-in and 30 verification attempts per five minutes per IP, and 150 token refreshes per 5 minutes per IP. IP forwarding is off, and the server-side Email routes have no separate per-client-IP throttle. Record effective behaviour in staging before tuning limits. The forgot/reset request and verified-session flow is pushed to draft PR #55 as `ffb7fb2d` and its protected Preview passed checks. The staging Reset password email template has the `/auth/confirm` token-hash link, saved and verified after reload. One controlled reset request produced a Resend **Delivered** message with the expected Preview host and recovery parameters. The user reports that the link, password change, and sign-out/re-entry tests passed; staging Auth shows one matching user and a fresh sign-in. Other-session revocation and broader account journeys remain unverified. Secure password change is now enabled for the separately gated Account security test; current-password enforcement remains off.
- Signed-in password management (updated 2026-10-09): Account security code for Add/Change password is pushed to draft PR #55 and enabled only on the protected `codex/email-password-staging-forms` Preview branch. Staging has the reviewed Reauthentication and Password changed templates, Secure password change on, and Password changed notifications on; current-password enforcement stays off. Ready deployment `dpl_GsmKKaH22T8Dcg4dpDzV9D8Umgf2` was rebuilt from approved HEAD `776682a0` and returns `{"enabled":true,"passwordManagementEnabled":true}`. The full Account security staging gate now passes: recent-session Change password without a code, older-session Change password with the emailed code, notification delivery, existing-Google-account Add password with the exact user and workspace retained, and two-browser revocation. In the last test, two live sessions became one after Browser B changed the password. Browser A's server-side session was removed and later lost access, while Browser B stayed signed in. The final account graph still has one password-bearing Auth user, one Google identity, one profile, and one owner membership in the same Free workspace. Billing and referral state did not change. Rollback is to remove the branch-only flag and redeploy. Production stays Google-only and has no matching flag. Referral and invitation journeys are the next acceptance area.
- Referral and invitation repair (updated 2026-10-11): the database blocker is closed in staging and Production. The approved `harden_account_invites_access` migration enabled RLS on `public.account_invites`, removed all `anon` and `authenticated` table privileges, fixed the trigger helper's search path, and removed its public/client execute grants. Service-role reads still work and the former external advisor error has cleared. After separate approval, the four pending Production invitations that predated the repair were revoked through a count-guarded database update. No address or token was returned and no email route ran; Production now has zero pending invites. Email invite entry is gated by Email readiness, reloads and locks the canonical invited address, preserves the invite destination through Email login/signup, and keeps the accept route's exact email validation. Referral bootstrap now consumes the sealed intent code across browsers, falls back to the cookie, awaits attribution, and clears the cookie. Commit `358b90b5` is pushed to draft PR #55; its protected Preview reached Ready with three successful checks. All 89 local and Vercel-build tests, TypeScript, focused ESLint, config, redirect, and unused-token probes pass. Live referral and invitation acceptance remains open and needs separately approved staging records.
- Referral and invitation live gate (updated 2026-10-11): commit `000ec1de` is deployed and malformed tokens now fail safely. Controlled expired, revoked, and used invite states pass. Three real pending invitations were created through the staging application and delivered to the controlled inbox without changing user, profile, workspace, membership, referral, checkout, or subscription counts. Acceptance stopped because the mismatched-account page blocks the wrong user but offers no switch-account action. Fix and redeploy that focused recovery path before continuing the pending invite or referral matrix.
- Login abuse control (updated 2026-10-24): the Preview-only Vercel firewall observation rule matched exactly one excess request in a bounded sixteen-request run, but Vercel Hobby requires a Pro upgrade for firewall `429` enforcement and the user declined that upgrade. The application-level replacement uses a service-role-only atomic Supabase counter keyed by an environment-specific HMAC of Vercel's visitor IP, allows fifteen attempts per five minutes, and fails closed if its configuration or database result is unavailable. Migration `20261023174605` is applied and verified on staging. Commit `0da27eaf` is pushed, its sensitive secret and exact-true flag exist only on the protected branch Preview, and current deployment `dpl_24PkbV6qUrAwrdtmYnoQZbM6NNdL` is Ready. The corrected sixteen-request gate passes. After later quiet windows, the normal invalid-login route, successful Email login, recovery availability without sending mail, Google availability, controlled-alias absence, and log-safety checks all passed. Production remains Google-only and has neither limiter variable nor database object.
- Atomic invite and Production gate (updated 2026-10-25): a controlled existing-Google invitation passed through the protected Preview and the atomic acceptance RPC. It created exactly one membership, accepted the intended invitation, retained the existing identity graph, and redirected to the Dashboard. The exact staging fixture was removed in a count-guarded cleanup and the checked error logs were clear. The three reviewed Email flow, login limiter, and atomic invite migrations are now applied and fully verified in Production, with their original versions preserved. All controlled Production fixtures were removed; five Google-only Auth users and zero pending invitations remain. The Production hosted-configuration audit is complete. Cloudflare confirms the existing staging widget allows only the stable protected Preview hostname, uses Managed mode, and has pre-clearance off. Production Email remains off, Google remains on, and no rollout variable, application code, or deployment changed. The proposed hidden package uses the tested staging templates and safeguards, a dedicated Production Resend credential, a separate Production Turnstile widget, fresh Production-only secrets, and `https://www.song-room.live` as the canonical host. It keeps both public Email flags off until the hidden deployment and Google regression pass.
- Preview activation preflight (2026-09-26): PR #55 remains draft and primary Preview `dpl_5XtatCMZYYbdtoPFo7MSRfe4EeBB` is Ready. The public Turnstile key, sensitive intent secret, and exact-true Email flag exist only on `codex/email-password-staging-forms` Preview; all three are absent in Production. The protected new deployment returned `enabled: true`, rendered Email and Password fields, a successful Cloudflare security check, and the Google button. Cookie-free Dashboard kept its login redirect, `/signup/free` returned `200`, and recent error/5xx runtime searches were empty. A signed-in browser was redirected from Create account to its Dashboard, so the signup form and full Google OAuth were not retested. Resend has no configured tracking subdomain; the staging Auth sending key had no messages in its last-15-days view. A test inbox is designated, but delivery and confirmation-link integrity remain untested. Next seek explicit approval for one controlled staging signup and mail test. No public Email rollout until full recovery is built and tested.
- Scope: email/password signup and login alongside Google, email verification and resend, forgotten-password requests, expired/used recovery links, password reset/change and deliberate session handling. Email is the login identifier. The requested username is a display name, not a unique handle or second sign-in identifier.
- Entry journeys: neutral signup, tier-aware Free/Pro/Studio choices, referrals, workspace invitations, protected-page login redirects, signed-in visitors and sign-out/re-entry. Preserve referral attribution through confirmation and recovery, avoid duplicate referral rewards, and keep invite priority and owner-only checkout rules intact.
- Existing accounts: a signed-in Google user adds a password through Settings using Supabase's supported `updateUser` flow. A password account choosing Google may use Supabase's verified-email automatic linking, but staging must prove the Supabase user UUID remains unchanged. Never merge accounts from an unverified email, display name, or client assertion.
- Security and operations: use the captured hosted baseline to centralize sealed auth intent, remove legacy-cookie trust from the new boundary, use SSR/PKCE confirmation, configure custom SMTP, add uniform anti-enumeration responses, review rate limits, and add CAPTCHA before public enablement.
- Delivery gate: implement the specification in bounded slices, complete the cross-browser acceptance matrix in staging, and keep the Production Email UI hidden until configuration and mail delivery are verified. Microsoft remains separate and deferred.
- Detailed product, technical, rollout, and rollback plan: `EMAIL_PASSWORD_SIGNUP_AND_RECOVERY_JOURNEY.md`.
- Hidden Production configuration (2026-10-25, complete): the approved dedicated domain-restricted Resend SMTP credential, tested templates, password safeguards, canonical Supabase Site URL, Production-only auth-intent and limiter Secret variables, limiter Config flag, canonical `NEXT_PUBLIC_APP_URL`, and public Turnstile site key are saved and verified. SMTP authentication passed without sending mail. The separate Production widget uses Managed mode with pre-clearance off and the user-selected `www.song-room.live` hostname. After the user saved the new secret, fresh reads confirmed Turnstile with CAPTCHA enabled, a stored secret, zero approved-setting/template mismatches, and the matching Production public site key. Live provider settings still report Email off and Google on, and both public Email flags remain absent. No Song Room application deployment or PR transition occurred. An accidental separate temporary audit deployment caused by Vercel CLI `env run` was deleted and its absence verified. The next gate is PR/deployment preparation followed by a separately approved hidden application deployment and Google regression. Live CAPTCHA and mail delivery remain for the later activation smoke tests.
- Read-only environment findings and the remaining hosted-setting checklist: `AUTH_CONFIGURATION_AUDIT.md`.
- Staging template contract, configuration order, verification, and rollback: `EMAIL_PASSWORD_STAGING_ROLLOUT.md`.

### Turn off the audio visualiser on the song page  ✅ DONE (2026-08-09)
- Logged: 2026-08-07 · Shipped: 2026-08-09 (commit 0ef7554a) — per-user toggle in Settings > Appearance
- Add a control to disable the waveform / frequency visualiser on the song/player page (for performance, preference, or distraction-free listening).

### Public sharing — sequential playlists  ✅ DONE (2026-08-09)
- Logged: 2026-08-07
- Today a single song can be shared publicly. Add the ability to share a **playlist** that plays through in sequence.
- Shipped 2026-08-09: in-app playlist manager + public `/listen/playlist/[id]` immersive player (WaveSurfer, reactive EQ, lock-screen background auto-advance). Commits: manage 7f8fd520, public player c4cc132d, fixes 47a871dc/26d3867d/fc371874/caf49a25.

### Public sharing: embed individual songs
- Priority: P2 sharing feature; unscheduled.
- Logged: 2026-10-21
- Status: Captured from the user's request. No implementation, deployment, entitlement decision, or live verification has been approved or completed.
- Current behaviour: a public song receives a `/listen/{songId}` link, while embed code and a dedicated iframe player exist only for public playlists. There is no single-song `/embed` route or embed-code control in the song sharing dialog.
- Expected: when an individual song is publicly shareable, offer copyable iframe code beside its listen link and provide a compact embedded player for the latest shared version.
- Product decision before implementation: confirm whether individual-song embedding follows the existing Pro and Studio playlist-embed entitlement or is available on every plan that can create a public song link.
- Preserve: disabling the public song link must also make its embed unavailable; private comments and version history must remain private; public-comment permissions must not expand merely because a song is embedded. Keep server-side visibility and plan checks so a hand-crafted iframe URL cannot bypass them.
- Acceptance: verify responsive embeds on representative external pages, keyboard and screen-reader playback controls, first-Play behaviour, latest-version updates, autoplay restrictions, framing headers, unavailable and plan-locked states, analytics or referrer privacy, and immediate revocation when public sharing is disabled.

---

## Future / larger efforts

### Contextual upgrade prompts and lifecycle email
- Priority: P2, with only the in-product foundation required for beta
- Logged: 2026-08-23
- Status: Assessment complete; marketing email automation is intentionally deferred until event data, consent handling, deduplication, and frequency controls exist.
- Use plan suggestions only at relevant owner actions such as an approaching storage limit, a blocked upload, a full collaborator allowance, or a selected plan-gated feature.
- Do not interrupt playback, commenting, uploads, or a successful first collaboration with generic sales messaging.
- Beta should capture durable funnel and prompt events. Owner-only usage warnings can follow when threshold calculation and delivery deduplication are trustworthy.
- The supplied Flow trial email is a useful model only if Song Room introduces a genuine trial. The Apollo pricing-abandonment approach should wait until beta evidence shows that it would be useful rather than intrusive.
- Full trigger matrix, release order, measurement plan, and open decisions: `TIER_SIGNUP_AND_UPGRADE_JOURNEY.md`.

### Mobile homepage hierarchy and hero animation  ✅ DONE (2026-08-22)
- Priority: P2
- Logged: 2026-08-19
- Status: Production complete on 2026-08-22 after PR #26 merged as `d5181516`; the final real-phone preview and live artifact checks passed.
- The current mobile stack does not create a convincing opening hierarchy: the small logo, top-right CTA, “What is the Song Room?” description, large “Create Together” treatment, and oversized closing sign-off compete rather than reading as one sequence.
- Approved direction: keep the full bento image system so the opening still shows several collaborators, place “Song Room” over the upper half of the lead image using the existing letter-by-letter outline animation, and remove “Create Together” and its sign-off from the phone hero.
- Implementation: phones hide the redundant small navigation logo, use the real Thunder outline paths from the existing Song Room loading artwork, show the complete collaborator bento from first paint, use the approved concise explanation inside the lead image, and retain the lower safe-area CTA. Tablet and desktop hero artwork and copy are unchanged.
- Success criteria: the brand is the first clear visual, the explanation follows naturally, and the next action is visible and reachable without an awkward stack or clipped content.

### Microsoft login
- Priority: Deferred growth-stage work, independent of email/password signup.
- Logged: 2026-08-14; reprioritised 2026-09-18.
- Status: Deprioritised at the user's request. Revisit if the app gains traction and generates income; no implementation now.
- Google and public Email signup/login/recovery are deployed. Microsoft remains deferred; it is not required to complete the separate Account security release.
- Before adding Microsoft, plan identity linking and recovery so existing users don't create duplicate Song Room accounts or workspaces.

### Multi-upload + revamped uploader  ✅ DONE (2026-08-10)
- Logged: 2026-08-07
- A faster, easier uploader that supports multiple files at once (multi-upload). Larger rework of the current upload flow.

### B06. Application-owner admin: signups and promotional Pro access

- Logged: 2026-08-07; extended 2026-11-01. This extends the existing creator-console requirement rather than creating a second admin project.
- Status: Feedback triage exists. User directory, owner signup alerts and promotional Pro grants are not verified or implemented by this task. Not complete.
- Reported need: The application owner wants a private, simple view of who signs up, an initial notification for each new signup, and a button to reward selected beta testers with Pro and notify them.
- Intended outcome: A small owner-only directory with search, signup date, identifying details and current effective access/plan; a clear Grant Pro access action with visible confirmation and safe failure handling.
- Implementation inspected: `/admin/feedback`, `app/api/admin/feedback` and its PATCH route use authenticated user lookup plus `isAdminEmail`; `ADMIN_EMAILS` defaults to deny-all but can list multiple administrators. Feedback approval currently records reward eligibility/review metadata, not a Pro entitlement. This isn't proof that a grant flow already exists. `/api/workspace/plan` is a development-only owner test switch that refuses production; don't repurpose it as the promotional grant API.
- Existing product model: Plan is workspace-scoped (`accounts.plan`, canonical bootstrap workspace and workspace-bound Stripe subscription/customer mapping), not a personal user entitlement. The directory must distinguish user identity, membership and effective workspace plan. Selecting a user with several memberships must not silently grant the active admin workspace or every workspace they belong to.
- Acceptance criteria:
  - Only the explicitly authorised application owner can read the directory, receive owner-only signup data or grant Pro. Enforce the boundary on every server read/mutation; test signed-out and ordinary workspace-owner/member denial. Existing ADMIN_EMAILS behaviour must be reconciled with the requested owner-only scope.
  - Show enough information to identify/search users, signup date and current effective access/plan; pagination/search should avoid an unnecessarily heavy all-users load. Keep the interface simple.
  - Notify `corisleachman@googlemail.com` once per genuinely new account creation, across every signup tier; existing login, bootstrap retries and invite acceptance must not create duplicate signup alerts.
  - Require an unambiguous target workspace and apply the agreed promotional entitlement so all intended Pro features/limits and account/settings displays agree.
  - Show successful completion and visible actionable errors. Record grantor, recipient, target workspace, time, grant scope/duration and outcome in an audit trail.
  - Repeated clicks/retries create neither duplicate grants nor duplicate recipient notifications. Partial notification failure must leave entitlement state clear and permit a safe retry without granting twice.
  - The recipient receives one upgrade notification with clear wording reflecting actual grant duration and any expiry. Delivery outcome is inspectable. Final outward-facing copy uses write-like-coris.
  - No charge, checkout or new paid subscription is created by a promotional grant. Existing paid subscriptions, renewal/cancellation and Stripe webhook reconciliation remain correct; a webhook must not accidentally erase or extend a grant.
- Dependencies: Existing owner-only admin gate, workspace entitlement source of truth, subscription reconciliation, idempotent grant/notification records, delivery configuration and S2 negative-access tests. Any later schema or billing-boundary change needs a scoped reviewed implementation; none is performed now.
- Confirmed user decisions (2026-11-01):
  - Beta testers first sign up on Free, then message Coris outside the app. Coris manually selects them in the admin area and converts their Free workspace to promotional Pro. No automatic grant, messaging integration or code-redemption requirement.
  - Grants last six months from the grant action. Record the start and explicit expiry and show both in the admin confirmation and recipient notification. No permanent grant or charge is implied.
  - This grant flow is for beta users starting from Free. Paid Pro/Studio subscriptions are ineligible for this action and must remain unchanged; don't cancel, refund or modify them. Re-check eligibility server-side at grant time.
  - Application owner and signup-alert recipient: `corisleachman@googlemail.com`. Alert on new account creation for any tier, not only Free. Existing login/retry activity must not generate a new-account alert. Capture the requested tier separately from effective Free bootstrap state so paid-intent registrations aren't missed.
- Remaining implementation details to resolve in the scoped design, not new features:
  - Map new account creation to the canonical lifecycle once, covering Google/Email and tier-aware entry without duplicate alerts. Account creation is the confirmed milestone; don't silently substitute each sign-in, payment or verification retry.
  - Plans remain workspace-scoped. Require an explicit target owned Free workspace; if several are available, select one rather than granting every membership. Don't grant a workspace the beta user merely belongs to, or create a new personal entitlement model.
  - Specify expiry scheduling, the safe over-limit state after expiry, and precedence if the tester purchases a paid subscription during the six months. Preserve data and valid paid access, never auto-charge, and don't let duplicate clicks renew/extend the six-month period unintentionally. Implementation and tests must settle these boundaries before release.
- Existing redemption-code assignment remains a separate later part of the original console idea. It isn't required for this simple button flow. No broader administration system is requested.

---

## Pre-launch checklist audit (2026-08-26)

Captured from a launch-readiness review (TikTok launch checklists cross-referenced against the build). Secret rotation is being handled outside the backlog. robots.txt, sitemap.xml and Dependabot shipped 2026-08-26; npm-audit CI workflow pending manual add (token lacks Workflows permission).

### Security hardening
- Current status (2026-11-01): Active L5. RLS, CSP enforcement, upload validation, public Email CAPTCHA and the login limiter already exist. Older unchecked bullets below are historical scope, not evidence that each protection is missing. Remaining findings and verification are tracked in `LAUNCH_SECURITY_REVIEW.md`.
- Logged: 2026-08-26
- Separate Vercel secret-handling review: the `song-review-app-v2` dashboard marked Production `SUPABASE_SERVICE_ROLE_KEY` and shared `RESEND_API_KEY` as Config variables needing attention because their names look secret-like. No value was revealed or changed during the PR #55 Preview check. Confirm their intended scopes, review exposure and rotation implications, then move them to appropriate secret handling in a separate approved rollout. This is not part of the Email test activation.
- Add login/auth rate limiting (verify Supabase defaults, add app-level throttle).
- Add bot protection on signup. Cloudflare Turnstile is implemented in draft PR #55; the staging widget, Supabase Auth secret, CAPTCHA setting, and branch-scoped Vercel public site key are configured. The hosted-key default-off Preview passed. The later enabled end-to-end test remains pending.
- Flip CSP from Report-Only to enforcing once the report endpoint is clean. ✅ DONE (2026-09-03). PR #47 squash-merged as `7e4faacd`; both production deployments reached Ready, route-specific framing remained correct, and the live header and runtime checks passed without a genuine CSP report.
- Verify audio upload restrictions (allowed MIME types + max size caps). PR #48 merged as `6f655f23`; migration `20260903163658` is applied to staging and production. PR #50's signature-read lifetime fix passed subsequent AIFF and MP3 uploads; the user confirmed MP3 playback after connectivity recovered on 18 September, with no file or code change, then confirmed WAV upload and playback. AIFF playback remains deferred as P3 and new AIFF/AIF uploads are blocked by the deployed policy, with existing files preserved. The later first-Play failure in Production promotes PLAYBACK-001 to P1 journey reliability. The user confirmed the AIFF rejection message and approved production rollout on 18 September. PR #50 merged as `6a09241e`; primary Production `dpl_CGr85ktfsnHnR5syLVQnngEVDobL` is Ready and public route/header/runtime checks passed. The user confirmed live AIFF rejection and MP3 upload; playback only loaded after leaving and returning. A subsequent MP3 version passed immediate first-press playback after a three-to-four-second load in desktop Chrome. Upload/rejection and that new first-play smoke test passed by user observation; intermittent first-play reliability remains open.
- Standardise input validation across API routes.

### SEO / discoverability
- Logged: 2026-08-26
- Add FAQ (marketing section or /faq route) for SEO + conversion.
- Audit alt text on all content/marketing images.
- Make canonical host consistent (www vs non-www; align metadataBase + marketing.html canonical, currently non-www).

### Pre-launch QA
- Logged: 2026-08-26
- Manual test all forms (signup, login, feedback, upload, checkout).
- Broken-link crawl (marketing + blog + in-app nav).
- Lighthouse performance pass.

## Deferred audio-format support

### AIFF/AIF browser playback and waveform support
- Priority: P3, deferred until after beta-critical work.
- Logged: 2026-09-17
- Status: Playback support deferred. Temporary new-upload restriction implemented in PR #50; deployed to primary Production as `6a09241e`. Preview and Production rejection passed by user observation. AIFF playback support stays deferred.
- Evidence: the user's 623,130-byte AIFF finalized on Preview `dpl_BRgru3UvRRzAECzYhqacVACNbTBr` at 17:49:30 UTC, and version/page reads returned 200. Pressing Play produced no audio and briefly showed “Waveform load interrupted”. Upload completion and browser playback are separate failures.
- Working cause: browser decoding/container compatibility is likely, but the generic retry message does not prove the issue is exclusive to AIFF. Earlier Preview M4A waveform retries also remain unexplained; keep a supported-format playback check in beta QA.
- Interim behaviour: block new `.aif` and `.aiff` selections and server allocations with WAV/MP3 export guidance. Keep previously stored files, legacy inspection, and historical versions unchanged. No transcoding or Storage migration in this slice.
- Acceptance: before re-enabling, verify representative AIFF and AIFC variants across Chrome, Safari/iOS and Firefox, including waveform decoding, seeking, playback, background playback and version switching. Choose a separately reviewed conversion/delivery approach only if necessary.

## B23 current staging checkpoint, 1 November 2026

PR #68 e19c8582 adds authorised short-lived audio delivery and project-bound artwork capabilities. Both staging buckets are now private; previously primed direct URLs return 400, delivered artwork returns 200, authorised audio redirects and signed Range works. Existing canonical image references are preserved. 244 Node tests, TypeScript and four PR checks pass; browser CI 28 passed, 10 skipped. Scope is staging only. Physical phone/background expiry, actual upload/finalize, measured performance and controlled live share revocation remain gates. Production remains public and this item is not Done. Current evidence and exact acceptance actions: [Storage review](STORAGE_ACCESS_REVIEW.md#current-staging-checkpoint-1-november-2026).

## B24. Align new audio uploads to 50 MB

- Status: Configuration mismatch confirmed; candidate implemented and staged, not complete.
- Reported/observed behaviour: App and audio bucket advertised/allowed 200 MB while both environments' global Storage limit was 50 MB. Saving staging bucket privacy failed with a global-limit error. A real oversized upload was not attempted; its user-facing failure is unverified.
- Intended outcome: One inclusive 50 MB ceiling for new audio uploads, consistently enforced by app and Storage, without changing existing finalized audio or total workspace quotas.
- Decision: User explicitly selected 50 MB on 1 November. Keep the spend cap enabled. No decision outstanding on the ceiling.
- Acceptance: App picker/help/server allocation/finalization agree; below/exact 52428800-byte metadata passes and larger files fail before allocation. Controlled actual staging upload/finalize/play passes; oversized file gives a clear error. Existing finalized legacy files remain playable. No charge/subscription/quota changes. Verify Production separately after rollout.
- Implementation/evidence: e19c8582 central policy, allocation/finalization errors and upload views updated; boundary and finalized legacy-file preservation tests pass. Staging audio bucket is 52428800 bytes; global 50 MB unchanged. Production bucket/app remain at their old values pending rollout. Historical 200 MB migrations weren't rewritten; upload RPC execution is service-role-only in both environments.
- Dependencies: B23 compatible delivery and private staging cutover; real-upload acceptance and later Production release. L5/S5 P2, not a newly declared launch blocker.

## B25. Mobile first Play needs a second tap

- Status: User-confirmed defect; repair e5dd6435 accepted on staging after user phone retest; Production rollout pending. Chrome on iPhone was explicitly confirmed by the user on 2 November; don't record this as a Safari-only report.
- Reported behaviour: After uploading multiple songs on staging, entering each song and pressing Play first shows the browser permission error. Second Play succeeds. User says other staging tests pass; exact individual steps weren't independently re-run.
- Intended outcome: A single first tap starts authorised audio, including immediately after upload, while waveform rendering can finish separately.
- Working cause: Existing first Play waits for asynchronous waveform fetch/decode before calling play, losing the original gesture context on a restrictive browser. This matches the error but physical-device root-cause confirmation remains pending.
- Acceptance: Fresh page/new upload plays on first tap in Chrome on the user's iPhone without the permission warning or Retry. Same media element survives delayed waveform/module readiness. No page-entry autoplay, duplicate player, stale song, broken pause/restart/repeat/seek, background or lock-screen regression. Desktop and native fallback still work.
- Dependencies: B23 private-media candidate, actual gesture-preserving playback path, regression checks and physical phone retest. Keep Production unchanged until accepted.
- Decisions needed: None. User's existing report establishes the browser to retest; no new product behaviour is proposed.

B25 verification: candidate Preview https://song-review-app-v2-d1qnlsvnw-corisleachmans-projects.vercel.app is Ready at e5dd6435; 245 Node tests and TypeScript pass, browser CI 41412981282 has 30 passed/10 skipped. New gesture-only regression fails against original source and passes candidate. No Production change.

B25 acceptance, 2 November: user confirmed the corrected Preview works after the older Preview URL was identified. First-play Chrome-on-iPhone gate passed by user report. Do not mark Production complete before rollout and live checks. No additional device details or per-step results were supplied.

## B23/B24 live verification checkpoint, 2 November 2026

B24 exact 50 MB upload is now independently verified: synthetic WAV 52428800 bytes, successful finalization, matching Storage/row size, first playback and consistent workspace storage accounting. 52428802 bytes rejected with no matching song/version/object. Staging-only; Production remains pending.

B23 live owner and separate member playback pass on the synthetic private song; wrong active workspace displays Not found. Public-song disable and playlist-entry removal refuse new media authorisation. A real 600-second signed audio URL changes from Range 206 to 400 at expiry+3 seconds before deletion. No global CDN invalidation claim. Candidate 89bdf552 preserves all access checks while reducing repeated round trips: paired handler median 1067.8 to 748.0 ms, HTTP 1.273 to 1.078 s (five post-warmup samples each). This is not the dashboard baseline. 246 Node tests, TypeScript, both hosted builds and 30 browser cases pass, 10 skipped.

Synthetic fixture cleanup was explicitly approved but is waiting on the open Chrome extension panel to be dismissed. No Production media/config change. Broader all-route/all-role L5 checks remain distinct from this scoped media verification.

## Approved fixture cleanup completed, 2 November 2026

After the user closed the blocking Chrome extension panel, the approved synthetic song was deleted through the staging app. Readback confirms its version and audio object are gone. The empty approved test playlist was removed using a guarded SQL delete because the current UI has no playlist-delete control. Zero matching song/version/object/playlist/entry rows remain. Storage accounting released exactly 52428800 bytes and matches remaining finalized sizes (64762207 bytes). Other songs and the separate upload flow were preserved. All four checks pass at PR head 62ba8881. Earlier cleanup-blocked statements are historical. Production rollout is next; do not mark Production complete until deployment/configuration/live checks pass.

## B23/B24/B25 Production release, 2 November 2026

PR #68 merged/deployed as ff15719f on the primary live project. Compatible app was verified first; both Production media buckets then made private and audio bucket set to 52428800 bytes. Global 50 MB/spend cap remain unchanged. Public/private delivery, Range, dashboard artwork, first playback and seek pass in live scoped checks; legacy public audio/artwork URLs are refused in the agent-region probes. Exact/oversize upload and physical Chrome/iPhone acceptance remain staging evidence; no Production upload was performed. B23/B24 are Production complete in this recorded scope; B25 is released with staging phone acceptance and successful live desktop playback. No broad L5 completion or global CDN purge is claimed. See Storage review for exact deployment, evidence, limits and rollback.

## B26. Comment input validation and timestamp bounds

- Status: Production complete via PR #69/1ff2727a, within the validation scope below.
- Reported/observed behaviour: Malformed JSON and object-valued public comment fields can cause 500 responses. Thread creation coerces nonnumeric timestamps and permits negative or overflowing values to reach database work. Twenty newly added regression checks fail on old source. This is an agent-discovered defect, not a claimed user incident.
- Intended outcome: Invalid requests return 400 before comment reads/writes or notification scheduling. Signed-out private requests remain 401.
- Acceptance: Reject non-object/unreadable JSON, unexpected field/ID types, nonfinite/negative timestamps and rounded values beyond the installed integer range. Preserve valid fractional rounding, zero and maximum integer timestamps, canonical workspace/thread/version checks, author identity, replies, honeypot and existing throttle. Verify valid paths with stubbed notifications and hosted no-write probes.
- Dependencies: No schema/env/provider change. Both environments confirm timestamp_seconds is integer. Hosted Preview and Production no-write smoke checks pass.
- Decisions needed: None for malformed-input repair. New comment length/rate quotas are outside this change.

S4 follow-up remains in the existing stage rather than a duplicate feature: durable comment throttling, invite resend/cost guardrails and account-setup coverage need their own design. Pending invites resend on each POST; public comments use an in-memory five/minute/IP Map; bootstrap requires auth but repeats profile upsert. No live abuse incident or provider-limit absence is asserted.

B26 release evidence, 2 November: 281 tests/TypeScript/focused lint and all four PR checks pass; browser CI 41458296211 has 30 passed/10 skipped. Primary live deployment dpl_9TMhrEvBcWFypnDY7td9ARFSbt9G serves merge 1ff2727a. Nine no-write probes passed in each environment. No actual comments, invites or notifications were created. Valid paths are verified through stubbed I/O, including scheduling exactly once. Rate policies are separate from this completed validation fix.

S4 policy approved by the user, 2 November: public comments five/minute per visitor IP; private comments/replies share 30/minute per authenticated user; invite attempts 30/hour per workspace and a 60-second cooldown for a recipient within that workspace. Dashboard/bootstrap/sign-in reads stay outside these mutation budgets.

S4 implementation checkpoint: Production complete for the approved API budgets via PR #70/1352dd8c, with the database verified in both environments; wider S4 remains open. Counters use bounded rolling windows and server-only HMAC identifiers. Invite workspace/recipient reservations are atomic; denied requests consume neither budget. Allowed attempts that fail downstream still count to prevent retry-driven provider abuse. Validation and canonical access checks precede the limiter; 429 includes Retry-After, outages fail closed with 503. Staging SQL verifies bounds, expiry, permissions and isolation; ten concurrent requests produce exactly five public allows and one same-recipient invite allow. No real invitations/notifications sent. Existing direct-database private comment INSERT policies are a separate S4 coverage gap, not silently changed. No new product decision is required for these API limits.


S4 release evidence, 2 November: 307 Node tests, TypeScript/focused lint, all four PR checks and 30 browser passes/10 skips. Staging hosted public POST: five synthetic comments 201, sixth 429; GET still 200 with five comments. Fixture/comment cleanup verified. Primary Production dpl_3gZwUK8rRnpYGodCdi9LQuo3nVQZ serves 1352dd8c on www.song-room.live. Eight no-write live checks pass, error/fatal scans empty. Private/invite success and denial paths are tested with fake notification/provider I/O; no real email send or Production comment write. Direct-database private INSERT coverage remains open and is confirmed by metadata in both environments.


S4 direct-comment boundary candidate, 2 November: confirmed both environments' authenticated INSERT grants plus member RLS allow private writes outside the shared API limits. No client code still uses that path. Intended outcome: comment/thread creation must use canonical API identity, workspace and rate-limit checks. Acceptance: deny direct table/column INSERT to client roles, preserve service-role creation/replies and member reads, preserve other privileges/policies, prove rollback and keep fixture/notification side effects out of hosted tests. Dependencies: existing PR #70 API controls; staged permission migration and installed-definition tests before Production. No new usage limit or product decision. Candidate/baseline probes pass on both environments, rollback on staging; installation/release pending. No live abuse incident is claimed. This extends existing S4 rather than duplicating the backlog.


S4 direct-comment boundary release, 2 November: Production complete for this scoped repair via PR #71/0565f64b. Installed permission checks and 15 rolled-back role/write/read checks pass in both environments, as do baseline/candidate/rollback modes. Actual app paths were unchanged; hosted signed-out checks pass, positive route scheduling remains covered with fake I/O, and no real email journey was replayed. Both Advisors: zero errors/warnings. No fixture workspaces/songs remain. Database rollback restores the previous client INSERT grants if a regression is found. Existing S4 now continues with feedback's non-atomic count check and bootstrap review; no duplicate backlog entry.


S4 feedback atomicity repair, 2 November: old code checks a stored-row count separately from insertion and continues on count errors. Ten simultaneous hosted staging submissions all saved, confirming the race; test entries were removed. Intended outcome: retain existing five/hour per signed-in user, otherwise IP hash, while checking/saving in one transaction and failing closed if quota cannot be checked. Acceptance: concurrent ten yields only five saved, historical rows still count, expiry reopens slots, user quota spans IP changes, anonymous IP history includes signed-in rows, failed checks/constraints save nothing, direct client writes remain denied, UI gets 429/Retry-After. Dependencies: database trigger before updated API route, installed-schema/hosted tests, compatible rollback. No new rate/product decision. Candidate installed on staging with SQL/local tests passing; hosted race and Production release pending. No email/notification path is involved. Existing S4 extended, no duplicate backlog item.


S4 feedback release, 2 November: Production complete via PR #72/f9581734. Primary deployment dpl_EhdHroGorkNpavmv2Wo83cR8EPtD Ready/live. Same ten-request hosted staging test changed from ten saved to exactly five saved and five 429 with Retry-After; database confirmed five and cleanup confirmed zero fixtures. Existing history remains the quota ledger. Eight installed SQL cases pass in both environments; constraint/read failures don't save submissions. 326 Node tests, TypeScript/lint, four PR checks, browser 30 passed/10 skipped, eight live no-write probes pass. No real feedback retained or notifications sent. Bootstrap concurrency is the next existing S4 review; no new product decision or user action for this release.


## B27. First-time workspace creation race and orphan risk

- Status: Production complete via PR #73/ce346868 after user acceptance and installed/live verification.
- Observed behaviour: Real bootstrap function under controlled I/O produces six workspaces for six simultaneous empty-membership reads; a failed owner-membership insert leaves a workspace. Two added regression cases fail the original source. This is reproduced application logic, not a user report or audit of existing duplicate data.
- Intended outcome: Concurrent first setup reuses one workspace/owner membership; failure leaves neither half. Preserve existing workspace selection and current member-first/owner-second default, referral attribution, profile/avatar handling and later legitimate multiple-workspace ownership.
- Acceptance: Six stale callers return the same workspace, with one creator/referral path. Membership failure creates no orphan and retry succeeds. Existing member/owner and valid active-workspace selection remain unchanged. Client roles can't execute provisioning; canonical server user is used. Verify RPC and source, rollback, fresh staged Google signup/first dashboard and returning-user access. Do not clean up any existing user workspaces automatically.
- Dependencies: Service-role-only invoker RPC installed before candidate app; staging identity/function/role probes; fresh browser signup acceptance before this candidate's Production release. Existing auth methods and billing don't change.
- Decisions needed: None. User reports both fresh staging signup/reload tests passed; records show one Free workspace and one correct owner membership. Existing profiles' repeated upsert cost stays with B17 until measured.
- Evidence: 340 Node tests, TypeScript/focused lint; 14 SQL cases in staging candidate/installed and Production rollback-only candidate, plus 15 staging rollback checks. Uncommitted test identities have no passwords/sessions, use no Auth API/email path, and all roll back; zero fixture identities/workspaces remain. Staging Advisor has zero errors/warnings. Live multi-session first signup hasn't been replayed; local concurrency uses fake atomic database I/O, with actual database transaction/lock/permission behaviour tested separately.

This promotes the already-recorded S4 bootstrap hypothesis into a confirmed defect record and repair, rather than duplicating a separate feature or silently adding a new launch policy.


B27 handoff checkpoint: exact-head primary Preview Ready, all four PR checks pass, browser 30 passed/10 skipped. Existing Google user loads the selected member workspace/five-song library; signed-out bootstrap 401 and bounded logs empty. This Preview is Google-only. Fresh Google signup with an account unused in staging remains the user acceptance check; do it in a private window and verify one Free workspace across reload/another tab, then supply test email/result for database verification. No Production migration or merge yet. Canonical test link/instructions are in LAUNCH_CHECKLIST.md.


B27 Production release, 2 November: both user tests accepted, staging Free/one workspace/one membership/owner link verified. Production migration installed/source-verified, 14 installed SQL cases pass, zero fixture users/workspaces. PR #73/ce346868 primary live deployment dpl_F19sdasWwV17Qt6den32dWjPh1s5 Ready on www.song-room.live. 340 Node tests, TypeScript/lint, four PR checks, browser 30 passed/10 skipped and live bootstrap/dashboard/login checks pass; bounded release error/fatal scans empty. Actual fresh signup was tested on staging, not replayed on Production. No real account cleanup, plan/provider/env changes or user action needed. Restore old app before optional RPC removal.


## B28. Anonymous raw song/version data bypasses public projections

- Status: Production complete via PR #74/6288e354, installed database and live app verified. Existing L5/S2/S3 review, not a new feature.
- Confirmed behaviour: Both environments grant anonymous SELECT on songs and song_versions. Rolled-back synthetic fixtures demonstrate access to older versions, unfinished uploads, internal notes/filenames and ownership fields for a publicly shared song. Private songs remain hidden. This proves exposure capability, not evidence of exploitation; no real private content was read. Public comments already deny anonymous raw reads.
- Intended outcome: Anonymous visitors use the existing canonical public APIs, which return the latest finalized version and scoped public fields. Preserve authenticated owner/member history, outsider isolation, public songs, playlist-only sharing, comments, artwork, audio and embeds.
- Acceptance: Deny raw table/column SELECT for anonymous clients; preserve service-role projections, authenticated permissions and other grants. Baseline/candidate/rollback and installed-role probes must pass. Compare hosted public responses, pages, audio redirect/one-byte Range and artwork before/after. No retained fixtures or notifications.
- Dependencies: Permission migration before release closeout; no app/env/provider or sharing-contract change. Both environments confirmed no PUBLIC SELECT or column overrides. Database rollback restores only the previous two anon SELECT grants and reopens the exposure; application rollback alone does not restore permissions.
- Decisions needed: None. This enforces the already-shipped public API contract.
- Evidence: 342 Node tests and focused lint pass; 16 baseline, 14 candidate and 16 rollback SQL cases pass in each environment. Fixtures always roll back, using existing profile IDs without creating Auth users or sending email. Public API regression tests cover latest finalized selection and omission of internal fields. Hosted baseline song/playlist/comments/pages/audio/artwork checks pass; post-install checks pending.

B28 staging checkpoint, 2 November: migration installed as ledger 20261102222009 (source 20261102220823). All 14 installed SQL cases pass, zero fixtures remain. Actual anonymous REST reads now return 401/42501 for both tables; existing comments denial is unchanged. Public API payloads match baseline, public pages/embeds return 200, audio redirect 307/Range 206 and artwork 200. Advisor has zero errors/warnings. Production remains unchanged pending CI/release.


B28 Production database release, 2 November: PR #74/6288e354 merged, 342 Node tests/focused lint/four PR checks and browser 30 passed/10 skipped. Reviewed migration source 20261102220823 installed as staging 20261102222009 and Production 20261102222433. Installed 14-case probes pass in both environments, alongside baseline16/candidate14/rollback16. Anonymous raw REST denied; public song/playlist/comments payloads match baseline; pages/embeds/audio Range/artwork pass; authenticated history preserved; zero retained fixture workspaces. Advisors zero errors/warnings; bounded Production error/fatal scan empty. Primary merged-source deployment dpl_Dh7UyB4o7sokRPmdcK22mfH8B1aB is Ready/live; no app logic/env/provider change. Companion SQL rollback restores only old anon SELECT and reopens exposure. Broader L5 remains open.


## B29. Raw exception messages in settings and billing responses

- Status: Production complete via PR #75/25b96370 and live verification. Extends existing L5/S2/S5 review.
- Confirmed behaviour: Eight actual-handler test paths return a synthetic internal exception verbatim through settings GET/POST forwarding, settings summary and billing activation/checkout/portal. This demonstrates an error-disclosure path, not evidence that live credentials leaked.
- Intended outcome: Unexpected failures return each route's existing generic fallback message; preserve server diagnostics, current 4xx validation/authorisation messages and all identity/workspace/billing rules.
- Acceptance: Reproduced failures no longer echo the internal sentinel; signed-out requests deny before database/provider access; members cannot operate billing; foreign/unpaid checkout activation cannot write; owner customer selection ignores supplied foreign IDs. Profile/referral/settings use canonical user/workspace and owner-only invitations; hosted no-write negatives pass.
- Dependencies: Application-only patch after Node/type/lint/CI/Preview checks. No database migration, plan/customer/subscription mutation, provider send, environment change or billing model decision. Positive provider flows use fake I/O; a real checkout/payment is not part of this error-text fix.
- Decisions needed: None. Existing generic response text is reused.
- Evidence: Eight regression cases fail the original handlers. Fixed suite 377 passed, TypeScript passed, focused lint zero errors (one pre-existing unused import warning in checkout). Remaining route/role/provider/logging coverage stays open in L5; these tests aren't a full hosted payment or settings journey.


## B30. Credential Config-to-Secret classification

- Status: Complete in approved classification scope, 3 November. Type-only edits, metadata read-back and rebuilt Production/Preview checks pass. Existing L5/S6 work.
- Observed behaviour: Primary Vercel project's Production SUPABASE_SERVICE_ROLE_KEY and SHARED_PASSWORD use API type encrypted (readable Config), as does RESEND_API_KEY shared across Production/Preview/Development. Other primary credential entries, including Stripe credentials and auth/rate-limit salts, use sensitive (Secret). This is storage classification, not proof of outside access or compromise.
- Intended outcome: Restrict future readback by converting only those existing entries to Secret, preserving current values/scopes and app operation. No credential rotation, deletion, scope expansion or provider change. Public keys remain public.
- Acceptance: Approval before configuration mutation; verify type-only edit support, exact project/key/target, unchanged scopes, installed metadata and successful compatible deployment/public and signed-in service paths. Never print/decrypt/persist credential values. Stop on any need to replace/re-enter a value or change scope; don't silently create new secrets.
- Dependencies: Vercel type-edit support and permission. Connector environment listing returns 403; authorised CLI metadata fallback succeeds. Do not broaden connector permissions. Type change affects future readback and is distinct from routine app deployment authority.
- Decisions needed: None for these three approved type changes. User approved on 3 November; credential rotation or scope changes remain outside this action.
- Evidence: 38 variable entries inspected via metadata only. 483 tracked files show no private-key/Stripe-live/Resend/service-role-JWT pattern hits; source import walk finds no path from 43 client roots to 14 private-env modules across 209 script modules. Thirteen live script chunks on three public surfaces also show no credential-pattern matches. These are scoped checks, not a full history or secret-exposure audit. Server diagnostic error objects still need separate review.


B30 completion, 3 November: all three entries now Secret with their original scopes; only type was submitted. No credential values decrypted, supplied, printed, rotated or persisted. Production dpl_FAvY4Fbm9Mdt28jZ6EZc9VXXLvBw/d3e505cd and Preview dpl_9ZSL6A7stxJtpEKKv7G1kjEi5AKp/d2238ac8 Ready; public projections/pages/media and twelve signed-out method probes pass in each. No real mail or valid legacy-password replay; bounded error/fatal scans empty. Retain Secret types during any app rollback. Full logging/monitoring review remains open.


## B31. Raw exception and CSP URL content in server diagnostics

- Status: Production complete via PR #77/6ba2c817 and actual hosted redaction checks. Extends existing L5/S6 logging review, not a new product feature.
- Confirmed behaviour: AST inventory finds 85 logger arguments across 59 server route/helper files passing raw exceptions or exception messages. Both legacy and Reporting API CSP runtime tests retain synthetic credentials in relative/malformed URLs, capability paths and arbitrary directive text. Three regression tests fail the original source. This demonstrates unsafe logging paths, not evidence of leaked real credentials or compromise.
- Intended outcome: Keep fixed log context, allowlisted operational error codes and integer HTTP status; drop raw message/stack/cause/request/response data. CSP retains HTTP(S) origins, known protocol labels/directives and numeric diagnostics, omitting URL credentials/paths/queries/fragments and unrecognised text.
- Acceptance: Synthetic messages, stacks, nested authorization/body/URLs and custom serialization do not reach diagnostics. Logging cannot invoke provider getters or interrupt error recovery. Known SQL/network/provider codes/status remain useful; unknown codes/text drop. Legacy and modern CSP preserve 16 KB/type/JSON validation, ten-report cap and existing success status. Full app tests/type/lint and CI/Preview checks pass before Production. No deliberate secret-bearing hosted request or real provider send.
- Dependencies: Application-only safeErrorDetails helper reused at the 85 existing raw logger sites, CSP normalization and regression harness updates. No migration, environment/provider change, auth/billing/storage logic change or dependency added. Previously stored logs are not deleted or claimed remediated; provider retention remains S7.
- Decisions needed: None for scoped redaction. Unknown diagnostic codes are omitted deliberately; add an explicit safe operational code when future troubleshooting justifies it.
- Evidence: 387 Node tests pass, TypeScript passes; focused lint zero errors/five existing warnings. Positive handler logic and all client responses stay unchanged; this does not close S5's remaining raw response-error review or the full hosted role/mutation matrix.


B31 Production completion, 3 November: primary dpl_C1VQK62tyWRy8ZDiZhTjCf7uyZrx Ready/live, 387 Node tests/TypeScript/lint zero errors (five existing warnings), four PR checks and browser30/skip10 pass. Preview/Production public projections/media and twelve signed-out checks pass. Actual benign CSP logs in both environments verify origin-only output; unfiltered retrieval is needed because warning-only filters miss these controls. Production scan27 records/zero error-fatal. Historical logs untouched. Current beta's Hobby one-hour logs/release-time checks explicitly accepted; no monitoring spend/schedule. S6 and beta-scoped S7 close, not all L5 or S5 client error responses. Original browser workspace and fixture cleanup are verified.


## B32. Direct client writes bypass core account and billing controls

- Status: Production complete via PR #78/126825bf, 3 November; actual staging owner save and installed/live checks verified. Existing L5/S2/S3 access review.
- Confirmed behaviour: Authenticated workspace owner can directly change its account plan and Stripe customer/subscription fields and delete the account. Authenticated creator can insert an account row with Studio values. Both environments have the same anon/authenticated INSERT/UPDATE/DELETE grants and permissive creator/owner row policies; there are no column ACL overrides or PUBLIC mutation grants. This proves a database control bypass, not actual misuse or access to another Stripe customer. No real account, plan or subscription was changed.
- Intended outcome: Core account mutations use existing canonical service-backed routes/RPCs only. Preserve account reads, RLS, server provisioning/settings/upload-accounting/billing/webhook behaviour, and all existing data. Current source has no browser account writer; all account mutations use supabaseServer or service-only RPCs.
- Acceptance: Deny client table/column INSERT/UPDATE and table DELETE, including owner direct plan/Stripe changes and creator Studio insertion. Owner/member reads remain correct; outsiders/anonymous reads stay denied. Service account creation retains Free default, legitimate settings/billing updates and cleanup work. Other grants and policies unchanged. Verify baseline, candidate, installed and rollback SQL modes; actual owner settings save on isolated staging fixture; no retained fixtures, real payment or email.
- Dependencies: Narrow permission migration before closeout; existing service-role account paths and B27 atomic provisioning remain. No schema fields/functions, account/plan model, provider/env or existing plan/customer data change. Application rollback alone cannot restore grants; companion SQL restores the exact old anon/authenticated I/U/D grants and reopens the bypass. Do not reset existing plans or reconcile paid accounts automatically.
- Decisions needed: None for enforcing the existing server-owned account model. Beta grants remain B06's separate approved six-month workspace entitlement work; no new promotional or billing rule is chosen here.
- Evidence: Original three direct-write cases pass on synthetic fixtures in both environments. Full baseline16/candidate19/rollback16 SQL checks pass in each; always rolled back, no Auth users or notifications. 390 Node tests pass, including canonical owner-only workspace updates ignoring supplied plan/Stripe/foreign-workspace fields and existing fake-provider billing tests. Focused lint passes. Persistent installation, staged actual save and release pending; no historical exploitation audit claimed.


B32 staging handoff, 3 November: ledger20261103091520 installed,19 actual-role cases pass, raw REST PATCH401/42501 and read200/empty. Source f619e508 four green checks, browser30/skip10, local390 tests/lint pass. One disposable Free owner workspace retained for naming-only UI save: rename “Agent account boundary staging acceptance” to “Agent account boundary staging saved”, Save, switch back to original, return result. No songs/Stripe linkage/provider send. Browser suspension/policy prevented Agent's save; no workaround. Production unchanged until acceptance; Agent verifies/cleans fixture and rolls out afterward.


B32 Production complete, 3 November: user Saved accepted and exact database name/Free/null Stripe state verified; acceptance fixture/membership removed. Production ledger20261103094603, source20261103090300; installed19 role cases pass both DBs, baseline16/candidate19/rollback16 preserved. PR #78/126825bf primary dpl_BfL9iReAvUBWFemGQaXa9aFvT23W Ready/live,390 tests/lint/four CI checks pass. Raw client REST read200/empty and PATCH401/42501; app/public/media/post-build checks pass, Advisor zero errors/warnings. No data/plan reset or real Stripe operation. Companion SQL is the permission rollback; compatible app rollback retains grant repair unless a verified regression requires restoration. Broader S2-S5 stays open, no user step remains.


## B33. Safe unexpected-error responses

- Status: Production complete via PR #79/98f4132f, 3 November; local, CI and hosted checks pass. Existing L5/S5 review.
- Confirmed behaviour: Thirty-two handler catch paths echo raw exceptions and one invite-provider warning echoes provider rejection text. Synthetic private sentinel failures reproduce these paths; no real credential exposure or compromise is claimed.
- Intended outcome: Unexpected failures return existing fixed, useful fallback messages. Keep diagnostic codes/status through B31 safeErrorDetails without returning provider internals.
- Acceptance: Error objects, plain provider objects and thrown strings never reach client messages. Preserve existing HTTP statuses, public invite state=invalid shape, authentication/validation, success paths and data writes. Rejected email retains the created invite, emailSent=false and manual-copy guidance; no duplicate send. Tests use fake providers only. Require CI/Preview and Production smoke checks before completion.
- Dependencies: Application-only change across 26 route files and regression tests; no migration, environment, provider, plan, auth or dependency changes. Private Stripe webhook ledger diagnostics are outside client-response scope and remain unchanged. App rollback can restore prior source; retain existing database permission repairs and Secret classifications.
- Decisions needed: None for scoped fallback messages. Broader validation and cross-workspace review remain open; this item does not finish L5.
- Evidence: 425 Node tests, TypeScript and focused lint pass (zero errors/four existing warnings); original synthetic response/warning regressions reproduced before repair. No hosted deliberately secret-bearing requests or real notifications.


B33 Production complete, 3 November: PR #79/d6ad7f1c merged98f4132f, primary dpl_F65yxwCvh5dPtLMFE6rc8Q7Lf8LG Ready/live www alias. 425 Node tests/TypeScript and focused lint zero errors/four existing warnings; four CI checks/browser30/skip10 pass. Preview and Production63 signed-out methods each pass; public JSON unchanged, pages/artwork/audio redirect and range checks pass. Bounded Production scan50 records/zero error-fatal. No real email, migration/configuration/dependency or billing change. Fake-provider leak regressions tested locally, not injected into hosted providers. App rollback to prior ed5329c2 retains existing account permissions and Secret types. Remaining validation/function/membership review stays open; no user action.


## B34. Direct client membership writes bypass owner controls

- Logged: 3 November 2026. Existing L5/S2/S3 scope, P1.
- Confirmed: rolled-back synthetic owner/admin clients can add an owner without an invitation and remove the existing owner in both environments. Regular member/outsider mutation denials still work. No real account membership was changed; existing exploitation is not asserted.
- Root cause: broad client table grants and owner/admin RLS policies permit membership mutation directly, bypassing server-only invitation, collaborator-limit and owner-preservation checks. B21 intentionally preserved these historical write semantics while repairing recursion.
- Candidate: `20261103154727_restrict_client_membership_writes.sql` revokes only INSERT/UPDATE/DELETE from PUBLIC, anon and authenticated. Preserve member-list reads, policies, helper/RPC definitions, service privileges and all data. All source membership writers use `supabaseServer`; no browser membership writer found.
- Verification: baseline21/candidate23/rollback21 SQL cases pass in each environment; zero fixtures remain and original grants read back unchanged. Actual-handler removal tests cover signed-out/admin/member denial, owner-self/other-owner preservation, foreign-target rejection and scoped successful removal with fake I/O.
- Status: review candidate only. Permanent staging installation requires approval for the security boundary change. No app deployment installs this SQL.
- After approval: install on staging, rerun installed23 checks, then verify existing-user bootstrap, member-list reads, isolated owner invite acceptance/removal and workspace creation through canonical server paths. No real email/payment or real membership mutation. Stop on any failed boundary or canonical flow; return environment, step and safe error details. Only then apply reviewed migration to Production and repeat installed checks plus safe live reads.
- Rollback: companion SQL restores the observed six anon/authenticated table grants and reopens the gap. Use only for a verified regression. Application rollback alone doesn't restore database privileges; no data rollback is required.


### B34 approved installation checkpoint, 3 November 2026

User approved B34. Migration source20261103154727 installed on staging ledger20261103161024, Production20261103161305. Installed23, bootstrap14 and canonical-invite4 checks pass in each environment. Added supabase/tests/membership_server_journey_probe.sql for actual invite acceptance/replay/mismatch and server removal regression checks. All synthetic transaction rows roll back. Existing signed-in staging settings/member reads pass; disposable fixture member removed through owner UI, owner retained; original workspace restored and guarded fixture cleanup confirmed. Zero fixture accounts/invites remain. No provider email, payment, Storage or real membership mutation. Seven Production login/signed-out HTTP checks pass. PR #80/cbe475aa had four green checks, 433 local tests and focused lint pass. App source unchanged; no deploy needed to enforce grants. Repository closeout pending.

Production owner writes and new provider-delivered invitation journeys weren't exercised. Companion rollback restores observed client grants, reopening the gap; application rollback cannot restore grants. Broader S2/S3 and L5 remain In progress.


## B35. Accepted invitation recreates removed membership

- Logged: 3 November 2026. Existing L5/S2/S3 review, P1 access revocation.
- Confirmed: both installed accept_workspace_invite_atomically bodies match hash012442e5b3a5da06b8b818ba3cd063fb. The accepted_by_user_id branch inserts a missing membership, so a removed recipient can replay an old accepted invitation and regain access, even after expires_at. Canonical POST /api/invites/[token]/accept reaches this branch using the real signed-in user/email. No existing exploitation or real member changes are asserted.
- Candidate: migration20261103162107 removes only the accepted-state membership insertion. Current members retain already_accepted/idempotent success; missing members get existing already_used/null workspace result. Fresh pending owner-issued invitations can still rejoin a removed member. Invoker/search_path/owner/EXECUTE grants, row locking, email/revoked/pending-expiry checks and pending acceptance remain unchanged. No app handler or UI copy change.
- Evidence: baseline11/candidate11/rollback11 pass on staging and Production using rolled-back synthetic workspaces/invitations. Current-member retry, removed-user/expired-accepted replay, fresh re-invite, revoked/expired pending denial and email mismatch covered. Four actual-handler fake-I/O cases verify canonical identity and no workspace read/cookie write on denials. All437 Node tests, focused ESLint and whitespace checks pass. Zero fixtures and original installed body hashes verified afterward.
- Status: committed review candidate only; permanent staging installation requires security-boundary approval. No emails, payments, Storage operations or persistent membership/function/grant changes.
- Rollout after approval: first install exact reviewed function on staging; run installed11 and existing membership/provisioning probes. Check controlled signed-in accept/remove/replay through canonical API where browser access permits, without provider sends or real memberships. Stop for any unexpected membership, cookie, function/grant change or failed test; report environment, URL/step, expected/actual and safe error. Then install identical Production migration and repeat installed probes and safe signed-out smoke checks before merging tested repository source. No app deployment needed for SQL enforcement.
- Rollback: matching supabase/rollback SQL restores original RPC body and reopens the gap without modifying rows. Prefer fixing forward; application rollback alone cannot change the RPC.


### B35 approved Production installation, 3 November 2026

User approved B35. Reviewed0828e58b/PR #81 passed four checks. Source migration20261103162107 installed as staging20261103170224 and Production20261103170410; both function hashes460ec500c96eded2a8d09f69bf3e77e5 match. Installed11 replay, membership23 and bootstrap14 cases pass in each environment. Existing437 local tests/focused lint pass; no application source change.

Actual staging accept/remove/stale-accept flow passed: first invitation accepted, one disposable member created; guarded SQL removed only that synthetic membership; second pending browser copy's POST returned existing already-accepted error and did not restore membership. Only owner remained. Refresh restored original COris owner dashboard. Guarded cleanup deleted the one fixture invite, owner link and account; zero matching accounts remain. No provider emails, payments, Storage, new Auth users or real membership changes. Five Production login/signed-out HTTP checks pass. Both security advisors zero ERROR/WARN with nine existing INFO notices. Production signed-in positive journey wasn't repeated.

B35 Production complete in this scope. No app deployment needed for database enforcement. Rollback matching SQL restores original function and reopens the gap; app rollback alone can't undo function changes. Broader L5/S2/S3 remain open.


## B36. Direct song/version writes bypass upload and accounting controls

- Logged: 3 November 2026. Existing L5/S2/S3, P1 integrity/accounting.
- Confirmed in both databases: client owner/admin/member INSERT can create finalized version metadata without canonical upload verification, UPDATE can rewrite file_size_bytes/upload_finalized_at, and owner/admin DELETE can remove song/version rows while storage_bytes_used stays unchanged. Admin deletion bypasses owner-only canonical song DELETE. Workspace outsider denials still hold. This is synthetic proof, not a claim that any real account exploited it or any foreign audio was exposed.
- Root cause: broad anon/authenticated table mutation grants plus member/owner/admin RLS allow direct writes around API field whitelists, upload integrity RPCs and atomic byte accounting. Current app TSX has no direct song/version mutation writer; canonical server routes/RPCs own all writes. Client reads remain used and must stay available.
- Candidate migration20261103171426 revokes only INSERT/UPDATE/DELETE on songs/song_versions from PUBLIC/anon/authenticated. Requires existing server I/U/D and authenticated SELECT, checks inherited/column grants after revoke. Preserve all rows, policies, RPC bodies, other privileges, signed media delivery and existing upload limits. Companion rollback restores observed grants and reopens the bypass.
- Evidence: 40 baseline, 40 candidate and 40 rollback cases pass in each environment, all transactional/rolled back. Owner/admin/member/outsider reads and writes covered; unrelated grants/RLS unchanged. Canonical allocation/finalization/deletion RPCs reject foreign workspace IDs; pending allocation doesn't count bytes, finalize counts once, deletion releases bytes/cascades versions. No Storage objects are created or removed. Fixture setup initially lacked mandatory created_by; corrected test fixture, not application behaviour. Final zero fixture accounts and original grant/policy readback verified in both DBs.
- Fourteen real-handler/fake-I/O tests cover foreign allocation/finalize/cancel before Storage, allowed label/notes-only metadata and owner-only deletion. All 451 Node tests, focused ESLint and whitespace checks pass. No app TypeScript implementation changed.
- Status: review candidate only, no permanent permission change. Requires security-boundary approval before staging installation.
- Rollout after approval: install exact reviewed migration on staging, run installed40 and verify canonical song create/metadata edit, supported upload/finalization/playback, version edit and owner deletion in one disposable staging song. Confirm stored bytes agree and remove only fixtures. Check authenticated reads and safe public/media boundaries. Stop on denied canonical operation, read regression, counter mismatch or failed SQL/CI; report environment, URL/step and safe error. Then install Production, rerun installed40 and safe non-writing live checks, merge tested source. No application deployment needed for SQL enforcement.
- Rollback: companion SQL restores observed client mutation grants, reopening the confirmed gap; use only for a verified regression. App rollback alone cannot restore table grants. No data rollback, plan/auth/provider/env change or real content deletion is proposed.


### B36 approved Production installation, 3 November 2026

User approved B36. Source migration20261103171426 installed as staging20261103191138 and Production20261103191415. Installed40 pass each environment; reads, policies and server writes preserved; client mutation denied. Security advisors zero ERROR/WARN, nine existing INFO. Reviewed6d94da6c/PR #82 passed four checks; existing451 local tests/focused lint pass.

Actual staging owner app acceptance passed: generated 2-second WAV creates disposable song, finalizes88244 bytes, with version size=Storage object size=account counter. Song rename and version-label edit read back correctly. Playback reached2 seconds/error null and ended paused. Owner app deletion removed song/version/Storage object and restored counter0; original empty workspace visible. No real content, membership, Auth user, email or payment mutation. Eleven safe Production login/signed-out/public checks pass, including song/listen/artwork200 and one-byte audio Range206. An initial missing-title probe correctly returned400; corrected valid-shaped unauthenticated request returned401. No fresh Production positive write or physical-device acceptance claimed.

B36 Production complete in this scope; no app implementation/deployment needed for grant enforcement. Matching SQL rollback restores observed grants and reopens bypass; application rollback alone can't restore permissions. Broader L5/S2/S3 remain open.


## B37. Direct collaboration writes bypass parent and author checks

- Logged: 3 November 2026. Existing L5/S2/S3, P1 context/attribution. Grouped related tables into one repair.
- Confirmed with synthetic identities/parents in both DBs: actions I/U accepts own account with foreign song/comment/version/assignee; song_tasks I/U accepts own song with foreign account; playlist_songs I/U accepts own playlist with foreign song; comments UPDATE can spoof author/user; comment_threads UPDATE can spoof creator/user. Canonical routes validate these parents/assignees or stamp identity instead. No actual foreign audio/content disclosure or real-user exploitation is asserted.
- Root cause: direct client table writes bypass canonical parent, workspace and attribution checks. RLS checks one parent or denormalized account but not all linked context. No current client mutation writer found; server routes already perform writes. Reads and Realtime subscriptions must remain available.
- Candidate20261103194256 denies client I/U/D on actions, song_tasks, playlist_songs, comments and comment_threads. Preserve all rows, policies, reads, server CRUD and unrelated grants. Existing B26 comments/thread INSERT denial remains, even on rollback. Playlist headers and public comments aren't changed.
- Verification: baseline81/candidate81/rollback81 pass each DB, always rolled back. Includes owner/admin/member/outsider reads, cross-context writes, attribution, both client roles' DML masks, unchanged policies/other grants and actual service I/U/D on five tables. Sixteen real-handler/fake-I/O cases cover comment source, assignee/resolution, canonical creator, task whitelist and foreign playlist-song denial. All 467 Node tests, focused ESLint and whitespace checks pass.
- Read-only existing-data audit: action/account, action/comment-song, task/account, thread/account, comment/account and playlist/song-account mismatch counts all zero in each database. Null legacy context isn't counted as mismatch; this isn't an exhaustive historical-data audit. No row cleanup performed. Original grants and matching policy hash15131089686223ffc3c9abdabc1f932d confirmed; zero probe accounts remain.
- Status: review candidate; no permanent changes. Security-boundary approval required before installation.
- After approval: install exact reviewed staging migration; run installed81; verify one isolated staging owner flow for comment/reply, action create/update, task create/update and playlist add/reorder/remove. Use disposable records with no other recipients; don't trigger provider sends. Verify member reads/negative workspace boundaries, then clean up only fixtures. Stop on failure and report environment, URL/step, expected/actual and safe errors. Only then install Production, rerun installed81 and safe public/signed-out checks, merge tested source. No app deployment needed for SQL enforcement.
- Rollback: matching SQL restores observed I/U/D on actions/tasks/playlist entries and U/D on comments/threads. It reopens context/author bypasses but doesn't reopen B26 comment INSERT. App rollback alone can't change grants. No account/auth/billing/provider/storage configuration change.


### B37 approved Production installation, 3 November 2026

User approved B37. Source20261103194256 installed staging20261103211609/Production20261103212159. Installed81 pass both DBs, preserving reads, server CRUD, RLS and B26 client comment INSERT denial. Security advisors zero ERROR/WARN, nine existing INFO. Candidatecb879571/PR #83 had four green checks; existing467 local tests/focused lint pass; no app implementation change.

Actual staging owner flow passes: comment/reply, source-linked action create/resolve, task create/complete, playlist create/name and two-song add/reorder/remove. Stored creator/source/resolved version/status/order read back correctly. Workspace had only the actor; deployed env snapshot has no forced notification-recipient override. No provider delivery tested. Vercel connector environment read403 recovered via authorized read-only CLI; no config/security changes. Fixtures used no audio objects; missing-audio state was expected.

Guarded cleanup removed fixture playlist and two songs plus dependent version/thread/comments/action/task. All fixture counts zero, original storage0; original empty COris owner dashboard restored visibly. No real content/membership/Auth/payment/credential mutation. Production16 safe signed-out/public checks pass. No Production positive write or email journey claimed. B37 Production complete in scope; SQL rollback restores original grants and reopens context/attribution gaps while preserving earlier comment INSERT restrictions. App rollback cannot undo SQL. L5/S2/S3 remain In progress.


## B38. Client writes can forge unused legacy billing records

- Logged: 3 November 2026. Existing L5/S3 P2 hardening, not a new launch blocker or paid-tier feature.
- Confirmed: synthetic owner/admin client roles can INSERT legacy billing_subscriptions/billing_checkout_sessions and UPDATE legacy subscription status/Stripe references. Member/outsider denials and anonymous read isolation work. Current entitlements remain on accounts/verified Stripe paths; probes explicitly verify legacy writes don't alter account plan/Stripe fields. No privilege escalation to paid access is claimed.
- Both legacy tables have0 real rows in each environment; repository search finds no current runtime reader/writer. Preserve service access for compatibility, don't delete tables or change billing/account logic.
- Candidate20261103221242 revokes only client INSERT/UPDATE/DELETE on the two tables. Keeps existing reads/RLS, profile/theme access, current billing routes, service I/U/D and unrelated privileges. Companion rollback restores exact observed grants and reopens legacy-fact forgery.
- Verification: baseline84/candidate84/rollback84 actual DB checks each environment, always rolled back. Includes four-role workspace reads/writes, own/foreign profile/preferences, workspace legacy-theme access, anonymous reads, service billing CRUD and unchanged primary account entitlement. Synthetic passwordless/sessionless Auth/profile records exist only in rolled-back transactions; timestamp trigger fingerprint reviewed. Zero synthetic Auth users/profiles/accounts and billing rows remain afterward; original grants/policy hash176478a7cf0aa72c404c785fe254dda9 verified. No Auth API or external Stripe/email/Storage call.
- Four actual current-user resolver tests verify trusted Auth id/email despite editable metadata claims, rejection on verification failure/missing user, and refresh-cookie/server-component behaviour. All471 Node tests, focused ESLint and whitespace checks pass. No application implementation change or TypeScript logic edit.
- Status: Production complete, 4 November 2026. User approved B38; installed84 pass staging/Production. Staging settings and Free plan reads verified; signed-out Production billing routes401. No legacy billing rows or synthetic identities remain. Source/evidence tracked in PR84.
- Approved rollout procedure (completed 4 November): install exact migration staging, run installed84 and safe signed-in settings/plan reads; confirm current account entitlement untouched. Then apply Production, rerun installed84, metadata/read checks and safe signed-out billing/settings checks. No payment, checkout session, Stripe object, subscription or real billing row needs creation. Stop on grant/read mismatch or failed check; return environment, step and safe error. Merge tested source after acceptance. SQL enforcement doesn't require application deployment.
- Rollback: matching SQL restores observed grants without changing rows or account plans; it reopens legacy-record mutation. Application rollback alone can't restore DB permissions.


## B39. Direct playlist-header writes can transfer foreign song links

- Logged4 November2026, confirmed defect in existing L5/S2-S3 scope. All25 public tables have RLS and matching policies/grants across environments; this remaining path was found in final coverage review.
- Root cause: playlist UPDATE RLS checks membership in old/new accounts, so a member of both can change account_id while playlist_songs retains source-workspace songs. Destination-only members can see the transferred links. Private playlist GET resolves the destination header, then service-loads linked song metadata by ID without a same-account predicate. This breaks the invariant enforced by canonical playlist-song insertion. No current mismatched links found in either DB; no real-content exploit or private-media exposure claimed.
- Direct creator spoofing and unvalidated header writes also reproduce. Source search finds playlist writes only in canonical server handlers; create sets account/creator from verified identity and PATCH whitelists title/public flag. No client writer requires raw table mutation.
- Candidate20261104100000 restrict_client_playlist_writes revokes only client INSERT/UPDATE/DELETE on playlists. Preserve member reads/RLS, actual service CRUD, playlist_songs restriction and all other privileges. No data rewrite or application implementation change.
- Checked-in composer and rollback-only SQL use disposable accounts/songs/playlists with existing profile IDs solely as role subjects. No profile/Auth/membership on a real workspace is modified; trigger preflight fails closed. Baseline26/candidate25/rollback26 pass both DBs, including owner/admin/member/outsider access, dual-workspace transfer, source-song isolation, anon denial, server CRUD and unchanged other grants/policies. Current mismatches0; fixture accounts/playlists/songs0 and original grants/policy hash67e1c849af01f1063b56ac6d8a295570 verified afterward. All471 Node tests/focused composer lint/whitespace pass.
- Status: Production complete in recorded scope,4 November2026. User approved B39; staging20261104085737/Production20261104090003 installed, installed25 pass both. Staging owner create/rename/share/draft/song add/reorder/remove pass, stored fields verified and fixtures cleaned. SQL covers service DELETE because UI exposes no playlist-delete action. Five safe Production playlist/login checks pass; no payment/email/Storage operation. PR86 records source/evidence.
- Rollout after approval: install exact candidate staging; run installed25; use disposable signed-in staging playlist create/rename/share/reorder/delete journey and verify cleanup. Then Production preflight, migration, installed25, read-only mismatch inventory and safe signed-out/public projection checks. Stop on failed grant/read/RPC/app check; report environment, step and safe error. No migration-dependent application deployment is needed. Merge tested source after acceptance.
- Rollback: matching SQL restores observed client I/U/D and reopens transfer/creator bypass. It changes no rows or policy. Application rollback alone does not change DB grants.


## B40. Action/task mutations accept malformed input

- Logged4 November2026 during existing S5 review. Real-handler/fake-I/O regressions reproduce35 failures against old code: null/array/malformed requests500, wrong description/optional-ID types, coercible/negative/overflow action timestamps, arbitrary task status writes and task reorder200 despite a database update error.
- Local fix: five action/task mutation handlers authenticate before parsing, share a16KiB JSON-object reader, validate text/optional IDs/task statuses and finite nonnegative Postgres-integer timestamps before resource access. Valid fractional timestamps still round; pending/completed task states and canonical account/source/assignee/field whitelists remain. Reorder now returns safe500 on any reported update failure. No new dependencies, schema, auth policy or provider changes.
- Verification:44 new checks pass, including UTF-8/exact byte ceilings, legitimate action creation/attribution and task completion; all515 Node tests, TypeScript and focused lint/whitespace pass. No live writes in local tests. Database reordering remains parallel/nontransactional, so a failed call can partially update positions; retrying the desired order is idempotent. Atomic reordering would require separate SQL work and isn't claimed.
- Status: Preview acceptance complete,4 November2026. Runtime7284fae5 passes515 tests/TypeScript/lint/four CI checks. Owner create/edit/resolve and task create/complete/reopen pass; user member-view/reorder test passes, stored B0/A1 verified. Actual outsider/member/revoked reads pass in scope; all fixtures cleaned and original workspace restored. Final documentation CI then application-only release pending. Stop on changed auth/workspace behaviour, failed valid flow or unexpected write; report URL, step and safe error. Application-only rollout; rollback to prior4e8a2750 app code while retaining B39 database grants.


### 4 November 2026: B40 email-account staging handoff

User approved making existing plus-address password accounts usable for the remaining staging checks. Existing Turnstile widget is restricted to the original email-staging hostname, so no new branch flag/secret or hostname permission was introduced. Rebuilt original Preview deployment dpl_EtDYXsoE9t3YUpxUmpBvD1VHtowT with its inherited staging environment and exact tested B40 source7284fae597f131acc6c9db691b249f4451bacc7e, producing Ready dpl_H9gAkTGS5G6PiNoD9rftSuK156XS. Existing stable alias now serves that source: https://song-review-app-v2-git-codex-ema-c75749-corisleachmans-projects.vercel.app/login . No git branch history, provider configuration, environment variable or Production deployment changed.

Verified alias deployment/source/Preview target, email config enabled=true/passwordManagementEnabled=true, public login bundle staging project ivifkrtupqizyqqsxdty, invalid empty login400 before provider use, and visible expanded Email/Password fields. Normal automated browser failed Turnstile with300030; no CAPTCHA was solved/bypassed, credentials submitted or auth email sent. Successful real-user password login remains pending. User should open the stable alias, expand email form, use an existing staging plus-address/password, complete security check, and report dashboard/workspace result or visible error without credentials/tokens. Original immutable B40 Preview remains Google-only; use stable email alias for password accounts.

Rollback for this staging code change is reassigning this same stable alias to dpl_EtDYXsoE9t3YUpxUmpBvD1VHtowT; do not disable existing email login or remove secrets while password test accounts exist. B40 remains Preview-only pending manual acceptance and guarded fixture cleanup. Disposable B40 hosted acceptance workspace and two pending tasks remain from the recorded reorder handoff; membership is only the designated Google actor, so a different password identity won't see it until an explicitly scoped fixture membership is arranged.


### 4 November 2026: selected email participant and hosted outsider checks

User confirmed password login passed on the stable email-staging alias and designated an existing plus-address account for tests. Canonical profile2a9732e1-217a-40ca-a021-fbf7d64f294a and fresh staging Auth sign-in verified. Its original workspace3498b4a6-c0df-4bc6-b2db-14e8213cbcfa remains Owner/Free/storage0 with null Stripe customer/subscription; no existing workspace or plan was edited.

Before fixture membership, actual signed-in browser navigation to fixture song GET, version GET, song-tasks GET and version-threads GET returned explicit access-denied JSON and no fixture title. Browser evidence establishes denied projections, not independently captured HTTP status codes. After these negatives, guarded server provisioning added only this actor's Member link to disposable account1ee43543-b6a2-4397-9679-518dd62fec30 (B40 hosted acceptance); Google actor27a37199-e2bf-45ad-a03f-2162b9f1802a remains its owner. No invite or notification was sent. Fixture membership count2, one synthetic song, two pending tasks; no audio object or storage usage.

Chrome extension UI then blocked automation before member workspace selection. Actual member positive read and drag-reorder acceptance remain pending. User should open the stable alias dashboard, select B40 hosted acceptance (Member), open the B40 hosted fixture song, drag task B above task A and refresh. Expected: only the isolated fixture view and persisted B/A order; report visible error/URL if it fails, never credentials. B40 remains unmerged/Preview only. After acceptance, verify DB order, restore original workspace selection and guardedly remove the fixture workspace/rows/memberships. Do not remove the user's original workspace or Auth identity.

Git transport repeatedly failed with GitHub500. Prior documentation commit was published through Git Data API as1ccd45a9164ee76848dcb408c639477c64f7ee12 after full-tree equality with local4ae4f672; non-force ref update verified. Local branch reconciled to that identical published tree. No source/runtime change.


## B41. Metadata requests accept malformed input and playlist reorder hides failure

- Logged4 November2026 during existing S5 review. Across two regression batches44 failures reproduced before fixes;66 new actual-handler/fake-I/O cases cover nine files/ten methods for song create/edit/share, version metadata, playlist create/edit/song add/reorder, profile theme and owner invite revocation.
- Root cause: unsafe JSON/type assertions permit null/array/malformed input to crash or silently create default metadata. Typed values can reach writes, mixed/duplicate/foreign playlist IDs are filtered/ignored, and reorder database errors are discarded before returning200. No new cross-workspace data exposure asserted; canonical resource/owner predicates remain in place.
- Fix reuses existing16KiB JSON-object reader. Canonical auth/owner checks run first; wrong metadata types and invalid playlist ID lists return400 before writes. Playlist reorder verifies IDs belong to the resolved playlist and checks returned errors. Preserve empty-object default playlist creation, version label/notes clears, valid trim/status/default behaviour, existing song-sharing rules and field whitelists. No migrations, dependencies, provider settings, auth flows or plan changes.
- Verification: all581 Node tests, TypeScript and focused lint0errors/one pre-existing unused-variable warning; whitespace passes. Positive default playlist, nullable/trimmed version metadata and scoped reorder covered. Public invite-token historical issue was inspected and is already guarded by isValidInviteToken/findInviteByToken; no speculative change there.
- Status: local code complete; exact-head Preview/CI, safe signed-out checks and isolated normal metadata flow pending before release. No new mail/provider operation authorized or required. Playlist reorder remains serial/nontransactional; an error can leave a partially applied order and retrying the desired list is idempotent. Atomic multirow reordering is not claimed.
- Application-only rollout after checks; rollback to B40 merge613a1426 while retaining all installed database restrictions. Stop for changed scope/permissions, failed valid metadata/clear/default/reorder flow or unexpected provider action. Report environment, URL, step and safe error.

4 November B40 Production completion: PR87 merged613a1426; primary dpl_BCGgcjLmtjcATiUaFuKpE17wpkRJ Ready/live www alias, seven safe HTTP checks pass, email readiness preserved. No Production positive write or payment/provider journey; tested staging fixtures all removed. Prior pending rollout statements are historical.
