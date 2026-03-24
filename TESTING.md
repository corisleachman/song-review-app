# Testing Guide

## Test Scenarios

### Scenario 1: First Time User Flow

**Objective:** Verify complete flow from login to creating a comment

1. **Open app**
   - [ ] Navigate to http://localhost:3000
   - [ ] See password gate
   - [ ] Password field is focused

2. **Login with password**
   - [ ] Enter: `further_forever`
   - [ ] Click Enter
   - [ ] Redirected to identity picker

3. **Choose identity**
   - [ ] See "Who are you?" heading
   - [ ] Two buttons: Coris, Al
   - [ ] Click Coris
   - [ ] Redirected to dashboard

4. **Dashboard**
   - [ ] See "Song Review" title
   - [ ] See "Logged in as: Coris"
   - [ ] See "+ New Song" button
   - [ ] See "No songs yet" message

5. **Create first song**
   - [ ] Click "+ New Song"
   - [ ] Form appears with 3 fields
   - [ ] Song Title: "Test Song"
   - [ ] Version Label: "Demo"
   - [ ] File: Choose an MP3 file (use sample MP3)
   - [ ] Click "Create Song"
   - [ ] Loading state appears
   - [ ] Song appears in table after upload
   - [ ] Can see "Version 1 - Demo" in table

6. **Open song**
   - [ ] Click "Open" button for song
   - [ ] See song title "Test Song"
   - [ ] See version "Version 1 - Demo"
   - [ ] See "+ Upload New Version" button

7. **Play waveform**
   - [ ] Click "Open" on version
   - [ ] Waveform player loads
   - [ ] Waveform displays (gray with black progress)
   - [ ] Play button visible
   - [ ] Click Play
   - [ ] Audio plays (listen for sound)
   - [ ] Click Pause
   - [ ] Audio stops

8. **Create comment**
   - [ ] Click on waveform at 5 seconds
   - [ ] Comment form appears
   - [ ] Type: "This sounds great!"
   - [ ] Click "Post Comment"
   - [ ] Comment thread appears
   - [ ] Red dot marker visible on waveform

9. **Reply to comment**
   - [ ] See comment in thread
   - [ ] Type in reply field: "Thanks!"
   - [ ] Click Reply
   - [ ] Reply appears in thread

