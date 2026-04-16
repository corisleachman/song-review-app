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
