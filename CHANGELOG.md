# CHANGELOG — Main Branch UI/UX Fixes

This file logs all UI/UX and interaction changes made to the **main branch** (private two-person build) after initial launch. It exists specifically so that agents working on the **consumer-facing v2 branch** can understand what was changed, why, and how to apply equivalent fixes.

For audio player architecture fixes, see [`AUDIO_PLAYER_FIXES.md`](./AUDIO_PLAYER_FIXES.md).

---

## [2026-04-27] Mobile Dashboard — One-Tap Play & EQ Overlay

### What changed
Redesigned the song artwork tap interaction on mobile (dashboard, song list view) to:
1. Play a track immediately on the first tap of the artwork (previously required two taps)
2. Show an animated EQ bar overlay centred on the artwork while the track is playing
3. Remove the play button entirely on mobile (it was always visible and looked cluttered)

### Why
On mobile there is no hover state, so the play button was hidden (`opacity: 0`) until after the first tap triggered `playSong()` and added the `.thumbPlayBtnActive` class. The user perceived this as needing two taps — tap one revealed the button, tap two pressed it. The play button itself was also adding visual clutter in list view once it became permanently visible.

### Root cause of the two-tap bug
Multiple CSS rule blocks set `opacity: 1` on `.thumbPlayBtn` outside any media query:
- `.desktopGridCard .thumbPlayBtnActive` (line ~378)
- `.desktopListCard .thumbPlayBtn` (line ~1410)

These came *after* the `@media (max-width: 768px)` block in the cascade, so they overrode the `display: none` that was supposed to hide the button on mobile.

### Files changed
**`app/dashboard/dashboard.module.css`**

Three separate changes were made:

**1. Wrapped `.desktopGridCard` play button rules in a desktop-only media query**
```css
/* Before — no media query guard, overrides mobile hide */
.desktopGridCard .thumbPlayBtn { opacity: 0 !important; ... }
.desktopGridCard:hover .thumbPlayBtn { opacity: 1 !important; ... }
.desktopGridCard .thumbPlayBtnActive { opacity: 1 !important; ... }

/* After — scoped to desktop only */
@media (min-width: 769px) {
  .desktopGridCard .thumbPlayBtn { opacity: 0 !important; ... }
  .desktopGridCard:hover .thumbPlayBtn { opacity: 1 !important; ... }
  .desktopGridCard .thumbPlayBtnActive { opacity: 1 !important; ... }
}
```

**2. Wrapped `.desktopListCard` play button rules in a desktop-only media query**
```css
/* Before */
.desktopListCard .thumbPlayBtn { opacity: 1; ... }
.desktopListCard:hover .thumbPlayBtn { ... }
.desktopListCard .thumbPlayBtnActive { ... }
.desktopListCard .eqBars { display: none; }

/* After */
@media (min-width: 769px) {
  .desktopListCard .thumbPlayBtn { opacity: 1; ... }
  .desktopListCard:hover .thumbPlayBtn { ... }
  .desktopListCard .thumbPlayBtnActive { ... }
  .desktopListCard .eqBars { display: none; }
}
```

**3. Replaced the mobile `@media (max-width: 768px)` play button block entirely**
```css
/* Before — made play button always visible on mobile */
@media (max-width: 768px) {
  .thumbPlayBtn {
    opacity: 1;
    transform: translate(-50%, -50%);
    width: 34px;
    height: 34px;
  }
  .thumbPlayBtnActive { transform: translate(-50%, -50%) !important; }
  .eqBars { display: none; }
}

/* After — hides play button, shows centred EQ overlay instead */
@media (max-width: 768px) {
  .thumbPlayBtn { display: none !important; }
  .thumbPlayBtnActive { display: none !important; }

  /* Centred EQ overlay on artwork when playing */
  .eqBars {
    display: flex;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 45%;
    height: 45%;
    align-items: flex-end;
    justify-content: center;
    gap: 8%;
    background: rgba(13, 9, 20, 0.45);
    border-radius: 8px;
    padding: 18% 12%;
    box-sizing: border-box;
  }
  .eqBar {
    flex: 1;
    width: auto;
    max-width: 14%;
    border-radius: 2px;
    height: 100%;
  }
  .eqBar:nth-child(1) { height: 40%; }
  .eqBar:nth-child(2) { height: 80%; }
  .eqBar:nth-child(3) { height: 55%; }
  .eqBar:nth-child(4) { height: 70%; }
}
```

### Interaction after this change (mobile)
- Tap artwork → plays immediately (first tap)
- EQ bars animate on the artwork thumbnail while playing
- Play button never shown on mobile
- Mini player bar at bottom handles pause/stop
- Desktop behaviour unchanged

### No JS changes required
The `onTouchEnd` handler on the artwork already called `playSong()` correctly. The EQ bars already existed and were already conditionally rendered based on `playingId === song.id && isPlaying`. This was a CSS-only fix.

### Notes for v2
- Apply the same `@media (min-width: 769px)` guards to any play button rules that use `opacity: 1`
- The EQ bars overlay approach (CSS animation, no GIF, no external assets) is the preferred pattern — keeps the app lightweight
- The `.eqBars` element and `.eqBar` children are already in the JSX; only CSS changes are needed to position and show them on mobile
