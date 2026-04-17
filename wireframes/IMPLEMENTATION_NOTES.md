# Dashboard UI Implementation — List View & Card Updates

**Branch:** `clone-clean`  
**Files to modify:** `app/dashboard/page.tsx`, `app/dashboard/dashboard.module.css`  
**Reference wireframes:** `wireframes/wireframe-desktop-list.html`, `wireframes/wireframe-mobile-list.html`  
**Open wireframes via:** `https://htmlpreview.github.io/?https://github.com/corisleachman/song-review-app/blob/main/wireframes/[filename]`

---

## Overview

Three UI changes needed:

1. **Mobile pill placement fix** — action pill moved from its own row to the meta line
2. **Attention bar** — left-edge pink bar for songs that need the user's attention
3. **Info panel** — desktop: inline expand below row / mobile: bottom sheet modal

All changes are in `dashboard.module.css` (CSS) and `page.tsx` (markup + state). No new libraries, no changes to API routes or lib files.

---

## 1. CSS changes — `dashboard.module.css`

### 1a. Add `.card-attention`

```css
/* Left-edge attention bar — no extra DOM element, no layout shift */
.card-attention {
  box-shadow: -3px 0 0 0 #ff1493, 0 10px 24px rgba(0,0,0,0.18);
  border-color: rgba(255,20,147,0.2);
}

/* Info icon gets pink tint on attention rows */
.card-attention .iconBtnInfo {
  border-color: rgba(255,20,147,0.45) !important;
  color: #ff69b4 !important;
}
```

### 1b. Add `.metaPill` — inline action pill on meta line

```css
/* Inline action pill — sits on the card meta line, not a separate row */
.metaPill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 500;
  padding: 1px 7px;
  border-radius: 20px;
  background: rgba(255,20,147,0.15);
  color: #ff69b4;
  border: 0.5px solid rgba(255,20,147,0.25);
  flex-shrink: 0;
}
.metaPillDot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #ff1493;
}
```

### 1c. Desktop list card — fix expand behaviour

The existing `.desktopListCard` uses `align-items: center` which causes icons to vertically centre when the card height grows. Replace with:

```css
/* Fix: icons must be top-aligned always, not vertically centred */
.desktopListCard {
  display: flex !important;
  flex-direction: column !important;  /* changed from row */
  align-items: stretch !important;
  aspect-ratio: unset !important;
  height: auto !important;            /* changed from 70px fixed */
}

/* Inner row holds thumb + main content, always 70px */
.desktopListCardRow {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  height: 70px;
  position: relative;
}

/* Icons: absolute inside .desktopListCardRow, always top-aligned */
.desktopListCard .cardActions {
  position: absolute !important;
  right: 14px !important;
  top: 12px !important;
  transform: none !important;
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 6px !important;
  opacity: 1 !important;
}
```

### 1d. Desktop expand panel

```css
/* Expand section — sibling to .desktopListCardRow */
.cardExpandPanel {
  display: none;
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 14px 16px 14px 86px; /* 86px aligns with card-main text column */
  flex-direction: column;
  gap: 10px;
}
.cardExpandPanel.cardExpandVisible {
  display: flex;
}
.expandGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.expandItem {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.expandLabel {
  font-size: 10px;
  color: rgba(255,255,255,0.35);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.expandValue {
  font-size: 12px;
  color: rgba(255,255,255,0.88);
  font-weight: 500;
}
.expandAssignRow {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.expandAssignPill {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 20px;
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.65);
  border: 0.5px solid rgba(255,255,255,0.13);
}
.expandAssignPillMe {
  background: rgba(255,20,147,0.15);
  color: #ff69b4;
  border-color: rgba(255,20,147,0.28);
}
.expandActivity {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

### 1e. Bottom sheet (mobile only)

```css
/* Overlay — position:fixed in production */
.bsOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0);
  transition: background 0.25s;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  pointer-events: none;
}
.bsOverlayVisible {
  background: rgba(0,0,0,0.55);
  pointer-events: all;
}

