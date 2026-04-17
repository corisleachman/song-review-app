# Song App Public MVP Roadmap

## Purpose

This document is the single source of truth for the transition from the original private two-person MVP into a public-facing MVP that supports real users, account ownership, and paid growth later.

It should be updated after every meaningful rollout so the current state of the product, technical foundation, and next steps are always clear.

---

# 1. Product Goal

The Song App began as a private collaboration tool for Coris and Al.

The original MVP used:
- a shared password
- an identity picker
- email notification logic tied to which of the two users was active

The goal now is to make the app public-facing so that:
- any user can sign up with their own Google account
- each new user gets their own real account/workspace foundation
- the app remains simple from a product point of view
- the collaboration functionality stays broadly the same
- free and paid tiers can be introduced cleanly
- billing and account management can be added on top of a solid foundation

This roadmap is focused primarily on the infrastructure and access-model transition required to support that.

---

# 2. Product Principles

## Keep the product simple
The collaboration workflow already does most of what is needed for MVP. The priority is not adding lots of new features. The priority is making the app work for real users safely and cleanly.

## Small, reversible changes
Each rollout should be as small as possible and easy to roll back.

## Keep the app usable during transition
The legacy password and identity-picker path should remain available until the new live path is stable.

## Do not cut corners on foundations
Fast progress matters, but not at the cost of fragile auth, bad account modelling, or messy schema drift.

## Canonical schema wins
The app must adapt to the canonical database schema, not the other way round.

---

# 3. Canonical Database / Environment

## Canonical database
The canonical schema is:

`song-review-v2`
Project ref:
`hxtsuhmqrufcdplidtov`

Both the app and MCP are pointed at this database.

## Canonical schema assumptions
The app should match these field names and relationships exactly:

- `profiles.id`
- `accounts.created_by_user_id`
- `account_members.user_id`
- `account_members.joined_at`
- composite primary key on `account_members(account_id, user_id)`

The app must not assume:
- `account_members.id`
- `account_members.profile_id`
- `account_members.created_at`

## Profile identity model
Preferred model:
- `profiles.id = auth.users.id`

This keeps the auth-to-profile relationship simple and direct.

---

# 4. Current Product Scope for Public MVP

## In scope
- Google sign-in
- authenticated user bootstrap
- one account/workspace created on first signup
- one owner membership created on first signup
- real session-based access to the app
- dashboard and existing song collaboration flows working under real auth
- groundwork for free and paid plans later
- account and billing structure planning

## Explicitly out of scope for early public MVP foundation
- invites
- referrals
- notification system rewrite
- multi-workspace support
- historical authorship migration
- major feature expansion
- deep settings overhaul
- billing implementation in the earliest foundation steps

---

# 5. High-Level Delivery Phases

## Phase 1: Original private MVP
### Objective
Create a working collaboration tool for Coris and Al only.

### Characteristics
- shared password
- identity picker
- email notifications tied to user identity
- private access model
- core song/version/comment workflow working

### Status
Completed

---

## Phase 2A: Public foundation transition
### Objective
Replace the fragile private access model with real auth, real user/profile/account foundations, and safe session-based app access.

### Status
In progress

### Why this phase matters
This phase does most of the heavy lifting required to make the app public-facing without changing the core product much.

---

# 6. Phase 2A Breakdown

## Step 1: Google auth foundation
### Goal
Establish Google sign-in and Supabase session creation without breaking the legacy flow.

### Intended outcome
- user can click Continue with Google
- Supabase OAuth flow works
- callback exchanges auth code for session
- browser ends up authenticated
- legacy shared-password path remains visible as fallback

### Status
Implemented

### Notes
- legacy flow intentionally retained
- no full middleware rewrite yet at this stage
- no bootstrap or full live-path cutover yet in Step 1

---

## Step 2: Bootstrap foundation
### Goal
After successful Google sign-in, create the minimum account structure required for a real user.

### Required behaviour
Bootstrap must:
- resolve the authenticated Supabase user
- upsert `profiles` using `profiles.id = auth user id`
- create exactly one account/workspace if the user does not already own one
- create exactly one owner membership if missing
- return current `user`, `profile`, `workspace`, and `membership`
- remain idempotent

### Status
Implemented

### Schema-readiness work completed
- `profiles.id` aligned to `auth.users.id`
- unique membership safety already present on the canonical schema
- bootstrap logic updated to match canonical schema exactly

### Notes
Ownership source of truth is:
- `account_members.role = 'owner'`

There should be no duplicate ownership source.

---

## Step 3: Live-path cutover from legacy identity gating to real session/bootstrap
### Goal
Move the live app from shared-password and identity-picker gating to real authenticated sessions and bootstrap data.

### Strategy
Do this gradually, not all at once.

### Intended order
1. dashboard cutover
2. minimal middleware compatibility adjustment
3. song pages cutover
4. settings page cutover
5. create-song API cutover
6. final middleware cleanup later

### Status
Planned / next in sequence

### Important constraint
Do not remove legacy fallback paths yet.

---

# 7. Planned Step 3 Execution Order

## Slice 1: Dashboard cutover + minimal middleware compatibility
### Goal
Allow a Google-authenticated user to reach `/dashboard` and have the dashboard use session + bootstrap instead of legacy identity gating.

### Files expected to change
- `middleware.ts`
- `app/dashboard/page.tsx`
- possibly `lib/useProtectedRoute.ts` if needed

