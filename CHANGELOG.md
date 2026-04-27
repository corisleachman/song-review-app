# CHANGELOG — Main Branch UI/UX Fixes

This file logs all meaningful changes made to the **main branch** (private two-person build) after initial launch. It exists specifically so that agents working on the **consumer-facing v2 branch** can understand what was changed, why, and how to apply equivalent fixes.

Entries are in reverse chronological order (newest first).

For audio player architecture fixes (mobile background audio, WaveSurfer iOS rules, etc.) see [`AUDIO_PLAYER_FIXES.md`](./AUDIO_PLAYER_FIXES.md) — those are documented separately in full.

---

## [2026-04-27] Mobile dashboard — one-tap play with EQ overlay, play button removed

**Commits:** `60f0941c`, `2ccd3ac5`, `0320bc3f`, `14fb794c`
**Files:** `app/dashboard/dashboard.module.css`

### What changed
- Play button hidden entirely on mobile (`display: none !important`)
- Tapping the artwork plays immediately (was already wired via `onTouchEnd`; this removed the visual confusion)
- Animated EQ bars appear centred on the artwork (45% width/height) while a track is playing, with a subtle dark scrim behind them
- Mini player bar at the bottom handles pause/stop

### Root cause of the two-tap bug
Multiple CSS rule blocks set `opacity: 1` on `.thumbPlayBtn` **outside** any media query — specifically `.desktopGridCard .thumbPlayBtnActive` and `.desktopListCard .thumbPlayBtn`. These came after the `@media (max-width: 768px)` block in the cascade and overrode the `display: none` meant to hide the button on mobile.

### Fix
Wrap all desktop play-button `opacity: 1` rules inside `@media (min-width: 769px)` so they never reach mobile. Replace the mobile play button block with EQ overlay styles.

### Notes for v2
- Apply `@media (min-width: 769px)` guards to **all** rules that set `opacity: 1` on play buttons — any rule outside a media query will override mobile `display: none` if it appears later in the file
- EQ bars are CSS-only (no GIF, no assets) — preferred for performance
- The `onTouchEnd` on the artwork div is what fires `playSong()` on mobile; no JS change was needed

---

## [2026-04-24] Auth cookie race condition — login loop on iOS and slow machines

**Commit:** `3e30efda`
**Files:** `app/api/auth/verify-password/route.ts`, `app/page.tsx`

### What changed
Auth cookie is now set **server-side** in the API response rather than client-side after the fetch resolves.

