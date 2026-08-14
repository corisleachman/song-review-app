# Product Backlog

Parking lot for bugs and feature ideas to pick up after the current beta-launch work. Not scheduled — captured here so nothing is lost. When an item becomes an active slice, move it into `public-mvp-roadmap.md`.

---

## Bugs

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
