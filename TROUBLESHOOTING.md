# Troubleshooting Guide

Solutions for common issues and how to debug problems.

## Login & Authentication Issues

### Password Not Working

**Problem:** Password field doesn't accept input on mobile

**Solutions:**
1. **Clear Browser Cache**
   - Mobile Safari: Settings → Safari → Clear History and Website Data
   - Chrome Mobile: Menu → Settings → Privacy → Clear Browsing Data

2. **Try Incognito Mode**
   - Chrome: Menu → New Incognito Tab
   - Safari: File → New Private Window

3. **Check Keyboard**
   - Ensure mobile keyboard is visible
   - Try switching keyboard (default to standard)
   - Use password manager if available

4. **Verify Password**
   - Password is: `further_forever`
   - Check for typos (case-sensitive)
   - No extra spaces

**Technical Details:**
- Password verified in `/api/auth/verify-password`
- Cookie set after verification
- If this fails, check browser console for API errors

---

### Can't Find Identity Picker

**Problem:** After entering password, page doesn't navigate to `/identify`

**Solutions:**
1. **Refresh Page**
   - Full page reload (Cmd+Shift+R or Ctrl+Shift+R)
   - Wait 3-5 seconds

2. **Check Browser Console**
   - Right-click → Inspect → Console tab
   - Look for red error messages
   - Screenshot and report errors

3. **Clear Cookies**
   - Safari: Preferences → Privacy → Manage Website Data
   - Chrome: Settings → Cookies and site data → Clear all

4. **Try Different Browser**
   - Switch to Chrome, Safari, Firefox, Edge
   - See if issue persists

---

### Identity Changes Not Sticking

**Problem:** Switching between Coris and Al doesn't persist

**Solutions:**
1. **Enable LocalStorage**
   - Check if browser allows local storage
   - Settings → Privacy/Security → Content Settings
   - Allow cookies and site data

2. **Incognito Mode Won't Work**
   - Incognito blocks localStorage
   - Use regular browser mode instead

3. **Clear Conflicting Data**
   - Open DevTools → Application → LocalStorage
   - Find `app_identity` or similar key
   - Delete and refresh

---

## Dashboard Issues

### Songs Not Loading

**Problem:** Dashboard shows empty songs list or loading spinner indefinitely

**Solutions:**
1. **Check Network Connection**
   - Open DevTools → Network tab
   - Reload page
   - Look for failed requests (red indicators)
   - Check if any requests are stuck in "pending"

2. **Verify Supabase Connection**
   - Open DevTools → Console
   - Paste: `console.log(localStorage.getItem('sb-auth'))`
   - Should show authentication token
   - If null, re-login

3. **Check Supabase Status**
   - Visit: https://status.supabase.com
   - Look for service incidents
   - If degraded, wait a few minutes

4. **Clear Cache & Reload**
   - Ctrl+Shift+Del (Windows) or Cmd+Shift+Del (Mac)
   - Select "All time"
   - Reload page

5. **Force Refresh**
   - Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
   - Close tab and reopen

---

### New Song Redirects to "Song Not Found"

**Problem:** Creating a song navigates to `/songs/undefined`

**Solutions:**
1. **Check API Response**
   - This indicates the API is not returning a song ID
   - Open DevTools → Network tab
   - Create a new song
   - Check POST `/api/songs/create` response
   - Should see `{"songId": "..."}`
   - If error, check server logs on Vercel

2. **Verify Supabase Tables Exist**
   - Go to https://app.supabase.com
   - Select your project
   - Check if `songs` table exists
   - If missing, run SQL to create it (see DATABASE.md)

3. **Check Env Variables**
   - Vercel Dashboard → Settings → Environment Variables
   - Verify all Supabase env vars are set correctly
   - Redeploy if any changed

---

### Can't Delete Song

**Problem:** Clicking trash icon does nothing or shows error

**Solutions:**
1. **Check Confirmation Dialog**
   - Trash click should show "Delete '[Title]'?"
   - If no dialog, may be JavaScript error
   - Check console for errors

2. **Verify Permissions**
   - Check Supabase RLS (Row Level Security) policies
   - Go to: Database → Policies (on `songs` table)
   - If policies too restrictive, delete song may fail
   - Recommended: Allow DELETE for all authenticated users

3. **Check Network**
   - DevTools → Network tab
   - Click trash
   - Look for DELETE `/api/songs/[id]`
   - Check response status (should be 200)

4. **Slow Network**
   - Delete may take a few seconds (cascades to related data)
   - Wait 5-10 seconds before trying again

---

### Images Not Showing

**Problem:** Cover art doesn't appear on song cards

