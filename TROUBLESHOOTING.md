# Troubleshooting — Song Review App

## Hero Layout

The version page hero in [`app/songs/[id]/versions/[versionId]/version.module.css`](./app/songs/[id]/versions/[versionId]/version.module.css) is still driven by named CSS grid.

Do not:
- replace it with flex-wrap shortcuts
- move hero blocks around in JSX to force ordering
- treat mobile and desktop as the same structure

Check both breakpoints when touching:
- top nav row
- action row
- version badge / title / art alignment
- waveform placement

## Mobile-Specific Layout

Mobile intentionally differs from desktop:
- Row 1: back button and avatar
- Row 2: change version and upload version
- below waveform: conversation threads, then actions, then song admin

If mobile starts feeling crowded, inspect spacing and row structure first before changing component order.

## WaveSurfer

Current integration notes:
- WaveSurfer v7 event names differ from v6
- timestamp values from waveform interaction should be rounded before saving to integer DB columns
- load races and aborted loads are now guarded in the player page
- if abort-like errors return, inspect duplicate loads, teardown order, or stale async handlers first

If the waveform fails to appear:
- confirm the container is mounted
- confirm the signed audio URL is valid
- check that only one active load path is being used

## Audio Keeps Playing After Navigation

The version page should pause and reset audio on:
- route change back to songs
- component teardown
- version switch

If audio overlaps across pages, inspect the cleanup logic in [`app/songs/[id]/versions/[versionId]/page.tsx`](./app/songs/[id]/versions/[versionId]/page.tsx).

## Supabase

### Joined-column filtering

Some joined-column filters still do not work reliably in the Supabase client. When action filtering looks wrong, fetch the broader set and filter in JS.

### Image uploads

Cover art uploads must go through the server route:
- `/api/songs/upload-image`

Direct client upload with the anon key is not the supported path here.

### RLS

If you see row-level security errors unexpectedly, check Supabase policies first.

## Runtime Errors

| Error | Likely cause | First check |
|---|---|---|
| `AbortError: signal is aborted without reason` | stale or canceled waveform load | version page load / teardown flow |
| Waveform not rendering | unmounted container or invalid URL | player init guard and signed URL |
| Action list looks wrong | joined-column filter issue | JS-side filtering |
| Audio keeps playing after leaving page | cleanup did not run as expected | player teardown logic |
| Upload fails immediately | invalid file type / size or expired signed URL | upload modal error and request timing |

## Local Setup

If the app fails at boot with `supabaseUrl is required`, create a local `.env.local` and fill in the required env vars before running `npm run dev`.
