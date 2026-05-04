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

---

## 2026-05-01 — Supabase Auth production callback configuration

### What we were trying to achieve

Allow the deployed Google sign-in flow to return to the production Vercel app instead of falling back to localhost.

### Feature / change being made

External Supabase Auth URL configuration checkpoint for the production Google OAuth flow.

### Files changed

- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Supabase Auth Site URL is configured to `https://song-review-app-v2.vercel.app`.
- Supabase Auth Redirect URLs include `http://localhost:3000/auth/callback`.
- Supabase Auth Redirect URLs include `https://song-review-app-v2.vercel.app/auth/callback`.
- Supabase Auth Redirect URLs include the current Vercel branch-preview callback URL.
- Production Google sign-in was verified successfully on `https://song-review-app-v2.vercel.app`.
- Next verification should be an invite sign-in round trip.

---

## 2026-05-01 — Member workspace dashboard resolution fix

### What we were trying to achieve

Ensure invited workspace members land in the shared owner workspace and see the owner-created songs instead of landing in their empty auto-created personal workspace.

### Feature / change being made

Workspace bootstrap selection fix for users who have both a personal owner workspace and a collaborative member workspace.

### Files changed

- [lib/bootstrapAccount.ts](/Users/impero/song-review-app/lib/bootstrapAccount.ts)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Confirmed `cat.libbie@gmail.com` owns an empty personal workspace and is also a member of Coris Leachman's workspace, which currently has songs.
- Bootstrap still respects the active-workspace cookie when present.
- When no active-workspace cookie is present, bootstrap now prefers an existing `member` workspace before falling back to an `owner` workspace.
- `npx tsc --noEmit` passed.

---

## 2026-05-02 — Workspace model and user journey spec

### What we were trying to achieve

Document the product model for signed-in users, workspaces, memberships, workspace switching, and multi-route onboarding before building a switcher UI.

### Feature / change being made

Planning/specification document for the future workspace switcher and multi-workspace UX.

### Files changed

