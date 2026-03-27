# Troubleshooting — Song Review App

---

## Hero Layout (Player Page) — MOST IMPORTANT

The hero section (`/songs/[id]/versions/[versionId]`) uses a **named CSS grid** in `version.module.css`. This was the resolution after many broken iterations.

**Do not:**
- Change `display: flex` + `flex-wrap` on `.heroContent`
- Use `order`, `display: contents`, or `align-self` tricks to move elements
- Move `.heroWaveform` in or out of `.heroLeft` in the JSX

**The layout is a named grid:**
```
Desktop: "left art" / "wave art"   (1fr | 330px)
Mobile:  "left art" / "wave wave"  (1fr | 110px)
```
Each child has a fixed `grid-area` name. Only `grid-template-areas` and `grid-template-columns` change between breakpoints.

---

## WaveSurfer v7 Specifics

- Event names differ from v6: use `seeking` not `seek`, `timeupdate` not `audioprocess`
- Load audio via `new Audio()` element passed as `media:` option — fixes mobile CORS issues with signed URLs
- `getDuration()` and click handlers return floats — always `Math.round()` before storing to `timestamp_seconds` (INTEGER column)
- "signal is aborted without reason" error is non-critical — appears when audio load is cancelled mid-stream

---

## Supabase

### Joined column filtering silently fails
```js
// WRONG — returns all rows, silently ignores the filter
.from('actions').select('*, comments(...)').eq('comments.thread_id', id)

// RIGHT — fetch all, filter in JS
const all = await supabase.from('actions').select('*, comments(...)')
const filtered = all.filter(a => a.comments?.thread_id === id)
```

### Image upload fails
Image uploads must go through `/api/songs/upload-image` (server-side, service role key).  
Client-side upload with anon key will fail with permission error.

### RLS errors
All tables have RLS enabled but with allow-all policies. If you see "row-level security" errors, check the policy in Supabase dashboard.

---

## Vercel Build Failures

1. Get the full deployment ID from Vercel dashboard (starts with `dpl_`)
2. Use `Vercel:get_deployment_build_logs` with that ID + team ID `team_z9MLYFXhcAfyoZfq63V6NDri`
3. Build logs give exact file path + line number for TypeScript errors
4. Always run `npx tsc --noEmit` locally first — catches errors before they reach Vercel

---

## Common Runtime Errors

| Error | Cause | Fix |
|---|---|---|
| `timestamp_seconds` constraint | Inserting float into INTEGER column | `Math.round()` the timestamp |
| Waveform not rendering | WaveSurfer container unmounted before init | Check `container.isConnected` guard in useCallback |
| Email not sending | Resend API key or wrong email address | Check Resend dashboard logs |
| "signal aborted" | Audio load cancelled | Non-critical — suppress or add mounted check in error handler |
| Actions not filtered by version | Supabase joined column filter silently fails | Filter in JS after fetch |
