# Deployment & Setup Guide

Complete instructions for deploying Song Review App from scratch.

## Overview

The Song Review App is deployed on Vercel with backend on Supabase. This guide covers:
1. Setting up Supabase database
2. Setting up Vercel deployment
3. Configuring environment variables
4. Running locally for development

## Prerequisites

You'll need accounts for:
- **GitHub** (for version control)
- **Supabase** (for database)
- **Vercel** (for hosting)
- **Resend** (for email)

All are free tier compatible.

---

## Step 1: Supabase Setup

### Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New project"
3. Enter project name: `song-review-app`
4. Select region closest to you
5. Create secure password (save it!)
6. Click "Create new project" (takes 2-3 minutes)

### Get Supabase Credentials

After project created:

1. Go to Settings → API
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon Key** (Public) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service Role Key** (Secret) → `SUPABASE_SERVICE_ROLE_KEY`
3. Save these values - you'll need them

### Create Database Tables

1. In Supabase, go to SQL Editor
2. Click "New Query"
3. Paste entire SQL from DATABASE.md setup section
4. Click "Run"
5. Verify all tables created (should see 6 tables in left sidebar)

### Create Storage Buckets

1. Supabase → Storage
2. Click "Create bucket"
3. Name: `song-files`
4. Make PUBLIC (toggle it)
5. Create
6. Repeat for `song-images` bucket

---

## Step 2: GitHub Setup

### Fork or Clone Repository

**Option A: Fork (recommended)**
```bash
# Fork from https://github.com/corisleachman/song-review-app
# Click "Fork" button
# Then clone your fork:
git clone https://github.com/YOUR_USERNAME/song-review-app.git
cd song-review-app
```

**Option B: Clone directly**
```bash
git clone https://github.com/corisleachman/song-review-app.git
cd song-review-app
```

### Install Dependencies

```bash
npm install
```

### Test Locally

```bash
npm run dev
```

Open http://localhost:3000 in browser

---

## Step 3: Vercel Deployment

### Create Vercel Project

1. Go to https://vercel.com/new
2. Select "Import Git Repository"
3. Select your GitHub repo (`song-review-app`)
4. Click "Import"
5. Don't configure env vars yet (next step)

### Set Environment Variables

1. Vercel Dashboard → Project Settings → Environment Variables
2. Add each variable:

```
NEXT_PUBLIC_SUPABASE_URL=https://xouiiaknskivrjvapdma.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_i7F...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_1D_yVORe...
SHARED_PASSWORD=further_forever
CORIS_EMAIL=corisleachman@googlemail.com
AL_EMAIL=furthertcb@gmail.com
RESEND_API_KEY=re_PcJq6dm...
NEXT_PUBLIC_APP_URL=https://song-review-app.vercel.app
```

3. For each variable:
   - Enter key and value
   - Make sure production is selected
   - Click "Add"

### Trigger Deployment

1. After env vars added, Vercel automatically redeploys
2. Go to Deployments tab
3. Wait for "Ready" status (green)
4. Click domain to test app

---

## Step 4: Resend Email Setup (Optional)

If you want email notifications:

1. Go to https://resend.com
2. Create account (free)
3. Verify email
4. Go to API Keys
5. Create API key
6. Copy and add to Vercel env vars as `RESEND_API_KEY`

Note: Without Resend key, app works but no emails sent

---

## Local Development Setup

### Clone Repository

```bash
git clone https://github.com/corisleachman/song-review-app.git
cd song-review-app
```

### Install Dependencies

```bash
npm install
```

### Create .env.local

Create `.env.local` file in root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xouiiaknskivrjvapdma.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_i7F...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_1D_yVORe...
SHARED_PASSWORD=further_forever
CORIS_EMAIL=corisleachman@googlemail.com
AL_EMAIL=furthertcb@gmail.com
RESEND_API_KEY=re_PcJq6dm...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Start Dev Server

```bash
npm run dev
```

Open http://localhost:3000

### Build for Production

```bash
npm run build
npm start
```

---

## Git Workflow

### Working on Features

```bash
# Create feature branch
git checkout -b feat/your-feature-name

# Make changes
# Test locally (npm run dev)

# Commit changes
git add .
git commit -m "feat: description of changes"

# Push to GitHub
git push origin feat/your-feature-name
```

### Create Pull Request (Optional)

1. Go to GitHub repo
2. Click "Pull requests"
3. Click "New pull request"
4. Select your branch
5. Create PR
6. Vercel will auto-build and comment on PR

### Merge to Main & Deploy

```bash
# After PR approved, merge to main
git checkout main
git pull origin main
git merge feat/your-feature-name

# Push (Vercel auto-deploys)
git push origin main
```

---

## Monitoring & Maintenance

### Check Deployment Status

**Vercel:**
- Visit https://vercel.com/dashboard
- Click project
- Deployments tab shows history
- Green checkmark = success
- Red X = failed deployment

**Logs:**
- Deployments → Click deployment → Logs tab
- Shows build output and any errors

### Check Database Health

**Supabase:**
- Go to https://app.supabase.com
- Select project
- Logs → Database (shows queries)
- Storage (shows file usage)

