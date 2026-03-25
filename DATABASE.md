# Database Documentation

Complete schema and relationships for the Song Review App.

## Overview

The database uses Supabase (PostgreSQL) with 6 tables:
- `songs` - Song catalog
- `song_versions` - Audio files and versions
- `comment_threads` - Timestamped comment locations
- `comments` - Individual comment replies
- `actions` - Workflow/task tracking
- `settings` - User color preferences

## Tables

### 1. songs

Core song catalog with optional cover art.

```sql
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_songs_created_at ON songs(created_at DESC);
```

**Fields:**
- `id` (UUID) - Unique identifier
- `title` (TEXT) - Song name (required)
- `image_url` (TEXT) - URL to cover art in Supabase Storage
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last modified timestamp

**Relationships:**
- Has many `song_versions`
- Has many `comment_threads` (through `song_versions`)
- Has many `actions` (via `song_id`)

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Just Us",
  "image_url": "https://bucket.supabase.co/song-images/550e8400.../image.jpg",
  "created_at": "2026-03-25T10:30:00Z",
  "updated_at": "2026-03-25T11:45:00Z"
}
```

---

### 2. song_versions

Audio file versions for each song with metadata.

```sql
CREATE TABLE song_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  label TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK (created_by IN ('Coris', 'Al')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_song_versions_song_id ON song_versions(song_id);
CREATE INDEX idx_song_versions_created_at ON song_versions(created_at DESC);
```

**Fields:**
- `id` (UUID) - Unique identifier
- `song_id` (UUID FK) - References `songs.id`
- `version_number` (INTEGER) - 1, 2, 3... (incremental)
- `label` (TEXT) - Human-readable label (e.g., "Demo", "v2 - Final")
- `file_path` (TEXT) - Storage path: `songs/[songId]/version-[num]/[filename]`
- `file_name` (TEXT) - Original filename
- `created_by` (TEXT) - 'Coris' or 'Al' (enforced via CHECK)
- `created_at` (TIMESTAMP) - Upload timestamp
- `updated_at` (TIMESTAMP) - Last modified timestamp

**Relationships:**
- Belongs to `songs`
- Has many `comment_threads`

**Example:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "song_id": "550e8400-e29b-41d4-a716-446655440000",
  "version_number": 1,
  "label": "Demo - Initial",
  "file_path": "songs/550e8400.../version-1/just-us-demo.wav",
  "file_name": "just-us-demo.wav",
  "created_by": "Coris",
  "created_at": "2026-03-25T10:30:00Z",
  "updated_at": "2026-03-25T10:30:00Z"
}
```

---

### 3. comment_threads

Timestamped thread anchors on the waveform.

```sql
CREATE TABLE comment_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_version_id UUID NOT NULL REFERENCES song_versions(id) ON DELETE CASCADE,
  timestamp_seconds FLOAT NOT NULL,
  created_by TEXT NOT NULL CHECK (created_by IN ('Coris', 'Al')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comment_threads_version_id ON comment_threads(song_version_id);
CREATE INDEX idx_comment_threads_timestamp ON comment_threads(timestamp_seconds);
```

**Fields:**
- `id` (UUID) - Unique identifier
- `song_version_id` (UUID FK) - References `song_versions.id`
- `timestamp_seconds` (FLOAT) - Position in audio (e.g., 45.3 = 45.3 seconds)
- `created_by` (TEXT) - 'Coris' or 'Al' (thread creator)
- `created_at` (TIMESTAMP) - Creation time
- `updated_at` (TIMESTAMP) - Last modified

**Relationships:**
- Belongs to `song_versions`
- Has many `comments`

**Storage Format:**
- Stored as seconds (float) for precision
- Displayed as "MM:SS.ms" in UI (e.g., "01:05.300")
- Allows replay to exact moment when following deep link

**Example:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "song_version_id": "660e8400-e29b-41d4-a716-446655440001",
  "timestamp_seconds": 65.3,
  "created_by": "Al",
  "created_at": "2026-03-25T11:00:00Z",
  "updated_at": "2026-03-25T11:00:00Z"
}
```

---

### 4. comments

Individual replies within a comment thread.

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES comment_threads(id) ON DELETE CASCADE,
  author TEXT NOT NULL CHECK (author IN ('Coris', 'Al')),
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_thread_id ON comments(thread_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);
```

**Fields:**
- `id` (UUID) - Unique identifier
- `thread_id` (UUID FK) - References `comment_threads.id`
- `author` (TEXT) - 'Coris' or 'Al' (comment writer)
- `body` (TEXT) - Comment text (supports markdown)
- `created_at` (TIMESTAMP) - Creation time

