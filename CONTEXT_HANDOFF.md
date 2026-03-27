# Song Review App — Context Handoff

**Last updated:** March 2026  
**Live app:** https://song-review-app.vercel.app  
**GitHub:** https://github.com/corisleachman/song-review-app  
**Latest commit:** `15edf57`

---

## What This App Is

A two-person collaborative music review web app for **Coris** and **Al** (band: Polite Rebels). Features: upload song versions, leave timestamped waveform comments, reply in threads, track action items, manage per-song tasks, and review together.

---

## Credentials & Keys

| Thing | Value |
|---|---|
| Shared app password | `further_forever` |
| Coris email | `corisleachman@googlemail.com` |
| Al email | `furthertcb@gmail.com` |
| Supabase URL | `https://xouiiaknskivrjvapdma.supabase.co` |
| Supabase anon key | `sb_publishable_i7F041QP5ThRwpPS1FMH6w_lF4B0Opp` |
| Supabase service role | `sb_secret_1D_yVORe591IB3zcNACSAQ_lDMOJrW1` |
| Resend API key | `re_PcJq6dm4_HQAFqdmJS7u9nQ1BsLnLcYry` |
| App URL | `https://song-review-app.vercel.app` |
| Vercel project ID | `prj_jtfnI15tcAVvYwbEJwlQCpDORfYV` |
| Vercel team ID | `team_z9MLYFXhcAfyoZfq63V6NDri` |
| GitHub token | `ghp_REDACTED_see_Vercel_env_or_ask_Coris` |
| GitHub repo | `https://github.com/corisleachman/song-review-app` |

---

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, CSS Modules
- **Audio:** WaveSurfer.js v7 (note: v7 API differs from v6 — event names changed)
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (buckets: `song-files`, `song-images`, both public)
- **Email:** Resend
- **Deployment:** Vercel (auto-deploy on push to `main`)

---

## Repo & Working Environment

- Repo cloned at `/home/claude/repo`
- GitHub token is configured in the remote URL — `git push origin main` works directly
- Always run `npx tsc --noEmit` from `/home/claude/repo` before every commit
- Vercel MCP tools available for checking deployment logs
- Project ID and Team ID required for every Vercel API call (see above)

---

## Database Tables

| Table | Purpose |
|---|---|
| `songs` | Song catalogue — id, title, image_url, created_at, updated_at |
| `song_versions` | Audio versions — id, song_id, version_number (INT), label (TEXT nullable), file_path, file_name, created_by, created_at, updated_at |
| `comment_threads` | Timestamped positions — id, song_version_id, timestamp_seconds (INTEGER — must use Math.round()), created_by, created_at, updated_at |
| `comments` | Replies — id, thread_id, author, body, created_at |
| `actions` | Action items — id, song_id, comment_id (nullable), description, suggested_by, status (pending/approved/completed), created_at, updated_at |
| `settings` | Per-user colour theme — id, user_identity (Coris/Al, UNIQUE), primary_color, accent_color, background_color |
| `song_tasks` | Per-song task list — id, song_id, description, status (pending/completed), sort_order, created_at |

**Critical:** `comment_threads.timestamp_seconds` is INTEGER. WaveSurfer passes floats. Always `Math.round()` before inserting.

**Critical:** Supabase JS client cannot filter on joined table columns with `.eq()`. Filter in JS after fetching.

---

## App Routes

### Pages
| Route | Purpose |
|---|---|
| `/` | Password gate |
| `/identify` | Choose identity (Coris or Al) |
| `/dashboard` | Song grid/list + actions panel |
| `/songs/[id]` | Redirects to latest version |
| `/songs/[id]/versions/[versionId]` | Main player page |
| `/songs/[id]/upload` | Upload new version (dedicated page — no redirect flash) |
| `/settings` | Colour theme customisation |

### API Routes
| Route | Method | Purpose |
|---|---|---|
| `/api/auth/verify-password` | POST | Verify shared password |
| `/api/songs/create` | POST | Create song |
| `/api/songs/upload-image` | POST | Upload cover art (server-side, service role key) |
| `/api/songs/[songId]` | DELETE | Delete song + cascade |
| `/api/versions/create` | POST | Create version + signed upload URL |
| `/api/versions/[versionId]` | PATCH | Update version label |
| `/api/threads/create` | POST | Create comment thread |
| `/api/threads/reply` | POST | Reply to thread |
| `/api/actions/create` | POST | Create action item |
| `/api/actions/by-song/[songId]` | GET | Get actions (filter by versionId in JS) |
| `/api/actions/[actionId]` | PATCH | Update action status |
| `/api/tasks/create` | POST | Create song task |
| `/api/tasks/[taskId]` | PATCH/DELETE | Update/delete task |
| `/api/tasks/reorder` | PATCH | Reorder tasks (drag-and-drop) |
| `/api/settings` | GET/POST | Per-user colour settings |
| `/api/email/notify-thread` | POST | Send email notification |

---

## Key Source Files

