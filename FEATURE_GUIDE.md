# 🎵 Song Review App - Complete Feature Guide

## **✨ WHAT WE'VE BUILT**

A beautiful, professional song collaboration and review app for **Coris & Al** with:

---

## **🎨 DESIGN SYSTEM**

### **Premium Visual Design**
- ✅ Glassmorphism effects
- ✅ Beautiful gradients and color transitions  
- ✅ Smooth animations (250ms cubic-bezier easing)
- ✅ Professional shadows and depth
- ✅ User avatars with initials
- ✅ Responsive layouts

### **Color Theme System**
- ✅ Live color picker (Brand Explorer inspired by Pulse)
- ✅ 6 beautiful color presets (Ocean, Sunset, Forest, Purple, Neon, Rose)
- ✅ Real-time preview with gradients
- ✅ Persistent localStorage (colors save to browser)
- ✅ Per-user themes (Coris & Al each have their own)
- ✅ ⚙️ Settings page to customize

---

## **🎵 CORE FEATURES**

### **Song Management**
- ✅ Create new songs
- ✅ Edit song titles
- ✅ **Upload cover art** - 🖼️ Upload images for each song
- ✅ Default icon (🎵) if no image
- ✅ Images display on dashboard & song detail pages

### **Audio Review System**
- ✅ Upload song versions (MP3, WAV, etc.)
- ✅ WaveSurfer.js waveform player
- ✅ Play/pause controls
- ✅ Click waveform to create comment threads
- ✅ Visual markers for each comment thread
- ✅ Deep links (jump to exact timestamp in email)

### **Comment System**
- ✅ Timestamped comment threads
- ✅ Reply to comments
- ✅ User avatars (color-coded initials)
- ✅ Comment timestamps
- ✅ Thread preview cards
- ✅ Floating comment tooltips on markers

### **Action Tracking**
- ✅ Mark comments as "Actions"
- ✅ Modal to edit action description
- ✅ Filter actions (All / Pending / Completed)
- ✅ Check off completed actions
- ✅ Dashboard action list grouped by song

### **Email Notifications**
- ✅ Notify the OTHER person when a comment is posted
- ✅ Deep links in emails (jump to specific thread)
- ✅ Automated via Resend

---

## **🎯 DASHBOARD**

- ✅ **Actions Section** (Left) - All actions grouped by song
- ✅ **Songs Section** (Right) - Grid of song cards with:
  - Song cover art (or 🎵 placeholder)
  - Song title
  - Action count
  - 🖼️ Upload image button
  - Hover effects

---

## **⚙️ SETTINGS PAGE**

### **Brand Explorer Color Picker**
1. **Primary Color** - Main accent color
2. **Accent Color** - Secondary highlight
3. **Background** - Dark background
4. **Live Preview** - See gradient in real-time
5. **Reset Button** - Back to defaults

### **Color Presets**
- Ocean (Blue + Cyan)
- Sunset (Orange + Pink)
- Forest (Green)
- Purple (Violet + Magenta)
- Neon (Lime + Blue)
- Rose (Pink + Orange)

### **Save & Persist**
- 💾 Save Theme button
- ✓ Saved! confirmation
- Persists to localStorage
- Survives browser restarts

---

## **🔐 AUTHENTICATION**

### **Login Flow**
1. Enter shared password: `further_forever`
2. Select identity: **Coris** or **Al**
3. Cookie session created
4. Logged in until logout

### **User Emails**
- **Coris**: corisleachman@googlemail.com
- **Al**: furthertcb@gmail.com

---

## **📱 SONG DETAIL PAGE** (`/songs/[id]`)

- Back navigation
- Song title (editable)
- **Song cover image** (if uploaded)
- Version list
- Create new version form
- Version details with metadata

---

## **🎧 VERSION PAGE** (`/songs/[id]/versions/[versionId]`)

### **Left Panel - Waveform**
- Play/Pause button
- WaveSurfer.js waveform
- Clickable marker track
- Colored circular markers (40px)
- Marker tooltip on hover

### **Right Panel - Comments**
- 420px fixed width
- Scrollable comment area
- Thread time badge
- Message cards with avatars
- 📌 Mark as Action button
- Reply form at bottom
- Thread preview grid (if no thread selected)

### **Features**
- Click waveform to create comment
- Click marker to view thread
- Inline avatar system
- Action modal
- Email notifications

---

## **🖼️ IMAGE UPLOAD SYSTEM**

### **Where Images are Stored**
- **Bucket**: `song-images` in Supabase Storage
- **Database**: `songs.image_url` column
- **File size**: Up to 10MB
- **Formats**: JPEG, PNG, WebP, GIF

### **How to Upload**
1. On Dashboard, click 🖼️ on any song
2. Select image from computer
3. Upload completes (shows ⏳ while loading)
4. Image displays instantly on:
   - Dashboard song cards
   - Song detail page header

### **Default Behavior**
- No image? Shows 🎵 emoji
- Images are public URLs (viewable to anyone)
- One image per song (newest replaces old)

---

## **🌐 LIVE DEPLOYMENT**

### **URL**
```
https://song-review-app.vercel.app
```

### **Deployment Workflow**
1. Push to GitHub → `main` branch
2. Vercel auto-deploys
3. Live in 2-3 minutes

### **Git Repo**
```
https://github.com/corisleachman/song-review-app
```

---

## **⚡ QUICK START GUIDE**

