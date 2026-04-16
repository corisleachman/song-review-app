# Implemented Changes From Baseline

This file documents the major changes made to the current app relative to the original clean install / first generated baseline.

It is intended as a practical product-and-architecture delta, not a line-by-line git diff.

**Last updated:** 16 April 2026

## What The Baseline Started With

The original baseline was a simpler two-person song review app with:

- shared password authentication
- manual identity selection for `Coris` / `Al`
- song creation
- version upload
- waveform playback
- timestamped comments
- threaded replies
- basic email notifications

At that point, the app was much closer to a prototype:

- dashboard behavior was lighter
- versions were mostly just uploads in a list
- actions were more static
- identity was partially guessed in multiple places
- notification routing still depended on hardcoded collaborator assumptions
- production reliability and mobile polish were less mature

## What Exists Now

The current app is a more operational collaboration tool with:

- canonical server-backed dashboard reads
- version-aware review flows
- actionable workflow items with status and ownership
- song-level workflow signals on the dashboard
- version notes and resolved-in-version tracking
- clearer collaboration visibility
- safer notification routing and better email content
- stronger first-load and mobile playback reliability

## Major Product Changes

## 1. Auth And Identity Cleanup

The baseline relied on simple cookie identity helpers and some legacy name assumptions.

Current state:

- canonical identity resolution now exists in `lib/canonicalIdentity.ts`
- authenticated user, profile, workspace/account, and membership are resolved in one shared path
- critical authored writes now derive authorship from canonical identity instead of ad hoc client fallbacks
- bootstrap and key UI flows now use canonical identity rather than local guessing

Standardized authorship now drives:

- comments
- replies
- actions
- versions

Transitional compatibility still exists where the schema still stores display strings, but the source of those strings is now centralized.

## 2. Version Workflow Upgrades

The baseline had upload + playback + comments, but versions were relatively thin records.

Current state:

- first-version upload and later-version upload are both supported cleanly
- version labels can be renamed inline
- version routing and switching are reliable
- version upload notes / changelog text are supported
- version notes display on the version page
- versions can be linked to resolved actions via `resolved_in_version_id`

This turns versions into a clearer record of progress rather than just a file history.

## 3. Commenting And Deep-Linking Improvements

The baseline supported threaded comments, but the review flow is now richer.

Current state:

- waveform comments create threads reliably
- replies work consistently
- thread deep links are supported
- selected threads expose better tools such as:
  - jump to time
  - copy timestamp
  - copy link
- the version page can focus the relevant thread or actions area from query-string context

## 4. Actions Became A Workflow System

The baseline action model was lighter and closer to a static list.

Current state:

- actions support workflow statuses:
  - `open`
  - `in_progress`
  - `done`
- actions support ownership via `assigned_to_user_id`
- assignment options come from canonical workspace membership
- actions can be filtered
- actions can be edited
- actions can be marked as resolved in a specific version
- dashboard and version page both surface action signals more clearly

Recent clarity fix:

- the song version page now has two explicit action tabs:
  - `This version`
  - `All versions`

This solves the earlier mismatch where the dashboard summarized song-wide actions but the version page only showed current-version actions.

## 5. Dashboard Became A Command Centre

The baseline dashboard was mostly a song list and entry point.

Current state:

- dashboard has grid and list views
- song artwork upload is supported
- song status exists:
  - `writing`
  - `in_progress`
  - `mixing`
  - `mastering`
  - `finished`
- songs expose `needs attention` based on unresolved actions
- unresolved action counts are visible
- dashboard supports status and attention filtering
- collaboration clarity signals are surfaced:
  - assigned to me
  - awaiting me / awaiting them
  - lightweight activity feed

Readability passes also added:

- info-toggle disclosure pattern for richer metadata
- standardized interactive metadata pills
- cleaner deep-link behavior into the version page

## 6. Notifications Were Made Safer And More Useful

The baseline notification logic was effectively a hardcoded collaborator flip.

Current state:

- notifications for comments and replies are still supported
- recipient resolution now comes from canonical workspace membership
- the acting user is excluded from recipients
- testing safety controls exist:
  - `EMAIL_NOTIFICATIONS_ENABLED`
  - `EMAIL_NOTIFICATIONS_FORCE_TO`
- non-production environments are safe by default
- emails were polished to be clearer, better attributed, and easier to act on

The system is still intentionally narrow:

- notifications exist for comment-thread activity
- notifications were not widened into a full workflow notification system

## 7. Production Reliability And Polish Fixes

Several important bug-fix passes moved the app from “works locally” toward “reliable in production”.

Key improvements include:

- first-load reliability fixes for version-page initialization
- visible recoverable error states instead of endless loading spinners
- safer sequencing around bootstrap and version-page loading
- better instrumentation/logging for initialization debugging
- mobile playback fix so locking the phone does not unnecessarily stop playback
- dashboard artwork flicker fix during navigation
- Strict Mode duplicate-init investigation and cleanup where appropriate

## Database / Schema Delta From Baseline

Compared with the original simpler schema, the current app has added or extended:

- `songs.status`
- `song_versions.notes`
- `actions.status` upgraded to `open` / `in_progress` / `done`
- `actions.assigned_to_user_id`
- `actions.resolved_in_version_id`
- `actions.account_id`
- `actions.created_by_user_id`

The current schema is documented in:

- [DATABASE.md](/Users/impero/song-review-app/DATABASE.md)

Migration files added during later phases include:

- [migrations/20260331_phase_2a_action_status_and_assignment.sql](/Users/impero/song-review-app/migrations/20260331_phase_2a_action_status_and_assignment.sql)
- [migrations/20260331_phase_2b_version_intelligence.sql](/Users/impero/song-review-app/migrations/20260331_phase_2b_version_intelligence.sql)
- [migrations/20260331_phase_2c_song_status_dashboard.sql](/Users/impero/song-review-app/migrations/20260331_phase_2c_song_status_dashboard.sql)

## API / Architecture Delta From Baseline

Important architectural changes relative to the original build:

- more server-backed canonical read paths
- dashboard aggregation moved into a dedicated API route
- identity resolution centralized instead of guessed in multiple UI paths
- action and song updates routed through server PATCH endpoints
- workspace membership lookup added for assignment and notifications
- version-page deep-linking and focus behaviors formalized through query params

Good starting references:

- [API.md](/Users/impero/song-review-app/API.md)
- [CONTEXT_HANDOFF.md](/Users/impero/song-review-app/CONTEXT_HANDOFF.md)

## Known Documentation Drift

Some older docs still reflect earlier phases and should not be treated as the source of truth for every workflow detail.

Examples:

- `CONTEXT_HANDOFF.md` still contains some legacy terminology in places
- `FEATURES.md` still refers to older action status names
- `PROJECT_OVERVIEW.md` describes a much earlier baseline snapshot

For current behavior, prefer checking:

1. [IMPLEMENTED_CHANGES_FROM_BASELINE.md](/Users/impero/song-review-app/IMPLEMENTED_CHANGES_FROM_BASELINE.md)
2. [README.md](/Users/impero/song-review-app/README.md)
3. [API.md](/Users/impero/song-review-app/API.md)
4. [DATABASE.md](/Users/impero/song-review-app/DATABASE.md)
5. [TESTING.md](/Users/impero/song-review-app/TESTING.md)

## In Short

The clean install started as a focused two-person waveform review prototype.

The current version is now a more complete collaboration workflow app with:

- stronger identity foundations
- richer version intelligence
- real action workflow
- more operational dashboard visibility
- safer notifications
- better reliability and polish

It is still intentionally lightweight, but it is substantially more capable and structurally cleaner than the original baseline.