### Root cause
`setAuth()` was called client-side after the API responded, then `window.location.assign()` triggered navigation. On slow machines (Al's 2018 laptop) and iOS standalone mode (Add to Home Screen), the cookie hadn't propagated by the time middleware checked it on the next request — causing an infinite redirect loop back to login.

### Fix
1. API route stamps `song_review_auth` cookie directly on the HTTP response — middleware sees it instantly
2. Added `credentials: 'same-origin'` to the fetch call so cookies travel with the request
3. Removed client-side `setAuth()` call from login page entirely

### Notes for v2
Server-side cookie stamping is the correct pattern. Never rely on client-side cookie setting before a navigation.

---

## [2026-04-21] Restart button on player

**Commit:** `41962a16`
**Files:** `app/songs/[id]/versions/[versionId]/page.tsx`

### What changed
Restart button added to hero controls, placed between the time display and loop button. Matches loop button style (36px circular border, same hover/colour treatment). Seeks to 0 and starts playing if not already playing.

---

## [2026-04-16] List card hover — glow only, no position shift

**Commits:** `f395d5c7`, `667e90b5`
**Files:** `app/dashboard/dashboard.module.css`

### What changed
- Removed card lift (transform/translate) on list card hover — was causing the play button to jump position
- Play button on list cards now shows a pink glow on hover (`box-shadow`) with no movement
- Play button position locked to `translate(-50%, -50%)` and stays there on hover

---

## [2026-04-15] Dashboard audio playback — play from card, mini player, Media Session

**Commits:** `62d9052c`, `f8e49ef0`, `09855c2c`
**Files:** `app/dashboard/page.tsx`, `app/dashboard/dashboard.module.css`

### What changed
- Songs can be played directly from the dashboard song list/card without navigating to the player page
- Mini player bar appears at the bottom of the dashboard when a track is playing (title, artist, progress, controls)
- Media Session API wired to dashboard player: artwork, title, artist metadata sent to OS — enables lock screen controls and Now Playing display on iOS/Android
- Mobile grid card overrides reset so cards render as list rows on mobile (not as grid cards)

### Notes for v2
- The mini player is a separate fixed-position element rendered conditionally based on `playingId` state
- Media Session must be set after user interaction (play press) — browsers block it before that
- See also `AUDIO_PLAYER_FIXES.md` for detailed iOS audio rules

---

## [2026-04-15] Stage filter tabs on dashboard

**Commits:** `8b750512`, `b7de7ec6`, `d3c06fbf`, `58c9e20d`, `9dce18a3`, `0e40a343`
**Files:** `app/dashboard/page.tsx`, `app/dashboard/dashboard.module.css`

### What changed
- "Songs" label replaced by stage filter tabs: **All · Early Stage · In Production · Completed**
- Tabs filter the song list by the song's current stage
- On mobile: tabs are a horizontally scrollable row above sort/new song controls
- On desktop: tabs sit on the same row as sort/new song controls (single row layout)
- Several layout iterations were needed to stabilise the tab row position relative to sort controls across breakpoints

---

## [2026-04-14] Song stage pill on player

**Commit:** `693a0349`
**Files:** `app/api/songs/[songId]/route.ts`, `app/songs/[id]/versions/[versionId]/page.tsx`, `app/songs/[id]/versions/[versionId]/version.module.css`

### What changed
- Stage pill added to the player page hero, showing the song's current stage
- Tapping/clicking cycles through: Early Stage → In Production → Completed → Early Stage
- Stage persisted to the database via `PATCH /api/songs/[songId]`

---

## [2026-04-14] Auth and middleware hardening

**Commit:** `8cccd3ad`
**Files:** `app/identify/page.tsx`, `app/page.tsx`, `middleware.ts`

### What changed
- Password verification moved fully to API route; removed race condition in identity selection
- Middleware tightened to prevent redirect loops
- `icon.png` excluded from middleware matcher (was triggering redirect loop on every page load)

---

## [2026-04-14] Rename to Rebel HQ, favicon

**Commit:** `fbbb20aa`
**Files:** `app/layout.tsx`, `app/page.tsx`, `app/icon.png`, `public/manifest.json`, `app/api/email/notify-thread/route.ts`, `app/songs/[id]/versions/[versionId]/page.tsx`

### What changed
- App renamed from "Pulse" to "Rebel HQ" (now "Polite Rebels") across all UI surfaces and email notifications
- Favicon updated to purple logo on black background
- PWA manifest updated to match

---

## [2026-04-14] Loop toggle button on player

**Commit:** `3595139e`
**Files:** `app/songs/[id]/versions/[versionId]/page.tsx`, `app/songs/[id]/versions/[versionId]/version.module.css`

### What changed
Loop toggle button added to player hero controls. Toggles WaveSurfer loop mode on/off. Styled to match other control buttons.

---

## [2026-04-04] Lazy audio loading + public URLs for caching

**Commits:** `bc9efa08`, `05b666f6`, `f1211678`, `3903a8df`
**Files:** `app/songs/[id]/versions/[versionId]/page.tsx`

### What changed
**Lazy loading:** MP3 is no longer fetched on page load. `ws.load(url)` is only called when the user first presses play. Subsequent play/pause uses the already-loaded audio. An `audioLoadedRef` tracks whether `ws.load()` has been called.

**Public URLs:** Switched from Supabase signed URLs (1-hour expiry, time-based token in URL string) to permanent public URLs. Signed URLs break browser caching because each session generates a new URL string = cache miss = full re-download. Public URLs are stable so the browser caches the MP3 across sessions.

**Why this matters:** Combined, these two changes mean: first play ever = one download; every subsequent play on the same device = served from browser cache, zero Supabase egress.

**Play button fix:** `disabled={!isReady}` was preventing the button from being pressed before audio loaded (which under lazy loading is always). Changed so the button is enabled immediately and triggers `ws.load()` on first press.

### Notes for v2
- Never use signed URLs for audio delivery — use public URLs with unique file paths per version
- Always check that play button is not gated on `isReady` when using lazy loading
- See `AUDIO_PLAYER_FIXES.md` Bug 6–9 for full detail

---

## [2026-04-02] Audio player — mobile background audio, iOS fixes, reactive visualisation

**Commits:** `c7db2438`, `93958d46`, `54e24ccd`, `67d71723`, `1ebfe3b6`, `8914d9fe`, `61d9881d`, `f09d8087`, `6334ce3e`, `2bc257a7`, `dc5f4127`, `ee3232b2`, `62cc6f8c`
**Files:** `app/songs/[id]/versions/[versionId]/page.tsx`, `app/songs/[id]/versions/[versionId]/version.module.css`

These are fully documented in [`AUDIO_PLAYER_FIXES.md`](./AUDIO_PLAYER_FIXES.md). Summary:

- Removed `crossOrigin` attribute from audio element (was blocking iOS background audio)
- Registered Media Session API for lock screen controls
- Stopped double-audio glitch (WaveSurfer effect was re-initialising due to unstable deps)
- Removed muted second audio element (was causing double-audio on iOS)
- Skipped `createMediaElementSource()` on mobile (transfers ownership of audio element, suspends backgrounded audio)
- Pre-computed frequency frames using `OfflineAudioContext` for mobile reactive animation
- Fixed waveform not loading on first visit (waveformRef not in DOM during loading state)
- Stopped audio continuing to play when navigating to a different song

---

## [2026-03-28] Reactive hero wave on version page

**Commit:** `396946da`
**Files:** `app/songs/[id]/versions/[versionId]/page.tsx`, `app/songs/[id]/versions/[versionId]/version.module.css`

### What changed
Animated frequency-reactive visualisation added to the player page hero background — canvas-based bars that respond to the audio frequency data in real time on desktop, and use pre-computed frames on mobile.

---

## [2026-03-27] Hero layout — named CSS grid permanent fix

**Commit:** `15edf577`
**Files:** `app/songs/[id]/versions/[versionId]/version.module.css`

### What changed
Hero layout was repeatedly breaking across desktop/mobile because `heroWaveform` was inside `heroLeft` in the DOM (correct for desktop) but needed to break out for mobile full-width. CSS tricks (flex-wrap, order, display:contents) all failed because CSS cannot move an element out of its DOM parent.

**Fix:** Named CSS grid areas on `heroContent`. Both `heroLeft` and `heroWaveform` are direct children of `heroContent`, placed into named grid areas. Desktop puts waveform in the left column; mobile stacks it below via a redefined grid template.

### Notes for v2
This is the permanent correct pattern. Do not put the waveform inside a sub-container if it needs to reflow independently at mobile breakpoints.

---

## [2026-03-27] Waveform three-state colour + floating comment box

**Commits:** `181ca63c`, `7110c693`
**Files:** `app/songs/[id]/versions/[versionId]/page.tsx`, `app/songs/[id]/versions/[versionId]/version.module.css`

### What changed
- Waveform unplayed: `rgba(255,255,255,0.2)` grey
- Waveform played (left of playhead): `#ff1493` hot pink (WaveSurfer `progressColor`)
- Waveform hovered: `rgba(255,20,147,0.3)` — transparent pink overlay via a canvas element layered on top (WaveSurfer only supports two native colours; hover state requires a separate overlay)
- Comment creation box floats over the waveform at the click position rather than appearing in a separate panel

---

## [2026-03-27] Mobile song page layout fixes

**Commits:** `baee4291`, `af9fc520`, `fff6e3ca`
**Files:** `app/songs/[id]/versions/[versionId]/page.tsx`, `app/songs/[id]/versions/[versionId]/version.module.css`

### What changed
- Mobile hero switches to a 2-column CSS grid: artwork left, title/controls right
- Artwork appears above the waveform on mobile (correct order)
- Version selector replaced with a modal picker (previously a `<select>` dropdown that was hard to use on mobile)
- Upload button given correct outline style
- Waveform full-width on mobile

---

## [2026-03-27] App renamed Pulse → Polite Rebels

**Commit:** `73d87106`

App name updated across UI and documentation.

---

## [2026-03-26] Desktop list view refinements

**Commits:** `09f82b78`, `fac147f7`, `3d5a8f72`
**Files:** `app/dashboard/dashboard.module.css`

### What changed
- Thumbnail: 60px → 70px
- Version label shown in list row
- Comment count left-aligned
- Action icons: 22px → 44px, right-aligned with `margin-left: auto`
- Icons vertically centred using `position: absolute; top: 50%; transform: translateY(-50%)`

---

## [2026-03-25] Mark as action bugs fixed

**Commits:** `9ca28095`, `7e4b2d5a`
**Files:** `app/api/actions/by-song/[songId]/route.ts`, `app/songs/[id]/versions/[versionId]/page.tsx`

### What changed
- Actions were not appearing in the dashboard panel after being created
- "Mark as action" button was persisting after page refresh

**Root cause (not appearing):** The API route joined `actions → comment_threads` directly but there is no direct FK. The correct path is `actions → comments → comment_threads`. Fixed the select query to use `comments!inner(comment_threads(...))`.

**Root cause (button persisting):** `loadActions` was using the Supabase JS client without the service role key, so RLS was silently returning no rows — the `actionIds` set stayed empty and the button never disappeared.

---

## [2026-03-25] Mobile dashboard compact list row layout

**Commit:** `f33e0095`
**Files:** `app/dashboard/dashboard.module.css`, `app/dashboard/page.tsx`

### What changed
- Song cards on mobile become 56px tall horizontal rows (aspect-ratio reset)
- Thumbnail: 56×56px square, left-aligned, left corners rounded
- Card body in-flow (not absolute overlay): flex:1, shows title + meta
- Action icons always visible on mobile, right-aligned, in-flow
- Version badge and comment count badge hidden on mobile (shown as inline text instead)

---

## [2026-03-25] Waveform not loading on mobile

**Commit:** `cd9dcb8b`
**Files:** `app/songs/[id]/versions/[versionId]/page.tsx`

### What changed
WaveSurfer's internal URL fetch was silently failing on mobile Safari/Chrome (CORS headers differ, signed URL query params can get mangled).

**Fix:** Create a native `HTMLAudioElement`, set its `src` directly, then pass it to WaveSurfer via the `media` option. WaveSurfer never fetches the URL itself — it uses the already-created element.

### Notes for v2
This is the correct mobile pattern. Always pass a pre-created `HTMLAudioElement` via `media:` option rather than letting WaveSurfer fetch the URL. See `AUDIO_PLAYER_FIXES.md` for full detail.

---

## [2026-03-25] timestamp_seconds integer rounding

**Commit:** `28e4ed9b`
**Files:** `app/api/threads/create/route.ts`, `app/api/actions/create/route.ts`

### What changed
WaveSurfer passes timestamps as floats (e.g. `99.3`). The `comment_threads.timestamp_seconds` column is `INTEGER` in Postgres and was rejecting the value with a type error, causing every `POST /api/threads/create` to 500.

**Fix:** `Math.round()` applied to `timestamp_seconds` in both API routes before DB insert.

### Notes for v2
Either apply `Math.round()` in the API routes, or change the column type to `FLOAT` — the latter is more accurate for seeking but requires a schema migration.

---

## [2026-03-25] Image upload + new version upload fixes

**Commit:** `1c0c7cf1`
**Files:** `app/songs/[id]/versions/[versionId]/page.tsx` (and related API routes)

### What changed
- Image upload switched from direct client-side Supabase storage call (was failing silently) to server-side API route
- New version upload flow fixed

---

## [2026-03-25] 4-bug fix — actions per version, bubble alignment, email deep link

**Commit:** `267086ba`
**Files:** `app/dashboard/dashboard.module.css`, `app/songs/[id]/versions/[versionId]/page.tsx`, `app/songs/[id]/versions/[versionId]/version.module.css`

### What changed
1. Actions filtered by `song_version_id` — only actions whose comment belongs to a thread on the current version are shown
2. Comment bubble alignment fixed (own messages right-aligned, other person's left-aligned)
3. Song cards on dashboard forced to square aspect ratio
4. Email deep link `?thread=` parameter fixed to correctly open the referenced thread

