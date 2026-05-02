# Workspace Model & User Journeys

## Purpose

This spec defines how users should understand identity, workspaces, invitations, and switching before the app adds a full workspace switcher.

The goal is to prevent the confusing state where a signed-in user sees an empty dashboard and thinks their songs are missing, when they are simply viewing a different workspace.

This is a planning document. It does not describe a completed UI unless explicitly marked as current behavior.

---

## Core Concepts

### User identity

A user identity answers: "Who am I signed in as?"

For the public app, this is the Google-authenticated person.

Examples:
- Cat Leachman signed in as `cat.libbie@gmail.com`
- Coris Leachman signed in as `corisleachman@googlemail.com`

A user identity can belong to more than one workspace.

### Workspace

A workspace answers: "Whose song library am I currently viewing or editing?"

The workspace is the container for:
- songs
- versions
- comments
- actions
- collaborators
- plan and billing state

Examples:
- `Cat Leachman's Workspace`
- `Coris Leachman's Workspace`
- a future band workspace such as `Polite Rebels`

### Membership

A membership connects one signed-in user to one workspace.

Expected roles:
- `owner`: can manage billing, invite collaborators, remove members, and create/manage songs
- `member`: can participate in the shared song workflow but should not see owner-only controls

### Account wording

In product UI, prefer `workspace` over `account`.

Reason: `account` can sound like the person's login. `workspace` makes it clearer that one signed-in person can move between multiple song libraries.

---

## Product Principle

The user signs in once, then works inside a selected workspace.

The app should always make the current workspace visible enough that the user can answer:

- Who am I signed in as?
- Which workspace am I viewing?
- What role do I have here?
- How do I switch to another workspace?
- How do I create my own workspace if I only belong to someone else's?

---

## Current Behavior

The app already supports the underlying data model for multiple memberships:
- a user can own a personal workspace
- a user can be a member of another owner's workspace
- songs are scoped by `songs.account_id`
- dashboard reads songs for the resolved active workspace

The app does not yet have a full visible workspace switcher.

The current workspace resolver should:
1. use the active workspace cookie when present and valid
2. otherwise prefer an existing collaborative `member` workspace
3. otherwise fall back to the user's personal `owner` workspace
4. create a personal owner workspace only if the user has no workspace membership yet

This keeps invited collaborators from landing in an empty personal workspace by default.

---

## Proposed Persistent Workspace Indicator

The app should show a persistent workspace affordance in the authenticated shell.

Suggested compact state:

```text
Coris Leachman's Workspace
Member
```

Expanded switcher:

```text
Signed in as
Cat Leachman
cat.libbie@gmail.com

Workspaces

✓ Coris Leachman's Workspace
  Member
  5 songs

  Cat Leachman's Workspace
  Owner
  0 songs

+ Create your own workspace
```

The switcher should be present even if the user only has one workspace, because it teaches the model and gives invited members a natural path to create their own separate workspace.

---

## User Journeys

### 1. User signs up directly

Scenario:
Cat visits the app without an invite and signs in with Google.

Expected behavior:
1. app creates Cat's profile
2. app creates `Cat Leachman's Workspace`
3. app creates Cat as `owner`
4. dashboard opens in Cat's workspace

Dashboard empty state:

```text
No songs in Cat Leachman's Workspace yet.
Create your first song to start reviewing versions.
```

Switcher state:

```text
✓ Cat Leachman's Workspace
  Owner
  0 songs
```

### 2. User is invited to a band workspace first

Scenario:
Cat receives an invite to Coris's workspace before creating her own workspace.

Expected behavior:
1. Cat opens invite link
2. Cat signs in with Google
3. app validates that Cat is signed in with the invited email
4. app creates Cat's membership in Coris's workspace
5. app opens the dashboard in Coris's workspace

Dashboard state:

```text
Coris Leachman's Workspace
Member
```

Switcher state:

```text
✓ Coris Leachman's Workspace
  Member
  5 songs

+ Create your own workspace
```

The user should see Coris's songs, not an empty personal workspace.

