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

### Current state
The app is now largely running on the real auth/bootstrap model.

Remaining legacy support is primarily compatibility scaffolding during transition, not the primary live path.

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
In progress

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
Implemented

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
Implemented

---

## Slice 3: Settings cutover
### Goal
Allow settings page access through real session/bootstrap without doing a full settings-system rewrite.

### Status
Implemented

### Notes
- page access now supports both the Google-session path and the transitional legacy fallback path
- underlying settings persistence is still transitional and keyed by a legacy-style identity string
- storage migration remains out of scope for this phase

---

## Slice 4: Create-song API cutover
### Goal
Stop using temporary/default account fallback for song creation and use the bootstrapped current user workspace instead.

### Status
Implemented

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
- legacy identity fallback paths
- legacy helpers that are still harmless
- historical authorship string fields
- notification logic
- any `?as=` deep-link behaviour still used by legacy flows
- settings persistence still keyed by a legacy-style identity string
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
- dashboard compatibility slice completed
- song-pages compatibility slice completed
- create-song API cutover confirmed complete
- settings compatibility patch completed
- Phase 2A page-access cutover work completed
- account plan foundation added with free vs paid state and free-tier collaborator cap

## In progress
- stabilisation and end-to-end validation under the real session/bootstrap model
- billing provider integration still deferred

## Next priority
- run a stabilisation pass
- validate end-to-end behavior across the full live app path

---

# 12. Immediate Next Actions

## Next development slice
Run:
- end-to-end validation across the live auth/bootstrap path
- focused stabilisation fixes only where the validation plan finds real breakage

## After that
- confirm remaining transitional legacy scaffolding is clearly isolated
- decide whether any final Phase 2A cleanup is required before monetisation work

## After that
- add billing provider foundation
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

Also, after every meaningful Song App rollout, audit, or compatibility patch:
- update any main roadmap statuses only where the completion state is actually confirmed
- append or update one concise Rollout Log entry
- record exact files changed or exact files audited
- note the next follow-up slice before closing the task

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

---

# 17. Rollout Log

After each meaningful rollout, append one entry.
Record only confirmed outcomes.
Include exact files changed or audited.
Note the next follow-up slice.

## 2026-04-17 — Dashboard compatibility patch

- Slice / change name: Dashboard compatibility patch
- Status: Implemented
- Exact files changed or audited:
  - `app/dashboard/page.tsx`
- Outcome:
  - dashboard now preserves legacy fallback if bootstrap is unavailable and legacy identity exists
  - bootstrap-first Google-session path remains intact
- Next follow-up:
  - song-pages compatibility patch

## 2026-04-17 — Song-pages compatibility patch

- Slice / change name: Song-pages compatibility patch
- Status: Implemented
- Exact files changed or audited:
  - `app/songs/[id]/upload/page.tsx`
  - `app/songs/[id]/versions/[versionId]/page.tsx`
- Outcome:
  - upload and version pages now preserve legacy fallback if bootstrap is unavailable and legacy identity exists
  - bootstrap-first Google-session path remains intact
- Next follow-up:
  - create-song API audit

## 2026-04-17 — Create-song API cutover audit

- Slice / change name: Create-song API cutover audit
- Status: Confirmed implemented
- Exact files changed or audited:
  - `app/api/songs/create/route.ts`
  - `lib/canonicalIdentity.ts`
  - `lib/currentUser.ts`
  - `lib/bootstrapAccount.ts`
  - `app/dashboard/page.tsx`
- Outcome:
  - create-song already resolves the authenticated user server-side
  - account_id already comes from canonical bootstrapped workspace identity
  - no default-account fallback remains
- Next follow-up:
  - settings cutover audit and compatibility patch

## 2026-04-17 — Settings cutover audit

- Slice / change name: Settings cutover audit
- Status: Partially completed
- Exact files changed or audited:
  - `app/settings/page.tsx`
  - `app/api/settings/route.ts`
  - `lib/canonicalIdentity.ts`
  - `middleware.ts`
- Outcome:
  - Google-session access works
  - settings page still lacks legacy fallback compatibility at page level
  - settings persistence remains intentionally transitional
- Next follow-up:
  - settings compatibility patch
  - stabilisation pass

## 2026-04-17 — Phase 2A end-to-end validation checkpoint

- Slice / change name: Phase 2A end-to-end validation checkpoint
- Status: Confirmed cutover complete, stabilisation in progress
- Exact files changed or audited:
  - `public-mvp-roadmap.md`