```
app/
├── dashboard/
│   ├── page.tsx                          — Dashboard (songs grid/list + actions)
│   └── dashboard.module.css
├── songs/[id]/
│   ├── page.tsx                          — Redirects to latest version
│   ├── upload/page.tsx                   — Upload new version page
│   └── versions/[versionId]/
│       ├── page.tsx                      — Main player page (most complex file)
│       └── version.module.css            — Player styles
├── settings/
│   ├── page.tsx
│   └── settings.module.css
└── api/                                  — All API routes (see table above)

lib/
├── supabase.ts                           — Client Supabase
├── supabaseServer.ts                     — Server Supabase (service role)
├── auth.ts                               — Cookie-based session
└── avatar.ts                             — User utilities
```

---

## Hero Player Layout — CRITICAL — READ BEFORE TOUCHING

The player page hero section (`/songs/[id]/versions/[versionId]`) went through many iterations. The layout is now solved permanently using **named CSS grid areas**. Do not revert to flex-based approaches.

### JSX structure (three direct children of `.heroContent`):
1. `.heroLeft` — badge, title, artist, play controls
2. `.heroArtwork` — cover art image / placeholder
3. `.heroWaveform` — waveform, markers, floating comment box

### CSS grid (in `version.module.css`):

**Desktop** (default):
```css
.heroContent {
  display: grid;
  grid-template-columns: 1fr 330px;
  grid-template-areas:
    "left art"
    "wave art";   /* artwork spans both rows */
  gap: 0 28px;
  padding: 8px 28px 0 28px;
}
.heroLeft    { grid-area: left; }
.heroArtwork { grid-area: art;  width: 330px; height: 330px; align-self: start; margin-bottom: 28px; }
.heroWaveform { grid-area: wave; }
```

**Mobile** (`@media (max-width: 700px)`):
```css
.heroContent {
  grid-template-columns: 1fr 110px;
  grid-template-areas:
    "left art"
    "wave wave";  /* wave spans full width */
  gap: 0 14px;
}
.heroArtwork { width: 110px; height: 110px; }
```

**The only thing that changes between breakpoints is `grid-template-areas` and `grid-template-columns`. The `grid-area` values on each child never change. Never use flex-wrap, order, display:contents, or move heroWaveform in the JSX.**

---

## Other Completed Features

### Dashboard list view (desktop)
- Toggle between grid and list view (icons in header)
- List view: 70px thumbnail, 10px row gap, version label shown (not v#), comment count left-aligned, icons 44px right-aligned via `position:absolute; right:10px; top:50%; transform:translateY(-50%)`

### Waveform (3-state colour)
- Grey: WaveSurfer `waveColor: rgba(255,255,255,0.2)`
- Played (hot pink): WaveSurfer `progressColor: #ff1493`
- Hovered (dimmed pink): transparent `<canvas>` overlay (`hoverCanvasRef`) drawn on `mousemove`, fills between playhead and mouse position

### Floating comment box
- `position: absolute; bottom: calc(100% + 10px)` — floats above waveform at click point
- 400px wide, positioned with `clamp()` to stay within bounds
- WaveSurfer click handler stores `relX * 100` as `clickXPercent` for positioning

### Inline version label editing
- Double-click the version badge (pink pill in hero)
- Input appears in-place, saves via `PATCH /api/versions/[versionId]`
- Empty string clears label, falls back to `v#` display

### Version picker modal
- "Change Version" button in nav opens a modal listing all versions
- Current version highlighted with pink tick ✓
- Replaces the old `<select>` dropdown

### Song Admin panel
- 3rd column on desktop player page
- Per-song tasks: add, double-click edit, drag-and-drop reorder, tick-to-complete, delete
- Backed by `song_tasks` Supabase table

### Mobile nav (player page)
- "← Songs" → hot pink filled button
- "Change Version" → ghost button
- "Upload new version" → pink outline (transparent bg, #ff1493 border)
- 20px bottom padding below nav bar

---

## Known Issues / Gotchas

- **WaveSurfer v7:** Use `seeking`, `timeupdate`, `interaction` events (not v6 names). Load audio via `new Audio()` passed as `media:` option.
- **"signal is aborted without reason":** Non-critical, appears when audio load is cancelled during version switch.
- **Supabase joined column filtering:** `.eq()` on joined columns silently fails — filter in JS after fetch.
- **Image upload:** Must use server-side API route with service role key. Client-side fails with anon key.

---

## Working Patterns

- Workflow: code → `npx tsc --noEmit` → `git commit` → `git push origin main` → auto-deploys in ~1 min
- Vercel build failures: `Vercel:get_deployment_build_logs` with full `dpl_` deployment ID
- Runtime errors: `Vercel:get_runtime_logs` with `level: ['error'], since: '30m'`
- Coris tests on real devices and reports precisely what is wrong visually

---

## Design Tokens

| Token | Value |
|---|---|
| Hot Pink | `#ff1493` |
| Cyan | `#00d4ff` |
| Purple | `#a855f7` |
| Background | `#0d0914` |
| Display font | Outfit 700-800 |
| Body font | DM Sans 400-600 |
