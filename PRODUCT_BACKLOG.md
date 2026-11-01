# Product Backlog

> Current progress: [Launch checklist](LAUNCH_CHECKLIST.md). Updated 1 November 2026. This document retains historical detail; the checklist controls current stage status and priorities.


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
  - Exclude the uploader and unrelated workspaces; confirm intended handling of existing notification settings and recipient eligibility.
  - No misleading notification for failed/cancelled uploads, and retries/repeated finalization don't generate duplicate messages.
  - Record recipient selection, whether a send was attempted, delivery/failure outcome and safe diagnostics without exposing tokens or private song content in logs.
  - If already working, record the tested evidence; don't replace it or mark complete based only on a code path.
- Dependencies: Existing workspace membership/notification policy, upload finalization, provider configuration and a controlled multi-member test with authorised test email delivery. No real email send is part of this capture task.
- Decisions still needed: If current settings limit recipients, should new-version alerts honour that policy or deliberately notify all other participants? Confirm channel if the existing email pattern doesn't meet the need; don't add push/in-app channels by assumption.


## Bugs

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
  - Notify the owner once per genuine new signup at the agreed signup milestone; existing login, bootstrap retries and invite acceptance must not create duplicate signup alerts.
  - Require an unambiguous target workspace and apply the agreed promotional entitlement so all intended Pro features/limits and account/settings displays agree.
  - Show successful completion and visible actionable errors. Record grantor, recipient, target workspace, time, grant scope/duration and outcome in an audit trail.
  - Repeated clicks/retries create neither duplicate grants nor duplicate recipient notifications. Partial notification failure must leave entitlement state clear and permit a safe retry without granting twice.
  - The recipient receives one upgrade notification with clear wording reflecting actual grant duration and any expiry. Delivery outcome is inspectable. Final outward-facing copy uses write-like-coris.
  - No charge, checkout or new paid subscription is created by a promotional grant. Existing paid subscriptions, renewal/cancellation and Stripe webhook reconciliation remain correct; a webhook must not accidentally erase or extend a grant.
- Dependencies: Owner identity/authorisation decision, existing admin gate, workspace entitlement source of truth, subscription reconciliation, idempotent grant/notification records, delivery configuration and S2 negative-access tests. Any later schema or billing-boundary change needs a scoped reviewed implementation; none is performed now.
- Decisions required before implementation:
  1. Current plans attach to workspaces. Confirm which owned workspace a selected beta tester receives Pro on, and how to handle a member who doesn't own a workspace; don't introduce personal Pro implicitly.
  2. Are grants permanent or time-limited? If limited, specify duration/start/expiry behaviour while preserving stored data.
  3. How should a grant interact with an existing paid Pro/Studio subscription: refuse, defer or another explicit policy? No automatic cancellation/refund/charge change is authorised.
  4. Which application-owner identity is authorised, and where should signup alerts go? Define new signup as Auth creation, confirmed registration or completed workspace onboarding, and agree notification channel. Reuse established delivery where appropriate; don't silently pick the milestone.
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
