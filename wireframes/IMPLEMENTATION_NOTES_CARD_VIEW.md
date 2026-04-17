# Dashboard UI Implementation — Desktop Card View

**Branch:** `clone-clean`  
**Files to modify:** `app/dashboard/page.tsx`, `app/dashboard/dashboard.module.css`  
**Reference wireframe:** `wireframes/wireframe-desktop-card.html`  
**Open via:** `https://htmlpreview.github.io/?https://github.com/corisleachman/song-review-app/blob/main/wireframes/wireframe-desktop-card.html`

Read alongside `wireframes/IMPLEMENTATION_NOTES.md` — that file covers shared concerns (attention bar, meta pill, state, field names). This file covers card-view-specific changes only.

---

## What changes in card view vs current main branch

The existing `.desktopGridCard` structure is already correct (flex-column, artwork on top, opaque strip below). The changes are:

1. **Add ℹ as first icon** in `.cardActions` row — currently only rename, image, delete exist
2. **Add status pill + action pill** to the card body strip — currently only version label and comment count
3. **Add info overlay** inside `.cardThumb` — covers artwork only, body strip always accessible
4. **Add attention ring** via `box-shadow` on `.card-attention`
5. **Info icon tint** on attention cards

The card grid layout (4 columns, 14px gap), hover lift, play button, EQ bars, version badge, activity badge — all of these already exist and should NOT be changed.

---

## 1. CSS changes — `dashboard.module.css`

### 1a. Card attention — ring variant for square cards

```css
/*
 * Grid cards use a ring (not left bar) because they are square.
 * box-shadow: 0 0 0 2px #ff1493
 * Stacked with the existing card shadow.
 */
.cardAttention {
  box-shadow: 0 0 0 2px #ff1493, 0 10px 24px rgba(0,0,0,0.18) !important;
  border-color: transparent !important;
}
.cardAttention:hover {
  box-shadow: 0 0 0 2px #ff1493, 0 16px 34px rgba(0,0,0,0.28) !important;
}
.cardAttention .iconBtnInfo {
  border-color: rgba(255,20,147,0.45) !important;
  color: #ff69b4 !important;
}
```

### 1b. Status row — new element in card body strip

```css
/* Status + action pill row — sits between title and the divider */
.cardStatusRow {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.cardStatusPill {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 20px;
}
.cardStatusMixing    { background: rgba(99,102,241,0.2);  color: #a5b4fc; border: 0.5px solid rgba(99,102,241,0.3); }
.cardStatusMastering { background: rgba(234,179,8,0.15);  color: #fcd34d; border: 0.5px solid rgba(234,179,8,0.25); }
.cardStatusWriting   { background: rgba(20,184,166,0.15); color: #5eead4; border: 0.5px solid rgba(20,184,166,0.25); }
.cardStatusInProgress { background: rgba(99,102,241,0.15); color: #a5b4fc; border: 0.5px solid rgba(99,102,241,0.25); }
.cardStatusFinished  { background: rgba(34,197,94,0.15);  color: #86efac; border: 0.5px solid rgba(34,197,94,0.25); }

.cardActionPill {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 10px; font-weight: 500; padding: 2px 7px; border-radius: 20px;
  background: rgba(255,20,147,0.15); color: #ff69b4;
  border: 0.5px solid rgba(255,20,147,0.25);
}
.cardActionPillDot {
  width: 4px; height: 4px; border-radius: 50%; background: #ff1493;
}
```

### 1c. Divider in card body strip

```css
.cardBodyDivider {
  height: 1px;
  background: rgba(255,255,255,0.07);
  margin: 2px 0;
}
```

### 1d. Info overlay — covers artwork area only

