# Song Review App

A private two-person music review app for Coris and Al of Polite Rebels. Upload versions, comment directly on the waveform, turn comments into actions, and keep song-specific admin tasks in one place.

**Live:** https://song-review-app.vercel.app  
**GitHub:** https://github.com/corisleachman/song-review-app

## Stack

- Next.js 14 + TypeScript + CSS Modules
- Supabase for Postgres and file storage
- WaveSurfer.js v7 for waveform playback
- Resend for thread email notifications
- Vercel for hosting and deploys

## Current Product Highlights

- Password gate plus identity picker for Coris and Al
- Dashboard with song grid/list views and per-song cover art
- First-version upload page for brand new songs
- In-player upload flow for new versions with file validation, progress, clearer errors, and optional version notes
- Version page with richer metadata, version picker modal, and inline version label editing
- Timestamped waveform threads with replies, deep links, `Jump to time`, `Copy timestamp`, and `Copy link`
- Three-state actions: `pending`, `approved`, `completed`
- Lightweight action editing modal and action creation from comments
- Song Admin panel with per-song tasks, completion, deletion, and drag reorder
- Mobile-specific layout improvements for the hero and lower-column order
- Playback cleanup on navigation so audio does not continue after leaving a version page

## Quick Start

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000` and fill in the local environment values before testing.

## Environment Variables

Use placeholders locally and keep real values in Vercel / local env files only.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SHARED_PASSWORD=
CORIS_EMAIL=
AL_EMAIL=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Documentation

| File | Purpose |
|---|---|
| [CONTEXT_HANDOFF.md](./CONTEXT_HANDOFF.md) | Up-to-date project context for future sessions |
| [DATABASE.md](./DATABASE.md) | Schema and database notes |
| [API.md](./API.md) | Current API routes and payloads |
| [FEATURES.md](./FEATURES.md) | Current user-facing flows |
| [TESTING.md](./TESTING.md) | Manual QA checklist |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Known integration and layout gotchas |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment notes |
