# API Reference — Song Review App

All routes are Next.js API routes under `app/api/`.

---

## Auth

### `POST /api/auth/verify-password`
**Body:** `{ password: string }`  
**Returns:** `{ success: true }` or 401

---

## Songs

### `POST /api/songs/create`
**Body:** `{ title: string }`  
**Returns:** `{ song: { id, title, ... } }`

### `POST /api/songs/upload-image`
**Body:** FormData — `songId`, `file`  
**Returns:** `{ imageUrl: string }` (public URL)  
**Note:** Uses service role key server-side. Updates `songs.image_url`.

### `DELETE /api/songs/[songId]`
Deletes song and cascades to versions, threads, comments, actions, tasks.

---

## Versions

### `POST /api/versions/create`
**Body:** `{ songId, label?, fileName, fileSize, createdBy }`  
**Returns:** `{ version: {...}, uploadUrl: string }` (signed upload URL, PUT to it directly)

### `PATCH /api/versions/[versionId]`
**Body:** `{ label: string | null }`  
**Returns:** `{ version: {...} }`  
Used by inline version label editing (double-click badge in hero).

---

## Threads & Comments

### `POST /api/threads/create`
**Body:** `{ versionId, songId, timestamp, author, commentText }`  
**Note:** `timestamp` is Math.round()'d to INTEGER before insert.  
**Returns:** `{ threadId: string }`  
Also triggers email notification to the other user.

### `POST /api/threads/reply`
**Body:** `{ threadId, songId, text, author }`  
**Returns:** `{ comment: {...} }`

---

## Actions

### `POST /api/actions/create`
**Body:** `{ songId, commentId?, description, suggestedBy }`  
**Returns:** `{ action: {...} }`

### `GET /api/actions/by-song/[songId]?versionId=[id]`
Returns actions for a song. Filters by versionId in JS (Supabase JS can't filter on joined columns).  
**Returns:** `{ actions: [...] }`

### `PATCH /api/actions/[actionId]`
**Body:** `{ status: 'pending' | 'approved' | 'completed' }`  
**Returns:** `{ action: {...} }`

---

## Tasks (Song Admin)

### `POST /api/tasks/create`
**Body:** `{ songId, description }`  
**Returns:** `{ task: {...} }`

### `PATCH /api/tasks/[taskId]`
**Body:** `{ description?, status? }`  
**Returns:** `{ task: {...} }`

### `DELETE /api/tasks/[taskId]`
**Returns:** `{ success: true }`

### `PATCH /api/tasks/reorder`
**Body:** `{ orderedIds: string[] }` — array of task IDs in new order  
Updates `sort_order` on each task.

---

## Settings

### `GET /api/settings?identity=Coris|Al`
Returns colour theme for user.  
**Returns:** `{ settings: { primary_color, accent_color, background_color } | null }`

### `POST /api/settings`
**Body:** `{ identity, primary_color, accent_color, background_color }`  
Upserts settings for user.

---

## Email

### `POST /api/email/notify-thread`
Called automatically by `threads/create` and `threads/reply`.  
Sends email to the OTHER user (not the author).  
**Body:** `{ songId, versionId, threadId, author, songTitle, versionLabel, timestamp, commentExcerpt }`