```css
/*
 * Positioned inside .cardThumb (position:relative).
 * aspect-ratio:1/1 ensures it exactly covers the square artwork.
 * Hidden via opacity+pointer-events so layout is never affected.
 * JS toggles .cardInfoOverlayVisible to show/hide.
 */
.cardInfoOverlay {
  position: absolute;
  top: 0; left: 0; right: 0;
  aspect-ratio: 1 / 1;
  background: rgba(10, 5, 20, 0.88);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border-radius: 10px 10px 0 0;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 5;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s;
}
.cardInfoOverlayVisible {
  opacity: 1;
  pointer-events: all;
}

.overlayGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.overlayItem { display: flex; flex-direction: column; gap: 2px; }
.overlayLabel {
  font-size: 9px; color: rgba(255,255,255,0.38); font-weight: 500;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.overlayValue { font-size: 11px; color: rgba(255,255,255,0.9); font-weight: 500; }

.overlayAssignRow { display: flex; gap: 5px; flex-wrap: wrap; }
.overlayPill {
  font-size: 10px; padding: 3px 8px; border-radius: 20px;
  background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7);
  border: 0.5px solid rgba(255,255,255,0.14);
}
.overlayPillMe {
  background: rgba(255,20,147,0.18); color: #ff69b4;
  border-color: rgba(255,20,147,0.28);
}

.overlayStageRow { display: flex; align-items: center; gap: 6px; }
.overlayStageLabel { font-size: 10px; color: rgba(255,255,255,0.38); }
.overlayStageVal {
  font-size: 10px; color: rgba(255,255,255,0.82);
  background: rgba(255,255,255,0.08); padding: 2px 8px;
  border-radius: 20px; border: 0.5px solid rgba(255,255,255,0.14);
}

.overlayActivity {
  font-size: 10px; color: rgba(255,255,255,0.38);
  border-top: 1px solid rgba(255,255,255,0.07); padding-top: 6px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-top: auto;
}
```

---

## 2. React state changes — `page.tsx`

```tsx
// Which card's info overlay is open (null = none)
// One state value covers both card and list view info interactions
const [openOverlayId, setOpenOverlayId] = useState<string | null>(null);
```

---

## 3. Markup changes — `page.tsx`

### 3a. Card className — add attention class

```tsx
className={`
  ${styles.card}
  ${viewMode === 'list' ? styles.desktopListCard : styles.desktopGridCard}
  ${songNeedsAttention(song) ? styles.cardAttention : ''}
  ${fadingSongIds.includes(song.id) ? styles.cardDeleting : ''}
`}
```

### 3b. Inside `.cardThumb` — add info overlay after existing badges

Add this after the existing `versionBadge` and `activityBadge` spans:

```tsx
{/* Info overlay — covers artwork only, body strip always accessible */}
<div className={`${styles.cardInfoOverlay} ${openOverlayId === song.id ? styles.cardInfoOverlayVisible : ''}`}
  onClick={e => e.stopPropagation()}>
  <div className={styles.overlayGrid}>
    <div className={styles.overlayItem}>
      <span className={styles.overlayLabel}>Latest version</span>
      <span className={styles.overlayValue}>{song.latestVersionLabel ?? `v${song.latestVersionNumber}`}</span>
    </div>
    <div className={styles.overlayItem}>
      <span className={styles.overlayLabel}>Last activity</span>
      <span className={styles.overlayValue}>{formatDate(song.updatedAt)}</span>
    </div>
    <div className={styles.overlayItem}>
      <span className={styles.overlayLabel}>Comments</span>
      <span className={styles.overlayValue}>{song.commentCount}</span>
    </div>
    <div className={styles.overlayItem}>
      <span className={styles.overlayLabel}>Open work</span>
      <span className={styles.overlayValue}>{song.openActionsCount > 0 ? `${song.openActionsCount} actions` : 'None'}</span>
    </div>
  </div>
  {/* Assign pills — adapt field names to clone-clean Song type */}
  {(song.openActionsAssignedToMe > 0 || song.openActionsAwaitingThem > 0) && (
    <div className={styles.overlayAssignRow}>
      {song.openActionsAssignedToMe > 0 && (
        <span className={`${styles.overlayPill} ${styles.overlayPillMe}`}>{song.openActionsAssignedToMe} assigned to me</span>
      )}
      {song.openActionsAwaitingThem > 0 && (
        <span className={styles.overlayPill}>Awaiting them</span>
      )}
    </div>
  )}
  <div className={styles.overlayStageRow}>
    <span className={styles.overlayStageLabel}>Stage</span>
    <span className={styles.overlayStageVal}>{song.status ?? '—'}</span>
  </div>
  {song.latestActivitySnippet && (
    <div className={styles.overlayActivity}>{song.latestActivitySnippet}</div>
  )}
</div>
```