- Outcome:
  - Phase 2A cutover slices are now implemented across dashboard, song pages, create-song, and settings page access
  - remaining legacy support is primarily transitional compatibility scaffolding
  - next work is validation and stabilisation, not new feature expansion
- Next follow-up:
  - execute the end-to-end validation plan
  - patch only confirmed breakages or unsafe transitional points

## 2026-04-17 — Collaborator invites and membership audit

- Slice / change name: Collaborator invites and membership audit
- Status: Audited, candidate for first Phase 2B slice
- Exact files changed or audited:
  - `public-mvp-roadmap.md`
  - `lib/bootstrapAccount.ts`
  - `lib/workspaceMembers.ts`
  - `app/api/workspace/members/route.ts`
  - `app/api/dashboard/route.ts`
  - `app/api/actions/create/route.ts`
  - `app/api/songs/[songId]/route.ts`
  - `app/songs/[id]/versions/[versionId]/page.tsx`
  - `DATABASE.md`
- Outcome:
  - workspace/account ownership and membership foundations already exist
  - collaborator visibility and workspace-scoped permissions exist
  - invite creation, invite acceptance, and member management flows are not implemented yet
- Next follow-up:
  - decide and scope the smallest viable Phase 2B invite system
  - implement invite acceptance before broader membership management polish

## 2026-04-17 — Phase 2B invite-system planning

- Slice / change name: Phase 2B invite-system planning
- Status: Planned
- Exact files changed or audited:
  - `public-mvp-roadmap.md`
- Outcome:
  - defined the smallest viable collaborator invite and membership-management plan for MVP
  - confirmed the feature should build on `accounts`, `account_members`, and existing workspace authorization rather than redesigning the model
- Next follow-up:
  - implement the invite persistence foundation
  - then implement invite acceptance

## 2026-04-17 — Phase 2B Slice 1 execution checklist

- Slice / change name: Invite persistence foundation checklist
- Status: Planned
- Exact files changed or audited:
  - `public-mvp-roadmap.md`
- Outcome:
  - defined the smallest safe first move as an additive schema migration for `account_invites`
  - deferred APIs, acceptance flow, and UI until the schema is confirmed and applied cleanly
- Next follow-up:
  - implement the additive `account_invites` migration
  - verify duplicate-prevention and owner-only assumptions before adding routes

## 2026-04-17 — Account invites schema migration

- Slice / change name: Account invites schema migration
- Status: Implemented
- Exact files changed or audited:
  - `migrations/20260417_phase_2b_account_invites_up.sql`
  - `migrations/20260417_phase_2b_account_invites_down.sql`
- Outcome:
  - added the dedicated `account_invites` persistence layer
  - enforced one active pending invite per `(account_id, normalized_email)`
  - added trigger-based normalization for `normalized_email` and `updated_at`
- Next follow-up:
  - apply the migration locally
  - implement owner-only invite create/list/revoke APIs

## 2026-04-17 — Invite API audit and planning

- Slice / change name: Owner-only invite API audit and planning
- Status: Planned
- Exact files changed or audited:
  - `public-mvp-roadmap.md`
  - `app/api/workspace/members/route.ts`
  - `lib/canonicalIdentity.ts`
  - `lib/workspaceMembers.ts`
  - `app/api/actions/create/route.ts`
  - `migrations/20260417_phase_2b_account_invites_up.sql`
- Outcome:
  - confirmed no invite API surface exists yet
  - confirmed current canonical auth/bootstrap and workspace-member foundations are sufficient to add owner-only create/list/revoke invite routes
- Next follow-up:
  - implement `app/api/workspace/invites/route.ts`
  - implement `app/api/workspace/invites/[inviteId]/route.ts`

## 2026-04-17 — Owner-only invite persistence APIs

- Slice / change name: Owner-only invite persistence APIs
- Status: Implemented
- Exact files changed or audited:
  - `lib/accountInvites.ts`
  - `app/api/workspace/invites/route.ts`
  - `app/api/workspace/invites/[inviteId]/route.ts`
- Outcome:
  - added owner-only invite listing, creation, and revoke routes for the current workspace
  - centralized email normalization, member checks, and duplicate pending-invite handling in a shared helper
  - kept acceptance flow, UI, and email sending out of scope
- Next follow-up:
  - verify authenticated owner and non-owner invite flows against the live app
  - implement invite acceptance once the owner-side persistence layer is confirmed