### **1. Login**
- Go to https://song-review-app.vercel.app
- Enter password: `further_forever`
- Select Coris or Al

### **2. Create a Song**
- Dashboard → "+ New Song"
- Enter title
- Click Create

### **3. Upload Cover Art**
- Click 🖼️ on song card
- Select image
- Done!

### **4. Upload Version**
- Click song → "+ New Version"
- Upload MP3/WAV file
- Enter version label (optional)

### **5. Review & Comment**
- Click version
- Click waveform to create comment
- Type comment
- Person gets email notification

### **6. Mark as Action**
- Click comment
- 📌 Mark as Action
- Edit description
- Actions appear in dashboard

### **7. Customize Colors**
- Dashboard → ⚙️ Settings
- Adjust colors
- Try presets
- 💾 Save Theme

---

## **🔧 TECHNICAL STACK**

### **Frontend**
- Next.js 14 (React)
- TypeScript
- CSS Modules (Premium Design System)
- WaveSurfer.js (Audio waveform)

### **Backend**
- Next.js API Routes
- Supabase (PostgreSQL + Storage)
- Resend (Email)
- Vercel (Hosting)

### **Database Schema**
```
songs
  - id (UUID)
  - title (TEXT)
  - image_url (TEXT)
  - created_at
  - updated_at

song_versions
  - id (UUID)
  - song_id (FK)
  - version_number (INT)
  - label (TEXT)
  - file_path (TEXT)
  - file_name (TEXT)
  - created_by (ENUM: 'Coris', 'Al')

comment_threads
  - id (UUID)
  - song_version_id (FK)
  - timestamp_seconds (INT)
  - created_by (ENUM: 'Coris', 'Al')

comments
  - id (UUID)
  - thread_id (FK)
  - author (ENUM: 'Coris', 'Al')
  - body (TEXT)

actions
  - id (UUID)
  - song_id (FK)
  - comment_id (FK)
  - description (TEXT)
  - suggested_by (ENUM: 'Coris', 'Al')
  - status (ENUM: 'pending', 'approved', 'completed')
```

---

## **📂 PROJECT STRUCTURE**

```
/app
  /dashboard/          - Main dashboard
  /identify/          - User selector
  /songs/[id]/        - Song detail page
    /versions/[versionId]/  - Review page with waveform
  /settings/          - Brand explorer
  /api/               - Backend routes
    /auth/
    /songs/
      /create
      /upload-image
    /versions/
    /threads/
    /actions/
    /email/

/lib
  /auth.ts            - Session management
  /supabase.ts        - Client Supabase
  /supabaseServer.ts  - Server Supabase
  /themeManager.ts    - Color theming
  /avatar.ts          - Avatar utilities

/styles
  /globals.css        - Premium design system with CSS variables
```

---

## **🚀 NEXT STEPS & IDEAS**

### **Completed ✅**
- Authentication
- Song management
- Audio review
- Comments & threads
- Action tracking
- Email notifications
- Brand explorer
- Color theming
- Image uploads

### **Future Ideas** (Not Built)
- Cloud theme sync (Supabase)
- Theme sharing between Coris & Al
- Reaction emojis on comments
- Comment editing
- User presence (online status)
- Undo/redo
- Song search
- Comment search
- Mobile app
- Dark/light mode toggle

---

## **📊 STATS**

- **API Routes**: 10
- **Pages**: 6
- **Database Tables**: 5
- **CSS Variables**: 20+
- **Components**: Fully custom (no UI library)
- **Lines of Code**: ~3,500+

---

## **💡 TIPS & TRICKS**

### **Color Theming**
- Colors apply instantly
- No page refresh needed
- localStorage is per-browser
- Clear browser data = reset theme
- Each of you can have different themes

### **Comments**
- Click anywhere on waveform
- Markers are colorful (6 colors rotate)
- Hover marker for tooltip
- Click marker to jump to thread

### **Actions**
- Mark any comment as action
- Edit description in modal
- Check off when done
- Filter by status in dashboard

### **Images**
- Supports JPEG, PNG, WebP, GIF
- Max 10MB per file
- Public URLs (anyone with link can view)
- Replaces previous image

---

## **🐛 TROUBLESHOOTING**

### **Colors not saving?**
- Check if localStorage is enabled
- Try clearing cache and reloading
- Check browser console for errors

### **Image upload fails?**
- Check file size (< 10MB)
- Check file type (image only)
- Check browser console for errors
- Try different file

### **Comments not appearing?**
- Refresh page
- Check internet connection
- Check Supabase status
- Verify you're logged in

### **Email not received?**
- Check spam folder
- Verify email addresses are correct
- Check Resend status
- Wait 2-3 minutes (can be slow)

---

## **📞 CREDENTIALS**

### **Shared Password**
```
further_forever
```

### **Supabase**
- URL: https://xouiiaknskivrjvapdma.supabase.co
- Anon Key: sb_publishable_i7F041QP5ThRwpPS1FMH6w_lF4B0Opp
- Service Role: sb_secret_1D_yVORe591IB3zcNACSAQ_lDMOJrW1

### **Resend**
- API Key: re_PcJq6dm4_HQAFqdmJS7u9nQ1BsLnLcYry
- From: onboarding@resend.dev

### **Vercel**
- Project: song-review-app
- URL: https://song-review-app.vercel.app

---

**Built with ❤️ for Coris & Al**

Last Updated: March 24, 2026
