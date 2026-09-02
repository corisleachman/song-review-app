# Song review commenting workspace

## Problem

The authenticated version page currently treats every waveform click as an intention to comment. That blocks a basic listening action: moving quickly through the track. The floating composer also covers the waveform at the moment the user is trying to inspect it.

## Product decision

- A waveform click or tap seeks only.
- Comment creation is an explicit action at the current playhead time.
- Existing comment markers remain interactive and open their conversation.
- Wide screens keep comments in a stable rail beside the complete player area.
- Narrow screens use an accessible comments sheet so the player retains the full width.
- Existing thread, reply, action, notification, and deep-link behaviour must remain intact.
- Public anonymous commenting is outside this change.

## Current path

The main authenticated flow lives in:

- `app/songs/[id]/versions/[versionId]/page.tsx`
- `app/songs/[id]/versions/[versionId]/version.module.css`
- the existing thread, comment, reply, and action API routes used by that page

The server-backed thread data remains canonical. This change should not add a second fetch path, database migration, storage change, billing change, or dependency.

## Intended interaction

### Seek

1. The user clicks or taps an empty point on the waveform.
2. Playback moves to that point.
3. No composer opens and no comment state changes.

### Start a timestamped comment

1. The user positions the playhead by listening, scrubbing, or seeking.
2. They choose `Add comment at 01:42`.
3. Playback pauses if it is running.
4. The comments surface opens when needed and focuses the composer.
5. The captured timestamp stays stable while the user writes.
6. Submit creates the thread through the existing API and selects it.
7. Cancel clears the draft and returns focus to the trigger.

The composer should support Enter to submit and Shift+Enter for a new line where that matches the existing textarea behaviour. A secondary `Use current time` action can refresh the captured timestamp if the playhead has moved.

### Existing comment marker

1. The user activates a marker.
2. Playback seeks to the marker time.
3. The matching thread becomes selected.
4. The comments rail or sheet opens and focus moves to the conversation heading or first useful action.

### Existing comment row

1. The user activates the timestamp or row.
2. Playback seeks to the thread time.
3. The thread becomes selected without starting a new draft.

### Nearby thread

When a new comment timestamp is within two seconds of an existing thread, the interface should show that conversation first. `Reply` is the primary choice, while `Start a separate comment` remains available. The app must not silently merge separate feedback.

### Version change with a draft

If the user has typed a draft and changes version or leaves the page, ask before discarding it. An untouched empty composer can close without confirmation.

## Responsive structure

### Wide screens

- Use a two-column review workspace above the lower Actions and Song admin panels.
- Keep the player stage, waveform, artwork, transport, and version context in the main column.
- Place comments in a roughly 340 to 400 pixel rail on the right.
- The rail is a sibling of the player, not a viewport-fixed overlay.
- The rail scrolls independently when the conversation list is long.
- Do not place the comments panel beneath the player as a duplicate surface.

### Compact desktop and tablet

- Keep the player at full usable width.
- Open comments in a labelled side drawer.
- Preserve the selected thread when the drawer closes and reopens.

### Phone

- Use a full-height bottom sheet opened from `Comments · {count}` or `Add comment at {time}`.
- Respect the safe area and any on-screen keyboard.
- Keep the close control, selected thread, composer, and submit action reachable without relying on hover.
- The waveform remains available for seeking while the sheet is closed.

The breakpoint should be content-driven, starting near 1100 pixels and verified at 320, 393, 430, 768, 1024, 1280, and 1440 pixels.

## State model

Keep explicit state for:

- selected thread ID
- whether the comments surface is open
- composer mode: closed, new comment, or reply
- captured draft timestamp
- draft text
- submit status and recoverable error
- the element that should regain focus when the surface closes

Remove the old coupling between waveform click percentage and floating composer visibility.

## Failure handling

- Preserve draft text and timestamp after a failed post.
- Show the error beside the composer with a retry action.
- Prevent double submission while a request is in flight.
- Keep the comments list usable when a reply fails.
- Keep permission and expired-session errors specific rather than reporting a generic loading failure.

## Accessibility

- Treat waveform seeking as an explicitly labelled seek control.
- Expose the current value and allow keyboard seeking with arrow keys when the existing waveform implementation permits it.
- Label markers with timestamp and message count, for example `Open comment at 01:42, 3 messages`.
- Provide visible focus states and 44-pixel touch targets.
- Move focus into the composer when comment creation starts.
- Restore focus when the drawer, sheet, or composer closes.
- Announce successful posts and recoverable errors through an appropriate live region.
- Respect reduced motion.

## Implementation order

1. Separate waveform seeking from comment intent.
2. Extract the existing comments list, selected thread, replies, and composer into a focused panel component without changing the API contract.
3. Build the wide review-stage grid and remove the duplicated lower comments placement.
4. Add the compact drawer and phone sheet using the same panel component.
5. Preserve markers, replies, Mark as action, deep links, notifications, and workspace/version boundaries.
6. Add targeted contracts and browser coverage before Preview deployment.

## Acceptance criteria

- Clicking or tapping an empty waveform position seeks and never opens a composer.
- Comment creation is an explicit, timestamped action.
- Desktop comments remain visible beside the player without covering it.
- Tablet and mobile comments open in an accessible responsive surface.
- Markers and comment rows seek to the right timestamp and open the right thread.
- Replies, Mark as action, deep links, and notifications retain their existing behaviour.
- Failed posts preserve the draft and timestamp.
- The implementation adds no new API, database, storage, billing, or duplicate-fetch path.

Preview verification passed on desktop and a real mobile device on 2 September 2026. The follow-up checks confirmed the two-row desktop thread header, immediate optimistic thread and reply rendering, mobile beta banner, and compact Feedback clearance.

## Rollout and rollback

- Ship as one focused draft PR with several reviewable commits.
- Verify on Preview before merge.
- No migration order or external configuration is expected.
- Roll back by reverting the PR or restoring the previous Vercel production deployment.
