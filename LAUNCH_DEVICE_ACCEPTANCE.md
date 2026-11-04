# L6 physical-device acceptance

Prepared4 November2026. Current status: partial pass on iPhone17 Pro Max/Chrome; first lock-screen Pause metadata handoff tracked as B42. This is the first controlled playback pass, not the complete L6 journey/browser matrix.

## Scope and current implementation

Use the existing Production account and an existing song. No uploads, edits, sharing changes or emails. Existing version player and dashboard use Media Session controls; lib/resumeNativeAudio.ts preserves the authorised source and restores position after a failed resume. Source inspection and desktop/staging tests cannot verify actual hardware lock-screen behaviour.

Use a phone with its normal browser; the previously requested11-inch iPad is also useful. Record exact device/browser and whether this is a browser tab or an installed app. B09 is satisfied only for hardware actually tested.

## User test

1. User, https://www.song-room.live/dashboard on the chosen device: sign in with the existing account if needed, open an existing song/version and press Play. Expected: correct song/version, audible audio and advancing position.
2. User, the same song page: seek forward a little. Expected: playback continues from the selected position, with one active player.
3. User, device lock screen: lock for about30seconds while playback is active. Expected: audio continues once, without overlapping playback. Note whether media title/controls appear; do not assume their presence from code alone.
4. User, unlock and return to the app: pause, then return to the dashboard. Expected: playback pauses, correct workspace/song cards return, no competing audio.

Stop at the first failure. Return device/browser, step, visible error or actual behaviour and page path (omit full capability/auth URLs). A pass report should include device/browser and “Mobile playback passed”. No need to send song content or account credentials.

## Agent follow-up

Read the report, inspect the smallest affected audio/lifecycle path if anything fails, then run relevant checks. Record environment/device, exact steps and pass/fail/untested distinctions in LAUNCH_CHECKLIST.md. Keep phone/tablet and browser contexts separate. Do not claim long-duration/background-resume, multiple devices or billing/email acceptance from this single pass. User may need a second targeted check if a failure is repaired.

## Remaining L6 checks

Google/email signup/recovery, controlled invites/workspace isolation, upload/version/comment/restart/repeat, isolated payment sandbox, public sharing/embed revocation and broader accessibility remain their existing named matrix items. No new launch blocker or notification channel is added here.

## First physical-device result, 4 November2026

User reports the requested audio/seek/background/pause/return steps worked on iPhone17 Pro Max in a Chrome tab, except the first locked Pause per song changes the phone's title/artwork to an unrelated track after2-3seconds. No unrelated audio starts. Replaying the same song before the next locked Pause avoids the metadata change. Repeated across different songs. This is a partial acceptance with [B42](PRODUCT_BACKLOG.md#b42-first-lock-screen-pause-shows-another-apps-metadata) open, not a full mobile/browser pass. iOS/Chrome versions unknown; physical11-inch iPad remains untested.

Next controlled comparison: use Safari on the same phone, same Production song, first Play/lock/wake/Pause. Return whether artwork/title switch while audio stays paused. No application change before comparison. Browser/OS selects the active session; distinguish this from Song Room selecting another song or playing outside media.