**Solutions:**
1. **Verify Image Uploaded**
   - Click image icon on song card
   - Select image file
   - Check browser console for errors
   - Look for "Image uploaded successfully" message

2. **Check Storage Bucket**
   - Supabase Dashboard → Storage → `song-images`
   - Look for folder with song ID
   - Should contain image file
   - If missing, upload failed silently

3. **Bucket Permissions**
   - Click `song-images` bucket
   - Check if it's PUBLIC
   - If PRIVATE, change to PUBLIC in policies
   - Or add policy to allow read access

4. **File Format**
   - Ensure uploading jpg, png, gif, or webp
   - Not: svg, webp with transparency (sometimes issue)
   - Try smaller file (< 1MB)

5. **Cache Issue**
   - Image URL correct but cached image wrong
   - Hard refresh (Ctrl+Shift+R)
   - Or open DevTools → Network → Disable Cache

---

## Waveform & Audio Issues

### Waveform Not Loading

**Problem:** Version page shows loading spinner but no waveform appears

**Solutions:**
1. **Check Audio File**
   - Verify file was uploaded successfully
   - Supabase → Storage → `song-files`
   - Look for `songs/[songId]/version-[num]/[filename]`
   - If missing, upload failed

2. **Audio Format**
   - Supported: wav, mp3, m4a, flac, ogg
   - Some formats may not work on all browsers
   - Try converting to mp3 or wav
   - Use FFmpeg: `ffmpeg -i input.m4a output.mp3`

3. **File Size**
   - WaveSurfer.js can handle large files but slower
   - Waveform rendering slower for files > 50MB
   - For testing, use file < 10MB

4. **CORS Issues**
   - Check browser console for CORS error
   - Storage bucket must allow public read
   - Verify bucket policies in Supabase

5. **Browser Support**
   - WaveSurfer.js requires modern browser
   - Works on: Chrome, Safari, Firefox, Edge (latest)
   - May not work on very old browsers

---

### Audio Won't Play

**Problem:** Play button doesn't play audio, or audio plays silently

**Solutions:**
1. **Check Browser Volume**
   - Ensure system volume not muted
   - Check browser tab volume control (if available)
   - Check device mute switch (on some devices)

2. **Audio Format Compatibility**
   - Some formats not supported on all browsers
   - Try different audio codec
   - Chrome: wav, mp3 (better support)
   - Safari: m4a, wav (better support)

3. **Check Console for Errors**
   - DevTools → Console
   - Play audio, watch for errors
   - Common error: "Unsupported media type"
   - Solution: Re-encode audio to mp3

4. **Storage URL Issue**
   - Check if signed URL expired
   - Signed URLs valid for 1 hour
   - Refresh page to get new URL
   - Check storage bucket is PUBLIC

---

### Comments Not Showing on Waveform

**Problem:** Click waveform but no comment marker appears

**Solutions:**
1. **Check Comments Loaded**
   - Scroll comments panel on right
   - Should show list of comment threads
   - If empty, no comments exist

2. **Verify Thread Creation**
   - Comments panel should show new comment instantly
   - If not, check network (DevTools → Network)
   - POST `/api/threads/create` should return 200
   - If error, check console

3. **Markers Not Rendering**
   - WaveSurfer.js plugin needs to render markers
   - Refresh page
   - Check browser console for plugin errors

4. **Color Conflict**
   - Markers may be same color as waveform
   - Usually colored circles, should be visible
   - If not visible, may be rendering bug
   - Try different resolution/browser

---

## Action Tracking Issues

### Actions Not Showing in Dashboard

**Problem:** Created action but doesn't appear in Actions panel

**Solutions:**
1. **Check Filter**
   - Make sure you're viewing ALL (not just PENDING)
   - Click "ALL" filter button
   - Should see all actions regardless of status

2. **Verify Action Created**
   - Go to version page where you marked comment as action
   - Scroll comments to find that comment
   - Should show "Marked as action" or similar indicator
   - If not marked, re-do the action creation

3. **Check Song Grouping**
   - Actions grouped by song
   - Scroll actions panel to find song
   - Action may be below other actions for same song
   - Try filtering by "PENDING" to narrow list

4. **Reload Dashboard**
   - Full page reload (Cmd+R or Ctrl+R)
   - Close and reopen tab
   - Actions list should refresh

---

### Can't Mark Comment as Action

**Problem:** "Mark as Action" button doesn't work or shows error

**Solutions:**
1. **Check Button Visibility**
   - On each comment, should see small button
   - May need to hover to see it
   - Scroll comment right if cut off

