# Product Backlog

Parking lot for bugs and feature ideas to pick up after the current beta-launch work. Not scheduled — captured here so nothing is lost. When an item becomes an active slice, move it into `public-mvp-roadmap.md`.

---

## Bugs

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

### Turn off the audio visualiser on the song page  ✅ DONE (2026-08-09)
- Logged: 2026-08-07 · Shipped: 2026-08-09 (commit 0ef7554a) — per-user toggle in Settings > Appearance
- Add a control to disable the waveform / frequency visualiser on the song/player page (for performance, preference, or distraction-free listening).

### Public sharing — sequential playlists  ✅ DONE (2026-08-09)
- Logged: 2026-08-07
- Today a single song can be shared publicly. Add the ability to share a **playlist** that plays through in sequence.
- Shipped 2026-08-09: in-app playlist manager + public `/listen/playlist/[id]` immersive player (WaveSurfer, reactive EQ, lock-screen background auto-advance). Commits: manage 7f8fd520, public player c4cc132d, fixes 47a871dc/26d3867d/fc371874/caf49a25.

---

## Future / larger efforts

### Mobile homepage hierarchy and hero animation  ✅ DONE (2026-08-22)
- Priority: P2
- Logged: 2026-08-19
- Status: Production complete on 2026-08-22 after PR #26 merged as `d5181516`; the final real-phone preview and live artifact checks passed.
- The current mobile stack does not create a convincing opening hierarchy: the small logo, top-right CTA, “What is the Song Room?” description, large “Create Together” treatment, and oversized closing sign-off compete rather than reading as one sequence.
- Approved direction: keep the full bento image system so the opening still shows several collaborators, place “Song Room” over the upper half of the lead image using the existing letter-by-letter outline animation, and remove “Create Together” and its sign-off from the phone hero.
- Implementation: phones hide the redundant small navigation logo, use the real Thunder outline paths from the existing Song Room loading artwork, show the complete collaborator bento from first paint, use the approved concise explanation inside the lead image, and retain the lower safe-area CTA. Tablet and desktop hero artwork and copy are unchanged.
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
