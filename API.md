# API Documentation

Complete endpoint reference for the Song Review App.

## Base URL

```
https://song-review-app.vercel.app/api
```

## Authentication

All endpoints require password verification. The password is stored in a cookie after `/api/auth/verify-password` is called.

Header requirements:
```
Cookie: auth=<verified>
```

## Error Responses

All endpoints return error responses in this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

HTTP status codes:
- `400` - Bad request (missing/invalid parameters)
- `401` - Unauthorized (not authenticated)
- `404` - Not found (resource doesn't exist)
- `500` - Server error

---

## Auth Endpoints

### POST /api/auth/verify-password

Verify the shared password and set authentication cookie.

**Request:**
```json
{
  "password": "further_forever"
}
```

**Response (200):**
```json
{
  "message": "Password verified"
}
```

**Response (400):**
```json
{
  "error": "Incorrect password"
}
```

**Usage:**
```typescript
const response = await fetch('/api/auth/verify-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'further_forever' })
});
```

---

## Song Endpoints

### POST /api/songs/create

Create a new song.

**Request:**
```json
{
  "title": "Just Us"
}
```

**Response (200):**
```json
{
  "songId": "550e8400-e29b-41d4-a716-446655440000",
  "versionId": null,
  "uploadUrl": null
}
```

**Fields:**
- `songId` - ID of created song
- `versionId` - Version ID if file was uploaded (null if no file)
- `uploadUrl` - Signed URL for file upload if file was provided

**Example:**
```typescript
const response = await fetch('/api/songs/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'New Song' })
});
const data = await response.json();
console.log(data.songId); // Use for navigation
```

---

### POST /api/songs/upload-image

Upload a cover image for a song.

**Request (FormData):**
```
songId: "550e8400-e29b-41d4-a716-446655440000"
file: <File object (image)>
```

**Response (200):**
```json
{
  "imageUrl": "https://bucket.supabase.co/song-images/550e8400.../image.jpg"
}
```

**Example:**
```typescript
const formData = new FormData();
formData.append('songId', songId);
formData.append('file', imageFile);

const response = await fetch('/api/songs/upload-image', {
  method: 'POST',
  body: formData
});
const data = await response.json();
console.log(data.imageUrl); // New image URL
```

**Constraints:**
- Must be an image file (jpg, png, gif, webp)
- Max size: 5MB (enforced by Supabase)
- Stored in `song-images` bucket

---

### DELETE /api/songs/[songId]

Delete a song and all related data (versions, threads, comments, actions).

**Request:**
```
DELETE /api/songs/550e8400-e29b-41d4-a716-446655440000
```

**Response (200):**
```json
{
  "message": "Song deleted successfully"
}
```

**Cascade Deletes:**
- All `song_versions` for this song
- All `comment_threads` for all versions
- All `comments` in all threads
- All `actions` linked to this song

**Example:**
```typescript
const response = await fetch(`/api/songs/${songId}`, {
  method: 'DELETE'
});
```

---

## Version Endpoints

### POST /api/versions/create

Create a new version of a song with audio file upload.

**Request (FormData):**
```
songId: "550e8400-e29b-41d4-a716-446655440000"
versionLabel: "v2 - Final Mix"
fileName: "just-us-v2.wav"
fileSize: 5242880
createdBy: "Coris"
```

**Response (200):**
```json
{
  "versionId": "660e8400-e29b-41d4-a716-446655440001",
  "uploadUrl": "https://supabase.co/...",
  "filePath": "songs/550e8400.../version-2/just-us-v2.wav"
}
```

**Fields:**
- `versionId` - ID of created version
- `uploadUrl` - Signed URL to upload file to (valid for 1 hour)
- `filePath` - Final storage path in Supabase

**Example:**
```typescript
// 1. Get upload URL
const response = await fetch('/api/versions/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    songId: songId,
    versionLabel: 'v2 - Final',
    fileName: 'song.wav',
    fileSize: file.size,
    createdBy: 'Coris'
  })
});
const data = await response.json();

// 2. Upload file to signed URL
await fetch(data.uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': 'audio/wav' }
});
```

---

## Thread Endpoints

### POST /api/threads/create

Create a comment thread at a specific timestamp on a version.

**Request:**
```json
{
  "versionId": "660e8400-e29b-41d4-a716-446655440001",
  "timestampSeconds": 45.3,
  "createdBy": "Al",
  "initialComment": "This part needs work"
}
```

**Response (200):**
```json
{
  "threadId": "770e8400-e29b-41d4-a716-446655440002",
  "commentId": "880e8400-e29b-41d4-a716-446655440003"
}
```

**Fields:**
- `threadId` - Created thread ID
- `commentId` - First comment ID

**Triggers:**
- Email sent to other user with deep link
- Deep link format: `/songs/[songId]/versions/[versionId]?threadId=[threadId]`

**Example:**
```typescript
const response = await fetch('/api/threads/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    versionId: versionId,
    timestampSeconds: 45.3,
    createdBy: 'Coris',
    initialComment: 'The reverb here is too much'
  })
});
const data = await response.json();
```

---

### POST /api/threads/reply

Add a reply to an existing comment thread.

**Request:**
```json
{
  "threadId": "770e8400-e29b-41d4-a716-446655440002",
  "author": "Coris",
  "body": "I agree. Let's try a smaller reverb time.",
  "versionId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200):**
```json
{
  "commentId": "990e8400-e29b-41d4-a716-446655440004"
}
```

**Fields:**
- `commentId` - ID of new comment

**Example:**
```typescript
const response = await fetch('/api/threads/reply', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    threadId: threadId,
    author: 'Al',
    body: 'Good idea. What time? 1.5 seconds?',
    versionId: versionId
  })
});
const data = await response.json();
```

---

## Action Endpoints

### POST /api/actions/create

Create an action from a comment (mark comment as actionable).

**Request:**
```json
{
  "songId": "550e8400-e29b-41d4-a716-446655440000",
  "commentId": "880e8400-e29b-41d4-a716-446655440003",
  "description": "Add plate reverb to vocals at 01:05",
  "suggestedBy": "Coris"
}
```

**Response (200):**
```json
{
  "actionId": "aa0e8400-e29b-41d4-a716-446655440005"
}
```

**Fields:**
- `actionId` - ID of created action
- Status defaults to 'pending'

**Example:**
```typescript
const response = await fetch('/api/actions/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    songId: songId,
    commentId: commentId,
    description: 'Fix the vocal reverb',
    suggestedBy: 'Al'
  })
});
const data = await response.json();
```

---

### GET /api/actions/by-song/[songId]

Fetch all actions for a specific song.

**Request:**
```
GET /api/actions/by-song/550e8400-e29b-41d4-a716-446655440000
```

**Response (200):**
```json
[
  {
    "id": "aa0e8400-e29b-41d4-a716-446655440005",
    "song_id": "550e8400-e29b-41d4-a716-446655440000",
    "comment_id": "880e8400-e29b-41d4-a716-446655440003",
    "description": "Add plate reverb to vocals at 01:05",
    "suggested_by": "Coris",
    "status": "pending",
    "created_at": "2026-03-25T11:05:00Z",
    "updated_at": "2026-03-25T11:05:00Z"
  }
]
```

**Query Parameters:**
- `status` (optional) - Filter by 'pending', 'approved', or 'completed'

**Example:**
```typescript
// Get all actions for a song
const response = await fetch(`/api/actions/by-song/${songId}`);
const actions = await response.json();

