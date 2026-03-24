# Song Review App

A minimal web app for two collaborators to upload song versions and leave timestamped comments.

## Setup

### 1. Clone and Install

```bash
npm install
```

### 2. Configure Supabase

1. Create a Supabase project at https://supabase.com
2. In the Supabase console, go to **SQL Editor** and run the schema from `SUPABASE_SCHEMA.sql`
3. Create a storage bucket named `song-files` in Supabase Storage
4. Copy your credentials (URL, Anon Key, Service Role Key)

### 3. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

SHARED_PASSWORD=further_forever
CORIS_EMAIL=corisleachman@googlemail.com
AL_EMAIL=furthertcb@gmail.com

RESEND_API_KEY=re_PcJq6dm4_HQAFqdmJS7u9nQ1BsLnLcYry
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Locally

```bash
npm run dev
```

Open http://localhost:3000

### 5. Deploy to Vercel

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Usage

1. Enter password: `further_forever`
2. Choose identity: Coris or Al
3. Create songs and upload MP3 versions
4. Open a version to review
5. Click the waveform to add timestamped comments
6. Notifications sent to the other person via email

## Features

- ✅ Shared password gate
- ✅ Two-person identity selection
- ✅ Song and version management
- ✅ WaveSurfer.js waveform player
- ✅ Click to create timestamped comment threads
- ✅ Thread replies
- ✅ Email notifications via Resend
- ✅ Deep links to exact threads
- ✅ Minimal, clean UI (black/white, Helvetica)

## Architecture

- **Frontend**: Next.js + React
- **Database**: Supabase Postgres
- **Storage**: Supabase Storage (MP3 files)
- **Email**: Resend
- **Hosting**: Vercel

## File Structure

```
app/
  api/
    auth/verify-password/
    songs/create/
    versions/create/
    threads/create/
    threads/reply/
    email/notify-thread/
  songs/[id]/
    page.tsx (song detail)
    versions/[versionId]/page.tsx (waveform player)
  dashboard/page.tsx
  identify/page.tsx
  page.tsx (password gate)
  layout.tsx
lib/
  auth.ts (session management)
  supabase.ts (client)
  supabaseServer.ts (server)
styles/
  globals.css
```

## Notes

- MP3 files only (v1)
- No delete functionality (v1)
- Comments are version-specific, not shared across versions
- Only two users: hardcoded as Coris and Al
- No user accounts or login required
// Build: Tue Mar 24 22:30:11 UTC 2026