### Expected behaviour
#### Legacy-cookie users
- still allowed through as before
- dashboard still accessible
- no breakage to old flow

#### Google-session users
- can reach `/dashboard` without legacy identity cookies
- dashboard uses session + bootstrap
- no redirect to `/identify`

### Why this slice comes first
Because a dashboard-only cutover is not enough if middleware still blocks Google-session users.

### Status
Planned

---

## Slice 2: Song pages cutover
### Goal
Move the core song pages from legacy identity gating to real session/bootstrap.

### Pages in scope
- `app/songs/[id]/page.tsx`
- `app/songs/[id]/upload/page.tsx`
- `app/songs/[id]/versions/[versionId]/page.tsx`

### Behaviour
- no redirect dependency on `/identify`
- new comments/actions/uploads use current profile display name as temporary string author
- historical string authorship remains untouched for now

### Status
Planned

---

## Slice 3: Settings cutover
### Goal
Allow settings page access through real session/bootstrap without doing a full settings-system rewrite.

### Status
Planned

---

## Slice 4: Create-song API cutover
### Goal
Stop using temporary/default account fallback for song creation and use the bootstrapped current user workspace instead.

### Status
Planned

---

## Slice 5: Final legacy gating cleanup
### Goal
After the live path is stable, remove dependency on shared-password and identity-picker from the normal app flow.

### Status
Deferred until the new live path is proven stable

---

# 8. What Remains Temporarily Legacy After Step 3

These can remain in place during transition:

- `app/identify/page.tsx`
- `app/api/auth/verify-password/route.ts`
- legacy helpers that are still harmless
- historical authorship string fields
- notification logic
- any `?as=` deep-link behaviour still used by legacy flows
- any settings behaviour still keyed to old identity shape
- legacy login fallback on `/`

These should not be removed until the live authenticated path is stable.

---

# 9. Billing and Plans Roadmap

## Product intent
The public-facing app should support:
- a free tier
- a paid tier
- very simple pricing

## Current decisions not yet locked
- monthly only vs monthly + annual discount
- exact paywall boundary
- exact billing provider rollout sequence
- exact upgrade prompts and account plan UX

## Recommendation
Do not implement billing until:
1. auth is stable
2. workspace/account ownership is stable
3. dashboard and song flows are running cleanly on session-based access

## Suggested initial commercial approach
For speed and simplicity:
- one free tier
- one paid tier
- monthly first
- annual later only if needed

Reason:
- faster to ship
- fewer edge cases
- easier support
- less pricing indecision slowing build progress

---

# 10. MVP Definition

The public MVP is achieved when:

## Access and identity
- any user can sign in with Google
- a real session is created
- a profile is created or updated automatically
- one workspace/account is created automatically for new users
- one owner membership is created automatically

## Core app path
- dashboard works through session + bootstrap
- song detail works through session + bootstrap
- upload/version pages work through session + bootstrap
- settings is reachable through real auth
- create-song attaches data to the correct user workspace/account

## Legacy safety
- legacy fallback can still exist temporarily
- but the main live path no longer depends on it

## Commercial readiness
- app is structurally ready for free/paid plan logic to be added next

---

# 11. Current Status Snapshot

## Completed
- private MVP built for Coris and Al
- Google auth foundation added
- auth callback added
- bootstrap foundation added
- schema alignment work completed for canonical database
- bootstrap logic corrected to canonical schema

## In progress
- cutover from legacy identity gating to real session/bootstrap

## Next priority
- dashboard cutover plus minimal middleware compatibility update

---

# 12. Immediate Next Actions

## Next development slice
Implement:
- dashboard cutover to session + bootstrap
- smallest middleware adjustment required so Google-session users can reach `/dashboard`
- preserve legacy cookie access as fallback

## After that
- song pages cutover
- settings cutover
- create-song API workspace cutover

## After that
- decide and implement free/paid plan structure
- add billing
- add account management polish

---

# 13. Working Rules for Codex Updates

After each rollout, update this file with:

## A. Status changes
- what moved from planned to implemented
- what moved from in progress to complete
- what got deferred

## B. Files changed
List the exact files touched.

## C. Behaviour changes
Describe what now works differently for the user.

## D. Schema changes
Document any DB changes, constraints, or assumptions introduced.

## E. Tests run
List the exact tests executed and whether they passed.

## F. Rollback point
State the rollback boundary for that change.

## G. New risks or blockers
List anything discovered that may affect later phases.

---

# 14. Preferred Delivery Rhythm

## Principle
Move fast by reducing scope per slice, not by taking shortcuts.

## Preferred implementation size
Each rollout should ideally be one of:
- one auth slice
- one page-family cutover
- one API cutover
- one billing slice
- one cleanup slice

Avoid giant mixed changesets.

## Why
This keeps:
- testing simpler
- rollback cleaner
- Codex more disciplined
- project momentum higher

---

# 15. Open Questions

These are still to be decided:

- free vs paid feature boundary
- monthly only vs monthly + annual
- when to introduce billing relative to final legacy cleanup
- whether notifications should be rewritten before or after monetisation
- whether workspace terminology should remain "account" or be surfaced differently in UI

---

# 16. Summary

This project is not primarily a feature-expansion roadmap.

It is a controlled migration roadmap:
- from private two-person MVP
- to public SaaS-ready collaboration app

The fastest safe route is:
1. finish session/bootstrap cutover
2. stabilize the live app path
3. add simple paid structure
4. remove legacy dependencies only after the new path is proven
