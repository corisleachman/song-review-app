# 🎵 Song Review App - BUILD COMPLETE

Your complete, production-ready two-person song collaboration app is built and ready to deploy.

---

## 📦 What You're Getting

A fully functional Next.js web application with:

✅ **Password-protected login** (shared password: `further_forever`)
✅ **Two-person system** (Coris & Al with session cookies)
✅ **Song & version management** (create, rename, upload)
✅ **Waveform player** (WaveSurfer.js with play/pause)
✅ **Timestamped comments** (click waveform to add at specific points)
✅ **Comment threads** (replies, conversation threads)
✅ **Email notifications** (Resend, only to the other person)
✅ **Deep linking** (direct links to specific threads from email)
✅ **Minimal UI** (black & white, Helvetica, clean admin aesthetic)

---

## 🚀 Quick Start (5 Steps)

### Step 1: Create Supabase Project
1. Go to https://supabase.com
2. Create a free project
3. Go to **SQL Editor**
4. Copy everything from `SUPABASE_SCHEMA.sql` and run it
5. Go to **Storage** > **+ New Bucket** > name it `song-files` > uncheck "Private" > create
6. Go to **Settings > API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Verify Resend API Key
You already have: `re_PcJq6dm4_HQAFqdmJS7u9nQ1BsLnLcYry`
This is set in `RESEND_API_KEY`

### Step 3: Local Setup
```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local` with your Supabase keys and API settings:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SHARED_PASSWORD=further_forever
CORIS_EMAIL=corisleachman@googlemail.com
AL_EMAIL=furthertcb@gmail.com
RESEND_API_KEY=re_PcJq6dm4_HQAFqdmJS7u9nQ1BsLnLcYry
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Run Locally
```bash
npm run dev
```
Open http://localhost:3000

Test it:
1. Password: `further_forever`
2. Choose Coris or Al
3. Create a song and upload an MP3
4. Open version and click waveform to comment
5. (Other person should get email notification)

### Step 5: Deploy to Vercel
1. Create GitHub repo and push your code
2. Go to https://vercel.com > New Project
3. Import your GitHub repo
4. Add same environment variables
5. Deploy

See `DEPLOYMENT.md` for detailed step-by-step guide.

---

## 📁 Project Structure

```
song-review-app/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/verify-password/
│   │   ├── songs/create/
│   │   ├── versions/create/
│   │   ├── threads/create/
│   │   ├── threads/reply/
│   │   └── email/notify-thread/
│   ├── songs/[id]/            # Song detail page
│   │   └── versions/[versionId]/  # Waveform player page
│   ├── dashboard/             # Dashboard page
│   ├── identify/              # Identity picker page
│   ├── page.tsx              # Password gate (/)
│   └── layout.tsx
├── lib/
│   ├── auth.ts               # Session & identity helpers
│   ├── supabase.ts          # Client-side Supabase
│   └── supabaseServer.ts    # Server-side Supabase
├── styles/
│   └── globals.css          # Global styles
├── package.json
├── tsconfig.json
├── next.config.js
├── .env.local.example       # Copy to .env.local and fill in
├── .gitignore
├── README.md
├── DEPLOYMENT.md            # Detailed deployment guide
├── PROJECT_OVERVIEW.md      # Full architecture & features
└── SUPABASE_SCHEMA.sql      # Database schema (run in Supabase)
```

---

## 📋 File Checklist

All files have been created and are in the outputs directory:

**Config Files**
- ✅ `package.json` - Dependencies
- ✅ `tsconfig.json` - TypeScript config
- ✅ `next.config.js` - Next.js config
- ✅ `.env.local.example` - Environment template
- ✅ `.gitignore` - Git ignore file

**Documentation**
- ✅ `README.md` - Quick start guide
- ✅ `DEPLOYMENT.md` - Step-by-step deployment
- ✅ `PROJECT_OVERVIEW.md` - Full technical details
- ✅ `SUPABASE_SCHEMA.sql` - Database setup

**App Pages**
- ✅ `app/page.tsx` - Password gate
- ✅ `app/page.module.css` - Password gate styles
- ✅ `app/identify/page.tsx` - Identity picker
- ✅ `app/identify/identify.module.css` - Identity picker styles
- ✅ `app/dashboard/page.tsx` - Song dashboard
- ✅ `app/dashboard/dashboard.module.css` - Dashboard styles
- ✅ `app/songs/[id]/page.tsx` - Song detail with versions
- ✅ `app/songs/[id]/song.module.css` - Song detail styles
- ✅ `app/songs/[id]/versions/[versionId]/page.tsx` - Waveform player
- ✅ `app/songs/[id]/versions/[versionId]/version.module.css` - Player styles
- ✅ `app/layout.tsx` - App layout

