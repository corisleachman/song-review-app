# Product Backlog

Bugs and feature ideas for beta readiness and later product work. The current priority order below identifies the near-term queue; other entries remain unscheduled. When an item becomes an active slice, move it into `public-mvp-roadmap.md`.

---

## Current priority order

1. Fix the 11-inch iPad homepage typography and tablet layout, with real-device checks.
2. Plan and implement email/password signup, including referrals and complete account recovery. Microsoft login isn't part of this work.
3. Continue the remaining security-hardening and review findings, then SEO and final pre-launch QA.

Microsoft login stays deferred until traction and income justify it. This order promotes password signup without interrupting the current reliability and tablet fixes.

## Bugs

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
- Status: Code refinement is in [draft PR #53](https://github.com/corisleachman/song-review-app/pull/53). The first Preview passed its automated checks and looked clear in Chrome's 11-inch iPad emulation, but desktop Safari exposed the same blocky treatment at the wide breakpoint. That failed the manual Preview gate; the PR remains draft and unmerged.
- Observed: filled Thunder headings such as “You've been doing it the hard way” and “Upload it. Everyone hears it.” become cramped blocks with poor internal definition. The original iPad screenshots and the later desktop Safari screenshot show the same readability problem. The words are much harder to scan than the surrounding body copy and don't look intentionally rendered.
- Working cause: this is a breakpoint inconsistency rather than evidence of a failed font download. Phone and tall-tablet rules select Thunder Bold with a `0.84` line-height, while wide screens still select the much heavier Thunder Black face at `0.74` and allow lead headings to reach 140 pixels. Safari is rendering that specified desktop treatment.
- Expected: carry a deliberately tested display treatment through the tablet range. Keep the established editorial character, but use a readable face, line-height, size, and wrap at every width. Font loading failure must also fall back without collisions or materially changing the section height.
- Local implementation: the main marketing headings and proof quote now use Thunder Bold, a `0.84` line-height, normal kerning and bounded fluid sizes at every breakpoint. Thunder Black remains available for short accents such as section numbers and prices. Reduced-motion users receive the completed outlined hero heading instead of an invisible animation start state.
- Local verification: 71 contract tests passed. The public Chromium suite passed 15 tests with seven expected project skips, including new 1440×900 computed-type coverage and the existing 820×1180 tablet case. Local WebKit renders at both sizes returned 200 with Thunder Bold, a `0.84` line-height, no horizontal overflow, no page errors and no framework overlay; the Problem section captures were inspected. The optimized build passed with its existing warnings. This still requires a manual desktop Safari comparison.
- Verification: first check the revised Preview in desktop Safari at normal zoom and 200% zoom. Then check the live page on a real 11-inch iPad Air in portrait and landscape, using Safari and Chrome. Confirm that every word remains distinct before merge.

### Tablet homepage: 11-inch iPad falls into an unfinished responsive layout
- Priority: P1 beta presentation
- Logged: 2026-09-14
- Status: Code complete in [draft PR #53](https://github.com/corisleachman/song-review-app/pull/53); automated Preview checks and real-device verification remain. The original failure is confirmed from three screenshots of the live homepage on an 11-inch iPad Air.
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
- Priority: P1 near-term product work, after current playback and tablet fixes; no dependency on Microsoft login.
- Logged: 2026-09-18
- Status: Promoted from post-beta reassessment at the user's request. Plan the complete journeys before implementation; Production remains Google-only until a separately approved rollout.
- Scope: email/password signup and login alongside Google, email verification and resend, forgotten-password requests, expired/used recovery links, password reset/change and session handling. Decide explicitly whether a username is a login identifier or a display name rather than silently adding a second identity system.
- Entry journeys: neutral signup, tier-aware Free/Pro/Studio choices, referrals, workspace invitations, protected-page login redirects, signed-in visitors and sign-out/re-entry. Preserve referral attribution through confirmation and recovery, avoid duplicate referral rewards, and keep invite priority and owner-only checkout rules intact.
- Existing accounts: define safe Google/password account linking, duplicate-email handling and password setup for Google-created accounts without duplicate Song Room users or workspaces. Require proof of identity; never link accounts based only on an unverified email or client-supplied username.
- Security and operations: inspect existing auth routes before designing new ones; plan rate limiting, anti-enumeration responses, password rules, redirect allowlists, transactional email delivery, staged configuration, rollback and a full acceptance matrix. Keep the storage, billing and canonical identity model unchanged unless separately justified.
- Delivery gate: agree the journey specification first, then implement a focused auth slice and verify it in staging before enabling Production. Microsoft remains separate and deferred.

### Turn off the audio visualiser on the song page  ✅ DONE (2026-08-09)
- Logged: 2026-08-07 · Shipped: 2026-08-09 (commit 0ef7554a) — per-user toggle in Settings > Appearance
- Add a control to disable the waveform / frequency visualiser on the song/player page (for performance, preference, or distraction-free listening).

### Public sharing — sequential playlists  ✅ DONE (2026-08-09)
- Logged: 2026-08-07
- Today a single song can be shared publicly. Add the ability to share a **playlist** that plays through in sequence.
- Shipped 2026-08-09: in-app playlist manager + public `/listen/playlist/[id]` immersive player (WaveSurfer, reactive EQ, lock-screen background auto-advance). Commits: manage 7f8fd520, public player c4cc132d, fixes 47a871dc/26d3867d/fc371874/caf49a25.

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
- Email/password signup is now a separate near-term P1 item above, including referrals and account recovery. Google remains the only currently deployed method.
- Before adding Microsoft, plan identity linking and recovery so existing users don't create duplicate Song Room accounts or workspaces.

### Multi-upload + revamped uploader  ✅ DONE (2026-08-10)
- Logged: 2026-08-07
- A faster, easier uploader that supports multiple files at once (multi-upload). Larger rework of the current upload flow.

### Admin console (creator-only)
- Logged: 2026-08-07
- A creator/admin area covering:
  - view all incoming beta feedback (triage)
  - manual override of user account levels (plan up/downgrade)
  - assign / issue redemption codes to individuals
- Note: the **beta feedback triage view** (currently being specced) is phase 1 of this console. The account-level override and code-assignment pieces are the later expansions.

---

## Pre-launch checklist audit (2026-08-26)

Captured from a launch-readiness review (TikTok launch checklists cross-referenced against the build). Secret rotation is being handled outside the backlog. robots.txt, sitemap.xml and Dependabot shipped 2026-08-26; npm-audit CI workflow pending manual add (token lacks Workflows permission).

### Security hardening
- Logged: 2026-08-26
- Add login/auth rate limiting (verify Supabase defaults, add app-level throttle).
- Add bot protection on signup (Cloudflare Turnstile or hCaptcha).
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