- [WORKSPACE_MODEL.md](/Users/impero/song-review-app/WORKSPACE_MODEL.md)
- [README.md](/Users/impero/song-review-app/README.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Defined the distinction between user identity and workspace.
- Captured the two main entry routes: direct signup and invite-first membership.
- Documented journeys for creating a personal workspace after joining a band workspace, and joining a band after starting solo.
- Captured workspace switcher requirements, empty states, billing implications, open questions, and suggested build order.

---

## 2026-05-02 — Read-only workspace indicator

### What we were trying to achieve

Make the active workspace visible in the authenticated app shell so users can tell which song library they are currently viewing before full workspace switching is built.

### Feature / change being made

First workspace-switcher build slice: read-only current-workspace and role indicator in the shared shell.

### Files changed

- [components/AppShell.tsx](/Users/impero/song-review-app/components/AppShell.tsx)
- [components/AppShell.module.css](/Users/impero/song-review-app/components/AppShell.module.css)
- [components/AppSidebar.tsx](/Users/impero/song-review-app/components/AppSidebar.tsx)
- [components/AppSidebar.module.css](/Users/impero/song-review-app/components/AppSidebar.module.css)
- [app/dashboard/page.tsx](/Users/impero/song-review-app/app/dashboard/page.tsx)
- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Dashboard and Settings now pass canonical workspace name and membership role from `/api/auth/bootstrap` into the shared shell.
- Desktop rail shows a compact workspace mark with role and a full title tooltip.
- Mobile authenticated shell shows a sticky workspace strip because the desktop rail is hidden on narrow screens.
- After visual review, the dashboard header now explicitly labels the active workspace and role so users do not have to interpret the rail marker.
- This is intentionally read-only; switching and workspace creation remain future slices.
- `npx tsc --noEmit` passed.
- `curl -I http://localhost:3000/dashboard` returned the expected unauthenticated `307` redirect.

---

## 2026-05-02 — Workspace list API foundation

### What we were trying to achieve

Create the canonical server-backed read path that a future workspace switcher can use to list every workspace the signed-in user belongs to.

### Feature / change being made

Workspace switcher backend foundation: current-user workspace list API.

### Files changed

- [lib/workspaces.ts](/Users/impero/song-review-app/lib/workspaces.ts)
- [app/api/workspaces/route.ts](/Users/impero/song-review-app/app/api/workspaces/route.ts)
- [API.md](/Users/impero/song-review-app/API.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Added `GET /api/workspaces`.
- The route uses the canonical authenticated identity and returns only workspaces where the current user has a membership.
- The response includes current workspace id, workspace name, role, plan, song count, active state, join date, and creation date.
- This route is read-only; switching workspace remains a later slice.
- `npx tsc --noEmit` passed.
- `curl -i http://localhost:3000/api/workspaces` returned the expected unauthenticated `401`.

---

## 2026-05-02 — Workspace switch mutation route

### What we were trying to achieve

Add the safe server-side mutation that lets a signed-in user switch the active workspace only when they already belong to that workspace.

### Feature / change being made

Workspace switcher backend foundation: validated active-workspace switch route.

### Files changed

- [app/api/workspaces/switch/route.ts](/Users/impero/song-review-app/app/api/workspaces/switch/route.ts)
- [API.md](/Users/impero/song-review-app/API.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Added `POST /api/workspaces/switch`.
- The route requires an authenticated user, validates membership in the requested workspace, and writes the existing active-workspace cookie.
- The response returns the selected workspace and refreshed workspace list for future UI wiring.
- Clients should reload canonical reads such as `/api/auth/bootstrap` and `/api/dashboard` after switching.
- `npx tsc --noEmit` passed.
- Unauthenticated `curl` checks returned the expected `401`.

---

## 2026-05-02 — Shell workspace switcher UI wiring

### What we were trying to achieve

Make the authenticated shell use the new workspace APIs so a signed-in user can see their available workspaces and switch between them without signing out.

### Feature / change being made

Workspace switcher UI wiring for desktop rail and mobile shell surfaces.

### Files changed

- [components/WorkspaceSwitcher.tsx](/Users/impero/song-review-app/components/WorkspaceSwitcher.tsx)
- [components/WorkspaceSwitcher.module.css](/Users/impero/song-review-app/components/WorkspaceSwitcher.module.css)
- [components/AppShell.tsx](/Users/impero/song-review-app/components/AppShell.tsx)
- [components/AppShell.module.css](/Users/impero/song-review-app/components/AppShell.module.css)
- [components/AppSidebar.tsx](/Users/impero/song-review-app/components/AppSidebar.tsx)
- [components/AppSidebar.module.css](/Users/impero/song-review-app/components/AppSidebar.module.css)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Added a reusable client `WorkspaceSwitcher` component.
- The switcher lazy-loads `GET /api/workspaces` when opened.
- Non-active workspaces call `POST /api/workspaces/switch`, then reload the current page so canonical bootstrap/dashboard reads use the new active workspace.
- Desktop rail and mobile shell now use the same switcher logic.
- Workspace creation remains out of scope for this slice.
- `npx tsc --noEmit` passed.
- Unauthenticated `curl` checks against the workspace list/switch APIs returned the expected `401`.

---

## 2026-05-02 — Create-own-workspace switcher action

### What we were trying to achieve

Let an invited member who does not yet own a workspace create a separate personal workspace for their own songs without leaving the switcher.

### Feature / change being made

Workspace creation flow inside the existing workspace switcher.

### Files changed

- [app/api/workspaces/create/route.ts](/Users/impero/song-review-app/app/api/workspaces/create/route.ts)
- [components/WorkspaceSwitcher.tsx](/Users/impero/song-review-app/components/WorkspaceSwitcher.tsx)
- [components/WorkspaceSwitcher.module.css](/Users/impero/song-review-app/components/WorkspaceSwitcher.module.css)
- [components/AppShell.tsx](/Users/impero/song-review-app/components/AppShell.tsx)
- [components/AppSidebar.tsx](/Users/impero/song-review-app/components/AppSidebar.tsx)
- [API.md](/Users/impero/song-review-app/API.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Added `POST /api/workspaces/create`.
- The route creates an owned workspace only for authenticated users who do not already own one.
- The route creates the owner membership, sets the new workspace active, and returns the refreshed workspace list.
- The switcher now shows `Create your own workspace` when the loaded workspace list contains no owner workspace.
- Workspace creation uses an inline form and reloads after success so canonical reads use the new active workspace.
- `npx tsc --noEmit` passed.
- Unauthenticated `curl` checks against the workspace list/create APIs returned the expected `401`.

---

## 2026-05-02 — Workspace-aware dashboard empty states

### What we were trying to achieve

Make empty dashboards explain which workspace is empty so users do not mistake the wrong active workspace for missing songs.

### Feature / change being made

Workspace-aware empty-state copy on the dashboard.

### Files changed

- [app/dashboard/page.tsx](/Users/impero/song-review-app/app/dashboard/page.tsx)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Empty song state now names the active workspace.
- Member empty state now points users toward the workspace switcher if they expected a different song library.
- Filtered-empty copy also names the active workspace.
- No permissions or song-creation behavior changed in this slice.
- `npx tsc --noEmit` passed.

---

## 2026-05-02 — Workspace permissions model and audit

### What we were trying to achieve

Clarify whether members should be collaborators or read-only reviewers before making permission changes across shared workspaces.

### Feature / change being made

Documentation and code-audit checkpoint for workspace roles and route permissions.

### Files changed

- [PERMISSIONS_MODEL.md](/Users/impero/song-review-app/PERMISSIONS_MODEL.md)
- [README.md](/Users/impero/song-review-app/README.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Recommended keeping the current `member` role as a collaborator role.
- Documented a future reviewer/commenter role for read-only or comment-only access.
- Confirmed owner-only checks already exist for billing, invites, member removal, and plan state.
- Confirmed members are currently allowed to create songs, upload versions, comment, and update actions.
- Flagged hardening gaps in destructive song deletion, version creation, thread creation, task routes, song reads, and transitional settings persistence.
- No app behavior changed in this slice.

---

## 2026-05-02 — Owner-only song deletion hardening

### What we were trying to achieve

Make destructive song deletion respect the active workspace and role model before continuing with broader member collaboration permissions.

### Feature / change being made

Owner-only song deletion enforcement in the API and dashboard UI.

### Files changed

- [app/api/songs/[songId]/route.ts](/Users/impero/song-review-app/app/api/songs/[songId]/route.ts)
- [app/dashboard/page.tsx](/Users/impero/song-review-app/app/dashboard/page.tsx)
- [PERMISSIONS_MODEL.md](/Users/impero/song-review-app/PERMISSIONS_MODEL.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Song deletion now requires a signed-in canonical identity.
- The API verifies the song belongs to the active workspace before deleting related actions, versions, threads, comments, and the song record.
- Only workspace owners can delete songs.
- Non-owner members no longer see dashboard delete buttons.
- `npx tsc --noEmit` passed.
- Unauthenticated `DELETE /api/songs/test-id` returned `401 Unauthorized`.

---

## 2026-05-02 — Version creation workspace guard

### What we were trying to achieve

Prevent a signed-in user from creating a version or signed upload URL against a song outside their active workspace.

### Feature / change being made

Active-workspace validation for version creation while keeping collaborator uploads allowed.

### Files changed

- [app/api/versions/create/route.ts](/Users/impero/song-review-app/app/api/versions/create/route.ts)
- [PERMISSIONS_MODEL.md](/Users/impero/song-review-app/PERMISSIONS_MODEL.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Version creation now loads the target song before counting versions or creating a signed upload URL.
- The route returns `404` if the song does not exist.
- The route returns `403` if the song belongs to another workspace.
- Collaborators can still upload versions to songs in their active workspace.
- `npx tsc --noEmit` passed.
- Unauthenticated `POST /api/versions/create` returned `401 Unauthorized`.

---

## 2026-05-02 — Phase 1 workspace route hardening

### What we were trying to achieve

Complete the remaining Phase 1 route hardening so authenticated song, version, thread, task, and cover-art routes respect the active workspace boundary.

### Feature / change being made

Canonical workspace checks across the remaining collaboration read/write routes while keeping normal member collaboration allowed.

### Files changed

- [app/api/songs/[songId]/route.ts](/Users/impero/song-review-app/app/api/songs/[songId]/route.ts)
- [app/api/songs/[songId]/versions/route.ts](/Users/impero/song-review-app/app/api/songs/[songId]/versions/route.ts)
- [app/api/songs/[songId]/tasks/route.ts](/Users/impero/song-review-app/app/api/songs/[songId]/tasks/route.ts)
- [app/api/songs/upload-image/route.ts](/Users/impero/song-review-app/app/api/songs/upload-image/route.ts)
- [app/api/versions/[versionId]/route.ts](/Users/impero/song-review-app/app/api/versions/[versionId]/route.ts)
- [app/api/versions/[versionId]/threads/route.ts](/Users/impero/song-review-app/app/api/versions/[versionId]/threads/route.ts)
- [app/api/threads/create/route.ts](/Users/impero/song-review-app/app/api/threads/create/route.ts)
- [app/api/threads/reply/route.ts](/Users/impero/song-review-app/app/api/threads/reply/route.ts)
- [app/api/tasks/create/route.ts](/Users/impero/song-review-app/app/api/tasks/create/route.ts)
- [app/api/tasks/[taskId]/route.ts](/Users/impero/song-review-app/app/api/tasks/[taskId]/route.ts)
- [app/api/tasks/reorder/route.ts](/Users/impero/song-review-app/app/api/tasks/reorder/route.ts)
- [PERMISSIONS_MODEL.md](/Users/impero/song-review-app/PERMISSIONS_MODEL.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Song and version detail reads now require a signed-in canonical identity and active-workspace access.
- Song versions, song tasks, and version threads reads now verify the parent song/version belongs to the active workspace.
- Thread creation now verifies the version belongs to the submitted song and active workspace before inserting a thread/comment.
- Thread replies now verify the canonical thread/version/song chain belongs to the active workspace.
- Task create, update, delete, and reorder routes now verify task/song workspace access.
- Cover art upload now verifies the target song belongs to the active workspace before uploading and updating the song.
- Collaborators remain able to create songs, upload versions, comment, manage actions, and manage tasks inside shared workspaces.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.
- Unauthenticated probes returned `401 Unauthorized` for song detail, version detail, version threads, thread creation, task creation, and task reorder routes.

---

## 2026-05-02 — Settings model decision

### What we were trying to achieve

Decide whether settings should belong to the signed-in user or to the active workspace before adding more Settings UI controls.

### Feature / change being made

Documentation and model checkpoint for user-level versus workspace-level settings.

### Files changed

- [SETTINGS_MODEL.md](/Users/impero/song-review-app/SETTINGS_MODEL.md)
- [README.md](/Users/impero/song-review-app/README.md)
- [DATABASE.md](/Users/impero/song-review-app/DATABASE.md)
- [FEATURES.md](/Users/impero/song-review-app/FEATURES.md)
- [PERMISSIONS_MODEL.md](/Users/impero/song-review-app/PERMISSIONS_MODEL.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Theme colors are now documented as user-level settings.
- Workspace plan, billing, invites, members, role policy, and future shared branding are documented as workspace-level settings.
- `/api/settings` is explicitly documented as transitional because it is still keyed by `authorName`.
- Recommended future route split is `/api/profile/settings` for user preferences and `/api/workspace/settings` for workspace-owned settings.
- No database schema or app behavior changed in this slice.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-02 — Phase 2 Settings scope UI

### What we were trying to achieve

Start Phase 2 by making the Settings page clearly separate personal preferences from workspace-level administration.

### Feature / change being made

Settings UI copy and layout polish for personal theme, workspace settings, current role, and collaborator permissions.

### Files changed

- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [app/settings/settings.module.css](/Users/impero/song-review-app/app/settings/settings.module.css)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Renamed the color theme area to "Personal theme."
- Added copy clarifying that theme colors follow the signed-in user across workspaces.
- Added a workspace settings header with the active workspace name and current role.
- Added a permission summary for owners and members without adding editable role controls.
- Updated plan and collaborator section copy to clarify workspace scope.
- No persistence, schema, route, or permission behavior changed.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-02 — User-level profile theme settings

### What we were trying to achieve

Move personal theme persistence away from the legacy `authorName` key and onto a stable auth-user keyed model.

### Feature / change being made

User-level profile settings route, database migration, and compatibility fallback for legacy theme settings.

### Files changed

- [app/api/profile/settings/route.ts](/Users/impero/song-review-app/app/api/profile/settings/route.ts)
- [app/api/settings/route.ts](/Users/impero/song-review-app/app/api/settings/route.ts)
- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [lib/profileThemeSettings.ts](/Users/impero/song-review-app/lib/profileThemeSettings.ts)
- [migrations/20260502_profile_settings_up.sql](/Users/impero/song-review-app/migrations/20260502_profile_settings_up.sql)
- [migrations/20260502_profile_settings_down.sql](/Users/impero/song-review-app/migrations/20260502_profile_settings_down.sql)
- [API.md](/Users/impero/song-review-app/API.md)
- [DATABASE.md](/Users/impero/song-review-app/DATABASE.md)
- [FEATURES.md](/Users/impero/song-review-app/FEATURES.md)
- [SETTINGS_MODEL.md](/Users/impero/song-review-app/SETTINGS_MODEL.md)
- [PERMISSIONS_MODEL.md](/Users/impero/song-review-app/PERMISSIONS_MODEL.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Added `profile_settings`, keyed by `profiles.id` / auth user id.
- Added `/api/profile/settings` as the canonical personal theme settings route.
- Updated the Settings page to call `/api/profile/settings`.
- Kept `/api/settings` as a compatibility alias.
- Theme loading falls back to legacy `settings.user_identity` rows when no profile settings row exists or when the migration is not applied yet.
- Theme saving prefers `profile_settings` and falls back to legacy `settings` if the new table is unavailable.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.
- Unauthenticated `GET /api/profile/settings` and `GET /api/settings` returned `401 Unauthorized`.

---

## 2026-05-02 — Production profile settings migration checkpoint

### What we were trying to achieve

Complete Phase 2 step 4 by confirming the production database has the user-level `profile_settings` table required by `/api/profile/settings`.

### Feature / change being made

Production migration checkpoint and online verification handoff.

### Files changed

- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- User confirmed `migrations/20260502_profile_settings_up.sql` was applied in Supabase.
- Code still needs to be pushed and deployed before online theme save/load can be verified.
- Next manual verification is saving/loading personal theme settings online as Coris and Cat.

---

## 2026-05-02 — Member Settings view polish

### What we were trying to achieve

Complete Phase 2 step 6 by making the member view in Settings explain what members can do and why owner-only controls are absent.

### Feature / change being made

Member-facing Settings copy and non-editable access summary.

### Files changed

- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [app/settings/settings.module.css](/Users/impero/song-review-app/app/settings/settings.module.css)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Members now see a note that billing and plan changes are managed by the workspace owner.
- Collaborator section copy now differs for owners and members.
- Members now see a "What you can do" card explaining they can add songs, upload versions, comment, create actions, and manage song tasks.
- No route, schema, permission, or persistence behavior changed.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-02 — Permissions language final pass

### What we were trying to achieve

Complete Phase 2 step 7 by making owner/member permission language consistent across Settings and the permissions model.

### Feature / change being made

Copy and documentation clarification for member collaboration rights and owner-only destructive/admin controls.

### Files changed

- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [PERMISSIONS_MODEL.md](/Users/impero/song-review-app/PERMISSIONS_MODEL.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Settings now explicitly says members can add songs, upload versions, comment, create actions, and manage tasks.
- Settings now explicitly says song deletion, billing, invites, and member removal are owner-managed.
- Permissions matrix now marks collaborator/member song deletion as `No` rather than `Proposed no`.
- No route, schema, permission, or persistence behavior changed.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-02 — Settings layout overflow fix

### What we were trying to achieve

Fix the Settings page appearing oversized inside the app shell and prevent collaborator invite rows from spilling horizontally.

### Feature / change being made

Responsive Settings layout tightening for desktop and mobile QA.

### Files changed

- [app/settings/settings.module.css](/Users/impero/song-review-app/app/settings/settings.module.css)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Reduced Settings max width from `1400px` to `1240px` so it fits the shell content area better.
- Reduced page padding, card padding, section gaps, and heading/control sizes.
- Changed the personal settings grid to use a constrained side panel width.
- Made collaborator cards auto-fit and invite/member rows wrap instead of forcing horizontal overflow.
- Long invite/member text can now wrap within the card.
- No route, schema, permission, or persistence behavior changed.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-03 — Mobile personal theme layout fix

### What we were trying to achieve

Stop the Settings personalisation section from running off the page and being cut off on mobile.

### Feature / change being made

Phone-specific responsive layout for the personal theme controls.

### Files changed

- [app/settings/settings.module.css](/Users/impero/song-review-app/app/settings/settings.module.css)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Stacked color controls vertically on phone-width screens instead of keeping the desktop row.
- Constrained color text inputs to the card width.
- Changed preset buttons to a mobile-safe grid with a single-column fallback on very narrow screens.
- Stacked Save Theme and Reset controls vertically on mobile.
- Kept this as a CSS-only layout fix with no route, schema, permission, or persistence behavior changes.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-03 — Mobile collaborator row height fix

### What we were trying to achieve

Remove the large empty vertical space inside Current members and Pending invites rows on mobile.

### Feature / change being made

Mobile collaborator row sizing correction.

### Files changed

- [app/settings/settings.module.css](/Users/impero/song-review-app/app/settings/settings.module.css)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Reset collaborator row child flex sizing on tablet/mobile so rows use natural content height.
- Kept collaborator actions wrapping inside the row without forcing extra vertical space.
- Kept this as a CSS-only layout fix with no route, schema, permission, or persistence behavior changes.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-03 — Settings navigation and workspace rename polish

### What we were trying to achieve

Tidy the Settings/navigation UI and let workspace owners rename the active workspace from Settings.

### Feature / change being made

Settings UI polish and owner-only workspace name editing.

### Files changed

- [components/AppSidebar.tsx](/Users/impero/song-review-app/components/AppSidebar.tsx)
- [components/AppSidebar.module.css](/Users/impero/song-review-app/components/AppSidebar.module.css)
- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [app/settings/settings.module.css](/Users/impero/song-review-app/app/settings/settings.module.css)
- [app/api/workspace/settings/route.ts](/Users/impero/song-review-app/app/api/workspace/settings/route.ts)
- [API.md](/Users/impero/song-review-app/API.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- The left rail top icon is now the Dashboard/Home control instead of a separate music mark.
- The lower duplicate home nav item was removed.
- The Settings back link now uses a styled pill button treatment.
- Workspace owners can now rename the active workspace from Settings.
- Workspace rename saves through owner-only `PATCH /api/workspace/settings` to `accounts.name`.
- The slow Dashboard/Settings load report is documented as a later performance investigation, not changed in this UI pass.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-03 — Workspace image upload and switcher avatars

### What we were trying to achieve

Let workspace owners add a visual image alongside the workspace name so members can distinguish workspaces in the switcher.

### Feature / change being made

Owner-managed workspace image upload and workspace switcher image rendering.

### Files changed

- [app/api/workspace/settings/route.ts](/Users/impero/song-review-app/app/api/workspace/settings/route.ts)
- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [app/settings/settings.module.css](/Users/impero/song-review-app/app/settings/settings.module.css)
- [components/AppShell.tsx](/Users/impero/song-review-app/components/AppShell.tsx)
- [components/AppSidebar.tsx](/Users/impero/song-review-app/components/AppSidebar.tsx)
- [components/WorkspaceSwitcher.tsx](/Users/impero/song-review-app/components/WorkspaceSwitcher.tsx)
- [components/WorkspaceSwitcher.module.css](/Users/impero/song-review-app/components/WorkspaceSwitcher.module.css)
- [app/dashboard/page.tsx](/Users/impero/song-review-app/app/dashboard/page.tsx)
- [lib/bootstrapAccount.ts](/Users/impero/song-review-app/lib/bootstrapAccount.ts)
- [lib/canonicalIdentity.ts](/Users/impero/song-review-app/lib/canonicalIdentity.ts)
- [lib/workspaces.ts](/Users/impero/song-review-app/lib/workspaces.ts)
- [migrations/20260503_workspace_images_up.sql](/Users/impero/song-review-app/migrations/20260503_workspace_images_up.sql)
- [migrations/20260503_workspace_images_down.sql](/Users/impero/song-review-app/migrations/20260503_workspace_images_down.sql)
- [API.md](/Users/impero/song-review-app/API.md)
- [DATABASE.md](/Users/impero/song-review-app/DATABASE.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Added `accounts.image_url` migration for workspace images.
- Added owner-only image upload through `POST /api/workspace/settings`.
- Workspace images upload to the existing public `song-images` bucket under `workspace-images/`.
- Bootstrap and workspace list responses now include workspace image URLs, with safe fallbacks if the migration is not applied yet.
- Workspace switcher rail and popup rows render the image when present and fall back to initials otherwise.
- Settings now shows an owner-only workspace image uploader beside the existing workspace rename controls.
- No song, invite, billing, or member permission behavior changed.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-03 — Settings load performance pass

### What we were trying to achieve

Reduce the Settings page's slow initial load by removing avoidable sequential API calls.

### Feature / change being made

Settings summary route and client load simplification.

### Files changed

- [app/api/settings/summary/route.ts](/Users/impero/song-review-app/app/api/settings/summary/route.ts)
- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [API.md](/Users/impero/song-review-app/API.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Added `GET /api/settings/summary` so Settings resolves canonical identity once.
- Settings now loads identity, workspace plan/name/image, personal theme, members, owner invites, and song count from one endpoint.
- Removed the Settings page's full `/api/dashboard` load, which was previously used only to count songs.
- Song count now uses a direct `songs` count query.
- Legacy fallback behavior remains in place for legacy sessions.
- No schema, permission, billing, invite mutation, or song behavior changed.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-03 — Dashboard first-paint performance pass

### What we were trying to achieve

Reduce the Dashboard's initial perceived load time without removing rich activity data.

### Feature / change being made

Fast dashboard summary endpoint with background hydration.

### Files changed

- [app/api/dashboard/summary/route.ts](/Users/impero/song-review-app/app/api/dashboard/summary/route.ts)
- [app/dashboard/page.tsx](/Users/impero/song-review-app/app/dashboard/page.tsx)
- [API.md](/Users/impero/song-review-app/API.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Added `GET /api/dashboard/summary` for fast song and latest-version metadata.
- Dashboard now renders from summary first, then hydrates full activity/action data in the background.
- The full `/api/dashboard` endpoint remains the canonical rich dashboard data source.
- Existing action sidebar loading remains intact.
- No schema, permission, song mutation, comment, action, or billing behavior changed.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-04 — Member collaboration QA fixes

### What we were trying to achieve

Fix member collaboration failures found during QA and add the requested account-avatar and invite-acceptance polish.

### Feature / change being made

Member author constraint migration, upload error cleanup, Google avatar display, invite acceptance modal, and safer billing portal error handling.

### Files changed

- [migrations/20260504_relax_author_name_checks_up.sql](/Users/impero/song-review-app/migrations/20260504_relax_author_name_checks_up.sql)
- [migrations/20260504_relax_author_name_checks_down.sql](/Users/impero/song-review-app/migrations/20260504_relax_author_name_checks_down.sql)
- [DATABASE.md](/Users/impero/song-review-app/DATABASE.md)
- [lib/currentUser.ts](/Users/impero/song-review-app/lib/currentUser.ts)
- [lib/canonicalIdentity.ts](/Users/impero/song-review-app/lib/canonicalIdentity.ts)
- [app/api/versions/create/route.ts](/Users/impero/song-review-app/app/api/versions/create/route.ts)
- [app/api/billing/portal/route.ts](/Users/impero/song-review-app/app/api/billing/portal/route.ts)
- [app/dashboard/page.tsx](/Users/impero/song-review-app/app/dashboard/page.tsx)
- [app/dashboard/dashboard.module.css](/Users/impero/song-review-app/app/dashboard/dashboard.module.css)
- [app/invite/[token]/InviteActions.tsx](/Users/impero/song-review-app/app/invite/[token]/InviteActions.tsx)
- [app/songs/[id]/upload/page.tsx](/Users/impero/song-review-app/app/songs/[id]/upload/page.tsx)
- [app/songs/[id]/versions/[versionId]/page.tsx](/Users/impero/song-review-app/app/songs/[id]/versions/[versionId]/page.tsx)
- [app/songs/[id]/versions/[versionId]/version.module.css](/Users/impero/song-review-app/app/songs/[id]/versions/[versionId]/version.module.css)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Added a migration to drop legacy `Coris`/`Al` author-name check constraints from version, thread, comment, action, and legacy settings authored fields.
- Version upload APIs and UI now convert object-shaped errors into readable messages instead of `[object Object]`.
- Google profile avatar URLs now flow through canonical identity.
- Dashboard now shows the signed-in user's avatar in the top-right header.
- Song/version page avatar now uses the Google profile image when available.
- Accepting an invite now lands on Dashboard with a confirmation modal explaining the workspace switch.
- Billing portal now returns a clearer stale Stripe customer error instead of the raw `No such customer` message.
- Invite email delivery was not changed; delivery still depends on Resend/domain configuration and should be verified separately.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.
