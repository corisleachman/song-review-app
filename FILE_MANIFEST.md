# Song Review App - Complete File Manifest

## 📍 Start Here
1. Read **00_START_HERE.md** (5 min overview + quick start)
2. Follow **DEPLOYMENT.md** for step-by-step setup
3. Reference **PROJECT_OVERVIEW.md** for technical details

## 📂 Project Files Structure

### Root Configuration
```
package.json                    # Dependencies: Next.js, React, Supabase, Resend, WaveSurfer
tsconfig.json                   # TypeScript configuration
next.config.js                  # Next.js configuration
.env.local.example              # Environment variables template (copy to .env.local)
.gitignore                      # Git ignore file
```

### Documentation
```
00_START_HERE.md               # Quick start guide (READ FIRST)
README.md                      # Project overview and setup
DEPLOYMENT.md                  # Step-by-step deployment guide
PROJECT_OVERVIEW.md            # Complete technical documentation
FILE_MANIFEST.md               # This file
```

### Database
```
SUPABASE_SCHEMA.sql            # Database schema - paste in Supabase SQL Editor
```

### Application Code

#### Pages & Routes
```
app/
├── page.tsx                    # / - Password gate (login page)
├── page.module.css             # Password gate styles
├── layout.tsx                  # Root app layout
├── identify/
│   ├── page.tsx               # /identify - Choose Coris or Al
│   └── identify.module.css     # Identity picker styles
├── dashboard/
│   ├── page.tsx               # /dashboard - Song list and create
│   └── dashboard.module.css    # Dashboard styles
└── songs/
    └── [id]/
        ├── page.tsx           # /songs/[id] - Song detail with versions
        ├── song.module.css    # Song detail styles
        └── versions/
            └── [versionId]/
                ├── page.tsx   # /songs/[id]/versions/[versionId] - Waveform player
                └── version.module.css  # Waveform player styles
```

#### API Routes (Backend)
```
app/api/
├── auth/
│   └── verify-password/
│       └── route.ts           # POST - Verify shared password
├── songs/
│   └── create/
│       └── route.ts           # POST - Create song + get upload URL
├── versions/
│   └── create/
│       └── route.ts           # POST - Create version + get upload URL
├── threads/
│   ├── create/
│   │   └── route.ts           # POST - Create comment thread
│   └── reply/
│       └── route.ts           # POST - Reply to thread
└── email/
    └── notify-thread/
        └── route.ts           # POST - Send email notification
```

#### Utilities & Libraries
```
lib/
├── auth.ts                    # Session, identity, password helpers
├── supabase.ts               # Client-side Supabase initialization
└── supabaseServer.ts         # Server-side Supabase initialization
```

#### Global Styles
```
styles/
└── globals.css               # Global styles (black/white, Helvetica)
```

## 🔧 Setup Steps

### 1. Environment Setup
```bash
npm install
cp .env.local.example .env.local
# Fill in .env.local with your credentials
```

### 2. Get Credentials
- **Supabase URL, Keys**: From https://supabase.com (Settings > API)
- **Resend API Key**: Already provided: `re_PcJq6dm4_HQAFqdmJS7u9nQ1BsLnLcYry`

### 3. Database Setup
- Create Supabase project
- Run `SUPABASE_SCHEMA.sql` in SQL Editor
- Create `song-files` bucket in Storage

### 4. Run Locally
```bash
npm run dev
# Open http://localhost:3000
```

### 5. Deploy to Vercel
- Push to GitHub
- Import in Vercel
- Set environment variables
- Deploy

See **DEPLOYMENT.md** for detailed instructions.

## 📋 Dependencies

### Core
- `next@14.0.0` - React framework
- `react@18.2.0` - UI library
- `react-dom@18.2.0` - React DOM

### Database & Storage
- `@supabase/supabase-js@2.38.0` - Supabase client
- `@supabase/auth-helpers-nextjs@0.8.0` - Auth helpers