10. **Email notification**
    - [ ] Check email for Corisleachman@googlemail.com
    - [ ] Should NOT receive email (creator doesn't get notified)
    - [ ] Al@furthertcb@gmail.com should receive email
    - [ ] Email subject: "New comment on Test Song..."
    - [ ] Email contains timestamp
    - [ ] Email has "View Thread" button/link

---

### Scenario 2: Second User Flow (Al)

**Objective:** Verify Al can see Coris's changes and comment

1. **Login as Al**
   - [ ] Go to http://localhost:3000
   - [ ] Enter password: `further_forever`
   - [ ] Click identify > Al
   - [ ] On dashboard

2. **See Coris's song**
   - [ ] Dashboard shows "Test Song"
   - [ ] Latest version is "Version 1 - Demo"
   - [ ] Click Open

3. **See Coris's comment**
   - [ ] Waveform loads
   - [ ] Red marker visible at ~5 seconds
   - [ ] Click marker
   - [ ] Thread opens with Coris's comment
   - [ ] Can see reply from earlier

4. **Add Al's comment**
   - [ ] Type in reply field: "Love the vocals!"
   - [ ] Click Reply
   - [ ] Reply appears from Al

5. **Create new thread**
   - [ ] Click waveform at ~10 seconds
   - [ ] Type: "Needs more bass here"
   - [ ] Click "Post Comment"
   - [ ] New marker appears at 10s
   - [ ] Thread shows comment from Al

6. **Email notification**
   - [ ] Check Coris's email
   - [ ] Should receive email about Al's new comment
    - [ ] Should receive email about Al's reply

---

### Scenario 3: Version Management

**Objective:** Verify multiple versions work correctly

1. **Upload new version**
   - [ ] On song page (logged in as Coris)
   - [ ] Click "+ Upload New Version"
   - [ ] Version Label: "With Drums"
   - [ ] Upload different MP3
   - [ ] Form closes
   - [ ] New version appears: "Version 2 - With Drums"

2. **Comments are version-specific**
   - [ ] On Version 2
   - [ ] Waveform empty (no markers)
   - [ ] Create comment at 5s
   - [ ] Open Version 1
   - [ ] Old comments still there
   - [ ] No new comment from Version 2

3. **Rename version**
   - [ ] On song page
   - [ ] Click Edit button next to "Version 1 - Demo"
   - [ ] Change to: "Rough Draft"
   - [ ] Click Save
   - [ ] Version label updates to "Rough Draft"

4. **Rename song**
   - [ ] On song page
   - [ ] Click Edit next to song title
   - [ ] Change to: "Epic Track"
   - [ ] Click Save
   - [ ] Title updates
   - [ ] Dashboard shows new title

---

### Scenario 4: Deep Linking

**Objective:** Verify deep links to threads work

1. **Get deep link**
   - [ ] While on Version page with comments
   - [ ] Copy URL: `/songs/[id]/versions/[versionId]?thread=[threadId]`
   - [ ] Open in new tab while logged in as other user

2. **Thread opens automatically**
   - [ ] Page loads
   - [ ] Waveform appears
   - [ ] Correct thread is highlighted/opened
   - [ ] Playback seeked to thread timestamp
   - [ ] (Audio does NOT auto-play)

3. **Deep link while logged out**
   - [ ] Log out (close all tabs or clear cookies)
   - [ ] Click deep link from email
   - [ ] Redirected to password gate
   - [ ] Enter password
   - [ ] Choose identity
   - [ ] Automatically redirected to thread

---

### Scenario 5: Edge Cases

**Empty waveform**
1. [ ] Upload corrupt/invalid MP3
2. [ ] Waveform page shows error or empty
3. [ ] Can still create comments (though timing may be off)

**Many threads**
1. [ ] Create 20+ comments in one version
2. [ ] All markers visible on waveform
3. [ ] Can click any marker
4. [ ] Thread list scrolls if needed

**Very long song**
1. [ ] Upload MP3 > 10 minutes
2. [ ] Waveform loads (may take time)
3. [ ] Comments at 5min+ work correctly
4. [ ] Timestamp formatting correct (e.g., "5:30")

**Rapid clicking**
1. [ ] Click "Post Comment" multiple times quickly
2. [ ] Should only create one comment
3. [ ] Or show loading state to prevent duplicates

---

## Browser Testing

### Chrome/Edge
- [ ] Login works
- [ ] Waveform displays
- [ ] Audio plays
- [ ] Comments work
- [ ] Emails send

### Firefox
- [ ] All above
- [ ] CSS renders correctly
- [ ] WaveSurfer compatible

### Safari
- [ ] All above
- [ ] Audio support (should work)
- [ ] Cookie persistence

### Mobile (if testing responsively)
- [ ] Forms are readable
- [ ] Buttons clickable
- [ ] Waveform responsive
- [ ] No horizontal scroll needed

---

## API Testing

### Test with curl or Postman

**Verify password**
```bash
curl -X POST http://localhost:3000/api/auth/verify-password \
  -H "Content-Type: application/json" \
  -d '{"password":"further_forever"}'

# Should return: {"success":true}
```

**Create song**
```bash
curl -X POST http://localhost:3000/api/songs/create \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Test Song",
    "versionLabel":"Demo",
    "fileName":"test.mp3",
    "fileSize":5000000
  }'

# Should return: {
#   "songId":"[uuid]",
#   "versionId":"[uuid]",
#   "uploadUrl":"[signed-url]"
# }
```

**Get threads**
```bash
curl http://localhost:3000/api/songs/[songId]/versions/[versionId]/threads

# Should return array of threads with comments
```

---

## Email Testing

### In Resend Dashboard
1. [ ] Go to https://dashboard.resend.com/emails
2. [ ] See all sent emails
3. [ ] Check subject lines are correct
4. [ ] Check recipient emails are correct
5. [ ] Verify no "Failed" status

### Testing Email Links
1. [ ] Click "View Thread" link in email
2. [ ] Should open correct thread
3. [ ] If not logged in, redirects to login first
4. [ ] After login, opens to correct thread

### Email Content Verification
- [ ] Subject includes song name
- [ ] Subject includes version name
- [ ] Subject includes timestamp
- [ ] Body mentions who commented
- [ ] Body includes comment excerpt
- [ ] Body has clickable link

---

## Performance Testing

### Load Times (should be < 1 second each)
- [ ] Password gate: instant
- [ ] Identity picker: instant
- [ ] Dashboard with 10 songs: < 500ms
- [ ] Song page: < 300ms
- [ ] Version page without audio: < 500ms
- [ ] Waveform load: 1-5s (depends on file)

### Memory Usage
- [ ] App doesn't leak memory over time
- [ ] No significant slowdown after many comments
- [ ] Browser usage remains < 500MB

---

## Security Testing

### Password
- [ ] Wrong password rejected
- [ ] Correct password accepted
- [ ] Password not logged anywhere
- [ ] Password verified server-side

### Session
- [ ] Clearing cookies logs user out
- [ ] Session persists on page refresh
- [ ] Session expires after 7 days (manual testing)
- [ ] Different users see different identities

### Files
- [ ] Only MP3 files accepted
- [ ] Files not executable
- [ ] Files stored securely in Supabase
- [ ] Signed URLs expire after 1 hour

---

## Regression Testing

**After any code change:**
1. [ ] npm run build succeeds
2. [ ] npm run dev starts
3. [ ] Login flow works
4. [ ] Can create song
5. [ ] Can play audio
6. [ ] Can comment
7. [ ] Email sends
8. [ ] No console errors
9. [ ] No TypeScript errors: `npx tsc --noEmit`

---

## Performance Benchmarks

Record these values locally and on production:

**Dashboard**
- Load time: ___ ms
- Time to first comment: ___ ms

**Waveform Player**
- Load time: ___ ms
- Play/pause response: ___ ms
- Click to comment: ___ ms

**Email**
- Time from post to received: ___ seconds
- Email link works: yes/no

---

## Checklist for Deployment

Before deploying to Vercel:
- [ ] All scenarios above pass
- [ ] No console errors
- [ ] npm run build succeeds
- [ ] npm run dev works
- [ ] Tested in Chrome, Firefox, Safari
- [ ] Emails sending correctly
- [ ] Deep links work
- [ ] Performance acceptable
- [ ] Code reviewed
- [ ] Environment variables correct

---

## Known Issues

Add any known issues and their status here:

| Issue | Status | Workaround |
|-------|--------|-----------|
| (none yet) | - | - |

---

## Test Notes

Date of testing: ___________
Tested by: ___________
Browser/Version: ___________
Environment: local / staging / production

Any issues found:
___________________________________________________________
___________________________________________________________

---

For continuous testing, consider setting up:
- Automated tests with Jest/Vitest
- E2E tests with Cypress or Playwright
- GitHub Actions for CI/CD