**API Routes**
- ✅ `app/api/auth/verify-password/route.ts` - Verify password
- ✅ `app/api/songs/create/route.ts` - Create song
- ✅ `app/api/versions/create/route.ts` - Create version
- ✅ `app/api/threads/create/route.ts` - Create comment thread
- ✅ `app/api/threads/reply/route.ts` - Reply to thread
- ✅ `app/api/email/notify-thread/route.ts` - Send email notification

**Utilities**
- ✅ `lib/auth.ts` - Auth helpers (password, identity, session)
- ✅ `lib/supabase.ts` - Client-side Supabase initialization
- ✅ `lib/supabaseServer.ts` - Server-side Supabase
- ✅ `styles/globals.css` - Global styles (black/white, Helvetica)

---

## 🔑 Environment Variables

Create `.env.local` with these values:

```
# Supabase (from Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (long key)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (long key, marked "SECRET")

# App Settings
SHARED_PASSWORD=further_forever
CORIS_EMAIL=corisleachman@googlemail.com
AL_EMAIL=furthertcb@gmail.com

# Email Service
RESEND_API_KEY=re_PcJq6dm4_HQAFqdmJS7u9nQ1BsLnLcYry

# For Deep Links (update after deployment)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🌐 Routes

### Public/Auth
- **`/`** - Password gate
- **`/identify`** - Choose Coris or Al

### Protected (after auth)
- **`/dashboard`** - List songs, create new song
- **`/songs/[id]`** - View song with all versions
- **`/songs/[id]/versions/[versionId]`** - Waveform player with comments

### API
- **`POST /api/auth/verify-password`** - Verify shared password
- **`POST /api/songs/create`** - Create song + get upload URL
- **`POST /api/versions/create`** - Create version + get upload URL
- **`POST /api/threads/create`** - Create comment thread
- **`POST /api/threads/reply`** - Reply to thread
- **`POST /api/email/notify-thread`** - Send email (called automatically)

---

## 💾 Database Schema

### songs
- id (UUID)
- title (TEXT)
- created_at, updated_at (TIMESTAMP)

### song_versions
- id (UUID)
- song_id (FK → songs)
- version_number (INT)
- label (TEXT, optional)
- file_path (TEXT) - storage path
- file_name (TEXT)
- created_by ('Coris' | 'Al')
- created_at, updated_at

### comment_threads
- id (UUID)
- song_version_id (FK → song_versions)
- timestamp_seconds (INT)
- created_by ('Coris' | 'Al')
- created_at, updated_at

### comments
- id (UUID)
- thread_id (FK → comment_threads)
- author ('Coris' | 'Al')
- body (TEXT)
- created_at

---

## 🎯 Feature Walkthrough

### 1. Login Flow
```
Password Gate → Verify Password (server) → Identity Picker → Dashboard
```

### 2. Create Song
```
Dashboard → "+ New Song" → 
  - Song title
  - Version label (optional)
  - Upload MP3
→ Creates song + version 1 → Song page
```

### 3. Upload New Version
```
Song Page → "+ Upload New Version" → 
  - Version label (optional)
  - Upload MP3
→ Increments version number → Reload versions list
```

### 4. Review with Comments
```
Song Version Page → WaveSurfer player →
Click waveform at timestamp →
Create comment → Comment thread created →
Other person receives email with deep link
```

### 5. Reply to Thread
```
Click thread marker → View thread →
See all comments → Type reply → Send →
Generates email notification to other person
```

### 6. Deep Link from Email
```
Click email link → 
  If not logged in: Password gate → Identify → Redirect to thread
  If logged in: Jump to version + open thread + seek to timestamp
