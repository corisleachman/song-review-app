# Database — Song Review App

Supabase (PostgreSQL). Project: `xouiiaknskivrjvapdma`

---

## Tables

### `songs`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
title       TEXT NOT NULL
image_url   TEXT                          -- public URL to cover art in song-images bucket
created_at  TIMESTAMP DEFAULT now()
updated_at  TIMESTAMP DEFAULT now()
```

### `song_versions`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
song_id         UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE
version_number  INTEGER NOT NULL
label           TEXT                      -- nullable; user-editable display name
notes           TEXT                      -- nullable; short upload context / changelog note
file_path       TEXT NOT NULL             -- path in song-files bucket
file_name       TEXT NOT NULL
created_by      TEXT CHECK (created_by IN ('Coris', 'Al'))
created_at      TIMESTAMP DEFAULT now()
updated_at      TIMESTAMP DEFAULT now()
```

### `comment_threads`
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
song_version_id   UUID NOT NULL REFERENCES song_versions(id) ON DELETE CASCADE
timestamp_seconds INTEGER NOT NULL        -- IMPORTANT: INTEGER, must Math.round() WaveSurfer float
created_by        TEXT CHECK (created_by IN ('Coris', 'Al'))
created_at        TIMESTAMP DEFAULT now()
updated_at        TIMESTAMP DEFAULT now()
```

### `comments`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
thread_id   UUID NOT NULL REFERENCES comment_threads(id) ON DELETE CASCADE
author      TEXT CHECK (author IN ('Coris', 'Al'))
body        TEXT NOT NULL
created_at  TIMESTAMP DEFAULT now()
```

### `actions`
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
song_id       UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE
comment_id    UUID REFERENCES comments(id) ON DELETE SET NULL   -- nullable
description   TEXT NOT NULL
suggested_by  TEXT CHECK (suggested_by IN ('Coris', 'Al'))
status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed'))
created_at    TIMESTAMP DEFAULT now()
updated_at    TIMESTAMP DEFAULT now()
```

### `settings`
```sql
id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_identity    TEXT UNIQUE CHECK (user_identity IN ('Coris', 'Al'))
primary_color    TEXT                      -- hex e.g. #ff1493
accent_color     TEXT
background_color TEXT
created_at       TIMESTAMP DEFAULT now()
updated_at       TIMESTAMP DEFAULT now()
```

### `song_tasks`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
song_id     UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE
description TEXT NOT NULL
status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed'))
sort_order  INTEGER DEFAULT 0
created_at  TIMESTAMP DEFAULT now()
```

---

## Storage Buckets

Both buckets must be **public** (no auth required to read).

| Bucket | Contents | Path pattern |
|---|---|---|
| `song-files` | Audio files (mp3, wav, m4a) | `songs/[songId]/version-[n]/[filename]` |
| `song-images` | Cover art (jpg, png, webp) | `[songId]/[filename]` |

---

## Critical Notes

1. `comment_threads.timestamp_seconds` is INTEGER. WaveSurfer.js passes floats from `getDuration()` / click events. Always `Math.round(relX * duration)` before inserting.

2. Supabase JS `.eq()` cannot filter on joined table columns — it silently returns all rows. Filter in JS after fetching.

3. RLS is enabled but policies allow all access (internal two-person app).

4. Image uploads must use the service role key (via server-side API route `/api/songs/upload-image`) — the anon key lacks write permission.

5. Existing projects need this one-time schema update for version notes:

```sql
ALTER TABLE song_versions ADD COLUMN IF NOT EXISTS notes TEXT;
```