2. **Verify Modal Opens**
   - Click "Mark as Action"
   - Modal should appear with editable description
   - If no modal, check console for JavaScript error

3. **Check Network**
   - DevTools → Network tab
   - Click "Mark as Action"
   - POST `/api/actions/create` should appear
   - Check response status (should be 200)
   - If error, check response error message

4. **Missing Data**
   - Ensure you have:
     - Valid songId (should auto-populate)
     - Valid commentId (should auto-populate)
     - Non-empty description (can edit in modal)
   - If any missing, that's the issue

---

## Settings & Customization Issues

### Colors Not Saving

**Problem:** Change colors, click Save, but colors revert on reload

**Solutions:**
1. **Check Database Connection**
   - Supabase connection may be failing silently
   - Open DevTools → Network tab
   - Click "Save Theme"
   - POST `/api/settings` should appear
   - Check response status (should be 200)
   - If 500, database error

2. **Verify Settings Table Exists**
   - Supabase → SQL Editor
   - Run: `SELECT COUNT(*) FROM settings;`
   - If error "table doesn't exist", run setup SQL
   - See DATABASE.md for create table script

3. **Check User Identity**
   - Settings tied to logged-in user (Coris/Al)
   - Change identity and try to save
   - Then switch back and check if saved
   - Make sure localStorage stores identity correctly

4. **Clear Settings & Retry**
   - Supabase → Table Editor → settings
   - Find and delete row for your user
   - Go back to app, try saving colors again
   - Will create new settings row

---

### Colors Not Updating Live

**Problem:** Color picker doesn't show instant preview