```

---

## 📧 Email Notifications

### Triggers
- New comment thread created
- Reply posted to thread

### Recipients
- Only the OTHER person (not the sender)

### Format
- From: `Song Review <onboarding@resend.dev>`
- Subject: `New comment on [Song Title] - Version [N] at [M:SS]`
- Contains: Who commented, timestamp, comment excerpt, clickable link

### Link
Deep link format: `/songs/[songId]/versions/[versionId]?thread=[threadId]`

---

## 🎨 Design System

### Colors
- Background: White (#ffffff)
- Text: Black (#000000)
- Borders: Black (#000000)
- Hover: Light gray (#f0f0f0)
- Secondary text: Gray (#666666)
- Error: Red (#cc0000)

### Typography
- Font: Helvetica, Arial, sans-serif
- No decorative fonts
- No emojis (except in thread markers: •)

### Components
- **Buttons**: Black bg, white text, hover darkens
- **Inputs**: Black border, white bg
- **Tables**: Simple borders, clean spacing
- **Links**: Black text, underline on hover
- **Forms**: Labels, inputs, buttons in simple layout

### Layout
- Max-width: 900-1200px
- Padding: 20-40px
- Simple borders (1px solid black)
- No shadows or gradients
- No animations

---

## 🔐 Security Notes

- ✅ Password verified server-side (never sent to client unverified)
- ✅ Identity stored in secure HTTP-only cookie (7 day expiry)
- ✅ Supabase RLS enabled (but allows all access since internal app)
- ✅ File uploads use signed URLs (1-hour expiry)
- ✅ Email sent only to pre-configured addresses

### NOT Included (v1)
- User passwords
- Password reset
- Rate limiting
- Audit logging
- Two-factor auth
- Account deletion

---

## 📱 Responsive Design

Built for desktop/tablet. Mobile support:
- Forms stack vertically
- Tables become readable on smaller screens
- Waveform takes full width
- Buttons remain clickable

Note: WaveSurfer.js works on mobile but audio may require native player for some formats.

---

## 🚀 Deployment Checklist

Before deploying to Vercel:

- [ ] Supabase project created
- [ ] Schema imported (SUPABASE_SCHEMA.sql)
- [ ] Storage bucket created (`song-files`)
- [ ] Supabase credentials in `.env.local`
- [ ] Resend API key set in `.env.local`
- [ ] `npm install` runs without errors
- [ ] `npm run dev` starts successfully
- [ ] Can login with password
- [ ] Can create song and upload MP3
- [ ] Can play waveform
- [ ] Can create comments
- [ ] Code pushed to GitHub
- [ ] Vercel project created and connected
- [ ] Environment variables set in Vercel
- [ ] Deployment successful
- [ ] Test in production
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain

---

## 🐛 Common Issues & Fixes

### "Cannot find module 'wavesurfer.js'"
```bash
rm -rf node_modules
npm install
```

### Waveform doesn't show
- Check MP3 uploaded to Supabase Storage
- Check storage bucket is public or signed URLs working
- Check browser DevTools Network tab for 404s

### Emails not sending
- Verify Resend API key is correct
- Check email addresses are valid
- Go to https://dashboard.resend.com to see failures
- Resend free tier: 100 emails/day

### Deep links broken
- Make sure `NEXT_PUBLIC_APP_URL` matches your domain
- Verify thread ID exists in database
- Test with logged-in user first

### Supabase connection errors
- Verify URL and keys in `.env.local`
- Check Supabase project is active
- Verify RLS policies allow access (they do - all access enabled)

---

## 📞 Support

### Documentation
- Supabase: https://supabase.com/docs
- Next.js: https://nextjs.org/docs
- Resend: https://resend.com/docs
- WaveSurfer: https://wavesurfer.xyz
- Vercel: https://vercel.com/docs

### Debugging
- Check `.next/` build for errors
- Use `console.log()` on client, check browser console
- Use `console.error()` on server, check terminal
- Check Supabase dashboard for data
- Check Resend dashboard for email logs

---

## ✅ What's Complete

- [x] Next.js project setup
- [x] Supabase integration
- [x] Password gate
- [x] Identity picker
- [x] Session management
- [x] Dashboard
- [x] Song CRUD
- [x] Version management
- [x] WaveSurfer player
- [x] Click-to-comment on waveform
- [x] Comment threads
- [x] Thread replies
- [x] Email notifications (Resend)
- [x] Deep linking
- [x] API routes
- [x] Database schema
- [x] Styling (black/white, Helvetica)
- [x] Documentation
- [x] Deployment guide

---

## 🎉 You're Ready!

1. **Set up Supabase** (5 min)
2. **Run locally** (2 min) - `npm install && npm run dev`
3. **Test** (5 min) - create song, comment, check email
4. **Deploy** (5 min) - push to GitHub, deploy from Vercel

Total: ~20 minutes from start to production.

---

## 📚 Documentation Files

- **README.md** - Quick start and overview
- **DEPLOYMENT.md** - Step-by-step deployment guide
- **PROJECT_OVERVIEW.md** - Complete technical reference
- **SUPABASE_SCHEMA.sql** - Database setup (paste in Supabase)

---

**Build Date**: March 24, 2026
**Status**: ✅ COMPLETE & READY TO DEPLOY
**Lines of Code**: ~2500+
**API Routes**: 6
**Database Tables**: 4
**Pages**: 5

You're all set. Happy reviewing! 🎵

---

For questions or issues, refer to the docs or check the source code comments.
