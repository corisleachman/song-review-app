# API Reference — Song Review App

All routes live under `app/api/`.

## Auth

### `POST /api/auth/verify-password`

**Body**
```json
{ "password": "string" }
```

**Returns**
- `200` with `{ "success": true }`
- `401` on invalid password

## Songs

### `POST /api/songs/create`

**Body**
```json
{ "title": "string" }
```

**Returns**
```json
{ "songId": "uuid" }
```

### `POST /api/songs/upload-image`

Multipart upload for song artwork.

**FormData**
- `songId`
- `file`

**Returns**
```json
{ "imageUrl": "https://..." }
```

### `DELETE /api/songs/[songId]`

Deletes the song and related versions, threads, comments, actions, and tasks.

## Versions

### `POST /api/versions/create`

Creates the DB record and signed upload URL for direct storage upload.

**Body**
```json
{
  "songId": "uuid",
  "fileName": "mix-v2.wav",
  "fileSize": 123456,
  "label": "Rough mix",
  "notes": "New vocal comp and brighter snare"
}
```

**Returns**
```json
{
  "versionId": "uuid",
  "uploadUrl": "https://...",
  "filePath": "songs/.../v2/..."
}
```

### `PATCH /api/versions/[versionId]`

**Body**
```json
{ "label": "string or null", "notes": "string or null" }
```

### `GET /api/dashboard`

Returns the server-backed dashboard song list with latest version metadata, comment counts, unresolved action counts, and `needsAttention`.

### `PATCH /api/songs/[songId]`

**Body**
```json
{ "title": "optional", "status": "optional" }
```

Notes:
- valid song statuses are `writing`, `in_progress`, `mixing`, `mastering`, `finished`

## Threads

### `POST /api/threads/create`

**Body**
```json
{
  "versionId": "uuid",
  "songId": "uuid",
  "timestamp": 65,
  "author": "Al",
  "commentText": "The vocal here needs more space"
}
```

Notes:
- timestamps should be rounded before insert because the thread table stores integer seconds
- this route also triggers email notification to the other collaborator

**Returns**
```json
{ "threadId": "uuid" }
```

### `POST /api/threads/reply`

**Body**
```json
{
  "threadId": "uuid",
  "songId": "uuid",
  "versionId": "uuid",
  "author": "Coris",
  "text": "Agreed"
}
```

**Returns**
```json
{ "commentId": "uuid" }
```

## Actions

### `POST /api/actions/create`

**Body**
```json
{
  "commentId": "uuid",
  "songId": "uuid",
  "description": "Add plate reverb to chorus",
  "timestampSeconds": 65,
  "status": "in_progress",
  "assignedToUserId": "uuid-or-null"
}
```

Notes:
- `status` is optional and defaults to `open`
- `timestampSeconds` is optional and rounded before storage when present
- `assignedToUserId` is optional and may be `null`

### `GET /api/actions/by-song/[songId]?versionId=[id]`

Returns song actions. Some filtering still happens in JS due to Supabase joined-column limitations.

### `GET /api/workspace/members`

Returns the current workspace collaborators for assignment UIs.

### `PATCH /api/actions/[actionId]`

**Body**
```json
{
  "status": "done",
  "description": "Tighten the second harmony in verse 2",
  "assignedToUserId": "uuid-or-null",
  "resolvedInVersionId": "uuid-or-null"
}
```

Notes:
- send either field or both
- valid statuses are `open`, `in_progress`, `done`
- setting `resolvedInVersionId` also makes the action `done`

## Tasks

### `POST /api/tasks/create`

**Body**
```json
{ "songId": "uuid", "description": "Check final master levels" }
```

### `PATCH /api/tasks/[taskId]`

**Body**
```json
{ "description": "optional", "status": "optional" }
```

### `DELETE /api/tasks/[taskId]`

**Returns**
```json
{ "success": true }
```

### `PATCH /api/tasks/reorder`

**Body**
```json
{ "orderedIds": ["task-1", "task-2", "task-3"] }
```

## Settings

### `GET /api/settings`

Reads current-user theme settings from the identity cookie.

**Returns**
- saved color settings for the active identity
- or default colors if that user has not saved any yet

### `POST /api/settings`

Saves theme settings for the current cookie identity.

**Body**
```json
{
  "primary_color": "#ff1493",
  "accent_color": "#a855f7",
  "background_color": "#0d0914"
}
```

## Email

### `POST /api/email/notify-thread`

Internal route used by thread creation and replies to notify the other collaborator.