**Relationships:**
- Belongs to `comment_threads`
- Can be referenced by `actions` (if marked as action)

**Example:**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "thread_id": "770e8400-e29b-41d4-a716-446655440002",
  "author": "Coris",
  "body": "The vocal here needs more reverb. Let's try doubling with a plate reverb.",
  "created_at": "2026-03-25T11:05:00Z"
}
```

---

### 5. actions

Workflow/task tracking system. Comments can be converted to actions.

```sql
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  suggested_by TEXT NOT NULL CHECK (suggested_by IN ('Coris', 'Al')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_actions_song_id ON actions(song_id);
CREATE INDEX idx_actions_status ON actions(status);
CREATE INDEX idx_actions_comment_id ON actions(comment_id);
CREATE INDEX idx_actions_created_at ON actions(created_at DESC);
```

**Fields:**
- `id` (UUID) - Unique identifier
- `song_id` (UUID FK) - References `songs.id` (required for dashboard grouping)
- `comment_id` (UUID FK) - References `comments.id` (optional, nullable)
- `description` (TEXT) - Action summary (user can edit)
- `suggested_by` (TEXT) - 'Coris' or 'Al' (who created the action)
- `status` (TEXT) - 'pending' | 'approved' | 'completed' (default: 'pending')
- `created_at` (TIMESTAMP) - Creation time
- `updated_at` (TIMESTAMP) - Last modified

**Status Workflow:**
```
pending → approved → completed
  ↑                      ↓
  └──────────────────────┘
     (can toggle back)
```

**Relationships:**
- Belongs to `songs`
- Optionally belongs to `comments`

**Example:**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "song_id": "550e8400-e29b-41d4-a716-446655440000",
  "comment_id": "880e8400-e29b-41d4-a716-446655440003",
  "description": "Add plate reverb to vocals at 01:05",
  "suggested_by": "Coris",
  "status": "pending",
  "created_at": "2026-03-25T11:05:00Z",
  "updated_at": "2026-03-25T11:05:00Z"
}
```

---

### 6. settings

Per-user color theme preferences.

```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identity TEXT NOT NULL UNIQUE CHECK (user_identity IN ('Coris', 'Al')),
  primary_color TEXT NOT NULL DEFAULT '#ff1493',
  accent_color TEXT NOT NULL DEFAULT '#a855f7',
  background_color TEXT NOT NULL DEFAULT '#0d0914',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_settings_user_identity ON settings(user_identity);
```

**Fields:**
- `id` (UUID) - Unique identifier
- `user_identity` (TEXT) - 'Coris' or 'Al' (UNIQUE, one per user)
- `primary_color` (TEXT) - Hex color (e.g., '#ff1493')
- `accent_color` (TEXT) - Hex color (e.g., '#a855f7')
- `background_color` (TEXT) - Hex color (e.g., '#0d0914')
- `created_at` (TIMESTAMP) - First saved
- `updated_at` (TIMESTAMP) - Last modified

**How It Works:**
- Settings are loaded on dashboard mount
- CSS variables are updated: `--color-primary`, `--color-accent`, `--color-bg-darkest`
- Changes are live-previewed on color picker
- Saved to DB when user clicks "Save Theme"
- Each user (Coris/Al) has separate settings

**Example:**
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440005",
  "user_identity": "Coris",
  "primary_color": "#ff1493",
  "accent_color": "#a855f7",
  "background_color": "#0d0914",
  "created_at": "2026-03-25T10:00:00Z",
  "updated_at": "2026-03-25T11:30:00Z"
}
```

---

## Relationships Diagram

```
songs (1) ──────── (many) song_versions
  │                            │
  │                            ├──── (many) comment_threads
  │                            │                │
  │                            │                └──── (many) comments
  │                            │                           │
  └────────────────────────────┴───────────────────────────┘
           (many) actions