## 2026-04-17 — Invite acceptance Slice A checklist

- Slice / change name: Public invite read path checklist
- Status: Planned
- Exact files changed or audited:
  - `public-mvp-roadmap.md`
- Outcome:
  - defined the smallest safe first acceptance slice as a public invite landing page, a public invite read API, and the minimum middleware adjustment to allow `/invite/[token]`
  - deferred accept actions, membership creation, and Google sign-in handoff to later slices
- Next follow-up:
  - implement the public invite read path
  - verify public token states before adding invite acceptance

## 2026-04-17 — Public invite read path

- Slice / change name: Public invite read path
- Status: Implemented
- Exact files changed or audited:
  - `middleware.ts`
  - `lib/accountInvites.ts`
  - `app/api/invites/[token]/route.ts`
  - `app/invite/[token]/page.tsx`
- Outcome:
  - `/invite/[token]` is now public and avoids auth redirect loops
  - invite token state can now be read safely for pending, revoked, expired, accepted, and invalid cases
  - acceptance and Google sign-in handoff remain deferred to the next slice
- Next follow-up:
  - implement invite acceptance mutation route
  - add signed-out Google sign-in handoff back to the invite page

## 2026-04-17 — Invite acceptance mutation planning

- Slice / change name: Invite acceptance mutation planning
- Status: Planned
- Exact files changed or audited:
  - `public-mvp-roadmap.md`
  - `lib/accountInvites.ts`
  - `lib/currentUser.ts`
  - `lib/canonicalIdentity.ts`
  - `lib/bootstrapAccount.ts`
  - `app/api/invites/[token]/route.ts`
- Outcome:
  - confirmed no invite acceptance mutation exists yet
  - confirmed current auth/bootstrap and membership foundations are sufficient to add a minimal `POST /api/invites/[token]/accept` route
- Next follow-up:
  - implement invite acceptance mutation route
  - then add signed-out Google handoff back to the invite page

## 2026-04-18 — Invite acceptance mutation route planning refresh

- Slice / change name: Invite acceptance mutation route planning refresh
- Status: Planned
- Exact files changed or audited:
  - `public-mvp-roadmap.md`
  - `lib/accountInvites.ts`
  - `lib/currentUser.ts`
  - `lib/canonicalIdentity.ts`
  - `lib/bootstrapAccount.ts`
  - `app/api/invites/[token]/route.ts`
- Outcome:
  - reconfirmed that no acceptance mutation exists yet
  - narrowed the next slice to a signed-in `POST /api/invites/[token]/accept` route plus minimal acceptance-specific invite helpers
- Next follow-up:
  - implement the acceptance mutation route
  - verify signed-in success, mismatch, and duplicate-membership paths

## 2026-04-18 — Invite acceptance mutation route

- Slice / change name: Invite acceptance mutation route
- Status: Implemented
- Exact files changed or audited:
  - `lib/accountInvites.ts`
  - `app/api/invites/[token]/accept/route.ts`
- Outcome:
  - added signed-in invite acceptance with email-match enforcement, duplicate-membership protection, and invite finalization
  - kept Google sign-in handoff, page wiring, and collaborator UI deferred
- Next follow-up:
  - add signed-out Google handoff back to `/invite/[token]`
  - then add minimal invite-page accept action wiring

## 2026-04-18 — Invite page handoff and accept wiring planning

- Slice / change name: Invite page handoff and accept wiring planning
- Status: Planned
- Exact files changed or audited:
  - `public-mvp-roadmap.md`
  - `app/invite/[token]/page.tsx`
  - `app/page.tsx`
  - `app/auth/callback/route.ts`
  - `app/api/invites/[token]/route.ts`
  - `app/api/invites/[token]/accept/route.ts`
  - `lib/currentUser.ts`
- Outcome:
  - confirmed that the callback `next` pattern can likely be reused as-is for invite return-path handoff
  - confirmed that the remaining work is invite-page state wiring, not new auth infrastructure
- Next follow-up:
  - implement signed-out Google handoff back to `/invite/[token]`
  - add minimal accept action wiring on the invite page

## 2026-04-18 — Invite page handoff and minimal accept wiring

- Slice / change name: Invite page handoff and minimal accept wiring
- Status: Implemented
- Exact files changed or audited:
  - `app/invite/[token]/page.tsx`
  - `app/invite/[token]/InviteActions.tsx`
  - `public-mvp-roadmap.md`
