# Features & User Flows

This file describes the current user-facing flows in the app as of March 2026.

## Authentication

### Password gate

- Entry route: `/`
- User enters the shared password
- Successful verification sets the auth cookie and routes to `/identify`

### Identity picker

- Entry route: `/identify`
- User chooses `Coris` or `Al`
- Identity is stored in a cookie, not localStorage
- The active identity controls:
  - bubble alignment
  - action attribution
  - per-user theme settings
  - who receives notification emails

## Dashboard

The dashboard is the main library and overview surface.

Current behaviors:
- song grid and list views
- cover art upload
- create new song
- open latest version of a song
- cross-song actions panel

## Song Creation and First Upload

### Create song

- Dashboard creates the song record first
- `POST /api/songs/create` returns `songId`
- User is then routed into `/songs/[id]`

### Upload first version

The first version uses a dedicated upload page at `/songs/[id]`.

Flow:
1. choose or drag an audio file
2. validate audio type and max size
3. optionally add a label
4. optionally add a short version note
5. request a signed upload URL from `/api/versions/create`
6. upload directly to Supabase Storage
7. route into the newly created version page

Current validation:
- accepts common audio formats such as MP3, WAV, M4A, AAC, FLAC, OGG
- rejects files over 200 MB
- shows clearer progress and error feedback

## Version Page

The version page at `/songs/[id]/versions/[versionId]` is the core review experience.

Current behaviors:
- richer version metadata beneath the title
- optional version note shown under the metadata
- change-version modal
- inline version label editing
- upload-new-version flow without leaving the page
- play / pause / seek waveform
- stop playback when navigating away

## Comments and Threads

### Create thread

Flow:
1. click on the waveform
2. choose the timestamp
3. enter the opening comment
4. create the thread and notify the other collaborator

### Reply to thread

Flow:
1. open a thread from a marker or list
2. type a reply
3. submit reply
4. thread updates and email notification is sent to the other person

### Thread tools

Selected threads now support:
- `Jump to time`
- `Copy timestamp`
- `Copy link`

The thread list also surfaces:
- timestamp
- message count
- stronger preview text
- last replier

## Actions

Actions stay intentionally lightweight and are created from comments.

Current behavior:
- create action from a comment
- choose initial status on creation
- three statuses: `pending`, `approved`, `completed`
- cycle status directly in the UI
- edit description and status from a small modal

## Song Admin

Song Admin is the per-song operations panel.

Current behavior:
- add song tasks
- mark tasks complete
- edit tasks
- delete tasks
- drag to reorder

On mobile, Song Admin appears after conversations and actions so the review flow comes first.

## Mobile Layout Notes

The mobile version page deliberately changes layout:
- top navigation row is separated from page-action row
- artwork sits lower to line up better with the title block
- sections under the waveform are ordered:
  1. conversation threads
  2. actions
  3. song admin

This should be preserved unless there is a clear UX reason to change it.
