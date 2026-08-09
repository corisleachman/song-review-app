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

### Turn off the audio visualiser on the song page
- Logged: 2026-08-07
- Add a control to disable the waveform / frequency visualiser on the song/player page (for performance, preference, or distraction-free listening).

### Public sharing — sequential playlists
- Logged: 2026-08-07
- Today a single song can be shared publicly. Add the ability to share a **playlist** that plays through in sequence.

---

## Future / larger efforts

### Multi-upload + revamped uploader
- Logged: 2026-08-07
- A faster, easier uploader that supports multiple files at once (multi-upload). Larger rework of the current upload flow.

### Admin console (creator-only)
- Logged: 2026-08-07
- A creator/admin area covering:
  - view all incoming beta feedback (triage)
  - manual override of user account levels (plan up/downgrade)
  - assign / issue redemption codes to individuals
- Note: the **beta feedback triage view** (currently being specced) is phase 1 of this console. The account-level override and code-assignment pieces are the later expansions.
