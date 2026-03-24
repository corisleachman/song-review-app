# Advanced Setup & Troubleshooting

## Local Development

### First Time Setup

```bash
# Clone or download the project
cd song-review-app

# Install dependencies
npm install

# Create .env.local
cp .env.local.example .env.local

# Edit .env.local with your credentials
nano .env.local

# Start dev server
npm run dev

# Visit http://localhost:3000
```

### IDE Setup

**VS Code** (Recommended)
- Install "Tailwind CSS IntelliSense" (optional, for CSS)
- Install "Prettier" for code formatting
- Settings: Enable "Format on Save"

**Environment Variables in VS Code**
- Install "Environment Manager" extension (optional)
- Or manually edit `.env.local`

### Debugging

**Client-Side**
```bash
# In browser DevTools (F12)
# Console tab: see all console.log and errors
# Network tab: see API calls and file uploads
# Application tab: see cookies
```

**Server-Side**
```bash
# In terminal where you ran npm run dev
# See all console.log from API routes and server code
# See build errors
```

**Network Issues**
```bash
# Enable verbose logging in browser
# Inspect Network tab for failed requests
# Check CORS errors (Supabase should handle)
# Verify API keys are correct
```

## Supabase Troubleshooting

### Connection Issues

**"Error: Invalid API Key"**
- Check `NEXT_PUBLIC_SUPABASE_URL` format (should have .supabase.co)
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is not truncated
- Regenerate keys in Supabase > Settings > API

**"Connection refused"**
- Verify Supabase project is running (check dashboard)
- Check internet connection
- Try restarting dev server

### Data Issues

**"Relations not loading"**
```sql
-- In Supabase SQL Editor, check if data exists:
SELECT * FROM songs LIMIT 5;
SELECT * FROM song_versions LIMIT 5;
SELECT * FROM comment_threads LIMIT 5;
SELECT * FROM comments LIMIT 5;
```

**"Versions not showing up"**
- Refresh browser (Cmd+Shift+R to hard refresh)
- Check Supabase dashboard for data
- Check `song_versions` table - should have records
- Verify foreign key constraint (song_id should exist)

**"Storage bucket not accessible"**
```bash
# Verify bucket exists in Supabase > Storage
# Verify bucket name is "song-files" (lowercase)
# Verify bucket is NOT private
# Check bucket permissions
```

### Row Level Security (RLS)

**"Permission denied" errors**
- In Supabase > Authentication > Policies
- Verify policies allow all access (they should for this app)
- If needed, re-enable policies from SUPABASE_SCHEMA.sql

## Resend Email Troubleshooting

### Emails Not Sending

**"API key invalid"**
```bash
# Verify in .env.local:
RESEND_API_KEY=re_PcJq6dm4_HQAFqdmJS7u9nQ1BsLnLcYry

# Check Resend dashboard for key
# Regenerate if needed at https://dashboard.resend.com
```

**"Invalid email address"**
- Verify email format in `.env.local`
- Check for typos in CORIS_EMAIL and AL_EMAIL
- Emails must be valid format (user@domain.com)

**"Rate limit exceeded"**
- Resend free tier: 100 emails per day
- Wait until next day
- Upgrade plan for more emails

**Debugging Emails**
```bash
# Check Resend dashboard > Emails
# See all sent/failed emails
# View full error message
# Resend provides bounce, hard fail, etc.
```

### Testing Emails Locally

```typescript
// In /api/email/notify-thread/route.ts, add logging:
console.log('Sending email to:', recipient);
console.log('Subject:', subject);

// Check terminal output
// Verify Resend response
```

## WaveSurfer Troubleshooting

### Waveform Not Displaying

**Audio not loading**
- Check browser DevTools Network tab
- Verify MP3 URL is correct (should be Supabase URL)
- Check MP3 file is valid (try in browser media player)
- Check CORS headers (Supabase handles this)

**"Uncaught TypeError: wavesurfer is not defined"**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
npm run dev
```

**Waveform shows but no sound**
- Check audio is not muted in browser
- Try in different browser
- Verify MP3 file is valid
- Check audio volume settings

### Performance Issues

**Slow waveform rendering**
- Large MP3 files (>20MB) may take time to decode
- WaveSurfer decodes entire file in browser
- This is expected behavior
- Consider encoding MP3 files at 128-192kbps instead of 320kbps

## File Upload Issues

### Upload Fails

**"Failed to upload audio file"**
```bash
# Check browser Network tab
# Verify signed URL is valid
# Signed URLs expire after 1 hour
# Try uploading again
```

**"File too large"**
- Supabase free tier: 1GB total storage
- Default limit per file: no hard limit but practical is 500MB
- Compress MP3 files before upload
- Use lower bitrate for encoding

**"Invalid file type"**
- Only MP3 files accepted
- Check file extension is `.mp3`
- Verify MIME type is `audio/mpeg`
- Try converting file using online tool

## Session & Auth Issues

### "Keep getting logged out"

**Cookies not persisting**
- Browser security settings blocking cookies
- Try in Incognito/Private window
- Check browser cookie settings
- In Safari: Preferences > Privacy > Allow cookies

**"Session expired" on deep link**
```bash
# In /identify page:
# If not authenticated, should redirect to password gate
# Then redirect back to original URL via ?redirectTo param
# If not working, check cookies are set
```

### "Wrong password accepted"

**This shouldn't happen - password verified server-side**
- Check `.env.local` SHARED_PASSWORD is correct
- Verify POST /api/auth/verify-password returns proper response
- Check network tab to see actual response

## Performance Optimization

### Slow Page Loads

**Dashboard takes long to load**
```bash
# Check if many songs exist
# Supabase query: SELECT COUNT(*) FROM songs;
# If > 1000, consider pagination
# Currently loads all songs at once
```

**Waveform page slow**
- Check if loading large MP3
- Check if many comments/threads
- Currently loads all threads at once
- For > 1000 threads, consider pagination

### Optimizing for Production

**Build time**
```bash
npm run build
# Should take < 1 min
# If longer, check for issues in console
```

**Bundle size**
```bash
npm run build
# Check .next/static/chunks for large files
# WaveSurfer.js typically ~100KB
# Supabase client ~50KB
```

## Deployment to Vercel

### Before Deploying

**Checklist**
```bash
# ✅ npm install runs without errors
✓ npm install

