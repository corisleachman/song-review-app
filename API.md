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

### `GET /api/versions/[versionId]`

Returns a workspace-checked version payload.

Notes:
- includes a one-hour signed `audioUrl` for playback when `file_path` exists
- avoids relying on direct public storage URLs for protected audio playback

### `GET /api/dashboard/summary`

Returns a fast first-paint dashboard song list for the active workspace.

Notes:
- loads songs and latest version metadata only
- richer activity, comments, action counts, and assignment state still come from `GET /api/dashboard`
- used by the Dashboard page before background hydration

### `GET /api/dashboard`

Returns the full server-backed dashboard song list with latest version metadata, comment counts, unresolved action counts, activity summaries, assignment state, and `needsAttention`.

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

### `PATCH /api/workspace/settings`

Updates owner-managed settings for the active workspace.

**Body**
```json
{ "name": "Rebel HQ" }
```

**Returns**
```json
{
  "workspace": {
    "id": "uuid",
    "name": "Rebel HQ"
  }
}
```

Notes:
- requires Google sign-in
- requires owner access to the active workspace
- trims empty names and stores at most 80 characters

### `POST /api/workspace/settings`

Uploads the active workspace image. The image is stored in the public `song-images` bucket under `workspace-images/`.

**Body**

Multipart form data:
- `file`: image file, 5MB maximum

**Returns**
```json
{
  "workspace": {
    "id": "uuid",
    "name": "Rebel HQ",
    "imageUrl": "https://..."
  }
}
```

Notes:
- requires Google sign-in
- requires owner access to the active workspace
- requires `accounts.image_url`, added by `migrations/20260503_workspace_images_up.sql`

### `GET /api/settings/summary`

Returns the data needed to render Settings with one canonical identity resolution.

**Returns**
```json
{
  "identity": {
    "displayName": "Coris Leachman",
    "authorName": "Coris",
    "workspaceName": "Rebel HQ",
    "workspaceImageUrl": "https://... or null",
    "membershipRole": "owner"
  },
  "workspace": {
    "plan": "paid"
  },
  "theme": {
    "primary_color": "#ff1493",
    "accent_color": "#a855f7",
    "background_color": "#0d0914"
  },
  "members": [],
  "invites": [],
  "songCount": 5
}
```

Notes:
- replaces the Settings page's previous chain of bootstrap, profile settings, workspace members, invites, and dashboard calls
- `invites` is only populated for workspace owners
- `songCount` is counted directly from `songs`, without loading dashboard activity data

### `GET /api/workspaces`

Returns the workspaces the signed-in user belongs to for the future workspace switcher.

**Returns**
```json
{
  "currentWorkspaceId": "uuid",
  "workspaces": [
    {
      "id": "uuid",
      "name": "Coris Leachman's Workspace",
      "imageUrl": "https://... or null",
      "slug": null,
      "role": "member",
      "plan": "free",
      "songCount": 5,
      "isActive": true,
      "joinedAt": "2026-04-18T15:23:24.620452+00:00",
      "createdAt": "2026-04-18T14:46:06.630682+00:00"
    }
  ]
}
```

Notes:
- uses the canonical authenticated workspace resolver
- returns only workspaces where the current user has a membership
- does not switch workspace; switching is a later route

### `POST /api/workspaces/switch`

Switches the active workspace for the signed-in user.

**Body**
```json
{ "workspaceId": "uuid" }
```

**Returns**
```json
{
  "switched": true,
  "currentWorkspaceId": "uuid",
  "workspace": {
    "id": "uuid",
    "name": "Cat Leachman's Workspace",
    "role": "owner",
    "plan": "free",
    "songCount": 0,
    "isActive": true,
    "joinedAt": "2026-04-18T14:46:06.630682+00:00",
    "createdAt": "2026-04-18T14:46:06.630682+00:00"
  },
  "workspaces": []
}
```

Notes:
- validates that the current user is a member of the requested workspace
- writes the active workspace cookie server-side
- clients should reload canonical reads such as `/api/auth/bootstrap` and `/api/dashboard` after switching

### `POST /api/workspaces/create`

Creates a personal workspace owned by the signed-in user, sets it active, and returns the refreshed workspace list.

**Body**
```json
{ "name": "Cat Leachman's Workspace" }
```

**Returns**
```json
{
  "created": true,
  "currentWorkspaceId": "uuid",
  "workspace": {
    "id": "uuid",
    "name": "Cat Leachman's Workspace",
    "role": "owner",
    "plan": "free",
    "songCount": 0,
    "isActive": true,
    "joinedAt": "2026-05-02T12:00:00.000000+00:00",
    "createdAt": "2026-05-02T12:00:00.000000+00:00"
  },
  "workspaces": []
}
```

Notes:
- intended for users who joined someone else's workspace first and do not yet own one
- returns `409` if the user already owns a workspace
- writes the active workspace cookie server-side

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

### `GET /api/profile/settings`

Reads personal theme settings for the signed-in user.

**Returns**
- saved color settings keyed by auth user id
- legacy color settings as a fallback while data migrates
- or default colors if the user has not saved any yet

### `POST /api/profile/settings`

Saves personal theme settings for the signed-in user.

**Body**
```json
{
  "primary_color": "#ff1493",
  "accent_color": "#a855f7",
  "background_color": "#0d0914"
}
```

### `GET /api/settings`

Compatibility alias for `GET /api/profile/settings`.

Prefer `/api/profile/settings` for new callers.

### `POST /api/settings`

Compatibility alias for `POST /api/profile/settings`.

Prefer `/api/profile/settings` for new callers.

## Email

### `POST /api/email/notify-thread`

Internal route used by thread creation and replies to notify the other collaborator.
