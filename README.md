# 🎵 Song Review App

A beautiful, modern web application for collaborative music review and feedback. Coris and Al can upload songs, leave timestamped comments with threads, mark actionable items, and customize the app's color theme.

**Live:** https://song-review-app.vercel.app

---

## 🎯 Features

### Core Functionality
- **Song Management**
  - Create, edit, and delete songs
  - Upload cover images for each song
  - View all songs in an organized grid
  - Quick access from dashboard

- **Audio Review**
  - Interactive waveform player using WaveSurfer.js
  - Click anywhere on the waveform to create timestamped comment threads
  - Visual markers showing all comment locations
  - Color-coded markers for different threads

- **Collaboration**
  - Leave comments on specific timestamps
  - Reply to comments in threaded conversations
  - Email notifications when mentioned
  - Deep links jump directly to timestamp in audio

- **Action Tracking**
  - Mark comments as actionable items
  - Track action status (Pending/Completed)
  - Filter by status on dashboard
  - See all actions grouped by song

- **Personalization**
  - Individual color themes for each user
  - Live preview as you change colors
  - 6 preset themes (Pulse, Ocean, Sunset, Forest, Purple, Rose)
  - Colors persist to profile (saved to database)

### UI/UX
- **Dashboard**
  - Songs on left (1.5x width), Actions on right
  - 4 song cards per row with thumbnails
  - Filter actions by status
  - Smooth scrolling and transitions

- **Settings**
  - Three color controls (Primary, Accent, Background)
  - Live color updates on the entire page
  - Per-user color persistence (Coris vs Al separate themes)
  - Save and Reset buttons

- **Design**
  - Pulse-inspired aesthetic (hot pink, cyan, purple)
  - Glassmorphism effects
  - Gradient text and buttons
  - Dark theme with accent colors

---

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **CSS Modules** - Component-scoped styling
- **WaveSurfer.js** - Audio waveform visualization

### Backend
- **Next.js API Routes** - Serverless functions
- **Supabase (PostgreSQL)** - Database
- **Supabase Storage** - File uploads (audio & images)
- **Resend** - Email notifications

### Deployment
- **Vercel** - Hosting and CI/CD
- **GitHub** - Version control

---

## 📋 Database Schema

### Songs
```sql
id (UUID)
title (TEXT)
image_url (TEXT) - Cover art URL
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Song Versions
```sql
id (UUID)
song_id (UUID FK)
version_number (INT)
label (TEXT)
file_path (TEXT)
file_name (TEXT)
created_by (TEXT) - 'Coris' or 'Al'
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Comment Threads
```sql
id (UUID)
song_version_id (UUID FK)
timestamp_seconds (FLOAT) - Position in audio
created_by (TEXT) - 'Coris' or 'Al'
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Comments
```sql
id (UUID)
thread_id (UUID FK)
author (TEXT) - 'Coris' or 'Al'
body (TEXT)
created_at (TIMESTAMP)
```

### Actions
```sql
id (UUID)
song_id (UUID FK)
comment_id (UUID FK) - Nullable
description (TEXT)
suggested_by (TEXT) - 'Coris' or 'Al'
status (TEXT) - 'pending', 'approved', 'completed'
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Settings
```sql
id (UUID)
user_identity (TEXT) - 'Coris' or 'Al' (UNIQUE)
primary_color (TEXT) - Hex color
accent_color (TEXT) - Hex color
background_color (TEXT) - Hex color
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

---

## 🔐 Environment Variables

Set these in Vercel:

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

## 📁 Project Structure

```
app/
├── layout.tsx - Root layout with styling
├── page.tsx - Password login gate
├── identify/ - Identity selector (Coris/Al)
├── dashboard/
│   ├── page.tsx - Main dashboard
│   └── dashboard.module.css - Dashboard styles
├── songs/
│   ├── [id]/ - Song detail page
│   └── [id]/versions/[versionId]/ - Waveform player
├── settings/
│   ├── page.tsx - Color theme settings
│   └── settings.module.css
├── api/
│   ├── auth/ - Password verification
│   ├── songs/ - Song CRUD & image upload
│   ├── versions/ - Version uploads
│   ├── threads/ - Comment threads
│   ├── email/ - Notifications
│   ├── actions/ - Action tracking
│   └── settings/ - User settings
└── styles/
    └── globals.css - Design tokens

lib/
├── supabase.ts - Client Supabase
├── supabaseServer.ts - Server Supabase
├── auth.ts - Session management
└── avatar.ts - User utilities
```

---

## 🚀 Deployment

**Currently Live:** https://song-review-app.vercel.app

### How It Works
- Code pushed to GitHub → Vercel auto-builds and deploys
- Environment variables set in Vercel dashboard
- Database on Supabase cloud
- Files stored in Supabase Storage
- Emails sent via Resend

### Setup Checklist
- ✅ Code deployed to Vercel
- ✅ All env vars configured
- ✅ Supabase tables created
- ✅ Storage buckets created (public)
- ✅ Custom domain ready (song-review-app.vercel.app)

---

## 🎨 Design System

### Colors
- **Primary**: `#ff1493` (Hot Pink)
- **Secondary**: `#00d4ff` (Cyan)
- **Accent**: `#a855f7` (Purple)
- **Background**: `#0d0914` (Deep Dark)

### Fonts
- **Display**: Outfit (700-800)
- **Body**: DM Sans (400-600)

---

## 🔄 Recent Changes

### Dashboard Redesign
- ✅ Swapped layout: Songs on LEFT, Actions on RIGHT
- ✅ Reduced thumbnails 30%: 4 cards per row
- ✅ Compact card spacing
- ✅ White outlined icons (pencil, trash, image)

### Settings Improvements
- ✅ Title: "Settings" (not "Brand Explorer")
- ✅ Live color preview on actual page (not preview box)
- ✅ Colors apply to background, heading gradient
- ✅ Per-user color persistence (Coris vs Al)
- ✅ Database-backed settings storage

---

## 🐛 Known Issues & Solutions

### Database
- `image_url` column needed: `ALTER TABLE songs ADD COLUMN image_url TEXT;`
- `settings` table needed: See SQL above

### Storage
- Buckets must be PUBLIC (not private)
- `song-files` and `song-images` must exist

### Colors
- Changes only persist if you click "Save Theme"
- Each user (Coris/Al) has separate saved colors

---

## 📞 Quick Links

- **Live App**: https://song-review-app.vercel.app
- **GitHub**: https://github.com/corisleachman/song-review-app
- **Vercel Dashboard**: https://vercel.com
- **Supabase Console**: https://app.supabase.com

---

## 🎯 How to Use

### Login
1. Go to https://song-review-app.vercel.app
2. Enter password: `further_forever`
3. Choose identity: Coris or Al
4. Access your dashboard

### Create & Upload
1. Click "+ NEW SONG"
2. Enter song title, click Create
3. Click pencil icon to edit, trash to delete
4. Click image icon to upload cover art

### Review Audio
1. Click on a song to view detail page
2. Upload audio version or click existing version
3. See waveform with comment markers
4. Click on waveform to create comment thread
5. Reply to comments

### Track Actions
1. On version page, click "Mark as Action" on a comment
2. Edit the action description
3. See all actions on dashboard
4. Filter by status (ALL/PENDING/COMPLETED)
5. Check off completed actions

### Customize Colors
1. Click ⚙️ SETTINGS
2. Click color box or enter hex code
3. See colors change live on the page
4. Try preset buttons (PULSE, OCEAN, etc.)
5. Click "Save Theme" to persist
6. Your colors stay saved for your profile

---

Happy reviewing! 🎵