```

**Cascade Delete:**
- Delete song → deletes all versions, threads, comments, actions
- Delete version → deletes all threads, comments
- Delete thread → deletes all comments
- Delete comment → action stays but `comment_id` becomes NULL

---

## Constraints

### Data Validation

All user identity fields enforce a CHECK constraint:

```sql
CHECK (field IN ('Coris', 'Al'))
```

This applies to:
- `song_versions.created_by`
- `comment_threads.created_by`
- `comments.author`
- `actions.suggested_by`
- `settings.user_identity` (also UNIQUE)

### Foreign Keys

```sql
song_versions.song_id → songs.id (CASCADE DELETE)
comment_threads.song_version_id → song_versions.id (CASCADE DELETE)
comments.thread_id → comment_threads.id (CASCADE DELETE)
actions.song_id → songs.id (CASCADE DELETE)
actions.comment_id → comments.id (SET NULL)
settings.user_identity → implicit (UNIQUE constraint)
```

---

## Indexes

Indexes optimize common queries:

| Table | Index | Purpose |
|-------|-------|---------|
| songs | created_at DESC | Sorting songs by newest |
| song_versions | song_id | Finding versions for a song |
| song_versions | created_at DESC | Recent uploads |
| comment_threads | song_version_id | Finding threads for version |
| comment_threads | timestamp_seconds | Sorting threads by position |
| comments | thread_id | Finding comments in thread |
| comments | created_at | Sorting comments by time |
| actions | song_id | Dashboard action grouping |
| actions | status | Filter pending/completed |
| actions | comment_id | Linking comment to action |
| actions | created_at DESC | Recent actions |
| settings | user_identity | Load user settings |

---

## Setup SQL

Run these in Supabase SQL Editor to create all tables:

```sql
-- Songs
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_songs_created_at ON songs(created_at DESC);

-- Song Versions
CREATE TABLE song_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  label TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK (created_by IN ('Coris', 'Al')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_song_versions_song_id ON song_versions(song_id);
CREATE INDEX idx_song_versions_created_at ON song_versions(created_at DESC);

-- Comment Threads
CREATE TABLE comment_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_version_id UUID NOT NULL REFERENCES song_versions(id) ON DELETE CASCADE,
  timestamp_seconds FLOAT NOT NULL,
  created_by TEXT NOT NULL CHECK (created_by IN ('Coris', 'Al')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_comment_threads_version_id ON comment_threads(song_version_id);
CREATE INDEX idx_comment_threads_timestamp ON comment_threads(timestamp_seconds);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES comment_threads(id) ON DELETE CASCADE,
  author TEXT NOT NULL CHECK (author IN ('Coris', 'Al')),
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_comments_thread_id ON comments(thread_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- Actions
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  suggested_by TEXT NOT NULL CHECK (suggested_by IN ('Coris', 'Al')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_actions_song_id ON actions(song_id);
CREATE INDEX idx_actions_status ON actions(status);
CREATE INDEX idx_actions_comment_id ON actions(comment_id);
CREATE INDEX idx_actions_created_at ON actions(created_at DESC);

-- Settings
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identity TEXT NOT NULL UNIQUE CHECK (user_identity IN ('Coris', 'Al')),
  primary_color TEXT NOT NULL DEFAULT '#ff1493',
  accent_color TEXT NOT NULL DEFAULT '#a855f7',
  background_color TEXT NOT NULL DEFAULT '#0d0914',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_settings_user_identity ON settings(user_identity);
```

---

## Queries

### Get song with all data

```sql
SELECT 
  s.id, s.title, s.image_url,
  COUNT(sv.id) AS version_count
FROM songs s
LEFT JOIN song_versions sv ON s.id = sv.song_id
WHERE s.id = $1
GROUP BY s.id;
```

### Get all threads for a version

```sql
SELECT ct.*, COUNT(c.id) as comment_count
FROM comment_threads ct
LEFT JOIN comments c ON ct.id = c.thread_id
WHERE ct.song_version_id = $1
GROUP BY ct.id
ORDER BY ct.timestamp_seconds;
```

### Get all actions for a song

```sql
SELECT a.*, s.title, c.body as comment_preview
FROM actions a
JOIN songs s ON a.song_id = s.id
LEFT JOIN comments c ON a.comment_id = c.id
WHERE a.song_id = $1
ORDER BY a.created_at DESC;
```

### Delete song (cascades to all related data)

```sql
DELETE FROM songs WHERE id = $1;
-- This automatically deletes:
-- - All song_versions
-- - All comment_threads
-- - All comments
-- - All actions linked to this song
```

---

## Best Practices

1. **Always cascade deletes** - Deleting a song should clean up everything
2. **Timestamps everywhere** - Track when records are created/updated
3. **User identity validation** - Use CHECK constraints to limit to 'Coris' or 'Al'
4. **Foreign key constraints** - Maintain referential integrity
5. **Indexes on foreign keys** - Speed up joins and filtering
6. **Soft deletes optional** - Current schema uses hard deletes with cascades

---

Last updated: March 2026