# ✅ npm run build succeeds
✓ npm run build

# ✅ npm run dev works locally
✓ npm run dev

# ✅ Password gate works
✓ Test at localhost:3000

# ✅ Can create song and upload MP3
✓ Test full flow

# ✅ Emails sent successfully
✓ Check Resend dashboard

# ✅ Deep links work
✓ Test ?thread= param
```

### Vercel Deployment

**Environment Variables in Vercel**
- Settings > Environment Variables
- Add all from `.env.local`
- Values are shown as `re_***` (masked)
- Click "Decrypt" to verify
- Deploy after adding variables

**Deployment Preview**
```bash
# Vercel shows deployment at: https://[project]-git-main-[team].vercel.app
# Test in preview before promoting to production
```

**Promoting to Production**
```bash
# In Vercel dashboard:
# Click "Promote to Production"
# Or push to main branch (if auto-deploy enabled)
# Production URL: https://your-domain.vercel.app
```

### Post-Deployment

**Update App URL**
```bash
# In Vercel Environment Variables:
# Set NEXT_PUBLIC_APP_URL to production domain
# Example: https://my-song-review.vercel.app

# Then redeploy:
# Any commit to main branch
# Or manually click "Redeploy" in Vercel
```

**Test Production**
```bash
# Go to production URL
# Test full flow: password, identity, create song, comment, email
# Check that deep links work from emails
# Verify email comes from Resend
```

## Monitoring & Logs

### Check Logs

**Vercel Logs**
- In Vercel dashboard: Deployments > Select deployment > Logs
- Shows API errors, build issues
- Real-time streaming

**Supabase Logs**
- In Supabase: Logs or Monitoring
- Shows database errors, slow queries
- API errors

**Resend Logs**
- https://dashboard.resend.com/emails
- Shows all sent emails
- Failed emails with error reasons

## Common Errors & Solutions

### "NEXT_PUBLIC_SUPABASE_URL is undefined"
```bash
# Solution: Check .env.local is in root of project
# File should be at: ./env.local (not in app/ or lib/)
# Restart dev server after creating file
```

### "Supabase storage bucket not found"
```bash
# Solution: 
# 1. Create bucket in Supabase > Storage
# 2. Name must be: song-files
# 3. Uncheck "Private bucket"
# 4. Create
```

### "WaveSurfer is not defined"
```bash
# Solution:
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### "Deep link doesn't work"
```bash
# Solution:
# 1. Verify thread ID exists in database
# 2. Check NEXT_PUBLIC_APP_URL is correct
# 3. Make sure user is authenticated before clicking link
# 4. Try without ?thread param first
```

### "Email never received"
```bash
# Solutions:
# 1. Check Resend dashboard for failed email
# 2. Verify recipient email is correct
# 3. Check spam folder
# 4. Verify Resend API key is correct
# 5. Check email is within 100/day limit
```

## Getting Help

### Check These First

1. **Browser Console** (F12)
   - Look for red errors
   - Check Network tab for 4xx/5xx responses
   - Check Application tab for cookies

2. **Terminal** (where you ran npm run dev)
   - Look for error messages
   - Check API route logs
   - Check build errors

3. **Supabase Dashboard**
   - Verify data exists in tables
   - Check Storage for uploaded files
   - Look for RLS policy issues

4. **Resend Dashboard**
   - Check email delivery status
   - See error messages for failed sends

### Documentation

- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Resend: https://resend.com/docs
- WaveSurfer: https://wavesurfer.xyz
- Vercel: https://vercel.com/docs

## Performance Benchmarks

**Expected load times:**
- Login: < 100ms
- Dashboard load: < 500ms (with 10-50 songs)
- Song page load: < 300ms
- Waveform load: 1-5s (depends on MP3 size)
- Comment creation: < 500ms
- Email send: < 2s (async, user doesn't wait)

**Expected file sizes:**
- App JS bundle: ~150KB (gzipped)
- Waveform JS: ~100KB
- CSS: ~50KB
- MP3 files: 2-10MB each

## Advanced Configuration

### Custom Domain on Vercel

```bash
# In Vercel dashboard:
# Settings > Domains
# Add your domain
# Follow DNS setup instructions
# Update NEXT_PUBLIC_APP_URL to new domain
```

### Custom Email Domain in Resend

```bash
# In Resend dashboard:
# Domains
# Add your domain
# Configure SPF, DKIM, DMARC (Resend provides instructions)
# Update email sender in api/email/notify-thread/route.ts
```

### Database Backups

```bash
# Supabase handles automatic backups
# Free tier: 7-day retention
# To export data:
# In Supabase > Database > Backups
# Or use pg_dump command
```

---

For issues not covered here, check the documentation links above or the project's GitHub issues.