### Audio
- `wavesurfer.js@7.8.0` - Waveform player

### Email
- `resend@3.0.0` - Email service

### Utilities
- `date-fns@2.30.0` - Date formatting

### Dev
- `typescript@5` - Type checking
- `@types/node@20` - Node.js types
- `@types/react@18` - React types
- `@types/react-dom@18` - React DOM types

## 🎯 Key Features

- ✅ Shared password authentication
- ✅ Two-person identity system (Coris/Al)
- ✅ Song and version management
- ✅ WaveSurfer.js waveform player
- ✅ Click-to-comment at timestamps
- ✅ Threaded discussions
- ✅ Email notifications via Resend
- ✅ Deep linking to threads
- ✅ Minimal black/white UI

## 📊 File Sizes & Line Counts

```
App Pages:              ~600 lines
API Routes:             ~400 lines
Utilities:              ~200 lines
Styles:                 ~500 lines
Config:                 ~100 lines
Documentation:          ~1000 lines
Database Schema:        ~100 lines
────────────────────
Total:                  ~2900 lines
```

## 🔍 Architecture Overview

```
User → Browser
    ↓
[Pages (Next.js)]
    ↓
[API Routes (Next.js)]
    ↓
[Supabase DB] ← [Supabase Storage] ← [MP3 Files]
    ↓
[Resend] ← [Email Service]
```

## 🚀 Deployment Targets

### Vercel (Recommended)
- Zero-config deployment
- Free tier available
- Automatic HTTPS
- Environment variables in dashboard
- Serverless functions for API

### Other Hosts
- Any Node.js 18+ host
- Requires: npm, environment variables
- Build: `npm run build`
- Start: `npm run start`

## 📱 Supported Browsers

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (responsive design)

## 🔒 Security

- ✅ Password verified server-side
- ✅ Identity stored in secure HTTP-only cookie
- ✅ File uploads via signed URLs (1-hour expiry)
- ✅ Supabase RLS enabled
- ✅ Email sent only to pre-configured addresses

## 📝 Database Schema

### 4 Tables:
1. **songs** - Song titles
2. **song_versions** - Song versions (MP3s)
3. **comment_threads** - Timestamped comment threads
4. **comments** - Individual comments in threads

See `SUPABASE_SCHEMA.sql` for full schema.

## ⚡ Performance Notes

- WaveSurfer.js decodes entire MP3 (typical 5-10MB fine)
- Comments cached in browser state
- Supabase queries use indexes
- No database pagination (internal app)
- Signed URLs for secure file access

## 🎓 Learning Resources

- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **Resend**: https://resend.com/docs
- **WaveSurfer**: https://wavesurfer.xyz
- **TypeScript**: https://www.typescriptlang.org/docs

## ❓ FAQ

**Q: Can I add more users?**
A: Not in v1. App is hardcoded for Coris & Al. To add users, you'd need to implement full auth.

**Q: Can I delete songs/comments?**
A: Not in v1. This was intentionally omitted. Add delete endpoints as needed.

**Q: What audio formats are supported?**
A: MP3 only in v1. WaveSurfer.js supports more if you enable them.

**Q: How many songs/comments can I have?**
A: Unlimited. Supabase free tier has 500MB database and 1GB storage (suitable for months of use).

**Q: Can I self-host?**
A: Yes, deploy to any Node.js host. You'll need Supabase (can also self-host) and Resend (or another email service).

## 🆘 Troubleshooting

See **DEPLOYMENT.md** for detailed troubleshooting.

Quick fixes:
```bash
# Clear npm cache and reinstall
rm -rf node_modules
npm install

# Reset Next.js build
rm -rf .next
npm run build

# Check TypeScript errors
npx tsc --noEmit
```

## 📄 License

Open source. Use freely.

---

**Last Updated**: March 24, 2026
**Status**: ✅ Production Ready
**Version**: 1.0.0 Complete
