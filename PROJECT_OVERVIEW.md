# Song Review App - Complete Build

This is a complete, production-ready Next.js application for two-person song collaboration and review.

## What's Included

### Core Features
✅ Shared password authentication (hardcoded)
✅ Two-person identity selection (Coris / Al)
✅ Dashboard with song list and creation
✅ Version management (upload, rename)
✅ WaveSurfer.js waveform player with playback controls
✅ Click-to-comment on waveform at specific timestamps
✅ Comment threads with replies
✅ Email notifications via Resend (to the other person)
✅ Deep linking to specific threads
✅ Minimal, clean UI (black/white, Helvetica)

### Technology Stack
- **Frontend**: Next.js 14 + React 18
- **Database**: Supabase Postgres
- **File Storage**: Supabase Storage
- **Email**: Resend
- **Audio Player**: WaveSurfer.js
- **Hosting**: Vercel (recommended)
- **Styling**: CSS Modules + Global CSS

### File Structure

```
song-review-app/
├── app/
│   ├── api/
│   │   ├── auth/verify-password/route.ts
│   │   ├── songs/create/route.ts
│   │   ├── versions/create/route.ts
│   │   ├── threads/create/route.ts
│   │   ├── threads/reply/route.ts
│   │   └── email/notify-thread/route.ts
│   ├── songs/
│   │   └── [id]/
│   │       ├── page.tsx (song detail)
│   │       ├── song.module.css
│   │       └── versions/
│   │           └── [versionId]/
│   │               ├── page.tsx (waveform player)
│   │               └── version.module.css
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── dashboard.module.css
│   ├── identify/
│   │   ├── page.tsx
│   │   └── identify.module.css
│   ├── page.tsx (password gate)
│   ├── page.module.css
│   └── layout.tsx
├── lib/
│   ├── auth.ts (session & identity management)
│   ├── supabase.ts (client-side)
│   └── supabaseServer.ts (server-side)
├── styles/
│   └── globals.css
├── package.json
├── tsconfig.json
├── next.config.js
├── .env.local.example
├── .gitignore
├── README.md
├── DEPLOYMENT.md
└── SUPABASE_SCHEMA.sql
```

### Database Schema

