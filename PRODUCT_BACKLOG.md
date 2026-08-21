# Product Backlog

Parking lot for bugs and feature ideas to pick up after the current beta-launch work. Not scheduled — captured here so nothing is lost. When an item becomes an active slice, move it into `public-mvp-roadmap.md`.

---

## Bugs

### Mobile homepage: descriptive copy appears too late
- Priority: P2
- Logged: 2026-08-19
- Status: Preview verified on iPhone on 2026-08-20 in PR #22.
- Observed on iPhone 16: the paragraph beginning “A collaboration space for artists...” fades in after the rest of the page, leaving a temporary gap that makes the layout look broken.
- Expected: the paragraph should be present when its section first renders. Any remaining entrance motion must not delay the content or leave empty layout space.
- Implementation: phone portrait and short wide layouts now show the description cell from first paint while the other bento cells keep their existing sequence. Reduced-motion users receive the same immediate copy.

### Mobile homepage: bento images crop the subject at the top
- Priority: P2
- Logged: 2026-08-19
- Status: Revised PR #23 preview verified on iPhone on 2026-08-21.
- Some images inside the bento frames are vertically centred, which can cut off the subject's head or the space above it.
- Preview finding: top-centred cropping exposed too much empty headroom and could leave only part of the subject visible.
- Expected: the lead mobile image should have enough height to frame people naturally using a centred crop, with the explanatory copy over the lower part of that same image.
- Revised implementation: phone layouts promote the existing text-bearing bento cell into a lead panel about half the viewport high, retain centred image framing, and place the four supporting image cells below it. The hidden redundant cell no longer preloads crossfade images. Desktop framing is unchanged.
- Preview check: watch the lead image through several rotations on a real phone and confirm each subject remains recognisable behind the copy.

### Mobile dashboard: song filters consume too much vertical space
- Priority: P2
- Logged: 2026-08-20
- Status: Local implementation complete on `codex/mobile-dashboard-song-filter`; preview verification pending.
- Observed on mobile: the song-status filters wrap across three rows, pushing the song list down and making the dashboard toolbar feel clunky.
- Expected: replace the exposed filter grid with one compact, clearly labelled filter control near Sort and New song while preserving every status, count, active state, and keyboard/touch access.
- Implementation: phones use one native song-filter select beside Sort and New song. It reuses the existing filter state and options, keeps every count, and retains 44-pixel touch targets. Desktop continues to show the full filter-pill row.
- Preview check: verify the toolbar at 320, 393, and 430 pixels wide, change every filter, and confirm the song list and empty state update correctly without horizontal overflow.

### Mobile homepage: primary CTA is clipped and outside the thumb zone
- Priority: P1
- Logged: 2026-08-19
- Status: Production verified on 2026-08-20 after PR #21.
- Observed on iPhone 16: the red CTA can be cut off, and its top-right placement makes it difficult to reach one-handed.
- Expected: the primary CTA must remain fully visible inside the safe area and sit in the lower, thumb-reachable part of the opening mobile composition.
- Copy decision remains open between “Start for free” and “See how it works”. Preserve a clear route into account creation whichever label is chosen.
- Implementation: phone portrait and landscape layouts now hide the duplicate navigation CTA, size the hero against the small viewport, reserve iOS safe-area padding, and keep the existing hero CTA centred with a 48-pixel primary target. The approved larger hero exploration remains separate.

### Mobile homepage: display headings lose clarity at small sizes
- Priority: P2
- Logged: 2026-08-19
- Headings such as “You've been doing it the hard way” look blocky and blur into themselves at the current mobile size.
- Expected: mobile display headings remain distinctive and legible without collisions or muddy letterforms.
- Test a larger fluid size first. If that does not solve it, compare a lighter display weight or mobile-specific font treatment before changing the typeface.

### Desktop card view — status dropdown missing  ✅ DONE (2026-08-09)
- Logged: 2026-08-07 · Shipped: 2026-08-09 (commits b9c03461, be268dce)
- On the dashboard **card view** (desktop), the dropdown to change a track's status (In progress / Mixing / Mastered / Completed, etc.) does not appear the way it does in **list view**.
- Expected: the status dropdown should be available in card view, matching list-view behaviour.

---

## Features

### Turn off the audio visualiser on the song page  ✅ DONE (2026-08-09)
- Logged: 2026-08-07 · Shipped: 2026-08-09 (commit 0ef7554a) — per-user toggle in Settings > Appearance
- Add a control to disable the waveform / frequency visualiser on the song/player page (for performance, preference, or distraction-free listening).

### Public sharing — sequential playlists  ✅ DONE (2026-08-09)
- Logged: 2026-08-07
- Today a single song can be shared publicly. Add the ability to share a **playlist** that plays through in sequence.
- Shipped 2026-08-09: in-app playlist manager + public `/listen/playlist/[id]` immersive player (WaveSurfer, reactive EQ, lock-screen background auto-advance). Commits: manage 7f8fd520, public player c4cc132d, fixes 47a871dc/26d3867d/fc371874/caf49a25.

---

## Future / larger efforts

### Mobile homepage hierarchy and hero animation
- Priority: design exploration before implementation
- Logged: 2026-08-19
- The current mobile stack does not create a convincing opening hierarchy: the small logo, top-right CTA, “What is the Song Room?” description, large “Create Together” treatment, and oversized closing sign-off compete rather than reading as one sequence.
- Direction to prototype: make “Song Room” the main animated visual inside the first large bento frame; follow it with “What is Song Room?” and place the primary CTA around the centre of the lower third.
- Reconsider “Create Together, every version” as a smaller supporting line or move it into the upper half of the page instead of using it as an oversized closing sign-off.
- This direction is not approved implementation yet. Compare it with a refined version of the current “Create Together” concept at an iPhone 16 viewport before choosing.
- Success criteria: the brand is the first clear visual, the explanation follows naturally, and the next action is visible and reachable without an awkward stack or clipped content.

### Authentication options beyond Google
- Logged: 2026-08-14
- Beta uses Google as the only login and account-creation method.
- Reassess whether Song Room needs email/username and password accounts after beta feedback.
- Consider additional single sign-on providers, especially Microsoft, for collaborators who do not use Google accounts.
- Plan account linking and recovery before adding another provider so existing users do not create duplicate Song Room identities.

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