**Solutions:**
1. **Check Input**
   - Type in hex code (e.g., #ff00ff)
   - Should see page colors change immediately
   - If not, JavaScript may be blocked

2. **Browser Console Check**
   - DevTools → Console
   - Look for error messages
   - May be React rendering issue
   - Refresh page and try again

3. **Try Color Box Instead**
   - Click color input box itself (not hex field)
   - Native color picker should appear
   - Select color visually
   - Should update page instantly

4. **Preset Buttons**
   - Click one of preset buttons (PULSE, OCEAN, etc.)
   - Should update all three colors instantly
   - If not, try different preset
   - Then try custom colors

---

### Color Picker Input Blocked

**Problem:** Can't click color input or hex field

**Solutions:**
1. **Check for Modal**
   - Make sure no modal is open
   - Close any open dialogs first
   - Then try color picker

2. **Input Focus**
   - Click directly on color box
   - Should show focus ring
   - Start typing hex code
   - Or browser color picker appears

3. **Try Mobile Browser**
   - Color pickers different on mobile
   - Tap the color box
   - Should show native mobile color picker
   - Select color and tap OK

---

## Email & Notification Issues

### Not Receiving Thread Notification Emails

**Problem:** Comment thread created but other user doesn't get email

**Solutions:**
1. **Check Email Addresses**
   - Vercel → Environment Variables
   - Verify `CORIS_EMAIL` and `AL_EMAIL` are correct
   - Make sure they match actual email addresses
   - No typos in email addresses

2. **Check Spam Folder**
   - Email may go to spam/junk
   - Check email spam filter
   - Add `onboarding@resend.dev` to contacts
   - Check email provider's settings

3. **Verify Resend API Key**
   - Vercel → Environment Variables
   - Check `RESEND_API_KEY` is correct
   - Log in to Resend dashboard
   - Verify API key is valid and not expired

4. **Check Thread Creation**
   - Make sure thread actually created
   - Comment should appear in comments list
   - If not, thread creation failed
   - No email sent if thread doesn't exist

5. **View Email Logs**
   - Resend Dashboard → Emails
   - Look for recent sends
   - If email shows as "failed", note error
   - Error may indicate email address problem

6. **Test Email API**
   - Can test manually with curl:
   ```bash
   curl -X POST "https://api.resend.com/emails" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "onboarding@resend.dev",
       "to": "your-email@example.com",
       "subject": "Test",
       "html": "<p>Test email</p>"
     }'
   ```

---

## Performance Issues

### App Slow to Load

**Problem:** Dashboard takes > 5 seconds to load

**Solutions:**
1. **Check Network Speed**
   - Use speedtest.net to test connection
   - Fast connection: > 10 Mbps download
   - Slow connection: Expect longer load times

2. **Check Supabase Status**
   - https://status.supabase.com
   - If degraded or down, that's the issue
   - Wait for service to recover

3. **Reduce Data**
   - If many songs/actions, dashboard slower
   - Implement pagination (future feature)
   - For now, delete old actions to improve speed

4. **Browser Performance**
   - Too many tabs open?
   - Close other tabs and try again
   - Restart browser
   - Clear cache (Ctrl+Shift+Del)

5. **Network Tab Debug**
   - DevTools → Network tab
   - Reload page
   - Look for slow requests
   - Anything > 3 seconds is slow
   - Check waterfall to see what's blocking

---

### Waveform Rendering Slow

**Problem:** Waveform takes long time to appear after navigating to version

**Solutions:**
1. **Audio File Size**
   - Large audio files render slower
   - Waveform generation is CPU-intensive
   - For files > 100MB, may take 10-30 seconds
   - Use smaller files for testing

2. **Browser Performance**
   - WaveSurfer.js uses Web Audio API
   - On slower devices, rendering takes longer
   - Try on different device/browser
   - Close other apps/tabs

3. **Audio Format**
   - Some formats decode slower
   - MP3 faster than FLAC
   - WAV fast but large file size
   - Try converting to MP3 if too slow

---

## Browser-Specific Issues

### Safari Issues

**Common Problems:**
- Color input not working → Use hex code field instead
- Audio formats → Use WAV or M4A
- LocalStorage issues → Clear site data

**Solutions:**
1. Clear site data: Settings → Privacy → Manage Website Data
2. Disable extensions: Safari → Preferences → Extensions
3. Try private window: File → New Private Window

---

### Chrome Issues

**Common Problems:**
- Notifications blocked → Settings → Privacy → Site Settings → Notifications
- Audio autoplay → Allow in site settings

**Solutions:**
1. Clear cache: Settings → Privacy → Clear Browsing Data
2. Disable extensions: Menu → More Tools → Extensions
3. Try incognito: Ctrl+Shift+N

---

### Firefox Issues

**Common Problems:**
- CORS errors → May need proxy
- Web Audio → Should work, but try enabling in about:config

**Solutions:**
1. Clear cache: Menu → Settings → Privacy → Clear Recent History
2. Disable addons: Menu → Add-ons → Manage
3. Try safe mode: Help → Restart in Safe Mode

---

## Server/Deployment Issues

### Getting 502 Bad Gateway

**Problem:** Page shows "502 Bad Gateway" error

**Solutions:**
1. **Check Vercel Status**
   - Vercel → Dashboard
   - Look for deployment status
   - Green = good, Red/Yellow = problem

2. **Check Recent Deployments**
   - Vercel → Deployments
   - Click latest deployment
   - Check if it succeeded
   - If failed, check build logs for errors

3. **Wait for Deployment**
   - After pushing to GitHub, wait 2-3 minutes
   - Check Vercel dashboard for "Building..."
   - Don't refresh during deployment

4. **Check Environment Variables**
   - Vercel → Settings → Environment Variables
   - Verify all variables are set
   - Verify no typos in values
   - Some changes need re-deploy

5. **Check GitHub Connection**
   - Vercel should auto-deploy on push
   - Verify GitHub connected
   - Check GitHub Actions (if enabled)

---

### Getting 500 Server Error

**Problem:** API endpoint returns 500 error

**Solutions:**
1. **Check Error Response**
   - DevTools → Network tab
   - Click failed request
   - Go to Response tab
   - Read error message carefully

2. **Check Supabase Connection**
   - Verify all Supabase env vars in Vercel
   - Test manually: https://xouiiaknskivrjvapdma.supabase.co/rest/v1/songs
   - Should return JSON (not 500)

3. **Check Database**
   - Supabase → SQL Editor
   - Run test query: `SELECT 1;`
   - If error, database may be down
   - Check Supabase status page

4. **Check Logs**
   - Vercel → project → Logs
   - Select latest deployment
   - Look for error stack traces
   - Screenshot and search error message

---

## Getting Help

### Before Reporting Bug

1. **Check This Guide** - Problem may be already documented
2. **Clear Cache** - Ctrl+Shift+Del (all data, all time)
3. **Try Different Browser** - Issue specific to browser?
4. **Check Console Errors** - Right-click → Inspect → Console
5. **Take Screenshot** - Include error message
6. **Note Steps to Reproduce** - Exactly what causes the issue

### Report Bug

Include:
- Browser name and version
- Operating system
- What you were doing when issue occurred
- Error message (if any)
- Screenshot (if visual issue)
- Steps to reproduce

### Check Logs

**Vercel Logs:**
- Dashboard → Project → Logs → Deployments/Functions

**Supabase Logs:**
- Dashboard → Logs → Database/Auth/Storage

**Browser Console:**
- Right-click → Inspect → Console tab
- Look for red error messages

---

Last updated: March 2026