- Outcome:
  - pending invites now show a Google sign-in path for signed-out users and a minimal accept action for matching signed-in users
  - successful acceptance now returns the user to the existing `/dashboard` flow without widening auth or collaborator UI scope
- Next follow-up:
  - manually verify the signed-out Google return path with a real invite token
  - begin owner-facing collaborator management UI when ready

## 2026-04-18 — Collaborator management UI planning

- Slice / change name: Collaborator management UI planning
- Status: Planned
- Exact files changed or audited:
  - `public-mvp-roadmap.md`
  - `app/settings/page.tsx`
  - `app/api/workspace/members/route.ts`
  - `app/api/workspace/invites/route.ts`
  - `app/api/workspace/invites/[inviteId]/route.ts`
  - `lib/workspaceMembers.ts`
- Outcome:
  - confirmed there is still no owner-facing UI for invites or member management
  - confirmed the existing invite APIs and members list are reusable, with one small owner-only member-removal API still needed
- Next follow-up:
  - implement collaborator management UI in settings
  - add owner-only member removal API

## 2026-04-18 — Owner-only member removal API

- Slice / change name: Owner-only member removal API
- Status: Implemented
- Exact files changed or audited:
  - `app/api/workspace/members/[userId]/route.ts`
  - `lib/workspaceMembers.ts`
- Outcome:
  - added the missing owner-only backend surface to remove a non-owner member from the current workspace
  - kept historical comments, actions, uploads, invites, and all UI work out of scope
- Next follow-up:
  - implement collaborator management UI in settings using the existing invite APIs and new removal route

## 2026-04-18 — Collaborator management UI in settings

- Slice / change name: Collaborator management UI in settings
- Status: Implemented
- Exact files changed or audited:
  - `app/settings/page.tsx`
  - `app/settings/settings.module.css`
- Outcome:
  - added the smallest owner-facing collaborator management surface in settings for invite creation, current members, pending invites, revoke, and remove actions
  - kept theme settings intact and left billing, ownership transfer, workspace switching, and advanced permissions out of scope
- Next follow-up:
  - manually verify owner and non-owner settings behavior with real workspace accounts
  - decide whether any further collaborator polish is needed before moving on

## 2026-04-18 — Invite email delivery audit

- Slice / change name: Invite email delivery audit
- Status: Audited
- Exact files changed or audited:
  - `public-mvp-roadmap.md`
  - `app/api/workspace/invites/route.ts`
  - `app/api/email/notify-thread/route.ts`
  - `.env.local`
- Outcome:
  - confirmed workspace invites are persisted only and do not currently trigger invite email delivery
  - confirmed Resend is currently wired only for comment and reply notification emails
- Next follow-up:
  - decide whether invite email delivery is needed in the next collaborator slice

## 2026-04-18 — Invite delivery fallback and account menu

- Slice / change name: Invite delivery fallback and account menu
- Status: Implemented
- Exact files changed or audited:
  - `app/settings/page.tsx`
  - `app/settings/settings.module.css`
  - `app/api/workspace/invites/route.ts`
  - `app/dashboard/page.tsx`
  - `components/AccountMenu.tsx`
  - `components/AccountMenu.module.css`
- Outcome:
  - owners can now copy pending invite links directly from settings for manual testing
  - newly created invites now attempt Resend delivery without failing invite creation if email send fails
  - dashboard and settings now expose a minimal top-right account menu with Dashboard, Settings, and Sign out
- Next follow-up:
  - manually verify invite email delivery and copy-link fallback with a real invite
  - decide whether song pages also need the same account menu

## 2026-04-18 — MVP commercialisation planning

- Slice / change name: MVP commercialisation planning
- Status: Planned
- Exact files changed or audited:
  - `public-mvp-roadmap.md`
  - `package.json`
  - `app/settings/page.tsx`
- Outcome:
  - confirmed there is still no billing provider, pricing enforcement, or in-app account plan visibility implemented
  - defined the next smallest path as a simple monthly free-vs-paid boundary, then billing foundation, then lightweight plan visibility
- Next follow-up:
  - lock the free vs paid boundary
  - implement billing foundation with minimal in-app plan status visibility

## 2026-04-18 — MVP plan foundation without billing

