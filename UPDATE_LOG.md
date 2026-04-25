# Update Log

Use this file to record meaningful app changes from this point onward.

For each update, document:

- which files were changed
- what we were trying to achieve
- which feature we were developing or what change we were making

This is not meant to replace git history. It is a human-readable product/development log.

---

## 2026-04-16 — Baseline change documentation

### What we were trying to achieve

Create one clear Markdown record of how the current app differs from the original clean install, and establish an ongoing documentation habit for future changes.

### Feature / change being made

Documentation and project process improvement.

### Files changed

- [IMPLEMENTED_CHANGES_FROM_BASELINE.md](/Users/impero/song-review-app/IMPLEMENTED_CHANGES_FROM_BASELINE.md)
- [README.md](/Users/impero/song-review-app/README.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [AGENTS.md](/Users/impero/song-review-app/AGENTS.md)

### Notes

- Added a baseline-to-current summary doc.
- Linked that doc from the main README documentation table.
- Added this ongoing update log for future development entries.
- Updated the project agent guidance so future tasks should record file changes, goal, and feature/change intent.

---

## 2026-04-16 — Database schema documentation sync

### What we were trying to achieve

Make the schema documentation accurately reflect the current app runtime expectations after the Phase 2 workflow, identity, and dashboard work.

### Feature / change being made

Documentation-only schema clarification for songs, actions, and the workspace/auth model.

### Files changed

- [DATABASE.md](/Users/impero/song-review-app/DATABASE.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Documented `songs.account_id` and `songs.status`.
- Documented the expanded `actions` workflow fields and new status values.
- Added the inferred auth/workspace tables: `auth.users`, `profiles`, `accounts`, and `account_members`.
- Marked which tables are new versus extended from the original baseline schema.

---

## 2026-04-17 — Audio engine fixes ported from main

### What we were trying to achieve

Bring the waveform player’s mobile audio, lock-screen playback, and lazy-load behavior from `main` into `clone-clean` without changing layout or broader app architecture.

### Feature / change being made

WaveSurfer and audio-engine logic-only port for the version player page.

### Files changed

- [app/songs/[id]/versions/[versionId]/page.tsx](/Users/impero/song-review-app/app/songs/[id]/versions/[versionId]/page.tsx)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Added lazy audio loading on first play instead of fetching on page view.
- Restored mobile-safe audio behavior by avoiding the live reactive audio graph on iOS/mobile playback.
- Reintroduced `OfflineAudioContext`-based mobile frequency precomputation.
- Reintroduced Media Session metadata and play/pause handlers for lock-screen integration.
- Added the waveform init `loading` guard and debounce pattern from `main`.

---

## 2026-04-17 — Google auth redirect hardening

### What we were trying to achieve

Stop users landing on the app 404 page after returning from Google sign-in when the saved post-login destination is stale or invalid.

### Feature / change being made

Auth return-path resilience for the Google login flow.

### Files changed

- [app/page.tsx](/Users/impero/song-review-app/app/page.tsx)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Added validation and normalization for the post-login `redirectTo` target on the login page.
- If a stale version route is detected, the app now falls back to the parent song entry route instead of sending the user to a 404.
- Unknown or malformed redirect targets now fall back to `/dashboard`.

---

## Template

Copy this block for future entries:

```md
## YYYY-MM-DD — Short change title

### What we were trying to achieve

Short plain-English goal.

### Feature / change being made

Name the feature, fix, cleanup, or improvement.

### Files changed

- /absolute/path/or/repo-relative-path
- /absolute/path/or/repo-relative-path

### Notes

- Optional implementation notes
- Optional risks or follow-up
```

## 2026-04-17 — Settings page legacy fallback compatibility

### What we were trying to achieve

Keep the settings page reachable during the public-MVP transition even when a user reaches it through the legacy password flow, while keeping the real Google-session path unchanged.

### Feature / change being made

Settings page access compatibility patch for legacy-cookie users during the auth cutover.

### Files changed

- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- The page now mirrors the dashboard/song-page fallback pattern: bootstrap first, then legacy identity if bootstrap is unavailable.
- Settings storage is still keyed by the transitional identity string on the API side; this patch only keeps the page reachable and makes that limitation explicit to legacy users.

---

## 2026-04-17 — Phase 2A end-to-end validation planning

### What we were trying to achieve

Capture the real current cutover state and define a structured validation pass for the live auth/bootstrap model without widening scope into new feature work.

### Feature / change being made

Roadmap and validation planning update for the completed Phase 2A cutover.

### Files changed

- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Updated the roadmap to reflect that dashboard, song pages, create-song, and settings page-access cutovers are implemented.
- Added a rollout-log entry marking validation and stabilisation as the next follow-up.

---

## 2026-04-17 — Collaborator invites and membership audit

### What we were trying to achieve

Assess whether the codebase is ready to move from Phase 2A cutover work into the first real collaboration-management slice for public MVP.

### Feature / change being made

Audit and planning checkpoint for collaborator invites and membership management.

### Files changed

- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Confirmed that account/workspace ownership and membership foundations already exist.
- Confirmed that invite creation, acceptance, and member management are not yet implemented.
- Recorded this as the likely first Phase 2B slice rather than widening Phase 2A further.

---

## 2026-04-17 — Phase 2B invite-system planning

### What we were trying to achieve

Turn the collaborator invites audit into a concrete, minimal implementation plan for the first post-cutover collaboration slice.

### Feature / change being made

Planning checkpoint for collaborator invites and membership management.

### Files changed

- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Defined the smallest viable invite system for owner-led band collaboration.
- Kept scope intentionally narrow: owner/member roles only, invite by email, accept after Google sign-in, revoke/remove support, no billing or ownership transfer.

---

## 2026-04-17 — Invite persistence foundation checklist

### What we were trying to achieve

Break the first collaborator-invite implementation slice into the safest possible first step before writing code.

### Feature / change being made

Execution checklist for Phase 2B Slice 1: invite persistence foundation.

### Files changed

- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Locked Step 1 to an additive schema migration only.
- Deferred APIs, acceptance flow, UI, and email sending until the invite table and constraints are validated.

---

## 2026-04-17 — Account invites schema migration

### What we were trying to achieve

Add the smallest safe persistence foundation for collaborator invites before implementing any invite APIs or UI.

### Feature / change being made

Additive schema migration for `account_invites` with duplicate-pending-invite protection and expiry defaults.

### Files changed

- [migrations/20260417_phase_2b_account_invites_up.sql](/Users/impero/song-review-app/migrations/20260417_phase_2b_account_invites_up.sql)
- [migrations/20260417_phase_2b_account_invites_down.sql](/Users/impero/song-review-app/migrations/20260417_phase_2b_account_invites_down.sql)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Added `account_invites` as a dedicated pending-invite table.
- Enforced one active pending invite per `(account_id, normalized_email)`.
- Added a trigger to normalize email-derived fields and maintain `updated_at`.

---

## 2026-04-17 — Invite API audit and planning

### What we were trying to achieve

Confirm whether any owner-side invite persistence API already existed and define the smallest safe API surface for the next implementation step.

### Feature / change being made

Audit and planning checkpoint for owner-only invite create/list/revoke APIs.

### Files changed

- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Confirmed no invite routes exist yet.
- Confirmed current canonical auth/bootstrap and workspace-member helpers are sufficient to implement owner-only invite APIs without widening into acceptance flow or UI.

---

## 2026-04-17 — Invite acceptance public-read checklist

### What we were trying to achieve

Break the invite acceptance feature into the smallest first slice before any membership creation or accept actions are added.

### Feature / change being made

Execution checklist for the public invite read path.

### Files changed

- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Locked Slice A to a public invite page, public invite read API, helper lookup additions, and the smallest middleware change needed to make `/invite/[token]` reachable.
- Deferred accept behavior, Google sign-in handoff, and workspace membership creation to the next slice.

---

## 2026-04-17 — Owner-only invite persistence APIs

### What we were trying to achieve

Add the smallest safe owner-side API surface for invite persistence before building acceptance flow or UI.

### Feature / change being made

Owner-only create/list/revoke invite APIs for the current workspace.

### Files changed

- [lib/accountInvites.ts](/Users/impero/song-review-app/lib/accountInvites.ts)
- [app/api/workspace/invites/route.ts](/Users/impero/song-review-app/app/api/workspace/invites/route.ts)
- [app/api/workspace/invites/[inviteId]/route.ts](/Users/impero/song-review-app/app/api/workspace/invites/[inviteId]/route.ts)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Added centralized email normalization and duplicate/member checks in the shared invite helper.
- Implemented owner-only invite listing, creation, and revoke flows.
- Kept acceptance, UI, email sending, and collaborator removal out of scope.

---

## 2026-04-17 — Public invite read path

### What we were trying to achieve

Make invite links safely readable before implementing invite acceptance or membership creation.

### Feature / change being made

Public invite landing page, token lookup helper logic, and public invite read API.

### Files changed

- [middleware.ts](/Users/impero/song-review-app/middleware.ts)
- [lib/accountInvites.ts](/Users/impero/song-review-app/lib/accountInvites.ts)
- [app/api/invites/[token]/route.ts](/Users/impero/song-review-app/app/api/invites/[token]/route.ts)
- [app/invite/[token]/page.tsx](/Users/impero/song-review-app/app/invite/[token]/page.tsx)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- `/invite/[token]` is now public and avoids auth redirect loops.
- Public invite state is available for pending, revoked, expired, accepted, and invalid tokens.
- Acceptance flow and Google sign-in handoff remain intentionally out of scope for the next slice.

---

## 2026-04-17 — Invite acceptance mutation planning

### What we were trying to achieve

Define the smallest safe next slice so an invited user can join a workspace after sign-in, without widening into sign-in handoff or UI work.

### Feature / change being made

Planning checkpoint for the invite acceptance mutation route.

### Files changed

- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Confirmed no accept mutation exists yet.
- Confirmed the next minimal implementation should be a signed-in `POST /api/invites/[token]/accept` route built on the current auth/bootstrap and `account_members` model.

---

## 2026-04-18 — Invite acceptance mutation route planning refresh

### What we were trying to achieve

Refresh the planning checkpoint for the next invite slice using the current codebase state before implementing the acceptance mutation.

### Feature / change being made

Planning-only audit for the signed-in invite acceptance route.

### Files changed

- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Reconfirmed that no acceptance mutation exists yet.
- Reconfirmed that the next minimal slice should stay limited to `POST /api/invites/[token]/accept` and helper additions in `lib/accountInvites.ts`.

---

## 2026-04-18 — Invite acceptance mutation route

### What we were trying to achieve

Allow a signed-in invited collaborator with the correct Google email to join a workspace without widening into sign-in handoff or UI work.

### Feature / change being made

Signed-in invite acceptance mutation route and narrow acceptance-specific invite helpers.

### Files changed

- [lib/accountInvites.ts](/Users/impero/song-review-app/lib/accountInvites.ts)
- [app/api/invites/[token]/accept/route.ts](/Users/impero/song-review-app/app/api/invites/[token]/accept/route.ts)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Added acceptance-specific membership and invite-finalization helpers.
- Implemented `POST /api/invites/[token]/accept` with signed-in user requirement, email-match enforcement, duplicate-membership protection, and invite finalization.
- Kept Google sign-in handoff, page wiring, and UI out of scope.

---

## 2026-04-18 — Invite page handoff and accept wiring planning

### What we were trying to achieve

Define the smallest page-level slice needed to complete the invited-user journey without widening into broader collaborator UI.

### Feature / change being made

Planning-only audit for invite page sign-in handoff and minimal accept wiring.

### Files changed

- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Confirmed the existing callback `next` flow is likely reusable for invite return-path handoff.
- Confirmed the next minimal slice should focus on `app/invite/[token]/page.tsx`, with no broader auth or collaborator-management expansion.

---

## 2026-04-18 — Invite page handoff and minimal accept wiring

### What we were trying to achieve

Complete the invited-user journey on the invite page with the smallest possible UI layer so signed-out users can return after Google auth and matching signed-in users can accept the invite.

### Feature / change being made

Minimal invite page client action layer for Google sign-in trigger, signed-in state handling, invite acceptance, and dashboard redirect on success.

### Files changed

- [app/invite/[token]/page.tsx](/Users/impero/song-review-app/app/invite/[token]/page.tsx)
- [app/invite/[token]/InviteActions.tsx](/Users/impero/song-review-app/app/invite/[token]/InviteActions.tsx)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Kept the invite page server-rendered and added one small client action component for sign-in and accept behavior.
- Reused the existing callback `next` pattern and existing `POST /api/invites/[token]/accept` route.
- Left owner UI, email delivery, billing, and broader auth changes out of scope.

---

## 2026-04-18 — Collaborator management UI planning

### What we were trying to achieve

Define the smallest useful owner-facing collaborator-management surface for MVP without widening into billing, advanced roles, or broader account-management work.

### Feature / change being made

Planning-only audit for owner invite/member management UI placement, scope, and required API surface.

### Files changed

- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Confirmed there is still no owner-facing collaborator-management UI in the app.
- Confirmed existing invite create/list/revoke APIs and workspace member list API can be reused.
- Confirmed one additional owner-only member removal API will be needed to complete the MVP management surface.

---

## 2026-04-18 — Owner-only member removal API

### What we were trying to achieve

Add the smallest backend surface needed for owner-facing collaborator management by allowing the workspace owner to remove a non-owner member.

### Feature / change being made

Owner-only `DELETE /api/workspace/members/[userId]` route plus narrow workspace membership helper support.

### Files changed

- [app/api/workspace/members/[userId]/route.ts](/Users/impero/song-review-app/app/api/workspace/members/[userId]/route.ts)
- [lib/workspaceMembers.ts](/Users/impero/song-review-app/lib/workspaceMembers.ts)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Restricts removal to authenticated owners in the current workspace only.
- Prevents owner self-removal and does not delete historical collaboration data.
- Leaves settings UI, invite UI, and broader permissions work out of scope.

---

## 2026-04-18 — Collaborator management UI in settings

### What we were trying to achieve

Add the smallest useful owner-facing collaborator management UI so invites and member access can be managed inside the existing settings page.

### Feature / change being made

Settings-page collaborator section for invite creation, current member list, pending invite list, revoke, and remove actions.

### Files changed

- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [app/settings/settings.module.css](/Users/impero/song-review-app/app/settings/settings.module.css)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Reused the existing workspace invite and member APIs plus the new owner-only member removal route.
- Kept the existing theme settings area intact and placed collaborator management below it.
- Non-owner and legacy fallback paths stay safe by avoiding destructive actions.

---

## 2026-04-18 — Invite email delivery audit

### What we were trying to achieve

Verify whether workspace invites currently send email and, if so, what service is responsible for delivery.

### Feature / change being made

Audit-only check of invite creation and existing email-sending paths.

### Files changed

- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Confirmed `POST /api/workspace/invites` currently only creates a pending invite row and does not send email.
- Confirmed Resend is wired for thread notification emails, not invite delivery.

---

## 2026-04-18 — Invite delivery fallback and account menu

### What we were trying to achieve

Make the collaborator flow practically usable by adding manual invite-link fallback, initial invite email delivery, and a visible account menu for the main authenticated app surfaces.

### Feature / change being made

Coordinated pass covering copyable pending invite links, non-blocking Resend invite delivery, and a minimal top-right account menu.

### Files changed

- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [app/settings/settings.module.css](/Users/impero/song-review-app/app/settings/settings.module.css)
- [app/api/workspace/invites/route.ts](/Users/impero/song-review-app/app/api/workspace/invites/route.ts)
- [app/dashboard/page.tsx](/Users/impero/song-review-app/app/dashboard/page.tsx)
- [components/AccountMenu.tsx](/Users/impero/song-review-app/components/AccountMenu.tsx)
- [components/AccountMenu.module.css](/Users/impero/song-review-app/components/AccountMenu.module.css)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Pending invites can now be copied manually from settings using the existing invite token.
- New invite creation now attempts Resend email delivery but still succeeds if email sending fails.
- Added a shared account menu for dashboard and settings without widening into a shell redesign.

---

## 2026-04-18 — MVP commercialisation planning

### What we were trying to achieve

Define the smallest safe billing and plan-introduction path now that the core collaboration loop is in place.

### Feature / change being made

Planning-only audit for free vs paid structure, billing foundation, and minimal in-app plan visibility.

### Files changed

- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Confirmed there is no billing provider or plan-enforcement code in the app yet.
- Confirmed the smallest next path is a monthly-only free/paid launch with lightweight plan visibility before any broader account-management expansion.

---

## 2026-04-18 — MVP plan foundation without billing

### What we were trying to achieve

Introduce a simple free vs paid plan structure with a free-tier collaborator cap, while keeping real billing providers and checkout flows out of scope.

### Feature / change being made

Account-level plan state, free-tier invite cap enforcement, and minimal plan visibility in settings.

### Files changed

- [lib/plans.ts](/Users/impero/song-review-app/lib/plans.ts)
- [migrations/20260418_phase_3a_account_plan_up.sql](/Users/impero/song-review-app/migrations/20260418_phase_3a_account_plan_up.sql)
- [migrations/20260418_phase_3a_account_plan_down.sql](/Users/impero/song-review-app/migrations/20260418_phase_3a_account_plan_down.sql)
- [lib/bootstrapAccount.ts](/Users/impero/song-review-app/lib/bootstrapAccount.ts)
- [app/api/workspace/invites/route.ts](/Users/impero/song-review-app/app/api/workspace/invites/route.ts)
- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [app/settings/settings.module.css](/Users/impero/song-review-app/app/settings/settings.module.css)
- [DATABASE.md](/Users/impero/song-review-app/DATABASE.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Added `accounts.plan` with `free` as the default through a migration pair.
- Free plan now blocks creating new invites once the collaborator cap is reached, while leaving existing members untouched.
- Settings now shows the current plan and collaborator allowance with a non-functional Upgrade button.

---

## 2026-04-18 — Plan-column bootstrap compatibility fix

### What we were trying to achieve

Fix the post-Google-sign-in bootstrap failure caused by environments where the new `accounts.plan` column has not been applied yet.

### Feature / change being made

Safe code fallback so missing `accounts.plan` defaults to `free` instead of breaking bootstrap or invite-plan lookups.

### Files changed

- [lib/plans.ts](/Users/impero/song-review-app/lib/plans.ts)
- [lib/bootstrapAccount.ts](/Users/impero/song-review-app/lib/bootstrapAccount.ts)
- [app/api/workspace/invites/route.ts](/Users/impero/song-review-app/app/api/workspace/invites/route.ts)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Bootstrap now retries the workspace read without `plan` if the column is missing and defaults that workspace to `free`.
- Invite-plan lookup now does the same so free-tier enforcement remains safe instead of crashing.

---

## 2026-04-18 — Invite auth return-path fix

### What we were trying to achieve

Fix the invite sign-in flow so a user who signs in from `/invite/[token]` returns to that same invite page instead of being normalized away by the login redirect logic.

### Feature / change being made

Allow `/invite/[token]` through the post-login redirect validator on the login page.

### Files changed

- [app/page.tsx](/Users/impero/song-review-app/app/page.tsx)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- The login page already allowed dashboard, settings, and song routes, but invite routes were missing from the allowlist.
- This fix keeps the invite handoff on the intended `/invite/[token]` path after successful Google auth.

---

## 2026-04-18 — Google success handoff fix

### What we were trying to achieve

Fix the post-Google-sign-in case where the login page stayed put even though bootstrap had already succeeded and returned `google=success`.

### Feature / change being made

Make the login page redirect on successful Google bootstrap without depending on an immediate client-side Supabase session read.

### Files changed

- [app/page.tsx](/Users/impero/song-review-app/app/page.tsx)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- The previous logic only redirected when `supabase.auth.getSession()` already returned a client-visible session in the same tick.
- The new logic trusts the server-side bootstrap success signal and immediately continues to the validated `redirectTo` target.

---

## 2026-04-18 — Active workspace preference after invite acceptance

### What we were trying to achieve

Fix the wrong-workspace bug where invite acceptance succeeded but the collaborator still landed in their own personal bootstrapped workspace instead of the inviter's shared workspace.

### Feature / change being made

Store the inviter workspace as an active-workspace cookie after successful invite acceptance and let bootstrap prefer that workspace when the current user is a valid member of it.

### Files changed

- [lib/activeWorkspace.ts](/Users/impero/song-review-app/lib/activeWorkspace.ts)
- [app/api/invites/[token]/accept/route.ts](/Users/impero/song-review-app/app/api/invites/[token]/accept/route.ts)
- [lib/bootstrapAccount.ts](/Users/impero/song-review-app/lib/bootstrapAccount.ts)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- The cookie is only written after successful invite acceptance.
- Bootstrap now prefers the cookie-selected workspace only when membership confirms it is valid for the signed-in user.
- Missing, malformed, or stale cookie values fall back to the existing owner-workspace bootstrap behavior.

---

## 2026-04-18 — Collaborator settings permissions and invite handoff patch

### What we were trying to achieve

Fix two real invite-flow problems from manual testing: members still seeing owner-only collaborator controls in settings, and invite sign-in occasionally dropping users into the dashboard before they returned to the invite page.

### Feature / change being made

Use the canonical membership role from bootstrap to gate owner-only settings controls, and add a one-tab invite return-path fallback through Google auth so the invite flow can resume on `/invite/[token]`.

### Files changed

- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [app/invite/[token]/InviteActions.tsx](/Users/impero/song-review-app/app/invite/[token]/InviteActions.tsx)
- [app/page.tsx](/Users/impero/song-review-app/app/page.tsx)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Settings no longer infers ownership from whether invite loading succeeds; it now uses the canonical bootstrap membership role directly.
- Member users still see collaborator information, but owner-only invite creation and pending-invite actions are no longer rendered for them.
- The invite page now stores a one-tab post-login invite path before starting OAuth, and the login page prefers that path when Google auth returns without a reliable invite redirect target.

---

## 2026-04-18 — Shared authenticated shell foundation

### What we were trying to achieve

Create the smallest reusable authenticated app shell so dashboard and settings can later adopt a fixed left navigation pattern without a broader layout rewrite.

### Feature / change being made

Reusable authenticated shell wrapper plus a fixed left icon sidebar for Dashboard, Settings, and Sign out.

### Files changed

- [components/AppShell.tsx](/Users/impero/song-review-app/components/AppShell.tsx)
- [components/AppShell.module.css](/Users/impero/song-review-app/components/AppShell.module.css)
- [components/AppSidebar.tsx](/Users/impero/song-review-app/components/AppSidebar.tsx)
- [components/AppSidebar.module.css](/Users/impero/song-review-app/components/AppSidebar.module.css)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- The shell is not adopted by any page yet in this step.
- The sidebar sign-out action intentionally reuses the same Supabase plus legacy-cookie clearing behavior already used by the account menu.
- This keeps the new shell isolated and reversible before dashboard/settings adoption.

---

## 2026-04-18 — Dashboard and settings shell adoption

### What we were trying to achieve

Adopt the new authenticated shell on the two primary authenticated hub pages without changing their internal product behavior or widening into song-page layout work.

### Feature / change being made

Wrap dashboard and settings in the shared AppShell and remove the top-right account menu from those two pages.

### Files changed

- [app/dashboard/page.tsx](/Users/impero/song-review-app/app/dashboard/page.tsx)
- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- The shell adoption only changes the outer frame and global navigation entry point.
- Dashboard and settings continue to use their existing page-specific headers and internal content.
- Song pages remain intentionally out of scope for a later optional slice.

---

## 2026-04-18 — Real billing integration planning

### What we were trying to achieve

Define the smallest safe way to introduce real billing now that the collaboration loop, plan state, collaborator cap, and authenticated shell are all in place.

### Feature / change being made

Planning-only audit for a single paid monthly subscription flow covering billing foundation, checkout, webhook sync, and minimal billing management.

### Files changed

- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- The app already has local `free` / `paid` plan state and free-tier collaborator-cap enforcement, but no external billing provider or subscription sync.
- The recommended MVP path is a single monthly paid subscription for the workspace owner using Stripe-hosted checkout, Stripe webhooks for local entitlement sync, and a minimal customer-portal manage-billing path.

---

## 2026-04-18 — Plan-limit upgrade prompts without billing

### What we were trying to achieve

Create a cleaner, testable paywall experience before real billing by turning plan-limit hits into structured upgrade prompts, adding lightweight upgrade-intent logging, and showing simple usage awareness in settings.

### Feature / change being made

Structured plan-limit responses for collaborator and song caps, reusable upgrade modal, lightweight plan-event logging, and free-plan usage visibility in settings.

### Files changed

- [lib/plans.ts](/Users/impero/song-review-app/lib/plans.ts)
- [lib/planEvents.ts](/Users/impero/song-review-app/lib/planEvents.ts)
- [app/api/plan-events/route.ts](/Users/impero/song-review-app/app/api/plan-events/route.ts)
- [app/api/workspace/invites/route.ts](/Users/impero/song-review-app/app/api/workspace/invites/route.ts)
- [app/api/songs/create/route.ts](/Users/impero/song-review-app/app/api/songs/create/route.ts)
- [components/UpgradeModal.tsx](/Users/impero/song-review-app/components/UpgradeModal.tsx)
- [components/UpgradeModal.module.css](/Users/impero/song-review-app/components/UpgradeModal.module.css)
- [app/dashboard/page.tsx](/Users/impero/song-review-app/app/dashboard/page.tsx)
- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Free collaborator-cap hits now return a structured `PLAN_LIMIT_REACHED` payload instead of a generic free-plan error string.
- Free song-cap hits are enforced only on song creation, not on uploads, versions, comments, actions, or existing songs.
- Upgrade clicks currently only log intent and show a minimal coming-soon confirmation; there is still no Stripe, checkout, or pricing page in this slice.

---

## 2026-04-18 — Stripe Checkout MVP billing

### What we were trying to achieve

Let a free workspace owner upgrade to the paid plan through the smallest possible hosted Stripe Checkout flow, without building a full billing lifecycle yet.

### Feature / change being made

Minimal Stripe Checkout billing foundation with owner-only checkout, post-payment activation, and direct upgrade entry points from the app.

### Files changed

- [package.json](/Users/impero/song-review-app/package.json)
- [package-lock.json](/Users/impero/song-review-app/package-lock.json)
- [lib/stripe.ts](/Users/impero/song-review-app/lib/stripe.ts)
- [app/api/billing/checkout/route.ts](/Users/impero/song-review-app/app/api/billing/checkout/route.ts)
- [app/api/billing/activate/route.ts](/Users/impero/song-review-app/app/api/billing/activate/route.ts)
- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [app/dashboard/page.tsx](/Users/impero/song-review-app/app/dashboard/page.tsx)
- [components/UpgradeModal.tsx](/Users/impero/song-review-app/components/UpgradeModal.tsx)
- [components/UpgradeModal.module.css](/Users/impero/song-review-app/components/UpgradeModal.module.css)
- [migrations/20260418_phase_3b_billing_columns_up.sql](/Users/impero/song-review-app/migrations/20260418_phase_3b_billing_columns_up.sql)
- [migrations/20260418_phase_3b_billing_columns_down.sql](/Users/impero/song-review-app/migrations/20260418_phase_3b_billing_columns_down.sql)
- [README.md](/Users/impero/song-review-app/README.md)
- [DATABASE.md](/Users/impero/song-review-app/DATABASE.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Checkout is owner-only and creates a Stripe customer for the current workspace if one does not already exist.
- Successful Stripe return now uses a minimal server activation step on the dashboard to mark the workspace plan as `paid` and store the Stripe subscription identifier.
- This intentionally does not include webhooks, customer portal, downgrade handling, or full subscription lifecycle management yet.

---

## 2026-04-21 — Paid upgrade success experience

### What we were trying to achieve

Turn the technically working paid-upgrade return flow into a more premium, product-feeling success moment without changing the underlying billing behavior.

### Feature / change being made

Reusable upgrade-success modal with lightweight celebration, plus a persistent paid-plan indicator in the authenticated app shell.

### Files changed

- [components/AppShell.tsx](/Users/impero/song-review-app/components/AppShell.tsx)
- [components/AppSidebar.tsx](/Users/impero/song-review-app/components/AppSidebar.tsx)
- [components/AppSidebar.module.css](/Users/impero/song-review-app/components/AppSidebar.module.css)
- [components/UpgradeSuccessModal.tsx](/Users/impero/song-review-app/components/UpgradeSuccessModal.tsx)
- [components/UpgradeSuccessModal.module.css](/Users/impero/song-review-app/components/UpgradeSuccessModal.module.css)
- [app/dashboard/page.tsx](/Users/impero/song-review-app/app/dashboard/page.tsx)
- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- The old dashboard success banner is now replaced by a modal shown only when the Stripe success return is actually activated.
- The modal includes a restrained particle effect, a clearer summary of unlocked capabilities, and a primary CTA toward collaborator management.
- Paid workspaces now surface a small persistent `Pro` indicator in the fixed authenticated sidebar instead of burying paid state only inside settings.

---

## 2026-04-21 — Local plan testing toggle

### What we were trying to achieve

Make it fast to test both free and paid UI states locally after a workspace has already upgraded, without having to loop through Stripe Checkout every time.

### Feature / change being made

Development-only workspace plan toggle in Settings plus a tiny owner-only API route to flip `free` / `paid` locally.

### Files changed

- [app/api/workspace/plan/route.ts](/Users/impero/song-review-app/app/api/workspace/plan/route.ts)
- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [app/settings/settings.module.css](/Users/impero/song-review-app/app/settings/settings.module.css)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- The toggle is blocked in production and is only intended for local testing.
- It changes `accounts.plan` only and does not cancel, recreate, or otherwise mutate the real Stripe subscription state.
- The new controls live inside the existing Plan section in Settings so both free and paid views are easy to exercise during QA.

---

## 2026-04-22 — Mobile song-sheet interaction polish

### What we were trying to achieve

Bring the mobile dashboard song-card interaction closer to the wireframed bottom-sheet behavior by making the `i` affordance feel native to the compact mobile row layout.

### Feature / change being made

Mobile-only dashboard card layout polish for inline meta, attention styling, and bottom-sheet presentation.

### Files changed

- [app/dashboard/page.tsx](/Users/impero/song-review-app/app/dashboard/page.tsx)
- [app/dashboard/dashboard.module.css](/Users/impero/song-review-app/app/dashboard/dashboard.module.css)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- The mobile grid card now renders a dedicated inline meta line for stage, version, and action-pill content so the title has more room in narrow rows.
- Mobile attention cards now use a stronger left-edge accent and keep the info button visually tinted to match the attention state.
- The existing mobile bottom-sheet interaction remains the single mobile info surface and still dismisses by tapping the dimmed area or the handle.

---

## 2026-04-22 — Mobile shell width fix

### What we were trying to achieve

Fix the authenticated mobile layout after discovering the shared desktop sidebar was still rendering on narrow screens and compressing the dashboard content area.

### Feature / change being made

Shared shell breakpoint fix so the fixed desktop sidebar is hidden on mobile and the content area no longer keeps the desktop left offset.

### Files changed

- [components/AppShell.module.css](/Users/impero/song-review-app/components/AppShell.module.css)
- [components/AppSidebar.module.css](/Users/impero/song-review-app/components/AppSidebar.module.css)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- The bug was in the shared shell, not Chrome device emulation.
- Mobile views were still inheriting the desktop `76px` content offset because the sidebar and content margin had no mobile breakpoint override.
- The fix leaves desktop shell behavior unchanged and only removes the sidebar/offset on screens `768px` wide and below.

---

## 2026-04-22 — Mobile row alignment follow-up

### What we were trying to achieve

Finish the mobile song-row layout so the action icons sit on the title line and the pink action pill is fully visible instead of clipped.

### Feature / change being made

Mobile-only dashboard CSS overrides to beat the lingering desktop-grid card rules on narrow screens.

### Files changed

- [app/dashboard/dashboard.module.css](/Users/impero/song-review-app/app/dashboard/dashboard.module.css)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- The remaining layout bug was caused by older `.desktopGridCard` rules with `!important` still winning on mobile.
- The patch forces the mobile row layout to win, repositions the icon cluster to the top-right, and removes clipping from the inline action pill.
- A subsequent `npm run build` hit unrelated pre-existing route collection errors for `/api/auth/verify-password` and `/api/actions/create`, but the CSS change itself compiled successfully before that failure.

---

## 2026-04-22 — Stripe webhook sync and billing portal

### What we were trying to achieve

Make the existing Stripe upgrade flow trustworthy enough for a real paid MVP by syncing subscription lifecycle changes back into local entitlement state and giving paid owners a minimal self-serve billing-management path.

### Feature / change being made

Stripe webhook sync for core subscription events plus an owner-only customer portal entry point from Settings.

### Files changed

- [lib/stripe.ts](/Users/impero/song-review-app/lib/stripe.ts)
- [app/api/stripe/webhook/route.ts](/Users/impero/song-review-app/app/api/stripe/webhook/route.ts)
- [app/api/billing/portal/route.ts](/Users/impero/song-review-app/app/api/billing/portal/route.ts)
- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [README.md](/Users/impero/song-review-app/README.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Added Stripe webhook signature verification using `STRIPE_WEBHOOK_SECRET`.
- Synced `accounts.plan`, `stripe_customer_id`, and `stripe_subscription_id` from `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
- Added a minimal owner-only billing portal route and wired paid owners in Settings to a `Manage billing` button.
- Documented the new webhook secret and local endpoint expectation in the README.

---

## 2026-04-25 — Production login cleanup

### What we were trying to achieve

Remove the redundant legacy password fallback from the public production login screen now that the deployed app should use Google sign-in as the primary access path.

### Feature / change being made

Login page cleanup for the production Google-auth flow.

### Files changed

- [app/page.tsx](/Users/impero/song-review-app/app/page.tsx)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Removed the visible password field and legacy password submit button from the login page.
- Kept the Google sign-in and post-login redirect handling unchanged.
- Supabase Auth URL configuration still needs the production callback URL so deployed Google auth does not fall back to localhost.
