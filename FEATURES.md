# Features & User Flows

Complete guide to using all features of the Song Review App.

## Overview

The Song Review App is designed for two collaborators (Coris and Al) to:
1. Upload and manage song versions
2. Leave timestamped feedback on audio
3. Have threaded discussions
4. Track actionable items
5. Customize the app's appearance

## Authentication Flow

### 1. Password Gate

**Entry:** `/` (login page)

Users must enter the shared password: `further_forever`

```
[Password Input] → Verify → Set Auth Cookie → Redirect to /identify
```

**Technical Details:**
- Password verified in `/api/auth/verify-password`
- Cookie stores authentication state
- Protected routes check for valid cookie

---

### 2. Identity Picker

**Entry:** `/identify`

After password verification, user selects their identity: **Coris** or **Al**

```
[Select Avatar] → Coris (🎹) or Al (🎤) → Set Identity → Redirect to /dashboard
```

**Why Identity Matters:**
- Identifies who created/suggested items
- Loads user-specific color theme settings
- Emails sent to the OTHER user

**Storage:**
- Stored in browser context (`lib/auth.ts`)
- Persists across page reloads (via localStorage)
- Can change identity by returning to `/identify`

---

## Core Workflows

## Feature 1: Song Management

### Create Song

**Entry:** Dashboard → "+ NEW SONG" button

```
[Modal: Enter Title] → POST /api/songs/create → Redirect to Song Page
```

**What Happens:**
1. User clicks "+ NEW SONG"
2. Modal appears asking for song title
3. Title validated (required)
4. POST to `/api/songs/create`
5. New song created in database
6. User redirected to `/songs/[id]` (or versions page if no version)

**DB Changes:**
- Insert row in `songs` table
- Columns: id, title, created_at, updated_at

---

### Upload Cover Art

**Entry:** Dashboard → Song Card → Image Icon

```
[Select File] → Upload to Supabase → Update song.image_url → Display on Card
```

**What Happens:**
1. User clicks image icon on song card
2. File input (hidden) triggers
3. Image file selected by user
4. FormData sent to `/api/songs/upload-image`
5. File uploaded to `song-images` bucket in Supabase Storage
6. URL returned and saved to `songs.image_url`
7. Thumbnail refreshes on dashboard

**Storage:**
- Bucket: `song-images` (public)
- Path: `[songId]/[filename]`
- File types: jpg, png, gif, webp
- Max size: 5MB

**DB Changes:**
- Update `songs.image_url` with public URL

---

### Edit Song Title

**Entry:** Dashboard → Song Card → Pencil Icon

```
[Click Pencil] → Navigate to /songs/[id] → (Future: Inline edit)
```

**Current Behavior:**
- Pencil icon navigates to song detail page
- Allows user to view all versions
- Title editing not yet implemented (placeholder)

---

### Delete Song

**Entry:** Dashboard → Song Card → Trash Icon

```
[Click Trash] → Confirm Dialog → DELETE /api/songs/[id] → Cascade Delete
```

**What Happens:**
1. User clicks trash icon
2. Confirmation dialog: "Delete '[Title]'? This cannot be undone."
3. If confirmed:
   - DELETE request sent to `/api/songs/[songId]`
   - Database cascades: Deletes song, all versions, threads, comments, actions
   - Dashboard refreshes
   - User sees song removed from list

**Cascade Deletes:**
```
songs → song_versions → comment_threads → comments
      → actions
```

**DB Changes:**
- Delete from `songs`
- Orphan deletion cascades through all related tables

---

## Feature 2: Audio Upload & Versioning

### Create Version (Upload Audio)

**Entry:** Song Detail → File Upload or Create Version Modal

```
[Select Audio File] → POST /api/versions/create → Get Signed URL → Upload to Storage
```

**What Happens:**
1. User clicks upload on song detail page
2. File input triggers (audio only)
3. File selected by user
4. Request to `/api/versions/create` with:
   - songId
   - versionLabel (e.g., "Demo", "v2 - Final")
   - fileName
   - fileSize
   - createdBy (Coris or Al)