- Slice / change name: MVP plan foundation without billing
- Status: Implemented
- Exact files changed or audited:
  - `lib/plans.ts`
  - `migrations/20260418_phase_3a_account_plan_up.sql`
  - `migrations/20260418_phase_3a_account_plan_down.sql`
  - `lib/bootstrapAccount.ts`
  - `app/api/workspace/invites/route.ts`
  - `app/settings/page.tsx`
  - `app/settings/settings.module.css`
  - `DATABASE.md`
- Outcome:
  - added account-level free vs paid plan state with a free-tier collaborator cap and minimal in-app plan visibility in settings
  - kept billing provider integration, pricing flows, and upgrade handling deferred
- Next follow-up:
  - apply the plan migration to the canonical database
  - implement real billing foundation when ready

## 2026-04-18 — Plan-column bootstrap compatibility fix

- Slice / change name: Plan-column bootstrap compatibility fix
- Status: Implemented
- Exact files changed or audited:
  - `lib/plans.ts`
  - `lib/bootstrapAccount.ts`
  - `app/api/workspace/invites/route.ts`
- Outcome:
  - restored Google sign-in/bootstrap compatibility when the runtime database does not yet have `accounts.plan`
  - defaulted missing-plan environments safely to the free plan instead of failing auth bootstrap
- Next follow-up:
  - apply the account plan migration to the canonical database
  - keep the free-plan fallback in place until schema parity is confirmed everywhere

## 2026-04-18 — Invite auth return-path fix

- Slice / change name: Invite auth return-path fix
- Status: Implemented
- Exact files changed or audited:
  - `app/page.tsx`
- Outcome:
  - restored the Google sign-in return path for `/invite/[token]` by allowing invite URLs through the post-login redirect validator
  - prevented the invite flow from falling back to an unrelated default route after successful auth
- Next follow-up:
  - manually verify the full invite sign-in and acceptance journey end to end

## 2026-04-18 — Google success handoff fix

- Slice / change name: Google success handoff fix
- Status: Implemented
- Exact files changed or audited:
  - `app/page.tsx`
- Outcome:
  - removed the brittle dependency on immediate client-side Supabase session visibility after a successful Google bootstrap redirect
  - ensured the login page now proceeds to the intended post-auth destination as soon as `google=success` is present
- Next follow-up:
  - manually verify the invite sign-in round trip on the fresh local server

## 2026-04-18 — Active workspace preference after invite acceptance

- Slice / change name: Active workspace preference after invite acceptance
- Status: Implemented
- Exact files changed or audited:
  - `lib/activeWorkspace.ts`
  - `app/api/invites/[token]/accept/route.ts`
  - `lib/bootstrapAccount.ts`
- Outcome:
  - set a server-readable active workspace cookie after successful invite acceptance
  - taught bootstrap workspace resolution to prefer that workspace when the current user is a valid member
  - preserved the existing owner-workspace bootstrap fallback when the cookie is missing or invalid
- Next follow-up:
  - manually verify that an invited collaborator lands in the inviter's shared dashboard after acceptance
  - later add an explicit workspace-switching experience if the MVP outgrows the cookie-based default

## 2026-04-18 — Collaborator settings permissions and invite handoff patch

- Slice / change name: Collaborator settings permissions and invite handoff patch
- Status: Implemented
- Exact files changed or audited:
  - `app/settings/page.tsx`
  - `app/invite/[token]/InviteActions.tsx`
  - `app/page.tsx`
- Outcome:
  - settings now uses the canonical membership role from bootstrap so member users no longer see owner-only invite or pending-invite controls
  - the invite flow now keeps a one-tab fallback invite return path through Google auth so invitees are returned to `/invite/[token]` instead of dropping into `/dashboard` before acceptance
- Next follow-up:
  - manually verify the signed-out invite flow end to end on the fresh server
  - confirm member settings stays read-only with no owner actions visible

## 2026-04-18 — Shared authenticated shell foundation

- Slice / change name: Shared authenticated shell foundation
- Status: Implemented
- Exact files changed or audited:
  - `components/AppShell.tsx`
  - `components/AppShell.module.css`
  - `components/AppSidebar.tsx`
  - `components/AppSidebar.module.css`
- Outcome:
  - added a reusable authenticated shell wrapper with a fixed left rail and content area
  - added a minimal icon sidebar for Dashboard, Settings, and Sign out using the existing sign-out behavior
  - kept the shell isolated from all pages for this first step
- Next follow-up:
  - adopt the shell on dashboard and settings only
  - remove the top-right account menu from those two pages once the shell is in place

