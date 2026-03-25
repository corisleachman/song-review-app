# Song Review App - Context Handoff

**Project:** Song Review App (collaborative music review platform)  
**Live:** https://song-review-app.vercel.app  
**GitHub:** https://github.com/corisleachman/song-review-app

## Quick Summary

A web app for Coris and Al to upload song versions and leave timestamped feedback. Built with Next.js 14, Supabase, WaveSurfer.js, and deployed on Vercel.

**Current Status:** ✅ Fully functional and deployed  
**Last Updated:** March 25, 2026

---

## Key Features

✅ Password-protected authentication  
✅ Song upload with version management  
✅ Waveform player with click-to-comment  
✅ Timestamped comment threads  
✅ Email notifications via Resend  
✅ Action tracking (pending/approved/completed)  
✅ Song cover art upload  
✅ Per-user color customization  
✅ Mobile responsive with tab interface  
✅ Deep link sharing for comment threads  

---

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, CSS Modules
- **Backend:** Supabase (PostgreSQL) + Next.js API routes
- **Audio:** WaveSurfer.js v7
- **Email:** Resend
- **Deployment:** Vercel (auto-deploy on git push)
- **Storage:** Supabase Storage (S3-compatible)

---

## Credentials & Keys

**Shared Password:** `further_forever`

**Users:** Coris & Al (identity-based)
- Coris Email: `corisleachman@googlemail.com`
- Al Email: `furthertcb@gmail.com`

**Supabase Project:** https://app.supabase.com (link to xouiiaknskivrjvapdma)

**GitHub:** https://github.com/corisleachman/song-review-app

---

## Documentation

All comprehensive docs are in GitHub repository:

1. **[README.md](https://github.com/corisleachman/song-review-app/blob/main/README.md)** - Project overview, setup, features
2. **[DATABASE.md](https://github.com/corisleachman/song-review-app/blob/main/DATABASE.md)** - Full schema, relationships, setup SQL
3. **[API.md](https://github.com/corisleachman/song-review-app/blob/main/API.md)** - All endpoint documentation with examples
4. **[FEATURES.md](https://github.com/corisleachman/song-review-app/blob/main/FEATURES.md)** - User flows, feature descriptions, workflows
5. **[TROUBLESHOOTING.md](https://github.com/corisleachman/song-review-app/blob/main/TROUBLESHOOTING.md)** - Common issues and solutions
6. **[DEPLOYMENT.md](https://github.com/corisleachman/song-review-app/blob/main/DEPLOYMENT.md)** - Setup and deployment guide

---

## Project Structure

```
app/
├── api/                          # All API endpoints
├── dashboard/                    # Main dashboard (songs + actions)
├── songs/[id]/                   # Song detail page
├── songs/[id]/versions/[vid]/    # Waveform player
├── identify/                     # Identity picker (Coris/Al)
├── settings/                     # Color customization
├── layout.tsx                    # Root layout
├── page.tsx                      # Login page

lib/
├── auth.ts                       # Cookie-based auth
├── supabase.ts                   # Client Supabase
├── supabaseServer.ts             # Server Supabase (service role)
├── useProtectedRoute.ts          # Route protection hook
└── avatar.ts                     # User utilities

styles/
└── globals.css                   # Design tokens & CSS variables
```

---

## Database Schema (6 Tables)

| Table | Purpose |
|-------|---------|
| `songs` | Song catalog with optional cover art |
| `song_versions` | Audio file versions with metadata |
| `comment_threads` | Timestamped comment locations on waveform |
| `comments` | Individual replies within threads |
| `actions` | Workflow items (pending/approved/completed) |
| `settings` | Per-user color preferences |

See [DATABASE.md](https://github.com/corisleachman/song-review-app/blob/main/DATABASE.md) for full schema with relationships.

---

## Environment Variables (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=https://xouiiaknskivrjvapdma.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_i7F041QP5ThRwpPS1FMH6w_lF4B0Opp
SUPABASE_SERVICE_ROLE_KEY=sb_secret_1D_yVORe591IB3zcNACSAQ_lDMOJrW1
SHARED_PASSWORD=further_forever
CORIS_EMAIL=corisleachman@googlemail.com
AL_EMAIL=furthertcb@gmail.com
RESEND_API_KEY=re_PcJq6dm4_HQAFqdmJS7u9nQ1BsLnLcYry
NEXT_PUBLIC_APP_URL=https://song-review-app.vercel.app
```

---

## API Endpoints (Summary)

**Auth:**
- `POST /api/auth/verify-password`

**Songs:**
- `POST /api/songs/create`
- `POST /api/songs/upload-image`
- `DELETE /api/songs/[songId]`

**Versions:**
- `POST /api/versions/create`

**Threads:**
- `POST /api/threads/create`
- `POST /api/threads/reply`

**Actions:**
- `POST /api/actions/create`
- `GET /api/actions/by-song/[songId]`
- `PATCH /api/actions/[actionId]`

**Settings:**
- `GET /api/settings`
- `POST /api/settings`

See [API.md](https://github.com/corisleachman/song-review-app/blob/main/API.md) for full endpoint documentation.

---

## Design System

**Colors** (Pulse-inspired deep purple aesthetic):
- Primary: `#ff1493` (Hot Pink) - customizable per user
- Secondary: `#00d4ff` (Cyan)
- Accent: `#a855f7` (Purple) - customizable per user
- Background: `#0d0914` (Deep Dark) - customizable per user

**Fonts:**
- Display: Outfit (700-800)
- Body: DM Sans (400-600)

**Spacing:** 4px → 48px scale  
**Border Radius:** 8px → 24px  

---

## Mobile Experience

**Desktop (768px+):**
- Two-column layout: Songs (left) + Actions (right)
- Full waveform player
- All features visible side-by-side

**Mobile (<768px):**
- Tabbed interface: Songs | Actions
- Single-column layout
- One panel at a time
- Full functionality on both tabs

---

## Recent Work

**Latest commit:** `5ff5984` - Comprehensive documentation suite

**Recent features completed:**
- ✅ Mobile tab interface (Songs/Actions tabs)
- ✅ Fixed desktop view (both panels visible)
- ✅ Mobile keyboard support for password
- ✅ Song card layout fixes (icons inside row)
- ✅ Filter button contrast fixes
- ✅ Song creation redirect fix (undefined → correct songId)
- ✅ Complete documentation

---

## Known Limitations & Future Ideas

**Current:**
- Simple shared password (2-person only)
- No user accounts (identity-based)
- No permissions system
- No pagination on long comment threads

**Ideas for enhancement:**
- User accounts with passwords
- Role-based access (viewer, editor, owner)
- Comment pagination
- Thread sorting/filtering
- Undo/revision history
- Collaboration on single version
- Waveform annotations (markers with text)
- Batch upload (multiple versions)

---

## Common Tasks

### Add a Feature
1. Create branch: `git checkout -b feat/your-feature`
2. Make changes, test locally: `npm run dev`
3. Commit: `git commit -m "feat: description"`
4. Push: `git push origin feat/your-feature`
5. Vercel auto-deploys on push to main

### Deploy
- Push to main → Vercel auto-builds → live in 1-2 minutes
- Check status: https://vercel.com/corisleachman/song-review-app

### Test Locally
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Debug Database
- Supabase Console: https://app.supabase.com
- Run SQL queries, inspect data
- Check tables, storage, backups

---

## Useful Links

| Link | Purpose |
|------|---------|
| https://song-review-app.vercel.app | Live app |
| https://github.com/corisleachman/song-review-app | GitHub repo |
| https://app.supabase.com | Supabase console |
| https://vercel.com/corisleachman/song-review-app | Vercel dashboard |
| https://resend.com/dashboard | Email logs |

---

## When Asking Questions

To help me understand context, please share:

1. **What are you trying to do?**
   - Add feature, fix bug, deploy, etc.

2. **What did you try?**
   - Code changes, commands run, etc.

3. **What happened?**
   - Error message, unexpected behavior, etc.

4. **What reference docs?**
   - Point to relevant DATABASE.md, API.md, etc.

---

## Version Info

- **App Version:** 1.0.0
- **Next.js:** 14
- **Node:** 18+
- **Database:** Supabase (PostgreSQL)
- **Last Updated:** March 2026

---

**Ready to help!** Feel free to ask about:
- Adding new features
- Fixing bugs
- Deploying changes
- Understanding the codebase
- Mobile/UX improvements
- Database queries
- API changes
- Documentation updates

Just let me know what you're working on! 🎵