**Monitor Usage:**
- Settings → Billing
- Shows API calls, storage usage
- Free tier has limits, watch for overages

### Monitor Emails

**Resend:**
- Go to https://resend.com/dashboard
- Emails section shows all sent emails
- Check for failures
- Note: Transactional API (sends real emails)

---

## Custom Domain

### Add Domain to Vercel

1. Vercel → Project → Settings → Domains
2. Click "Add"
3. Enter domain name
4. Select "nameservers" or "CNAME" method
5. Follow instructions for your registrar

### Update Email Sender

If using custom domain for emails:

1. Resend → Domains
2. Add your domain
3. Follow DNS verification steps
4. Update `RESEND_FROM_EMAIL` in Vercel env vars

---

## Scaling Considerations

### When to Upgrade

**Vercel:**
- If hitting speed limits: upgrade to Pro
- Pro tier includes priority support
- Current usage: minimal (< 1M requests/month)

**Supabase:**
- Free tier includes 500K reads/month
- Current usage: minimal
- Monitor in Supabase Settings → Usage

**Resend:**
- Free tier includes 100 emails/month
- Current usage: minimal (only on thread creation)
- Pro tier: $20/month for unlimited

---

## Backup & Recovery

### Database Backups

**Supabase:**
- Auto backups daily on free tier
- Saved for 7 days
- Go to Backups in Supabase settings
- Can restore any backup with one click

### Code Backup

**GitHub:**
- All code in GitHub repo
- Can always clone/revert to any commit
- Go to Code → History to see all versions

### Manual Export

**Export database:**
```sql
-- In Supabase SQL Editor
SELECT * FROM songs;
SELECT * FROM song_versions;
-- etc. for all tables
```

---

## Security Best Practices

### Protect Credentials

1. **Never commit env vars**
   - Add `.env.local` to `.gitignore`
   - Always use Vercel env vars for production

2. **Rotate API Keys**
   - Change RESEND_API_KEY every 3 months
   - Change SUPABASE_SERVICE_ROLE_KEY if compromised
   - Generate new key in service dashboard
   - Update Vercel env vars
   - Redeploy

3. **Password Management**
   - `SHARED_PASSWORD` is simple for demo
   - For production, use proper auth (Auth0, Firebase)
   - Current setup: adequate for 2-person team

### Database Security

1. **RLS (Row Level Security)**
   - Currently disabled for simplicity
   - For multi-user system: enable RLS
   - Restrict data by user_identity

2. **Storage Permissions**
   - Song files: PUBLIC (anyone can read)
   - For private: implement RLS policies
   - Current setup: adequate for demo

---

## Troubleshooting Deployment

### Build Fails on Vercel

**Check logs:**
1. Vercel → Deployments
2. Click failed deployment
3. Logs tab shows error
4. Common issues:
   - Missing env var
   - Type errors in code
   - Supabase table missing

**Common Fixes:**
```bash
# Wrong Node version?
node --version  # Should be 18+

# Dependencies not installed?
npm install

# Type errors?
npm run build  # Test locally first

# Missing tables?
# Run SQL setup from DATABASE.md
```

### App Loads but No Data

1. Check Supabase URL in browser console
2. DevTools → Network tab → check API calls
3. Should see requests to `xouiiaknskivrjvapdma.supabase.co`
4. If blocked/failed, check:
   - CORS settings
   - RLS policies
   - Network connectivity

### Emails Not Sending

1. Check RESEND_API_KEY in Vercel env vars
2. Verify email addresses are correct
3. Check Resend dashboard for errors
4. Check spam folder on receiving end
5. Resend may need domain verification

---

## Development Tips

### Enable Debug Logging

In `lib/supabase.ts`:
```typescript
// Add logging
console.log('Supabase client created', supabase);
```

### Test API Endpoints

```bash
# Test auth endpoint
curl -X POST http://localhost:3000/api/auth/verify-password \
  -H "Content-Type: application/json" \
  -d '{"password": "further_forever"}'

# Test songs endpoint
curl http://localhost:3000/api/songs
```

### Database Queries

Run queries directly in Supabase SQL Editor:
```sql
-- Check songs
SELECT * FROM songs LIMIT 5;

-- Check actions
SELECT * FROM actions WHERE status = 'pending';

-- Delete test data
DELETE FROM songs WHERE created_at < NOW() - INTERVAL '1 day';
```

---

## Maintenance Checklist

**Weekly:**
- [ ] Check Vercel deployments (any failures?)
- [ ] Monitor Supabase usage
- [ ] Check Resend email logs

**Monthly:**
- [ ] Clean up old test data
- [ ] Review database backups
- [ ] Check security updates for dependencies

**Quarterly:**
- [ ] Update dependencies: `npm update`
- [ ] Rotate API keys
- [ ] Review and update documentation

---

## Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Resend Docs:** https://resend.com/docs
- **WaveSurfer.js Docs:** https://wavesurfer.xyz/docs

---

## Contact & Help

**Project Owner:** Coris Leachman  
**Email:** corisleachman@googlemail.com  
**GitHub:** https://github.com/corisleachman/song-review-app  

---

Last updated: March 2026
Version: 1.0.0
