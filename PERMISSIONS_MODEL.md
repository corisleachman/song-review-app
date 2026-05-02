# Workspace Roles & Permissions

## Purpose

This document defines the intended permission model for public workspaces before we make further access-control changes.

The guiding principle is that this is a collaboration app. A normal collaborator should be able to contribute songs, versions, comments, and actions. Owner-only controls should be reserved for workspace administration, billing, membership, and destructive or sensitive operations.

This is a planning and audit document. It records current behavior and recommended follow-up patches.

---

## Role Model

### Owner

The owner controls the workspace as a business/account container.

Owners should be able to:
- manage billing and plan state
- invite collaborators
- revoke pending invites
- remove members
- create songs
- rename songs
- upload cover art
- upload versions
- create comments and replies
- create and update actions
- create and manage song admin tasks
- delete songs
- eventually manage workspace-level settings

### Collaborator

The current database role is `member`. In product language, the default member role should behave like a collaborator.

Collaborators should be able to:
- view workspace songs
- create songs
- upload versions
- upload or update cover art
- create comments and replies
- create actions from comments
- update action status and assignments
- create and manage song admin tasks

Collaborators should not be able to:
- manage billing
- change plan state
- invite or remove members
- revoke invites
- delete songs
- delete the workspace

Recommendation:
- keep song deletion owner-only for the MVP
- keep non-destructive collaboration broad

### Reviewer / Commenter

This role is not implemented yet.

It would be useful later for people who should review without managing song assets.

Reviewers/commenters might be able to:
- view songs
- listen to versions
- comment and reply
- possibly create actions

Reviewers/commenters should not be able to:
- create songs
- upload versions
- delete songs
- manage members
- manage billing

This should be a future role, not a silent reinterpretation of the existing `member` role.

---

## Intended Permission Matrix

| Capability | Owner | Collaborator/member | Future reviewer |
|---|---:|---:|---:|
| View workspace dashboard | Yes | Yes | Yes |
| View song/version pages | Yes | Yes | Yes |
| Create songs | Yes | Yes | No |
| Rename songs | Yes | Yes | No |
| Upload cover art | Yes | Yes | No |
| Delete songs | Yes | No | No |
| Upload versions | Yes | Yes | No |
| Edit version labels/notes | Yes | Yes | No |
| Create comments/replies | Yes | Yes | Yes |
| Create actions | Yes | Yes | Maybe |
| Update actions | Yes | Yes | Maybe |
| Create/update/delete song tasks | Yes | Yes | No |
| Invite collaborators | Yes | No | No |
| Revoke invites | Yes | No | No |
| Remove members | Yes | No | No |
| Upgrade/manage billing | Yes | No | No |
| Switch between own workspaces | Yes | Yes | Yes |
| Create own personal workspace | Yes, if none owned | Yes, if none owned | Yes, if none owned |

---

## Current Code Audit

### Owner-only behavior already present

These routes already check `membershipRole === 'owner'`:
- `POST /api/billing/checkout`
- `POST /api/billing/activate`
- `POST /api/billing/portal`
- `GET /api/workspace/invites`
- `POST /api/workspace/invites`
- `PATCH /api/workspace/invites/[inviteId]`
- `DELETE /api/workspace/members/[userId]`
- `PATCH /api/workspace/plan`

These align with the intended model.

### Member/collaborator behavior already allowed

These paths currently allow any signed-in user whose active workspace has access to the target resource:
- `POST /api/songs/create`
- `PATCH /api/songs/[songId]`
- `POST /api/versions/create`
- `PATCH /api/versions/[versionId]`
- `POST /api/threads/create`
- `POST /api/threads/reply`
- `POST /api/actions/create`
- `PATCH /api/actions/[actionId]`

This broadly matches the recommended collaborator model.

### Hardened after audit

#### Song deletion

`DELETE /api/songs/[songId]` now requires a canonical identity, verifies the song belongs to the active workspace, and restricts destructive deletion to the workspace owner.

The dashboard also hides song delete controls for non-owner members. Later, we can consider allowing deletion by song creator if we add reliable creator tracking and a clear recovery model.

#### Version creation

`POST /api/versions/create` now requires the submitted `songId` to belong to the active workspace before counting versions, creating a signed upload URL, or inserting a version record.

Collaborators can still upload versions inside shared workspaces.

#### Song and version reads/updates

The main song/version detail routes now require a canonical identity and active-workspace membership before returning or updating resource data:
- `GET /api/songs/[songId]`
- `GET /api/songs/[songId]/versions`
- `GET /api/songs/[songId]/tasks`
- `GET /api/versions/[versionId]`
- `PATCH /api/versions/[versionId]`
- `GET /api/versions/[versionId]/threads`

#### Thread creation and replies

`POST /api/threads/create` now verifies:
- the submitted version exists
- the version belongs to the submitted song
- the song belongs to the active workspace

`POST /api/threads/reply` now verifies:
- the thread exists
- the thread's version exists
- optional submitted song/version ids match the canonical thread context
- the backing song belongs to the active workspace

Collaborators can still create comments and replies inside shared workspaces.

#### Task routes

Task routes now require a canonical identity and verify that the task or target song belongs to the active workspace:
- `POST /api/tasks/create`
- `PATCH /api/tasks/[taskId]`
- `DELETE /api/tasks/[taskId]`
- `PATCH /api/tasks/reorder`

Collaborators can still create, update, delete, and reorder song tasks inside shared workspaces.

#### Cover art upload

`POST /api/songs/upload-image` now requires a canonical identity and verifies that the target song belongs to the active workspace before uploading the image and updating the song.

### Current gaps / risks

#### Settings route

`/api/profile/settings` now stores personal theme settings by auth user id.

`/api/settings` remains as a compatibility alias and can still fall back to legacy `settings.user_identity` rows while production data migrates.

Settings model decision:
- theme colors are user-level settings
- workspace administration controls are workspace-level settings
- future workspace-wide branding should be owner-controlled and should not reuse `/api/settings`

See `SETTINGS_MODEL.md`.

---

## Recommended Next Patch Order

1. Apply the `profile_settings` migration in production and verify theme save/load.
2. Decide whether song rename/cover/status changes remain collaborator-writable long term.
3. Later add a true reviewer/commenter role if needed.

---

## Product Decision Notes

Current recommendation:
- keep `member` as a collaborative role, not a read-only role
- allow members to add songs and versions
- reserve owner-only behavior for billing, invites, member management, plan state, and high-risk destructive actions

This fits the core purpose of the app: shared song review and collaboration.
