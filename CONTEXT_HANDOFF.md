# Song Review App — Context Handoff

**Last updated:** 27 March 2026  
**Live app:** https://song-review-app.vercel.app  
**GitHub:** https://github.com/corisleachman/song-review-app

## What This App Is

A private two-person collaborative music review app for Coris and Al of Polite Rebels.

Core jobs:
- upload and compare song versions
- leave timestamped comments directly on the waveform
- reply in threaded conversations
- turn comments into lightweight actions
- manage song-specific admin tasks

## Security / Secrets

Do not store live credentials, passwords, or tokens in docs.

Required env vars live in local env files and Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SHARED_PASSWORD`
- `CORIS_EMAIL`
- `AL_EMAIL`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL`

Vercel identifiers:
- project ID: `prj_jtfnI15tcAVvYwbEJwlQCpDORfYV`
- team ID: `team_z9MLYFXhcAfyoZfq63V6NDri`

## Stack

- Frontend: Next.js 14, TypeScript, CSS Modules
- Audio: WaveSurfer.js v7
- Database and storage: Supabase
- Email: Resend
- Deployment: Vercel

## Working Environment

- Repo path: `/Users/corisleachman/Documents/song-review-app`
- Always run `npx tsc --noEmit` before committing code
- Main branch auto-deploys on push
- Local auth and identity are cookie-based via [`lib/auth.ts`](./lib/auth.ts)

## Main Routes

### Pages

| Route | Purpose |
|---|---|
| `/` | Password gate |
| `/identify` | Identity picker |
| `/dashboard` | Song library and cross-song actions |
| `/songs/[id]` | First-version upload page, or redirect to latest version if one exists |
| `/songs/[id]/versions/[versionId]` | Main version player page |
| `/settings` | Per-user theme settings |

### API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/verify-password` | POST | Verify shared password |
| `/api/songs/create` | POST | Create song and return `songId` |
| `/api/songs/upload-image` | POST | Upload song artwork |
| `/api/songs/[songId]` | DELETE | Delete song and related data |
| `/api/versions/create` | POST | Create version record and signed upload URL |
| `/api/versions/[versionId]` | PATCH | Update version label |
| `/api/threads/create` | POST | Create timestamped thread |
| `/api/threads/reply` | POST | Reply to thread |
| `/api/actions/create` | POST | Create action from a comment |
| `/api/actions/by-song/[songId]` | GET | Get actions for a song |
| `/api/actions/[actionId]` | PATCH | Update action status and/or description |
| `/api/tasks/create` | POST | Create song admin task |
| `/api/tasks/[taskId]` | PATCH / DELETE | Update or delete task |
| `/api/tasks/reorder` | PATCH | Reorder tasks |
| `/api/settings` | GET / POST | Read or save theme settings for current cookie identity |
| `/api/email/notify-thread` | POST | Send thread notification email |

## Key Product Behavior

### Version page

The version page is the heart of the app:
- richer metadata under the song title
- version picker modal plus inline label editing
- selected thread header tools: `Jump to time`, `Copy timestamp`, `Copy link`
- more scannable thread list with timestamp, message count, preview, and last replier
- standard chat layout: active user on the right, other user on the left
- playback is explicitly stopped when leaving the page

### Actions

Actions are intentionally lightweight:
- created from comments
- states are `pending`, `approved`, `completed`
- status can be chosen at creation time
- actions can be edited in place with a small modal

### Upload flows

There are two upload flows:
- first version: dedicated page at `/songs/[id]`
- later versions: in-player modal launched from `Upload new version`

Both now:
- validate audio file type
- reject files over 200 MB
- show clearer progress and error feedback

### Mobile layout

The mobile player layout is intentionally different from desktop:
- Row 1: back to songs plus avatar
- Row 2: change version plus upload version
- then version badge, title/meta, artwork, controls, waveform
- below waveform on mobile: conversation threads first, actions second, song admin third

## Key Source Files

| File | Responsibility |
|---|---|
| [`app/dashboard/page.tsx`](./app/dashboard/page.tsx) | Song library and dashboard actions |
| [`app/songs/[id]/page.tsx`](./app/songs/[id]/page.tsx) | First-version upload flow / redirect logic |
| [`app/songs/[id]/versions/[versionId]/page.tsx`](./app/songs/[id]/versions/[versionId]/page.tsx) | Main player page |
| [`app/songs/[id]/versions/[versionId]/version.module.css`](./app/songs/[id]/versions/[versionId]/version.module.css) | Player layout and hero/mobile styling |
| [`app/api/actions/create/route.ts`](./app/api/actions/create/route.ts) | Action creation |
| [`app/api/actions/[actionId]/route.ts`](./app/api/actions/[actionId]/route.ts) | Action status / description updates |
| [`app/api/versions/create/route.ts`](./app/api/versions/create/route.ts) | Signed upload URL creation |
| [`lib/auth.ts`](./lib/auth.ts) | Cookie auth and identity helpers |

## Hero Layout Warning

The version hero still depends on named CSS grid. Keep the current structure intact when editing [`app/songs/[id]/versions/[versionId]/version.module.css`](./app/songs/[id]/versions/[versionId]/version.module.css).

Avoid:
- replacing the hero layout with flex-wrap hacks
- moving waveform markup around in JSX just to force visual order
- changing mobile ordering without checking both the hero and the lower-column stack

## Current Gotchas

- `comment_threads.timestamp_seconds` is integer-based. Round incoming waveform values before insert.
- Supabase joined-column filtering still needs JS-side filtering in some action queries.
- WaveSurfer load races are now guarded, but signed URL / mount timing issues can still show up if that integration is changed carelessly.
- Audio should stop on navigation away from a version page. If it does not, inspect version-page teardown first.