## 2026-04-18 — Dashboard and settings shell adoption

- Slice / change name: Dashboard and settings shell adoption
- Status: Implemented
- Exact files changed or audited:
  - `app/dashboard/page.tsx`
  - `app/settings/page.tsx`
- Outcome:
  - adopted the shared authenticated shell on dashboard and settings
  - removed the top-right account menu as the primary navigation on those two pages
  - kept dashboard and settings functionality intact while moving global navigation into the fixed left rail
- Next follow-up:
  - manually verify dashboard and settings navigation on the fresh server
  - decide later whether song pages should adopt the same shell in a separate slice

## 2026-04-18 — Real billing integration planning

- Slice / change name: Real billing integration planning
- Status: Planned
- Exact files changed or audited:
  - `lib/plans.ts`
  - `app/settings/page.tsx`
  - `app/api/workspace/invites/route.ts`
  - `package.json`
- Outcome:
  - confirmed the app already has local free/paid plan state, collaborator-cap enforcement, and an upgrade placeholder, but no billing provider, checkout flow, webhook sync, or customer portal
  - defined the smallest MVP billing path as a single monthly paid plan for the workspace owner using a hosted checkout flow, webhook-driven subscription sync, and a minimal manage-billing link
- Next follow-up:
  - implement billing foundation and local subscription-state persistence
  - then add hosted checkout, webhook sync, and a simple manage-billing path

## 2026-04-18 — Plan-limit upgrade prompts without billing

- Slice / change name: Plan-limit upgrade prompts without billing
- Status: Implemented
- Exact files changed or audited:
  - `lib/plans.ts`
  - `lib/planEvents.ts`
  - `app/api/plan-events/route.ts`
  - `app/api/workspace/invites/route.ts`
  - `app/api/songs/create/route.ts`
  - `components/UpgradeModal.tsx`
  - `components/UpgradeModal.module.css`
  - `app/dashboard/page.tsx`
  - `app/settings/page.tsx`
- Outcome:
  - free-tier collaborator and song limits now return structured plan-limit payloads instead of generic errors
  - dashboard and settings now surface those responses through a shared upgrade modal with lightweight upgrade-intent logging
  - settings now shows simple free-plan usage visibility for collaborator slots and songs
- Next follow-up:
  - manually verify collaborator-cap and song-cap behavior on the fresh server
  - use the captured upgrade-intent signal to prioritize the real billing slice

## 2026-04-18 — Stripe Checkout MVP billing

- Slice / change name: Stripe Checkout MVP billing
- Status: Implemented
- Exact files changed or audited:
  - `package.json`
  - `package-lock.json`
  - `lib/stripe.ts`
  - `app/api/billing/checkout/route.ts`
  - `app/api/billing/activate/route.ts`
  - `app/settings/page.tsx`
  - `app/dashboard/page.tsx`
  - `components/UpgradeModal.tsx`
  - `components/UpgradeModal.module.css`
  - `migrations/20260418_phase_3b_billing_columns_up.sql`
  - `migrations/20260418_phase_3b_billing_columns_down.sql`
  - `README.md`
  - `DATABASE.md`
- Outcome:
  - added a minimal Stripe SDK helper plus owner-only hosted Checkout creation for the current workspace
  - stored Stripe customer and subscription identifiers on `accounts` so the local plan state can be promoted to `paid`
  - upgraded the free-plan upgrade entry points to start Checkout directly and added a dashboard success-activation pass that flips the workspace to `paid` immediately after a paid session returns
- Next follow-up:
  - apply the billing-column migration to the canonical database before relying on live upgrades
  - add webhook-based subscription sync and a manage-billing path in a later slice before supporting downgrades or lifecycle changes

## 2026-04-21 — Paid upgrade success experience

- Slice / change name: Paid upgrade success experience
- Status: Implemented
- Exact files changed or audited:
  - `components/AppShell.tsx`
  - `components/AppSidebar.tsx`
  - `components/AppSidebar.module.css`
  - `components/UpgradeSuccessModal.tsx`
  - `components/UpgradeSuccessModal.module.css`
  - `app/dashboard/page.tsx`
  - `app/settings/page.tsx`
- Outcome:
  - replaced the plain paid-activation banner on the dashboard with a celebratory but restrained premium success modal after a successful Stripe return
  - added a persistent `Pro` lockup in the authenticated sidebar when the active workspace plan is paid
  - kept the trigger scoped to the actual successful billing return path so the success moment does not repeat on later visits