#### songs
```sql
CREATE TABLE songs (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### song_versions
```sql
CREATE TABLE song_versions (
  id UUID PRIMARY KEY,
  song_id UUID NOT NULL REFERENCES songs(id),
  version_number INTEGER NOT NULL,
  label TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_by TEXT CHECK (created_by IN ('Coris', 'Al')),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### comment_threads
```sql
CREATE TABLE comment_threads (
  id UUID PRIMARY KEY,
  song_version_id UUID NOT NULL REFERENCES song_versions(id),
  timestamp_seconds INTEGER NOT NULL,
  created_by TEXT CHECK (created_by IN ('Coris', 'Al')),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### comments
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES comment_threads(id),
  author TEXT CHECK (author IN ('Coris', 'Al')),
  body TEXT NOT NULL,
  created_at TIMESTAMP
);
```

## Quick Start

### 1. Supabase Project
- Create at https://supabase.com
- Run `SUPABASE_SCHEMA.sql` in SQL Editor
- Create `song-files` bucket in Storage
- Get URL and API keys

### 2. Resend Account
- Sign up at https://resend.com (free)
- Get API key

### 3. Local Setup
```bash
npm install
cp .env.local.example .env.local
# Fill in environment variables
npm run dev
```

### 4. Deploy to Vercel
```bash
git init && git add . && git commit -m "Initial"
# Push to GitHub
# Import in Vercel with environment variables
```

See `DEPLOYMENT.md` for detailed instructions.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=              # From Supabase > Settings > API
NEXT_PUBLIC_SUPABASE_ANON_KEY=         # From Supabase > Settings > API
SUPABASE_SERVICE_ROLE_KEY=             # From Supabase > Settings > API

SHARED_PASSWORD=further_forever        # App password
CORIS_EMAIL=corisleachman@googlemail.com
AL_EMAIL=furthertcb@gmail.com

RESEND_API_KEY=re_PcJq6dm4_HQAFqdmJS7u9nQ1BsLnLcYry
NEXT_PUBLIC_APP_URL=http://localhost:3000  # For deep links
```

## Usage Flow

1. **Password Gate** (`/`)
   - Enter shared password

2. **Identity Picker** (`/identify`)
   - Choose Coris or Al
   - Sets session cookie

3. **Dashboard** (`/dashboard`)
   - List of songs
   - Create new song with first version

4. **Song Detail** (`/songs/[id]`)
   - View all versions
   - Rename song title
   - Rename version labels
   - Upload new versions

5. **Waveform Player** (`/songs/[id]/versions/[versionId]`)
   - Play audio with WaveSurfer.js
   - Click waveform to create comment at timestamp
   - See thread markers on waveform
   - Reply to threads
   - Receive email notifications with deep links

## API Routes

### POST `/api/auth/verify-password`
Verify the shared password

### POST `/api/songs/create`
Create a song and get signed upload URL for first version

### POST `/api/versions/create`
Create a new version and get signed upload URL

### POST `/api/threads/create`
Create a comment thread at a timestamp with initial comment

### POST `/api/threads/reply`
Add a reply to an existing thread

### POST `/api/email/notify-thread`
Send email notification (called automatically by create/reply)

## Features By Page

### Password Gate (`/`)
- Clean, minimal login
- Single password field
- Redirects to identify on success

### Identity Picker (`/identify`)
- "Who are you?" heading
- Two buttons: Coris, Al
- Sets identity in session cookie

### Dashboard (`/dashboard`)
- Table of all songs
- Song name, latest version, last updated, open button
- "+ New Song" button with form
  - Song title input
  - Version label input
  - MP3 file upload
- Minimal styling (black/white)

### Song Page (`/songs/[id]`)
- Song title (editable)
- List of versions with:
  - Version number and label (editable)
  - Creator and upload date
  - Open button
- "+ Upload New Version" button with form
  - Optional version label
  - MP3 file upload
- Back button to dashboard

### Waveform Player (`/songs/[id]/versions/[versionId]`)
- Song title and version info
- Play/Pause button
- WaveSurfer.js waveform (gray with black progress)
- Thread markers (dots) on waveform
- Thread panel (right side or below):
  - Create thread form (when clicking waveform)
  - View thread with all comments and replies
  - Reply form
  - Thread list (if not viewing specific thread)

## Email Notifications

### Trigger
- New thread created
- Reply posted
- **Only** sends to the other person (not the sender)

### Format
- From: Song Review <onboarding@resend.dev>
- Subject: "New comment on [Song] - [Version] at [Time]"
- Contains:
  - Who commented
  - Timestamp in song
  - Comment excerpt
  - Button link to thread
  - Deep link: `/songs/[id]/versions/[versionId]?thread=[threadId]`

## Authentication & Sessions

- **No user accounts** - shared password only
- **Password stored** in `SHARED_PASSWORD` env var
- **Verified server-side** in `/api/auth/verify-password`
- **Identity** stored in `song_review_identity` cookie
- **Auth status** stored in `song_review_auth` cookie
- **Session duration** 7 days

## Deep Linking

Deep links allow direct access to comment threads from emails:

`/songs/[songId]/versions/[versionId]?thread=[threadId]`

Flow:
1. User clicks link from email
2. If not authenticated, redirected to password gate
3. After password entry and identity selection, redirected back to thread
4. Thread automatically opened and focused
5. Playback seeks to thread timestamp (doesn't auto-play)

## Styling

### Design Philosophy
- Minimal and clean
- Black and white only (no colors)
- Helvetica font
- Simple borders
- No animations unless necessary
- Admin tool aesthetic (not marketing site)

### Components
- Buttons: Black background, white text, hover darkens
- Inputs: Black border, white background
- Tables: Simple borders, clean spacing
- Links: Black text, underline on hover
- Messages: Gray text, left-aligned

## Known Limitations (v1)

- MP3 files only (no transcoding)
- No file deletion
- No user accounts or full auth
- Comments are version-specific (not shared across versions)
- No thread deletion or editing
- No mentions or @tags
- No read receipts or activity feed
- No version comparison
- No advanced search
- Only works for Coris and Al (hardcoded)

## Error Handling

- Invalid password: "Incorrect password" message
- Missing file: 404 error
- Network errors: Caught and displayed in UI
- Email failures: Logged but don't block UI (notification is async)
- Invalid deep link: Shows "Not found" message

## Performance Notes

- WaveSurfer.js loads entire MP3 for decoding (typical ~5-10MB files fine)
- Comments/threads are paginated in UI (max 300px with scroll)
- Database queries use indexes for performance
- Storage signed URLs are generated per upload (1-hour expiry)
- No caching at app level (always fresh data)

## Development Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run linter
```

## Deployment

### To Vercel (Recommended)

1. Push code to GitHub
2. Go to vercel.com > New Project
3. Import GitHub repo
4. Add environment variables
5. Click Deploy

### To Other Hosts

Requires:
- Node.js 18+
- Environment variables set
- Supabase project
- Resend account

```bash
npm run build
npm run start
```

---

**Build Date**: March 24, 2026
**Status**: Complete and ready to deploy
**Last Updated**: 2026-03-24
