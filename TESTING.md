# Testing Guide

Use this as the current manual QA checklist after UI or workflow changes.

## Core Flow

### Login and identity

- [ ] Open `http://localhost:3000` or the active local port
- [ ] Password gate appears
- [ ] Successful password entry routes to identity picker
- [ ] Choosing `Coris` or `Al` lands on dashboard

### Dashboard

- [ ] Song grid/list renders cleanly
- [ ] Cover art upload still works
- [ ] New song creation routes into the first-version upload flow

## Upload Flows

### First version

- [ ] Create a new song
- [ ] Land on `/songs/[id]`
- [ ] Valid audio file can be selected or dropped
- [ ] Invalid file type shows a clear message
- [ ] File over 200 MB is rejected clearly
- [ ] Optional label is saved
- [ ] Progress updates during upload
- [ ] Successful upload routes into the version page

### Additional versions

- [ ] On an existing version page, click `Upload new version`
- [ ] File picker/modal opens
- [ ] File metadata and optional label display correctly
- [ ] Progress and error handling feel clear
- [ ] Successful upload lands on the new version

## Version Page

- [ ] Version metadata under the title is correct
- [ ] `Change Version` modal opens and switches cleanly
- [ ] Inline version label editing still works
- [ ] Play / pause / seek work
- [ ] Leaving the page stops playback
- [ ] Switching versions does not leave the old audio running underneath

## Comments and Threads

- [ ] Clicking waveform creates a new thread at the intended timestamp
- [ ] Replying to a thread works
- [ ] Active user bubble aligns right, other user aligns left
- [ ] `Mark as action` aligns with the comment side
- [ ] Selected thread header shows:
- [ ] `Jump to time`
- [ ] `Copy timestamp`
- [ ] `Copy link`
- [ ] Thread list shows timestamp, count, preview, and last replier
- [ ] Deep link with `?thread=` reopens the correct thread

## Actions

- [ ] Action can be created from a comment
- [ ] Initial status can be chosen on creation
- [ ] Status cycles through `pending`, `approved`, `completed`
- [ ] Editing action description works
- [ ] Editing action status works

## Song Admin

- [ ] Task can be added
- [ ] Task can be edited
- [ ] Task can be completed
- [ ] Task can be deleted
- [ ] Drag reorder still works

## Mobile

- [ ] Top hero uses separate nav row and action row
- [ ] Spacing between rows feels breathable
- [ ] Artwork lines up well with the title block
- [ ] Below-waveform section order is:
- [ ] conversation threads
- [ ] actions
- [ ] song admin
- [ ] Buttons are easy to tap
- [ ] Modals and reply controls are not cramped

## Regression Checks

- [ ] `npx tsc --noEmit`
- [ ] No obvious runtime errors on initial load
- [ ] Waveform still loads consistently after refreshes and version switches
