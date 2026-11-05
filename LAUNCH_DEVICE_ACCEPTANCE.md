# L6 physical-device acceptance

Prepared4 November2026. Current status: partial audio acceptance on iPhone17 Pro Max; metadata issue reproduced in Chrome and Safari; first lock-screen Pause metadata handoff tracked as B42. This is the first controlled playback pass, not the complete L6 journey/browser matrix.

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

## Safari comparison, 4 November2026

On the same iPhone17 Pro Max, user reproduces title/artwork handoff after the first locked Pause in Safari too. After2-3seconds a radio-show card appears, then after dim/wake the media card is gone. No audio is playing. Date/time/torch/camera remain on the phone lock screen; this is not a Song Room page blanking report.

B42 is therefore not Chrome-specific. Both browsers still use the same app code, so this comparison does not by itself establish an iOS-only cause. W3C leaves active media-session selection to the user agent; the observed sequence is consistent with a paused-session handoff, not proven to be caused by it.

Next controlled test uses the [official Google Media Session audio sample](https://googlechrome.github.io/samples/media-session/audio.html), inspected source: native audio, explicit play/pause handlers and playbackState updates. User should tap its Play button, play briefly, lock/wake/Pause and wait5seconds in Safari. Record metadata ownership and audible state separately. No Song Room code or account, no new diagnostic app patch.

## Independent control result, 4 November2026

User reports the official Google plain-audio Media Session demo in Safari also switches to unrelated title/artwork immediately after Pause, while staying silent. After dim/wake its unrelated card remains; Song Room Safari's card cleared. This establishes the common handoff outside Song Room, not identical later retention or a specific iOS implementation cause. B42 is tracked as a platform/UI limitation; no app-owned playback defect demonstrated and no patch justified by this evidence.

The requested Chrome/iPhone audio/seek/background/pause/return flow is reported functional, with the documented metadata limitation. Safari pause and independent control are recorded separately; no Safari seeking, installed-app, longer-duration or iPad pass inferred. Continue remaining L6 checks; no more user repetition of this same control is needed.

### Follow-up observation, 5 November2026

User clarifies the independent demo's unrelated artwork was visible for about one second after a later wake, then disappeared to reveal the lock-screen background. This supersedes the earlier impression that its card stayed visible indefinitely. Both Song Room and the independent reference can hand off metadata and subsequently clear it while remaining paused; timing varies. No further repeat test or playback-code change is justified now. Exact OS cause remains unconfirmed.
