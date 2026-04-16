# Database — Song Review App

Supabase (PostgreSQL). Project: `xouiiaknskivrjvapdma`

---

## Tables

### `songs` (extended from original schema)
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
account_id  UUID REFERENCES accounts(id) ON DELETE CASCADE
title       TEXT NOT NULL
image_url   TEXT                          -- public URL to cover art in song-images bucket
status      TEXT DEFAULT 'in_progress' CHECK (status IN ('writing', 'in_progress', 'mixing', 'mastering', 'finished'))
created_at  TIMESTAMP DEFAULT now()
updated_at  TIMESTAMP DEFAULT now()
```

### `song_versions` (extended from original schema)
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

### `comment_threads` (unchanged core table)
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
song_version_id   UUID NOT NULL REFERENCES song_versions(id) ON DELETE CASCADE
timestamp_seconds INTEGER NOT NULL        -- IMPORTANT: INTEGER, must Math.round() WaveSurfer float
created_by        TEXT CHECK (created_by IN ('Coris', 'Al'))
created_at        TIMESTAMP DEFAULT now()
updated_at        TIMESTAMP DEFAULT now()
```

### `comments` (unchanged core table)
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
thread_id   UUID NOT NULL REFERENCES comment_threads(id) ON DELETE CASCADE
author      TEXT CHECK (author IN ('Coris', 'Al'))
body        TEXT NOT NULL
created_at  TIMESTAMP DEFAULT now()
```

### `actions` (extended from original schema)
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
song_id       UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE
comment_id    UUID REFERENCES comments(id) ON DELETE SET NULL   -- nullable
description   TEXT NOT NULL
suggested_by  TEXT CHECK (suggested_by IN ('Coris', 'Al'))
status        TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done'))
assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
resolved_in_version_id UUID REFERENCES song_versions(id) ON DELETE SET NULL
account_id    UUID REFERENCES accounts(id) ON DELETE CASCADE
created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
created_at    TIMESTAMP DEFAULT now()
updated_at    TIMESTAMP DEFAULT now()
```

### `settings` (unchanged core table)
```sql
id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_identity    TEXT UNIQUE CHECK (user_identity IN ('Coris', 'Al'))
primary_color    TEXT                      -- hex e.g. #ff1493
accent_color     TEXT
background_color TEXT
created_at       TIMESTAMP DEFAULT now()
updated_at       TIMESTAMP DEFAULT now()
```

### `song_tasks` (unchanged core table)
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
song_id     UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE
description TEXT NOT NULL
status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed'))
sort_order  INTEGER DEFAULT 0
created_at  TIMESTAMP DEFAULT now()
```

### `auth.users` (new dependency introduced by the workspace/auth model)
In Supabase Auth this is a system-managed table. The app currently relies on these user fields:

```sql
id            UUID PRIMARY KEY
email         TEXT
user_metadata JSONB           -- used to derive display name from `full_name` or `name`
```

Notes:
- The app reads the authenticated user via `supabase.auth.getUser()`.
- Display name is derived from `user_metadata.full_name`, then `user_metadata.name`, then email prefix.

### `profiles` (new table)
```sql
id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
email         TEXT
display_name  TEXT
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

Notes:
- Upserted during account bootstrap.
- Used as the canonical app-level profile record.

### `accounts` (new table)
```sql
id                 UUID PRIMARY KEY DEFAULT gen_random_uuid()
name               TEXT NOT NULL
slug               TEXT
created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
created_at         TIMESTAMP
updated_at         TIMESTAMP
```

Notes:
- This is the workspace table used throughout the current app.
- One owner workspace is auto-created during bootstrap if none exists.

### `account_members` (new table)
```sql
account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE
user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
role        TEXT NOT NULL CHECK (role IN ('owner', 'member'))
joined_at   TIMESTAMP
```

Notes:
- Used for workspace membership, assignment options, and notification recipient resolution.
- Current code assumes one membership row per `(account_id, user_id)` pair.

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

5. The current app expects a workspace/account model in addition to the older two-collaborator authored-string model.

That means the runtime now depends on:

- `auth.users`
- `profiles`
- `accounts`
- `account_members`
- `songs.account_id`
- `actions.account_id`
- `actions.created_by_user_id`
- `actions.assigned_to_user_id`
- `actions.resolved_in_version_id`

6. Existing projects that started from the older schema need one-time schema updates for song status, workspace linkage, action workflow fields, and version-aware resolution:

```sql
ALTER TABLE songs ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE song_versions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE actions ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE actions ADD COLUMN IF NOT EXISTS resolved_in_version_id UUID REFERENCES song_versions(id) ON DELETE SET NULL;
ALTER TABLE actions ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE actions ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
```