/* Sheet */
.bottomSheet {
  width: 100%;
  background: #1e1330;
  border-radius: 20px 20px 0 0;
  border-top: 1px solid rgba(255,255,255,0.1);
  overflow: hidden;
  transform: translateY(100%);
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.bsOverlayVisible .bottomSheet {
  transform: translateY(0);
}

.bsHandle {
  display: flex;
  justify-content: center;
  padding: 10px 0 6px;
  cursor: pointer;
}
.bsHandleBar {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255,255,255,0.2);
}
.bsHeader {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.bsArt {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  flex-shrink: 0;
  overflow: hidden;
}
.bsSongTitle {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}
.bsSub {
  font-size: 12px;
  color: rgba(255,255,255,0.42);
  margin: 2px 0 0;
}
.bsBody {
  padding: 14px 16px 4px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bsGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.bsItem {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.bsItemLabel {
  font-size: 10px;
  color: rgba(255,255,255,0.35);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.bsItemValue {
  font-size: 13px;
  color: rgba(255,255,255,0.9);
  font-weight: 500;
}
.bsAssignRow {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.bsPill {
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 20px;
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.7);
  border: 0.5px solid rgba(255,255,255,0.13);
}
.bsPillMe {
  background: rgba(255,20,147,0.18);
  color: #ff69b4;
  border-color: rgba(255,20,147,0.28);
}
.bsActivitySnippet {
  font-size: 12px;
  color: rgba(255,255,255,0.38);
  border-top: 1px solid rgba(255,255,255,0.07);
  padding-top: 12px;
}
.bsCta {
  margin: 4px 16px 16px;
  background: #ff1493;
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  padding: 12px;
  width: calc(100% - 32px);
  cursor: pointer;
  font-family: inherit;
  display: block;
}
```

---

## 2. React state changes — `page.tsx`

### 2a. New state

```tsx
// Desktop: which card's expand panel is open (null = none)
const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

// Mobile: which song's bottom sheet is open (null = none)
const [sheetSongId, setSheetSongId] = useState<string | null>(null);
```

### 2b. Attention logic

A song "needs attention" when it has open actions assigned to the current user. Derive this from existing song data:

```tsx
function songNeedsAttention(song: Song): boolean {
  // Adjust field names to match clone-clean's Song type
  return (song.openActionsAssignedToMe ?? 0) > 0;
}
```

---

## 3. Markup changes — `page.tsx`

### 3a. Card className — add attention class

```tsx
className={`${styles.card} ${viewMode === 'list' ? styles.desktopListCard : styles.desktopGridCard} ${songNeedsAttention(song) ? styles.cardAttention : ''} ...`}
```

### 3b. Desktop list card structure — add inner row wrapper

Wrap the existing thumb + body content in `.desktopListCardRow`. The expand panel goes as a sibling:

```tsx
<div className={`${styles.card} ${styles.desktopListCard} ...`}>
  {/* Inner row — always 70px, icons absolutely positioned here */}
  <div className={styles.desktopListCardRow}>
    {/* existing thumb */}
    {/* existing cardBody */}
    {/* existing cardActions — now absolute inside this row */}
    {/* ADD: info button as first icon */}
    <button
      className={`${styles.iconBtn} ${styles.iconBtnInfo}`}
      onClick={e => { e.stopPropagation(); setExpandedCardId(expandedCardId === song.id ? null : song.id); }}
      title="Info"
    >
      {/* ℹ svg */}
    </button>
  </div>

  {/* Expand panel — sibling to row, shown via CSS class */}
  <div className={`${styles.cardExpandPanel} ${expandedCardId === song.id ? styles.cardExpandVisible : ''}`}>
    <div className={styles.expandGrid}>
      <div className={styles.expandItem}><span className={styles.expandLabel}>Latest version</span><span className={styles.expandValue}>{song.latestVersionLabel ?? `v${song.latestVersionNumber}`}</span></div>
      <div className={styles.expandItem}><span className={styles.expandLabel}>Last activity</span><span className={styles.expandValue}>{formatDate(song.updatedAt)}</span></div>
      <div className={styles.expandItem}><span className={styles.expandLabel}>Comments</span><span className={styles.expandValue}>{song.commentCount}</span></div>
      <div className={styles.expandItem}><span className={styles.expandLabel}>Open work</span><span className={styles.expandValue}>{song.openActionsCount > 0 ? `${song.openActionsCount} actions` : 'None'}</span></div>
    </div>
    {/* assign pills, activity snippet — adapt field names to clone-clean Song type */}
  </div>
</div>
```

### 3c. Mobile card meta line — move pill inline

**Before (causes overlap):**
```tsx
<div className={styles.cardTitle}>{song.title}</div>
<div className={styles.pillRow}>
  <span className={styles.pill}>{song.openActionsCount} actions</span>
</div>
<div className={styles.cardMetaPrimary}>Mixing · v2</div>
```

**After (pill on meta line, no overlap):**
```tsx
<div className={styles.cardTitle}>{song.title}</div>
<div className={styles.cardMetaPrimary}>
  {song.stage} · v{song.latestVersionNumber}
  {song.openActionsCount > 0 && (
    <>
      {' · '}
      <span className={styles.metaPill}>
        <span className={styles.metaPillDot} />
        {song.openActionsAssignedToMe > 0
          ? `${song.openActionsAssignedToMe} assigned to me`
          : `${song.openActionsCount} actions`}
      </span>
    </>
  )}
</div>
```

### 3d. Info button — add to all card types as first icon

```tsx
<button
  className={`${styles.iconBtn} ${styles.iconBtnInfo}`}
  title="Info"
  onClick={e => {
    e.stopPropagation();
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setSheetSongId(song.id);
    } else {
      setExpandedCardId(expandedCardId === song.id ? null : song.id);
    }
  }}
>
  {/* ℹ icon svg */}
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2">
    <circle cx="5.5" cy="5.5" r="4.5"/>
    <line x1="5.5" y1="5" x2="5.5" y2="8"/>
    <circle cx="5.5" cy="3.2" r="0.6" fill="currentColor" stroke="none"/>
  </svg>
</button>
```

### 3e. Bottom sheet — add once at bottom of component JSX

```tsx
{/* Mobile bottom sheet — rendered once, populated from sheetSongId */}
{(() => {
  const sheetSong = sheetSongId ? songs.find(s => s.id === sheetSongId) : null;
  return (
    <div
      className={`${styles.bsOverlay} ${sheetSongId ? styles.bsOverlayVisible : ''}`}
      onClick={e => { if (e.target === e.currentTarget) setSheetSongId(null); }}
    >
      <div className={styles.bottomSheet}>
        <div className={styles.bsHandle} onClick={() => setSheetSongId(null)}>
          <div className={styles.bsHandleBar} />
        </div>
        {sheetSong && (
          <>
            <div className={styles.bsHeader}>
              <div className={styles.bsArt} style={sheetSong.image_url ? undefined : { background: 'rgba(255,20,147,0.12)' }}>
                {sheetSong.image_url && <img src={sheetSong.image_url} alt={sheetSong.title} style={{width:'100%',height:'100%',objectFit:'cover'}} />}
              </div>
              <div>
                <p className={styles.bsSongTitle}>{sheetSong.title}</p>
                <p className={styles.bsSub}>{sheetSong.stage} · v{sheetSong.latestVersionNumber}{sheetSong.latestVersionLabel ? ` · ${sheetSong.latestVersionLabel}` : ''}</p>
              </div>
            </div>
            <div className={styles.bsBody}>
              <div className={styles.bsGrid}>
                <div className={styles.bsItem}><span className={styles.bsItemLabel}>Last activity</span><span className={styles.bsItemValue}>{formatDate(sheetSong.updatedAt)}</span></div>
                <div className={styles.bsItem}><span className={styles.bsItemLabel}>Comments</span><span className={styles.bsItemValue}>{sheetSong.commentCount}</span></div>
                <div className={styles.bsItem}><span className={styles.bsItemLabel}>Open work</span><span className={styles.bsItemValue}>{sheetSong.openActionsCount > 0 ? `${sheetSong.openActionsCount} actions` : 'None'}</span></div>
                <div className={styles.bsItem}><span className={styles.bsItemLabel}>Latest version</span><span className={styles.bsItemValue}>{sheetSong.latestVersionLabel ?? `v${sheetSong.latestVersionNumber}`}</span></div>
              </div>
              {/* Assign pills — adapt to clone-clean Song type fields */}
              <div className={styles.bsActivitySnippet}>{sheetSong.latestActivitySnippet}</div>
            </div>
            <button
              className={styles.bsCta}
              onClick={() => { setSheetSongId(null); router.push(`/songs/${sheetSong.id}`); }}
            >
              Open song →
            </button>
          </>
        )}
      </div>
    </div>
  );
})()}
```

---

## 4. Field name notes

The clone-clean `Song` type may use different field names from what's shown above. Before implementing, check the current `Song` type in `page.tsx` and adapt:

| Concept | Main branch name | Clone-clean — check actual field |
|---|---|---|
| Open action count | `song.openActionsCount` | verify |
| Actions assigned to current user | `song.openActionsAssignedToMe` | verify |
| Song stage/status | `song.stage` | may be `song.status` |
| Latest version label | `song.latestVersionLabel` | verify |
| Latest activity snippet | `song.latestActivitySnippet` | may not exist yet — may need API change |

If `latestActivitySnippet` doesn't exist on the Song type, omit that line from the expand panel and bottom sheet for now and log a TODO comment.

---

## 5. Checklist

- [ ] `.card-attention` CSS added
- [ ] `.metaPill` / `.metaPillDot` CSS added
- [ ] `.desktopListCardRow` wrapper added to list card JSX
- [ ] `.cardExpandPanel` / `.cardExpandVisible` CSS added
- [ ] Desktop expand toggle working (icons stay fixed, panel expands below)
- [ ] Mobile meta line: pill moved inline, no title overlap
- [ ] Bottom sheet CSS added
- [ ] Bottom sheet rendered once at end of JSX
- [ ] Info button added as first icon on all card types
- [ ] Attention class applied based on `songNeedsAttention()`
- [ ] `npx tsc --noEmit` passes (excluding `.next/types` errors)
- [ ] `npm run build` passes
- [ ] Tested on mobile viewport (375px): no pill/title overlap
- [ ] Tested on desktop: icons do not move when row expands