- Next follow-up:
  - visually tune the success modal against the final wireframe source if that HTML artifact is restored into the repo
  - later consider extending the paid-plan shell indicator onto song pages when they adopt the shared shell

## 2026-04-21 — Local plan testing toggle

- Slice / change name: Local plan testing toggle
- Status: Implemented
- Exact files changed or audited:
  - `app/api/workspace/plan/route.ts`
  - `app/settings/page.tsx`
  - `app/settings/settings.module.css`
- Outcome:
  - added a local-only owner route to switch the active workspace plan between `free` and `paid` for UI testing
  - added a small Settings control so plan-capped and paid states can be exercised quickly without re-running Stripe Checkout
  - kept the toggle out of production and left real Stripe subscription data untouched
- Next follow-up:
  - use the local toggle to regression-test free-limit and paid-success views quickly during billing polish
  - keep real billing state authoritative in production and avoid widening this into a customer-facing plan switcher

## 2026-04-22 — Mobile song-sheet interaction polish

- Slice / change name: Mobile song-sheet interaction polish
- Status: Implemented
- Exact files changed or audited:
  - `app/dashboard/page.tsx`
  - `app/dashboard/dashboard.module.css`
- Outcome:
  - aligned the mobile song row meta line so stage, version, and action pill sit inline without crowding the title
  - tightened the mobile attention treatment with a stronger left accent and pink-tinted info button state
  - kept the existing bottom-sheet interaction as the mobile-only info surface and tuned it to match the current wireframe direction more closely
- Next follow-up:
  - visually verify the sheet spacing and card truncation on a real narrow viewport
  - if needed later, refine the bottom-sheet content hierarchy to more closely match the final wireframe artifact

## 2026-04-22 — Mobile shell width fix

- Slice / change name: Mobile shell width fix
- Status: Implemented
- Exact files changed or audited:
  - `components/AppShell.module.css`
  - `components/AppSidebar.module.css`
- Outcome:
  - fixed the shared authenticated shell so mobile views no longer keep the desktop sidebar visible or reserve the 76px desktop rail offset
  - restored full-width mobile rendering for dashboard and settings content inside the authenticated shell
  - kept the change tightly scoped to shell breakpoints rather than reworking individual mobile screens again
- Next follow-up:
  - visually verify the dashboard and settings pages in a real mobile viewport now that the shell no longer squeezes the content area

## 2026-04-22 — Mobile row alignment follow-up

- Slice / change name: Mobile row alignment follow-up
- Status: Implemented
- Exact files changed or audited:
  - `app/dashboard/dashboard.module.css`
- Outcome:
  - overrode the lingering `desktopGridCard` layout rules on mobile so song cards render as true rows instead of stacked tile layouts
  - moved the icon cluster back to the title line on mobile and removed clipping on the pink action pill in the inline meta row
- Next follow-up:
  - refresh the mobile viewport and visually confirm the row now matches the wireframe spacing more closely

## 2026-04-22 — Stripe webhook sync and billing portal

- Slice / change name: Stripe webhook sync and billing portal
- Status: Implemented
- Exact files changed or audited:
  - `lib/stripe.ts`
  - `app/api/stripe/webhook/route.ts`
  - `app/api/billing/portal/route.ts`
  - `app/settings/page.tsx`
  - `README.md`
- Outcome:
  - added a verified Stripe webhook route for the core MVP subscription lifecycle events and synced local `accounts.plan` from Stripe-driven subscription state
  - added an owner-only Stripe customer portal route so paid workspace owners can self-serve basic billing management
  - updated Settings so free owners keep the existing upgrade path while paid owners now see a minimal `Manage billing` action
- Next follow-up:
  - point a live Stripe webhook endpoint at `/api/stripe/webhook` and verify end-to-end delivery with the real signing secret
  - later decide whether invoice-payment events need to participate in plan sync beyond the current subscription lifecycle coverage

## 2026-04-25 — Production login cleanup

- Slice / change name: Production login cleanup
- Status: Implemented
- Exact files changed or audited:
  - `app/page.tsx`
- Outcome:
  - removed the visible legacy password fallback from the login page now that the production path is Google-auth based
  - kept the Google sign-in return-path behavior unchanged so invite and dashboard redirects continue through the existing callback flow
- Next follow-up:
  - configure Supabase Auth URL settings with the production callback URL so Google sign-in no longer returns to localhost
