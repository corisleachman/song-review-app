# Song Review App - Deployment Guide

## Quick Start

### Step 1: Supabase Setup

1. Go to https://supabase.com and create a free project
2. Once created, go to the **SQL Editor**
3. Create a new query and paste the entire contents of `SUPABASE_SCHEMA.sql`
4. Run the query

#### Create Storage Bucket

1. In Supabase, go to **Storage**
2. Click **+ New Bucket**
3. Name: `song-files`
4. Uncheck "Private bucket" to allow public access
5. Click **Create bucket**

#### Get Your Keys

1. Go to **Settings > API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Resend Setup

1. Go to https://resend.com
2. Sign up (free)
3. Go to **API Keys**
4. Copy your API key → `RESEND_API_KEY`

### Step 3: Local Setup

1. Clone this repo (or download the files)
2. Run:
   ```bash
   npm install
   ```

3. Create `.env.local` in the root:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

   SHARED_PASSWORD=further_forever
   CORIS_EMAIL=corisleachman@googlemail.com
   AL_EMAIL=furthertcb@gmail.com

   RESEND_API_KEY=re_PcJq6dm4_HQAFqdmJS7u9nQ1BsLnLcYry
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000

### Step 4: Vercel Deployment

1. **Initialize git** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub**:
   - Create a new repo on GitHub
   - Push your code to it

3. **Deploy to Vercel**:
   - Go to https://vercel.com
   - Click **New Project**
   - Import your GitHub repo
   - Click **Continue**

4. **Environment Variables**:
   - In the "Environment Variables" section, add all variables from `.env.local`
   - Click **Deploy**

5. **After Deployment**:
   - Update `NEXT_PUBLIC_APP_URL` in Vercel to your production URL
   - Redeploy

### Testing the App

1. Go to your app (local or Vercel)
2. Password: `further_forever`
3. Choose Coris or Al
4. Create a song and upload an MP3
5. Open the version
6. Click the waveform to add a comment
7. The other person should receive an email

## Troubleshooting

### "Cannot find module 'wavesurfer.js'"
Run `npm install` again and restart the dev server.

### Waveform not loading
- Make sure the MP3 file was uploaded successfully to Supabase Storage
- Check browser DevTools Network tab for 404s
- Verify storage bucket is public or signed URLs are working

### Email not sending
- Check that `RESEND_API_KEY` is correct
- Verify email addresses are valid
- Check Resend dashboard for failed deliveries
- Note: Resend may require SPF/DKIM setup for production

### Deep links not working
- Make sure `NEXT_PUBLIC_APP_URL` is set correctly
- Verify thread ID in URL matches database
- Check that user enters password first before following deep link

## Database Schema Reference

### songs
- `id` UUID (primary key)
- `title` text
- `created_at` timestamp
- `updated_at` timestamp

### song_versions
- `id` UUID (primary key)
- `song_id` UUID (foreign key)
- `version_number` integer
- `label` text (optional)
- `file_path` text (path in storage)
- `file_name` text
- `created_by` text ('Coris' or 'Al')
- `created_at` timestamp
- `updated_at` timestamp

### comment_threads
- `id` UUID (primary key)
- `song_version_id` UUID (foreign key)
- `timestamp_seconds` integer
- `created_by` text ('Coris' or 'Al')
- `created_at` timestamp
- `updated_at` timestamp

### comments
- `id` UUID (primary key)
- `thread_id` UUID (foreign key)
- `author` text ('Coris' or 'Al')
- `body` text
- `created_at` timestamp

## Support

For issues with:
- **Supabase**: https://supabase.com/docs
- **Next.js**: https://nextjs.org/docs
- **Resend**: https://resend.com/docs
- **WaveSurfer**: https://wavesurfer.xyz