### 3. Invited member later wants their own workspace

Scenario:
Cat is a band collaborator, then decides she also wants a separate workspace for her own music.

Expected behavior:
1. Cat opens the workspace switcher
2. Cat chooses `Create your own workspace`
3. app creates `Cat Leachman's Workspace`
4. app switches Cat into that workspace
5. dashboard shows an empty owner workspace with a clear label

Switcher state after creation:

```text
  Coris Leachman's Workspace
  Member
  5 songs

✓ Cat Leachman's Workspace
  Owner
  0 songs
```

### 4. User starts solo, then joins a band

Scenario:
Cat has already created her personal workspace, then later accepts a band invite.

Expected behavior:
1. Cat accepts the invite
2. app adds Cat as a member of the band workspace
3. app switches Cat into the invited workspace after acceptance
4. the switcher shows both workspaces

This makes the result of accepting an invite immediately visible.

### 5. Returning user with multiple workspaces

Scenario:
Cat returns to the app later.

Expected behavior:
1. app uses the last valid active workspace if available
2. if no active workspace is available, app chooses a sensible default
3. workspace indicator makes the current workspace obvious

The user should never have to infer the active workspace from the song list alone.

---

## Empty States

Empty dashboard copy must name the current workspace.

For an owner workspace:

```text
No songs in Cat Leachman's Workspace yet.
Create your first song to start reviewing versions.
```

For a member workspace:

```text
No songs in Coris Leachman's Workspace yet.
When the owner adds songs, they will appear here.
```

For a user who belongs to another workspace with songs:

```text
No songs in Cat Leachman's Workspace yet.
You also belong to Coris Leachman's Workspace.
Switch workspace if you are looking for band songs.
```

For an invited member who has no personal workspace:

```text
You are in Coris Leachman's Workspace as a member.
Want a separate space for your own music?
Create your own workspace.
```

---

## Switcher Requirements

The switcher should:
- show the signed-in user's name and email
- show the current workspace name
- show the user's role in the current workspace
- list every workspace the user belongs to
- visually mark the active workspace
- allow switching without signing out
- provide `Create your own workspace` when the user does not own a workspace
- keep owner-only controls scoped to owner workspaces

The switcher should not:
- mix songs from multiple workspaces into one dashboard
- call workspaces `accounts` in user-facing copy
- hide the workspace name on empty dashboards
- require signing out to move between workspaces

---

## Data and Routing Expectations

Workspace switching should set the active workspace server-side so canonical API reads continue to use one source of truth.

Recommended behavior:
- switching writes the active workspace cookie
- `/api/auth/bootstrap` returns the selected workspace and role
- dashboard reads `/api/dashboard`, which filters by selected workspace
- song pages reject access if the song does not belong to the active workspace
- invite acceptance writes the invited workspace as active

This preserves the current server-backed data path and avoids duplicate client-side fetching.

---

## Billing Implication

Billing belongs to a workspace, not to the signed-in user identity.

Example:
- Cat can be a free member of Coris's paid workspace
- Cat can separately own a free or paid personal workspace

Owner-only billing controls should appear only when the current workspace membership role is `owner`.

---

## Open Questions

- Should a user be allowed to own more than one workspace in the MVP?
- Should the first personal workspace be created automatically for invited users, or only when they click `Create your own workspace`?
- Should the current default prefer member workspaces forever, or only until an explicit workspace switcher exists?
- What should the workspace creation form ask for: workspace name only, or artist/band type too?
- Should workspace names default to personal names, band names, or both depending on creation route?
- Should there be a dedicated onboarding step after invite acceptance explaining the switcher?

---

## Suggested Build Order

1. Add a read-only workspace indicator to the authenticated shell.
2. Add a workspace list API for the current user.
3. Add workspace switching by setting the active workspace cookie.
4. Add smarter empty states that name the current workspace.
5. Add `Create your own workspace` for users who only belong to someone else's workspace.
6. Add owner/member role-aware copy and controls in the switcher.
7. Consider a fuller workspace settings page only after the basic switcher is working.