// Get only pending actions
const response = await fetch(`/api/actions/by-song/${songId}?status=pending`);
const pendingActions = await response.json();
```

---

### PATCH /api/actions/[actionId]

Update an action's status or description.

**Request:**
```json
{
  "status": "completed",
  "description": "Add plate reverb to vocals at 01:05 - DONE"
}
```

**Response (200):**
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440005",
  "status": "completed",
  "description": "Add plate reverb to vocals at 01:05 - DONE",
  "updated_at": "2026-03-25T11:15:00Z"
}
```

**Example:**
```typescript
const response = await fetch(`/api/actions/${actionId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'completed'
  })
});
const updated = await response.json();
```

---

## Settings Endpoints

### GET /api/settings

Load color theme settings for the logged-in user.

**Request:**
```
GET /api/settings
```

**Response (200):**
```json
{
  "id": "bb0e8400-e29b-41d4-a716-446655440006",
  "user_identity": "Coris",
  "primary_color": "#ff1493",
  "accent_color": "#a855f7",
  "background_color": "#0d0914",
  "created_at": "2026-03-25T10:00:00Z",
  "updated_at": "2026-03-25T11:30:00Z"
}
```

**Note:**
- Returns settings for the current logged-in user (from identity context)
- Creates default settings if none exist

**Example:**
```typescript
const response = await fetch('/api/settings');
const settings = await response.json();
console.log(settings.primary_color); // '#ff1493'
```

---

### POST /api/settings

Save or update color theme settings for the logged-in user.

**Request:**
```json
{
  "primary_color": "#ff1493",
  "accent_color": "#a855f7",
  "background_color": "#0d0914"
}
```

**Response (200):**
```json
{
  "id": "bb0e8400-e29b-41d4-a716-446655440006",
  "user_identity": "Coris",
  "primary_color": "#ff1493",
  "accent_color": "#a855f7",
  "background_color": "#0d0914",
  "updated_at": "2026-03-25T12:00:00Z"
}
```

**Validation:**
- Colors must be valid hex codes (#RRGGBB)
- Stored per user (Coris and Al have separate settings)
- Upserts (creates or updates)

**Example:**
```typescript
const response = await fetch('/api/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    primary_color: '#00d4ff',
    accent_color: '#a855f7',
    background_color: '#0d0914'
  })
});
const saved = await response.json();
```

---

## Email Endpoints

### POST /api/email/notify-thread

Send email notification when a thread is created (internal use, called automatically).

**Request:**
```json
{
  "toEmail": "furthertcb@gmail.com",
  "songTitle": "Just Us",
  "versionLabel": "v1",
  "timestamp": "01:05",
  "initialComment": "The vocal here needs work",
  "createdBy": "Coris",
  "deepLink": "https://song-review-app.vercel.app/songs/550e.../versions/660e...?threadId=770e..."
}
```

**Response (200):**
```json
{
  "message": "Email sent successfully"
}
```

**Note:**
- Automatically called when thread is created
- Sends to the OTHER user (not the thread creator)
- Uses Resend API

---

## Common Patterns

### Create Song → Upload Version → Add Comments

```typescript
// 1. Create song
const songRes = await fetch('/api/songs/create', {
  method: 'POST',
  body: JSON.stringify({ title: 'New Song' })
});
const { songId } = await songRes.json();