5. API returns signed upload URL
6. File uploaded directly to Supabase Storage (PUT request)
7. Version created in database
8. Waveform player loads the new version

**Storage:**
- Bucket: `song-files` (public)
- Path: `songs/[songId]/version-[num]/[filename]`
- File types: audio/* (wav, mp3, m4a, etc.)

**DB Changes:**
- Insert row in `song_versions`
- Columns: id, song_id, version_number, label, file_path, file_name, created_by, created_at, updated_at

**Version Numbering:**
- Increments automatically (1, 2, 3...)
- Allows multiple takes/edits of the same song

---

### View All Versions

**Entry:** Song Detail Page → Version Selector Dropdown

```
[Click Version Dropdown] → List All Versions → Select Version → Load Waveform
```

**What Happens:**
1. Song detail page loads all `song_versions` for this song
2. Dropdown shows all versions with labels and counts
3. User selects a version
4. WaveSurfer.js loads the audio file
5. All comment threads for this version display as markers

---

## Feature 3: Waveform & Comments

### Waveform Player (WaveSurfer.js)

**Display:** `/songs/[id]/versions/[versionId]`

```
[Waveform Visualization] ← WaveSurfer.js v7
  ├─ Click to seek
  ├─ Play/Pause buttons
  ├─ Time display (current / duration)
  └─ Color-coded comment markers
```

**Features:**
- Visual audio waveform
- Click anywhere to create comment thread
- Colored circular markers show comment locations
- Hover shows timestamp
- Color palette: `['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a', '#98d8c8', '#f7dc6f', '#bb8fce']`
- Each thread gets a random color

**Interaction:**
- Click on waveform → Creates thread at timestamp
- Scroll horizontally → Pan across timeline
- Drag bottom right corner → Zoom in/out
- Play button → Stream audio

---

### Create Comment Thread

**Entry:** Waveform → Click at timestamp

```
[Click Waveform] → Modal: Enter Initial Comment → POST /api/threads/create
```

**What Happens:**
1. User clicks on waveform
2. Timestamp captured (in seconds with 1 decimal precision)
3. Modal appears asking for initial comment
4. User types comment and submits
5. POST to `/api/threads/create` with:
   - versionId
   - timestampSeconds (float)
   - createdBy
   - initialComment
6. Thread created, marker added to waveform
7. Email sent to other user with deep link
8. Comments list scrolls to new thread

**Timestamp Format:**
- Stored as: 45.3 (seconds)
- Displayed as: "00:45.300" (MM:SS.ms)
- Allows precise feedback on specific moments

**Email:**
- Sent to other user (not creator)
- Deep link: `/songs/[id]/versions/[versionId]?threadId=[threadId]`
- Deep link auto-navigates to thread and seeks waveform to timestamp

---

### Reply to Comment Thread

**Entry:** Comment Thread → Reply Input

```
[Comment Card] → [Reply Input] → POST /api/threads/reply → Comment Added
```

**What Happens:**
1. User reads comment thread
2. Clicks reply or starts typing in reply box
3. Types response and submits
4. POST to `/api/threads/reply` with:
   - threadId
   - author
   - body
   - versionId
5. Comment added to thread
6. Comments list updates
7. No email sent (only on thread creation)

**UI:**
- Comments displayed in order (earliest first)
- Author shown with timestamp
- Reply box at bottom of thread
- "Mark as Action" button on each comment

---

### Mark Comment as Action

**Entry:** Comment → "Mark as Action" Button

```
[Comment Card] → [Mark as Action Button] → Modal: Edit Description → POST /api/actions/create
```

**What Happens:**
1. User clicks "Mark as Action" on a comment
2. Modal appears with action description pre-filled from comment text
3. User can edit description if needed
4. Submit button creates action
5. POST to `/api/actions/create` with:
   - songId
   - commentId
   - description
   - suggestedBy
6. Action created with status='pending'
7. Action appears in dashboard Actions panel
8. Modal closes

**Action Status:**
- New actions default to 'pending'
- Can toggle between 'pending' and 'completed'
- Completed actions show a checkmark

---

## Feature 4: Action Tracking

### Dashboard Actions Panel

**Display:** Right side of `/dashboard`

```
[Actions Panel]
  ├─ Filter Buttons: ALL | PENDING | COMPLETED
  ├─ Actions by Song
  │   ├─ Song Name (collapsible)
  │   │   ├─ Action 1 (status indicator)
  │   │   ├─ Action 2
  │   │   └─ Action 3
  │   └─ Song Name
  │       └─ Action 1
  └─ Empty State: "No actions yet..."
```

**Features:**
- **Filter by Status:** ALL, PENDING, COMPLETED
- **Grouped by Song:** See all actions for each song
- **Action Count Badge:** Number of actions per song
- **Toggle Status:** Click circle (○/✓) to toggle pending ↔ completed
- **Mobile Tab:** On mobile, switch to Actions tab to view

---

### Create Action

See "Mark Comment as Action" above.

**Alternative:** Create action directly without comment (future feature)

---

### Update Action Status

**Entry:** Actions Panel → Action Circle

```
[Click Status Circle] → PATCH /api/actions/[id] → Toggle Status
```

**What Happens:**
1. User clicks the status circle (○ or ✓) on an action
2. Circle indicator toggles
3. PATCH request updates status in database
4. UI updates immediately (optimistic update)

**Status Transition:**
```
pending ← → completed
  ↑          ↓
  └──────────┘
```

---

### View Action Details

**Entry:** Actions Panel → Click Action

```
[Click Action] → Show Full Description → Option to Link to Version
```

**Features:**
- Full action description
- Suggested by (creator)
- Created date
- Current status
- Optional: Link to the comment/thread (future)

---

## Feature 5: Color Customization

### Access Settings

**Entry:** Header → "⚙️ SETTINGS" Button

```
[Click SETTINGS] → Navigate to /settings
```

---

### View Color Picker

**Display:** `/settings`

```
[Settings Page]
  ├─ Color Picker Controls
  │   ├─ Primary Color (Hot Pink)
  │   │   ├─ Color Input (visual picker)
  │   │   └─ Hex Code Input
  │   ├─ Accent Color (Purple)
  │   │   └─ Color Input + Hex
  │   └─ Background Color (Dark)
  │       └─ Color Input + Hex
  ├─ Color Presets
  │   ├─ PULSE (default)
  │   ├─ OCEAN
  │   ├─ SUNSET
  │   ├─ FOREST
  │   ├─ PURPLE
  │   └─ ROSE
  ├─ Action Buttons
  │   ├─ Save Theme
  │   └─ Reset to Defaults
  └─ Live Preview (entire page changes color)
```

---

### Customize Colors

**Workflow:**

1. **Change Primary Color:**
   - Click color box or type hex code
   - Page colors update LIVE
   - Primary color appears in: buttons, accents, highlights

2. **Change Accent Color:**
   - Same as primary
   - Appears in: secondary buttons, borders

3. **Change Background Color:**
   - Same as primary
   - Appears in: page background, card backgrounds

4. **Use Presets:**
   - Click preset button (PULSE, OCEAN, etc.)
   - All three colors update instantly
   - Live preview shows new theme

---

### Save Theme

**Workflow:**

```
[After Customizing] → Click "Save Theme" → POST /api/settings → Persisted to DB
```

**What Happens:**
1. User makes color changes and sees live preview
2. Clicks "Save Theme" button
3. POST to `/api/settings` with:
   - primary_color
   - accent_color
   - background_color
4. Settings saved to database
5. User sees confirmation
6. Colors persist when user logs out/back in

**Per-User Storage:**
- Each user (Coris/Al) has separate saved colors
- Loading settings on dashboard automatically applies saved colors
- Settings loaded on app startup

---

### Reset to Defaults

**Workflow:**

```
[Click Reset Button] → Colors revert to defaults → Ask to save
```

**Default Colors:**
- Primary: #ff1493 (Hot Pink)
- Accent: #a855f7 (Purple)
- Background: #0d0914 (Deep Dark)

---

## Feature 6: Mobile Experience

### Mobile Layout (< 768px)

**Header:**
```
[🎵 Song Review] [Identity] [⚙️ SETTINGS]
```

**Tab Navigation:**
```
[🎵 Songs Tab] [📋 Actions Tab]
```

**Content Area:**
- Single column
- Full width
- One panel visible at a time
- Smooth tab switching

---

### Songs Tab (Mobile)

**Display:**
```
[Tab Header: 🎵 Songs]
  ├─ [+ NEW SONG Button]
  └─ [Song List]
      ├─ Song Card (full width)
      ├─ Song Card
      └─ Song Card (scrollable)
```

**Interaction:**
- Tap song card to view waveform
- Tap pencil to edit (navigation)
- Tap trash to delete
- Tap image icon to upload cover

---

### Actions Tab (Mobile)

**Display:**
```
[Tab Header: 📋 Actions]
  ├─ [Filter Buttons: ALL | PENDING | COMPLETED]
  └─ [Actions List]
      ├─ Song Group
      │   ├─ Action 1
      │   └─ Action 2
      └─ Song Group (scrollable)
```

**Interaction:**
- Tap filter buttons to change view
- Tap action to see details
- Tap status circle to toggle

---

### Waveform on Mobile

**Display:**
```
[Waveform Player]
  ├─ Play/Pause Button
  ├─ Waveform (swipeable, horizontally scrollable)
  ├─ Time Display
  └─ Version Selector
```

**Interaction:**
- Tap waveform to seek
- Swipe left/right to pan
- Two-finger pinch to zoom (if supported)
- Tap comment marker to jump to thread

---

## Keyboard Navigation (Future)

**Planned Features:**
- Arrow keys to navigate songs
- Space to play/pause waveform
- Enter to create comment
- Tab to navigate between threads
- Escape to close modals

---

## Deep Link Sharing

### Email Deep Links

When a comment thread is created, email contains a link like:

```
https://song-review-app.vercel.app/songs/550e8400.../versions/660e...?threadId=770e...
```

**What Happens When Clicked:**
1. User logs in (if needed)
2. App navigates to `/songs/[id]/versions/[versionId]`
3. Waveform loads
4. URL parameter `threadId` triggers:
   - Find thread by ID
   - Extract timestamp from thread
   - Scroll comments to that thread
   - Seek waveform to timestamp
   - Highlight thread in blue
5. User sees exactly where feedback was left

---

## Error Handling

### Common Errors & Recovery

| Error | Cause | Solution |
|-------|-------|----------|
| "Password not working on mobile" | Cache issue | Clear browser cache, try incognito |
| "Songs not loading" | Supabase connection | Check internet, restart browser |
| "File upload fails" | File too large or wrong type | Check file size < 5MB, use supported format |
| "Comment not saving" | Network timeout | Try again, check internet connection |
| "Email not received" | Resend API issue | Check email spam folder, verify email address |
| "Colors not saving" | DB error | Try refreshing, contact support |

---

## Accessibility Features

- ✅ Keyboard navigation support
- ✅ High contrast colors
- ✅ Clear button labels
- ✅ Focus indicators (browser default)
- ✅ Semantic HTML structure
- ⏳ Aria labels (coming soon)
- ⏳ Screen reader testing (coming soon)

---

## Performance Considerations

- **Lazy Loading:** Waveforms load on demand
- **Pagination:** Comments load with initial thread (could paginate on long threads)
- **Caching:** Supabase client caches queries automatically
- **Image Optimization:** Cover art is served from Supabase (CDN)
- **Code Splitting:** Next.js automatically splits routes

---

Last updated: March 2026
