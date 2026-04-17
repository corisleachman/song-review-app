# Update Log

Use this file to record meaningful app changes from this point onward.

For each update, document:

- which files were changed
- what we were trying to achieve
- which feature we were developing or what change we were making

This is not meant to replace git history. It is a human-readable product/development log.

---

## 2026-04-16 — Baseline change documentation

### What we were trying to achieve

Create one clear Markdown record of how the current app differs from the original clean install, and establish an ongoing documentation habit for future changes.

### Feature / change being made

Documentation and project process improvement.

### Files changed

- [IMPLEMENTED_CHANGES_FROM_BASELINE.md](/Users/impero/song-review-app/IMPLEMENTED_CHANGES_FROM_BASELINE.md)
- [README.md](/Users/impero/song-review-app/README.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [AGENTS.md](/Users/impero/song-review-app/AGENTS.md)

### Notes

- Added a baseline-to-current summary doc.
- Linked that doc from the main README documentation table.
- Added this ongoing update log for future development entries.
- Updated the project agent guidance so future tasks should record file changes, goal, and feature/change intent.

---

## 2026-04-16 — Database schema documentation sync

### What we were trying to achieve

Make the schema documentation accurately reflect the current app runtime expectations after the Phase 2 workflow, identity, and dashboard work.

### Feature / change being made

Documentation-only schema clarification for songs, actions, and the workspace/auth model.

### Files changed

- [DATABASE.md](/Users/impero/song-review-app/DATABASE.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Documented `songs.account_id` and `songs.status`.
- Documented the expanded `actions` workflow fields and new status values.
- Added the inferred auth/workspace tables: `auth.users`, `profiles`, `accounts`, and `account_members`.
- Marked which tables are new versus extended from the original baseline schema.

---

## 2026-04-17 — Audio engine fixes ported from main

### What we were trying to achieve

Bring the waveform player’s mobile audio, lock-screen playback, and lazy-load behavior from `main` into `clone-clean` without changing layout or broader app architecture.

### Feature / change being made

WaveSurfer and audio-engine logic-only port for the version player page.

### Files changed

- [app/songs/[id]/versions/[versionId]/page.tsx](/Users/impero/song-review-app/app/songs/[id]/versions/[versionId]/page.tsx)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Added lazy audio loading on first play instead of fetching on page view.
- Restored mobile-safe audio behavior by avoiding the live reactive audio graph on iOS/mobile playback.
- Reintroduced `OfflineAudioContext`-based mobile frequency precomputation.
- Reintroduced Media Session metadata and play/pause handlers for lock-screen integration.
- Added the waveform init `loading` guard and debounce pattern from `main`.

---

## 2026-04-17 — Google auth redirect hardening

### What we were trying to achieve

Stop users landing on the app 404 page after returning from Google sign-in when the saved post-login destination is stale or invalid.

### Feature / change being made

Auth return-path resilience for the Google login flow.

### Files changed

- [app/page.tsx](/Users/impero/song-review-app/app/page.tsx)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Added validation and normalization for the post-login `redirectTo` target on the login page.
- If a stale version route is detected, the app now falls back to the parent song entry route instead of sending the user to a 404.
- Unknown or malformed redirect targets now fall back to `/dashboard`.

---

## Template

Copy this block for future entries:

```md
## YYYY-MM-DD — Short change title

### What we were trying to achieve

Short plain-English goal.

### Feature / change being made

Name the feature, fix, cleanup, or improvement.

### Files changed

- /absolute/path/or/repo-relative-path
- /absolute/path/or/repo-relative-path

### Notes

- Optional implementation notes
- Optional risks or follow-up
```