### 3c. Inside `.cardBody` — add status row and divider

Add these between the `cardTitle` div and the existing `cardActions` div:

```tsx
{/* Status + action pill row */}
<div className={styles.cardStatusRow}>
  {song.status && (
    <span className={`${styles.cardStatusPill} ${statusPillClass(song.status)}`}>
      {song.status}
    </span>
  )}
  {song.openActionsCount > 0 && (
    <span className={styles.cardActionPill}>
      <span className={styles.cardActionPillDot} />
      {song.openActionsAssignedToMe > 0
        ? `${song.openActionsAssignedToMe} assigned to me`
        : `${song.openActionsCount} actions`}
    </span>
  )}
</div>
<div className={styles.cardBodyDivider} />
```

Helper for status pill class (add near top of component or as a util):

```tsx
function statusPillClass(status: string): string {
  const map: Record<string, string> = {
    writing: styles.cardStatusWriting,
    in_progress: styles.cardStatusInProgress,
    mixing: styles.cardStatusMixing,
    mastering: styles.cardStatusMastering,
    finished: styles.cardStatusFinished,
  };
  return map[status.toLowerCase()] ?? '';
}
```

### 3d. Inside `.cardActions` — add ℹ as first button

```tsx
<div className={styles.cardActions}>
  {/* ℹ Info — NEW, first in row */}
  <button
    className={`${styles.iconBtn} ${styles.iconBtnInfo}`}
    title="Info"
    onClick={e => {
      e.stopPropagation();
      setOpenOverlayId(openOverlayId === song.id ? null : song.id);
    }}
  >
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="5.5" cy="5.5" r="4.5"/>
      <line x1="5.5" y1="5" x2="5.5" y2="8"/>
      <circle cx="5.5" cy="3.2" r="0.6" fill="currentColor" stroke="none"/>
    </svg>
  </button>

  {/* existing rename button */}
  {/* existing image button */}
  {/* existing delete button */}
</div>
```

### 3e. Close overlay on card click

Wrap the card's existing `onClick` to also close any open overlay:

```tsx
onClick={e => {
  // Close info overlay if open — don't navigate
  if (openOverlayId === song.id) {
    setOpenOverlayId(null);
    return;
  }
  handleCardClick(e, song);
}}
```

---

## 4. Field name notes

Same as `IMPLEMENTATION_NOTES.md` section 4. Additionally:

| Concept | Expected field | Notes |
|---|---|---|
| Song workflow stage | `song.status` | values: `writing`, `in_progress`, `mixing`, `mastering`, `finished` |
| Latest activity snippet | `song.latestActivitySnippet` | may not exist — omit if missing, add TODO |
| Actions awaiting other person | `song.openActionsAwaitingThem` | may not exist — omit pill if missing |

---

## 5. Checklist

- [ ] `.cardAttention` CSS added (ring variant, not left bar)
- [ ] `.cardAttention .iconBtnInfo` tint added
- [ ] `.cardStatusRow`, `.cardStatusPill`, status variants CSS added
- [ ] `.cardActionPill` / `.cardActionPillDot` CSS added
- [ ] `.cardBodyDivider` CSS added
- [ ] `.cardInfoOverlay` / `.cardInfoOverlayVisible` CSS added
- [ ] All overlay sub-classes added (grid, item, label, value, assign, stage, activity)
- [ ] `openOverlayId` state added to component
- [ ] Info overlay markup added inside `.cardThumb`
- [ ] Status row + divider added to `.cardBody`
- [ ] ℹ button added as first icon in `.cardActions`
- [ ] Card `onClick` updated to close overlay without navigating
- [ ] `statusPillClass()` helper added
- [ ] `songNeedsAttention()` helper added (shared with list view)
- [ ] `npx tsc --noEmit` passes (excluding `.next/types` errors)
- [ ] `npm run build` passes
- [ ] Tested: tap ℹ opens overlay, tap ℹ again closes it
- [ ] Tested: tap card outside overlay navigates to song page
- [ ] Tested: attention ring visible on songs with assigned actions