// 2. Create version (get upload URL)
const versionRes = await fetch('/api/versions/create', {
  method: 'POST',
  body: JSON.stringify({
    songId,
    versionLabel: 'Demo',
    fileName: 'audio.wav',
    fileSize: audioFile.size,
    createdBy: 'Coris'
  })
});
const { versionId, uploadUrl } = await versionRes.json();

// 3. Upload audio file
await fetch(uploadUrl, {
  method: 'PUT',
  body: audioFile
});

// 4. Create thread and comment
const threadRes = await fetch('/api/threads/create', {
  method: 'POST',
  body: JSON.stringify({
    versionId,
    timestampSeconds: 45.3,
    createdBy: 'Coris',
    initialComment: 'Needs more bass'
  })
});
const { threadId } = await threadRes.json();

// 5. Reply to thread
const replyRes = await fetch('/api/threads/reply', {
  method: 'POST',
  body: JSON.stringify({
    threadId,
    author: 'Al',
    body: 'Agreed. Let me boost the low end.',
    versionId
  })
});

// 6. Mark as action
const actionRes = await fetch('/api/actions/create', {
  method: 'POST',
  body: JSON.stringify({
    songId,
    commentId: replyRes.commentId,
    description: 'Boost low end frequencies',
    suggestedBy: 'Coris'
  })
});
```

---

## Rate Limiting

No official rate limiting, but be respectful of Supabase quotas:
- Free tier: 50K requests/month
- Each operation uses ~1 request (or 2-3 for complex operations)

---

## Status Codes Reference

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Missing/invalid parameters |
| 404 | Not Found | Song/thread/action doesn't exist |
| 500 | Server Error | Database error, Supabase down |

---

Last updated: March 2026
