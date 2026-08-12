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

---

## 2026-05-04 — Signed version playback URLs

### What we were trying to achieve

Fix member-uploaded versions opening successfully but failing playback with `Failed to fetch`.

### Feature / change being made

Workspace-checked signed audio URLs for version playback.

### Files changed

- [app/api/versions/[versionId]/route.ts](/Users/impero/song-review-app/app/api/versions/[versionId]/route.ts)
- [app/songs/[id]/versions/[versionId]/page.tsx](/Users/impero/song-review-app/app/songs/[id]/versions/[versionId]/page.tsx)
- [API.md](/Users/impero/song-review-app/API.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Version detail now returns a one-hour signed `audioUrl` after validating workspace access.
- The song/version page now prefers the signed playback URL instead of constructing a public storage URL client-side.
- Public URL fallback remains in place for compatibility.
- No upload, comment, action, billing, invite, or schema behavior changed.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-04 — Verify version audio objects

### What we were trying to achieve

Stop member-uploaded versions from landing on a version page that later fails playback with `Failed to fetch`.

### Feature / change being made

Storage-object verification for version playback and upload handoff.

### Files changed

- [app/api/versions/[versionId]/route.ts](/Users/impero/song-review-app/app/api/versions/[versionId]/route.ts)
- [app/songs/[id]/versions/[versionId]/page.tsx](/Users/impero/song-review-app/app/songs/[id]/versions/[versionId]/page.tsx)
- [app/songs/[id]/upload/page.tsx](/Users/impero/song-review-app/app/songs/[id]/upload/page.tsx)
- [API.md](/Users/impero/song-review-app/API.md)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Version detail now verifies that the audio object exists in the `song-files` bucket before returning a signed playback URL.
- Missing audio objects now surface as `audioMissing: true` so the UI can show a clear reupload message instead of trying to play a broken URL.
- Both version upload entry points now verify the uploaded object before navigating to the version page.
- Existing version rows whose storage object never uploaded will need the audio reuploaded.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-04 — Dashboard signed playback

### What we were trying to achieve

Fix the owner/member playback mismatch where a member-uploaded file could play for the owner but still failed for the member with `Failed to fetch`.

### Feature / change being made

Route Dashboard playback through the same signed, workspace-checked version audio path as the song/version page.

### Files changed

- [app/dashboard/page.tsx](/Users/impero/song-review-app/app/dashboard/page.tsx)
- [app/songs/[id]/versions/[versionId]/page.tsx](/Users/impero/song-review-app/app/songs/[id]/versions/[versionId]/page.tsx)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Dashboard playback now fetches `/api/versions/[versionId]` and uses the returned signed `audioUrl`.
- Dashboard playback no longer builds direct public Supabase storage URLs from `file_path`.
- The song/version page no longer falls back to public storage URLs when the signed URL is missing.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-04 — Song page native playback fallback

### What we were trying to achieve

Fix member playback on the song/version page after Dashboard playback was confirmed working for the same member-uploaded file.

### Feature / change being made

Fallback from WaveSurfer's fetch/decode path to native browser audio playback when a signed URL can play through `<audio>` but WaveSurfer reports `Failed to fetch`.

### Files changed

- [app/songs/[id]/versions/[versionId]/page.tsx](/Users/impero/song-review-app/app/songs/[id]/versions/[versionId]/page.tsx)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- WaveSurfer remains the primary waveform player.
- If WaveSurfer fails with `Failed to fetch`, the page now starts playback via the underlying browser audio element.
- Native fallback keeps play/pause state, current time, duration, and marker seeking wired.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-04 — Dedicated song page audio fallback

### What we were trying to achieve

Fix the song page fallback appearing to play while producing no audible audio for member accounts.

### Feature / change being made

Use a dedicated native `Audio` element for the song page fallback instead of reusing WaveSurfer's internal media element after WaveSurfer has failed.

### Files changed

- [app/songs/[id]/versions/[versionId]/page.tsx](/Users/impero/song-review-app/app/songs/[id]/versions/[versionId]/page.tsx)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Native fallback now creates and plays a separate browser audio element, matching the Dashboard playback model more closely.
- The failed WaveSurfer media element is paused and disconnected before fallback playback starts.
- Reactive audio analysis now resets if playback switches to a different audio element.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-04 — Keep fallback audio out of analyser path

### What we were trying to achieve

Fix member song-page playback where the timer advanced but no sound was audible and no audio was visualised.

### Feature / change being made

Prevent the native fallback audio element from being routed into the song page reactive Web Audio analyser.

### Files changed

- [app/songs/[id]/versions/[versionId]/page.tsx](/Users/impero/song-review-app/app/songs/[id]/versions/[versionId]/page.tsx)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Native fallback audio now bypasses `ensureReactiveAudioGraph`.
- Any existing reactive `AudioContext` is closed before fallback playback starts.
- This keeps the fallback path closer to the Dashboard's working native audio playback.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-04 — Mobile dashboard sheet/player spacing

### What we were trying to achieve

Prevent the mini-player from covering the mobile dashboard song info sheet's `Open song` button.

### Feature / change being made

Lift the mobile bottom sheet above the active mini-player while preserving both controls.

### Files changed

- [app/dashboard/page.tsx](/Users/impero/song-review-app/app/dashboard/page.tsx)
- [app/dashboard/dashboard.module.css](/Users/impero/song-review-app/app/dashboard/dashboard.module.css)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- The dashboard bottom sheet gets an extra class while playback is active.
- The active sheet now reserves mini-player height so `Open song` remains tappable.
- Comment notification email work is queued separately because the route already exists but needs configuration and notification-policy review.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-04 — Dashboard artwork playback targets

### What we were trying to achieve

Bring the main-branch mobile dashboard artwork playback interaction into the clean branch and clarify clickability on dashboard cards.

### Feature / change being made

Artwork-level dashboard playback, mobile EQ artwork treatment, centered desktop grid play buttons, and clickable-only pointer behavior for info overlays.

### Files changed

- [app/dashboard/page.tsx](/Users/impero/song-review-app/app/dashboard/page.tsx)
- [app/dashboard/dashboard.module.css](/Users/impero/song-review-app/app/dashboard/dashboard.module.css)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Tapping/clicking song artwork now plays or pauses the latest version and stops row navigation when audio exists.
- Mobile hides the artwork play button and shows centered animated EQ bars while playing.
- Desktop grid play buttons are centered over artwork.
- Desktop overlay pills for assigned work and awaiting response are real buttons that deep-link to the relevant view.
- Static info overlay and expanded info panels now use default cursor behavior.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

---

## 2026-05-05 — Owner-controlled comment notification mode

### What we were trying to achieve

Give workspace owners a simple way to control who receives email notifications when a comment is posted, without building a full per-user preference system or @mention tagging.

### Feature / change being made

Owner-only notification mode toggle in Settings (workspace settings section), backed by a new `accounts.notification_mode` column and notification routing logic in the email notify route.

### Files changed

- [migrations/20260505_notification_mode_up.sql](/Users/impero/song-review-app/migrations/20260505_notification_mode_up.sql)
- [migrations/20260505_notification_mode_down.sql](/Users/impero/song-review-app/migrations/20260505_notification_mode_down.sql)
- [lib/bootstrapAccount.ts](/Users/impero/song-review-app/lib/bootstrapAccount.ts)
- [app/api/settings/summary/route.ts](/Users/impero/song-review-app/app/api/settings/summary/route.ts)
- [app/api/workspace/settings/route.ts](/Users/impero/song-review-app/app/api/workspace/settings/route.ts)
- [app/api/email/notify-thread/route.ts](/Users/impero/song-review-app/app/api/email/notify-thread/route.ts)
- [app/settings/page.tsx](/Users/impero/song-review-app/app/settings/page.tsx)
- [app/settings/settings.module.css](/Users/impero/song-review-app/app/settings/settings.module.css)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [public-mvp-roadmap.md](/Users/impero/song-review-app/public-mvp-roadmap.md)

### Notes

- Added `accounts.notification_mode` column with values `all_members` (default) or `owner_only`.
- `all_members`: every workspace member except the commenter receives an email.
- `owner_only`: only the workspace owner receives an email, regardless of who commented. If the owner is the commenter, no email is sent.
- The notify route reads `notification_mode` from the workspace before building the recipient list. Fallback is `all_members` if the column is missing (pre-migration environments).
- `PATCH /api/workspace/settings` now accepts `notification_mode` alongside `name`. At least one field is required.
- Bootstrap `WorkspaceRecord` now includes `notification_mode` with a safe `all_members` fallback.
- Settings summary route exposes `notification_mode` alongside plan.
- Settings UI: owner sees two selectable cards (Notify everyone / Notify owner only). Active mode is highlighted. Members see a read-only description of the current mode.
- `npx tsc --noEmit` passed.

---

## 2026-05-10 — Auth, email and invite flow fixes

### What we were trying to achieve

Complete the Phase 3 QA checklist — specifically get the member invite flow working end to end: invite email delivered, member signs in via Google, member lands in the shared workspace.

### Features / changes made

**1. Supabase client cookie format unification**
The server was writing session cookies via `@supabase/ssr` but the client-side Supabase client (`lib/supabase.ts`) was still using `createClientComponentClient` from the deprecated `@supabase/auth-helpers-nextjs`. The two packages use different cookie formats, so the client always saw no session after Google OAuth — causing the invite page to show "signed out" and loop. Updated `lib/supabase.ts` to use `createBrowserClient` from `@supabase/ssr`.

**2. Auth callback redirect chain fix**
The callback was redirecting through two server-side hops (callback → bootstrap → login). In incognito mode and some browsers, `Set-Cookie` headers on 307 redirect responses are not persisted before the browser follows the next hop, losing the session cookie. Simplified to a single redirect from callback directly to `/?google=success&redirectTo=...`.

**3. Invite email — Resend module-level instantiation bug**
`new Resend(process.env.RESEND_API_KEY)` was called at module level in the invite route. In Vercel serverless functions, `process.env` values are not reliably available at module init time — this produced a broken Resend client that silently accepted send calls but never delivered emails. Moved instantiation inside the `sendInviteEmail` function, matching the pattern used by the comment notification route.

**4. Verified sending domain — song-room.live**
Registered `song-room.live` domain and verified it in Resend (eu-west-1). Updated both invite and comment notification email routes to send from `noreply@song-room.live` instead of `onboarding@resend.dev`. This removes the Resend free-tier restriction that blocked sending to any email other than the account owner.

**5. Duplicate invite resend**
When sending an invite to an email that already had a pending invite, the route previously returned early with `duplicate: true` and silently skipped the email send. Now resends the email and returns `emailSent` status. UI updated to show appropriate message.

**6. Accepted invite auto-redirect**
When an authenticated user lands on an already-accepted invite URL, they were shown a dead-end "invite already used" page. Now detects authenticated state and redirects to dashboard with the `inviteAccepted` success message.

### Files changed

- `lib/supabase.ts`
- `app/auth/callback/route.ts`
- `app/api/workspace/invites/route.ts`
- `app/settings/page.tsx`
- `app/invite/[token]/page.tsx`
- `app/api/auth/bootstrap/route.ts`
- `lib/currentUser.ts`
- `UPDATE_LOG.md`
- `public-mvp-roadmap.md`

### Notes

- The `@supabase/ssr` vs `@supabase/auth-helpers-nextjs` cookie format mismatch was the root cause of multiple auth issues including the stale base64-eyJ cookie warnings in the browser console. Updating `lib/supabase.ts` resolves those warnings too.
- `song-room.live` is now the canonical sending domain for all app emails. If the domain is ever transferred or DNS changes, both email routes need updating.
- QA steps 1–7 now pass. Steps 8–18 pending.

---

## 2026-05-11 — Phase 4 Core Collaboration Polish

### What we were trying to achieve

Improve audio reliability, perceived responsiveness, mobile UX, and dashboard performance.

### Changes made

**1. Audio signed URLs → public URLs**
`/api/versions/[versionId]/route.ts` was generating 1-hour signed URLs for audio delivery. After expiry, playback silently failed. Switched to `getPublicUrl()` — no expiry risk, no cache collision. `song-files` bucket is public with unique file paths per version.

**2. Immediate play button feedback**
Version page play button now sets `isPlaying` optimistically on first tap — button flips to pause icon immediately rather than waiting 2 seconds for audio to buffer. Same pattern applied to dashboard artwork tap — EQ bars appear instantly on tap, paused/dimmed while buffering, animated at full opacity when playing.

**3. MediaSession next/previous track**
Version page: added `nexttrack`/`previoustrack` handlers wired to router navigation between versions. Fixes lock screen, car HUD, and Siri next/previous repeating the same track.
Dashboard: fixed stale closure in `skipTrack` — `queueIndexRef` now tracks current index so MediaSession handlers always have the correct position.

**4. Dashboard song caching — stale-while-revalidate**
Songs are now cached in `localStorage` per identity. On return visits, cached songs render instantly with no loading message. Fresh data fetches silently in the background. Also eliminated the sort-reorder flash caused by two sequential `setSongs` calls (summary endpoint then full endpoint).

**5. Faster version page load**
`setLoading(false)` now fires as soon as song+version data is ready (~1-1.5s). Threads, actions, and tasks load in the background after the page is visible, rather than blocking the initial render.

**6. SR loading animation**
Replaced plain "Loading this version…" text with a full-screen dark loading screen featuring animated SR monogram — white outline with pink stroke-dashoffset fill animation. Placeholder for real Song Room logo when asset is available.

**7. Mobile bottom nav on version page**
Added a fixed bottom nav bar (mobile only, `max-width: 700px`) to the song version page:
- `← Songs` button routes to `/dashboard`
- Workspace switcher grid icon opens `WorkspaceSwitcher` panel as a fixed overlay sheet
- Logout icon signs out and redirects to `/`
- Avatar circle routes to `/settings`
- Existing top `heroNav` bar hidden on mobile
- iOS Safari safe: `translateZ(0)` + `will-change: transform` for stable fixed positioning

**8. WorkspaceSwitcher mobile panel → overlay sheet**
Workspace switcher on mobile now opens as a fixed overlay with blurred backdrop instead of expanding inline and pushing content down. Tap backdrop to dismiss.

**9. Dashboard header hidden on mobile**
The `dashboard_header` (workspace name + avatar row) was rendering as a duplicate below the `AppShell` `mobileWorkspaceBar`. Hidden on mobile via CSS since the workspace bar covers both.

**10. Avatar in workspace bar**
Avatar circle added to the right of the Member/Owner pill in the `WorkspaceSwitcher` mobile trigger row. `avatarUrl` threaded through `AppShell` → `WorkspaceSwitcher`.

**11. Settings collaborator layout**
Invite input given proper height/padding/border styling. Pending invites column widened from `1.4fr` to `1.8fr` to prevent email addresses and action buttons from stacking into narrow single-character columns.

### Files changed

Too many to list individually — major files: `app/songs/[id]/versions/[versionId]/page.tsx`, `app/songs/[id]/versions/[versionId]/version.module.css`, `app/dashboard/page.tsx`, `app/dashboard/dashboard.module.css`, `app/api/versions/[versionId]/route.ts`, `components/WorkspaceSwitcher.tsx`, `components/WorkspaceSwitcher.module.css`, `components/AppShell.tsx`, `app/settings/settings.module.css`

### Notes

- Phase 3 QA all 18 items passing
- Phase 4 active — mobile UX and collaboration polish ongoing
- Real Song Room logo path can be dropped into `app/songs/[id]/versions/[versionId]/page.tsx` SR monogram SVG when asset is ready
- `song-room.live` verified in Resend — all emails now send from `noreply@song-room.live`

## 2026-05-16 — Phase 5 pricing model investigation and implementation plan

### What we were trying to achieve

Rethink the pricing model before going live with Stripe. The original two-tier model (Free/Paid) had no storage tracking, song count as a proxy for the real cost driver, and a single Stripe price ID. Phase 5 required deciding the right model, understanding cost implications, and producing a complete implementation plan before touching any code.

### Feature / change being made

Pricing model investigation and implementation plan — no code changed yet.

### Decisions made

- Model: storage-based pricing per workspace (flat rate, not per-seat)
- Tiers: Free / Pro / Studio
- Storage limits: 500MB free, 10GB Pro, 50GB Studio
- Collaborator limits: 3 free, 10 Pro, unlimited Studio
- Pricing: £0 / £9 per month / £19 per month with annual billing at roughly 20% discount
- Annual prices: Pro £86/year, Studio £190/year
- Hard cap on storage (not metered overages) — upload rejected when limit hit
- Song count limit removed entirely — storage is the real cost driver

### Key findings from investigation

- fileSize is received by the version create route but never written to the database — no file_size column exists on song_versions
- No version delete route exists — no decrement path needed yet, but must be noted for when delete is added later
- getStripePriceId() reads a single env var — needs to expand to four price IDs
- Webhook and activate routes both hardcode the free/paid union — full type system update required across all billing routes
- Settings page imports FREE_SONG_LIMIT and getSongLimitLabel — both being removed
- All billing routes need coordinated update — cannot be done piecemeal

### Files to be changed (planned, not yet implemented)

- migrations/20260516_phase5_storage_pricing_up.sql (new)
- migrations/20260516_phase5_storage_pricing_down.sql (new)
- lib/plans.ts — complete rewrite for three tiers and storage limits
- lib/stripe.ts — expand from one price ID to four (pro/studio x monthly/annual)
- app/api/versions/create/route.ts — storage enforcement and file_size_bytes write
- app/api/billing/checkout/route.ts — accept plan and interval, use correct price ID
- app/api/billing/activate/route.ts — resolve tier from Stripe price ID
- app/api/stripe/webhook/route.ts — resolve tier from price ID on subscription events
- app/api/settings/summary/route.ts — include storage_bytes_used in response
- app/api/workspace/plan/route.ts — support three tiers in dev toggle
- components/UpgradeModal.tsx — add storage limit type and copy
- app/settings/page.tsx — storage usage display and three-tier plan UI

### Notes

- No code has been changed — this entry records the planning phase only
- Implementation to begin after confirmed go-ahead on each step
- UPDATE_LOG and roadmap will be updated again after each confirmed working change

## 2026-05-16 — Phase 5 Step 1 & 2: Database migration and plans rewrite

### What we were trying to achieve

Apply the Phase 5 storage-based pricing schema to the database and rewrite the plans module to support three tiers.

### Feature / change being made

Database migration (run directly in Supabase) and complete rewrite of lib/plans.ts plus all downstream files that referenced the old free/paid binary or song count limits.

### Files changed

- `lib/plans.ts` — complete rewrite: three tiers (free/pro/studio), storage limits (500MB/10GB/50GB), collaborator limits (3/10/unlimited), formatStorageBytes, isStorageLimitReached, planRank, isPlanAtLeast, getPlanDisplayName. Song count limit removed entirely.
- `app/api/songs/create/route.ts` — removed song count enforcement entirely. Songs are no longer gated; storage is the limit.
- `lib/stripe.ts` — added getPlanForStripePriceId() which maps a Stripe price ID to a plan tier. Updated getPlanForStripeSubscriptionStatus return type.
- `app/api/stripe/webhook/route.ts` — updated plan type signatures throughout. handleCheckoutSessionCompleted and handleSubscriptionUpdated now resolve tier from price ID rather than hardcoding paid.
- `components/AppSidebar.tsx` — replaced plan === 'paid' with isPlanAtLeast(plan, 'pro').
- `app/dashboard/page.tsx` — replaced 'paid' plan reference with 'pro', replaced 'songs' limit type with 'storage'.
- `app/settings/page.tsx` — removed FREE_SONG_LIMIT and getSongLimitLabel imports, added storage helpers, updated all plan === 'paid' comparisons to use isPlanAtLeast.

### Database changes (applied directly in Supabase)

- Dropped old accounts_plan_check constraint
- Migrated existing plan = 'paid' rows to plan = 'pro'
- Added new constraint: plan IN ('free', 'pro', 'studio')
- Added accounts.storage_bytes_used BIGINT NOT NULL DEFAULT 0
- Added song_versions.file_size_bytes BIGINT

### Tests run

- npx tsc --noEmit — zero errors

### Notes

- Steps 3 onwards (storage enforcement in upload route, billing checkout/activate updates, settings UI storage bar, Stripe products) are next
- Version delete route does not exist yet — when added later it must decrement storage_bytes_used

## 2026-05-16 — Phase 5 Steps 3–11: Billing routes, storage enforcement, settings UI

### What we were trying to achieve

Complete all remaining Phase 5 code changes — billing checkout/activate, storage enforcement on upload, upgrade modal, settings storage bar, and three-tier dev toggle — before Stripe products are created.

### Feature / change being made

Full implementation of three-tier storage-based pricing across all relevant routes and UI. No Stripe products created yet — price IDs will be wired in once Stripe dashboard setup is complete.

### Files changed

- `lib/stripe.ts` — getStripePriceId() now accepts plan+interval, falls back to legacy STRIPE_PRICE_ID env var. getPlanForStripePriceId() maps price ID to tier.
- `app/api/billing/checkout/route.ts` — accepts { plan, interval } in request body. Uses correct price ID per tier. Guards against checking out for a plan already held or lower.
- `app/api/billing/activate/route.ts` — resolves plan tier from metadata written at checkout time. Writes 'pro' or 'studio' to accounts.plan instead of 'paid'.
- `app/api/stripe/webhook/route.ts` — subscription updated/completed events now resolve tier from price ID via getPlanForStripePriceId().
- `app/api/versions/create/route.ts` — checks storage_bytes_used + incoming file size against plan limit before issuing upload URL. Writes file_size_bytes to song_versions. Increments accounts.storage_bytes_used after successful insert.
- `app/api/workspace/plan/route.ts` — dev toggle now accepts free/pro/studio.
- `app/api/settings/summary/route.ts` — includes storage_bytes_used in workspace payload.
- `components/UpgradeModal.tsx` — added storage limit type with plan-aware copy. Added targetPlan prop. Checkout call now passes plan+interval.
- `app/settings/page.tsx` — storage usage bar (used/limit with colour warning at 90%), three-tier plan display using getPlanDisplayName, studio button in dev toggle, UpgradeModal receives targetPlan.
- `app/settings/settings.module.css` — storageBar and storageBarFill styles added.

### Tests run

- npx tsc --noEmit — zero errors

### Notes

- All price ID env vars (STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_ANNUAL, STRIPE_PRICE_STUDIO_MONTHLY, STRIPE_PRICE_STUDIO_ANNUAL) still need to be added to Vercel after Stripe products are created
- The old STRIPE_PRICE_ID env var remains as a fallback — safe to leave in place until new vars are confirmed working
- storage_bytes_used bootstrap reads use a cast because WorkspaceRecord type does not yet include the new column — safe at runtime since the column exists in DB
- When a version delete route is added later it must decrement storage_bytes_used

## 2026-05-18 — Phase 5: Pricing page and upgrade flow

### What we were trying to achieve

The upgrade button and limit modal were going straight to Stripe checkout with Pro monthly hardcoded — no plan selection, no tier comparison, no annual option. Users needed a proper place to see and choose between Free, Pro, and Studio before entering payment.

### Feature / change being made

New /upgrade page with side-by-side plan comparison and monthly/annual billing toggle. Both upgrade entry points (settings button and limit modal) now route to this page instead of going directly to Stripe.

### Files changed

- `app/upgrade/page.tsx` (new) — full pricing page with three-column plan grid, monthly/annual toggle, animated price switching, per-plan CTA buttons. Free CTA goes back. Pro and Studio CTAs call /api/billing/checkout with the correct plan and interval.
- `app/upgrade/upgrade.module.css` (new) — styles for pricing page using existing design tokens. Popular badge on Pro card, gradient CTAs, glassmorphism cards.
- `components/UpgradeModal.tsx` — simplified to a lightweight nudge. No longer calls checkout directly. Shows contextual copy (collaborator limit or storage limit) with a See plans button that routes to /upgrade.
- `app/settings/page.tsx` — Upgrade button now calls router.push('/upgrade') instead of hitting the checkout API directly. Removed startingCheckout state.
- `components/AppSidebar.tsx` — fixed hardcoded 'Paid' label. Sidebar now shows getPlanDisplayName(plan) and 'Active' caption for paid tiers.

### Tests run

- npx tsc --noEmit — zero errors

### Notes

- The /upgrade page handles both monthly and annual billing. Annual prices shown as per-month equivalent with total billed per year.
- Free plan CTA routes back rather than doing anything — safe for users who land on the page by mistake.
- Dashboard upgrade flow was already via UpgradeModal — no change needed there.

## 2026-05-18 — Upgrade page: differentiated tier copy

### What we were trying to achieve

The three plan cards on /upgrade looked identical — same number of bullet points, same feature set, only storage and collaborator numbers differed. The page needed each tier to feel genuinely distinct without adding arbitrary song count limits.

### Feature / change being made

Rewrote the plan feature lists to lead with what matters at each tier, added contextual notes beneath key features, and added priority support as a genuine Studio-only differentiator.

### Approach

Kept storage-based pricing (no song count limits added). Fixed the presentation instead:
- Free: clean, minimal list — honest about the limits, no oversell
- Pro: storage note calls out the 20x jump, collaborator note says 'Full band + guests'
- Studio: storage framed around use case (stems, multitracks), collaborators described as 'No ceiling, ever', priority support added as exclusive feature

Added featureNote sub-label styling (italic, tertiary colour) beneath qualifying features.

### Files changed

- `app/upgrade/page.tsx` — rewrote PLANS array with FeatureItem type supporting text + optional note field. Added featureNote rendering in JSX.
- `app/upgrade/upgrade.module.css` — added featureText and featureNote styles.

### Tests run

- npx tsc --noEmit — zero errors

### Notes

- Priority support on Studio is a commitment — flagged for awareness when support volume increases
- Song count limits were considered and rejected: storage is the real cost driver, song limits would frustrate users before they are genuinely invested

## 2026-05-18 — Settings page: full rebuild with subroute architecture

### What we were trying to achieve

The settings page was a single 1,200-line page with no clear hierarchy — theme customisation at the top, plan buried mid-page, collaborators and notifications blended together, identical wall of content for owners and members. Needed a clear, navigable structure with signposted sections.

### Feature / change being made

Complete rebuild of /settings as a subroute architecture with a fixed left nav and a shared data context bootstrapped once in the layout.

### Architecture decisions

- URL-based routing (/settings/workspace, /settings/plan, /settings/collaborators, /settings/appearance) — deep-linkable and back-button safe
- Shared SettingsProvider (lib/settingsContext.tsx) bootstraps data once in the layout, all section pages consume via useSettingsData / useSettingsActions — no redundant fetches on section switch
- Layout (app/settings/layout.tsx) owns the two-column shell, nav, AppShell wrapper, and UpgradeModal
- /settings/page.tsx redirects to /settings/workspace (owner) or /settings/appearance (member)
- Owner-only nav items (Workspace, Plan & Billing, Collaborators) hidden entirely from member nav
- Member experience: Workspace and Plan show concise read-only views; Collaborators shows their own access summary and the member list (read-only)
- Mobile: nav stacks vertically above content, nav items wrap into a horizontal row
- Permissions summary cards removed — contextual information folded into each section
- Appearance moved to bottom of nav (personal, secondary concern)

### Files created

- lib/settingsContext.tsx — SettingsProvider, useSettingsData, useSettingsActions, all shared types
- app/settings/workspace/page.tsx — workspace name, image, notification mode
- app/settings/plan/page.tsx — plan summary grid, storage bar, billing CTA, dev toggle
- app/settings/collaborators/page.tsx — invite, members list, pending invites, past invites
- app/settings/appearance/page.tsx — colour controls, presets, save/reset

### Files changed

- app/settings/layout.tsx — rewritten as two-column shell with left nav and SettingsProvider wrapper
- app/settings/page.tsx — rewritten as redirect-only (no UI)
- app/settings/settings.module.css — complete rewrite for new layout system

### Tests run

- npx tsc --noEmit — zero errors

## 2026-05-18 — Phase 5 marked complete, referral programme added to roadmap

### What we were trying to achieve

Mark Phase 5 (Pricing Review & Stripe Rollout) as complete following confirmation that all pricing code is deployed, Stripe products are live, price IDs are in Vercel, and the upgrade flow is working end to end. Add a referral programme as a new roadmap phase.

### Changes

- public-mvp-roadmap.md: Phase 5 status updated to Complete, all workstream items ticked
- public-mvp-roadmap.md: Phase 6.5 (Referral Programme) added with full spec — mechanic, database schema, API routes, UI, and open questions

### Referral model decided

- Reward trigger: referred user upgrades to any paid plan
- Reward: one month free on referrer's current plan, applied as a Stripe credit
- No reward for free-tier sign-ups
- One reward per referred user
- Referred user gets no discount at launch (can add later)
- Credits via Stripe customerBalanceTransactions — no custom billing logic needed

### No code changed — planning and documentation only


## 2026-05-20 — Proper RLS policies applied to all tables

### What we were trying to achieve

Supabase flagged a critical security alert: tables in the song-review-v2 project were publicly accessible because Row-Level Security was enabled but all policies used `USING (true)` — meaning any request with the project URL could read, edit, or delete all data without authentication.

### Feature / change being made

Replaced all blanket `Allow all USING (true)` policies with properly scoped RLS policies across all 11 tables. Policies are now gated on `auth.uid()` (Supabase Auth) and workspace membership via `account_members`.

### Policy logic per table

- **profiles / profile_settings** — users can only read and write their own row (`id = auth.uid()` / `user_id = auth.uid()`)
- **settings (legacy)** — any authenticated user; acceptable as a transitional table with no sensitive isolation requirement
- **accounts** — SELECT for any member; INSERT by creator; UPDATE/DELETE restricted to workspace owners
- **account_members** — SELECT for any member of the same workspace; INSERT/DELETE restricted to owners
- **songs / actions** — SELECT/INSERT/UPDATE for any workspace member; DELETE restricted to owners
- **song_versions / song_tasks** — SELECT/INSERT/UPDATE for any workspace member; DELETE restricted to owners
- **comment_threads / comments** — SELECT/INSERT for any workspace member (chained through song_versions → songs → account_members)

### Files added

- `migrations/20260520_rls_policies_up.sql` — idempotent migration: drops all existing policies by name before recreating, safe to re-run
- `migrations/20260520_rls_policies_down.sql` — rollback: restores blanket `Allow all` policies

### Notes for v2

- All API routes using the service role key bypass RLS by design and are unaffected
- The `settings` legacy table retains a permissive policy; once `profile_settings` fully replaces it this can be tightened
- Migration is idempotent — `DROP POLICY IF EXISTS` before every `CREATE POLICY` means it can be re-run safely if needed
- Confirmed working: login, dashboard, songs, versions, comments all functional after applying

## 2026-05-22 — Phase 6: Referral programme — full implementation

### What we were trying to achieve

Build the complete referral system: cookie-based attribution on signup, 50% off 3 months for referred users at checkout, 50% off one month per conversion for the referrer (up to 5 times), and a settings page showing link, history, and credits earned.

### Files created

- `migrations/20260522_phase6_referrals_up.sql` — referral_codes and referrals tables, generate_referral_code() Postgres function
- `migrations/20260522_phase6_referrals_down.sql` — rollback
- `lib/referrals.ts` — shared DB helpers: getOrCreateReferralCode, getReferralCodeByCode, attributeReferralOnSignup, getPendingReferralForAccount, markReferralConverted, markReferralRewarded. Constants: REFERRAL_REWARD_CAP (5), REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE.
- `app/api/referrals/code/route.ts` — GET, returns or creates the signed-in user's active referral code and shareable URL
- `app/api/referrals/summary/route.ts` — GET, returns referral stats, masked email history, and credit totals for the settings UI
- `app/r/[code]/route.ts` — public GET, validates code, drops httpOnly ref cookie, redirects to signup
- `app/settings/referrals/page.tsx` — settings section: referral link with copy button, rewards summary cards, referral history list, how-it-works steps

### Files changed

- `middleware.ts` — /r/ added to public paths (no auth redirect)
- `lib/bootstrapAccount.ts` — reads tsr_ref cookie on new account creation, calls attributeReferralOnSignup best-effort
- `app/api/billing/checkout/route.ts` — detects pending referral for monthly plan checkouts, applies STRIPE_REFERRAL_COUPON_ID silently, marks referee_coupon_applied
- `app/api/stripe/webhook/route.ts` — rewrote cleanly, added invoice.paid handler: marks conversion, cap check, applies Stripe customer balance credit to referrer, marks rewarded
- `app/settings/layout.tsx` — Referrals added to settings nav between Collaborators and Appearance
- `app/settings/settings.module.css` — referralCredit and howItWorksList styles added

### Referral model implemented

- Referrer reward: 50% off one month of their plan per conversion, max 5 rewards total. Applied as Stripe customer balance credit on invoice.paid (billing_reason: subscription_create).
- Referee reward: 50% off first 3 months on monthly plans. Applied as Stripe coupon at checkout. Annual plans pay full price — copy guides users toward monthly.
- Cap: soft cap of 5 rewards checked at reward time, not link-sharing time. Excess referrals marked ineligible with reason cap_reached.
- Self-referral protection, duplicate referral protection, and ineligible_reason field for all edge cases.
- reward_eligible_at set to now() at launch — schema ready to add a holding period later.
- Referrer must have a Stripe customer ID to receive credit. If not yet on a paid plan, referral left as converted for manual resolution.

### Stripe setup required

- Coupon created in Stripe: 50% off, repeating, 3 months, no customer-facing code. ID stored as STRIPE_REFERRAL_COUPON_ID in Vercel.
- Add invoice.paid to the webhook endpoint event list in Stripe dashboard.

### Tests run

- npx tsc --noEmit — zero errors
- Migration applied in Supabase: success, no rows returned

## 2026-05-22 — Phase 6: Referral programme implementation

### What we were trying to achieve

Build the complete referral infrastructure — database, API routes, cookie landing, webhook reward logic, checkout coupon, and settings UI.

### What was already built (discovered in repo)

- `lib/referrals.ts` — full helper library with getOrCreateReferralCode, attributeReferralOnSignup, getPendingReferralForAccount, markReferralConverted, markReferralRewarded
- `app/api/referrals/code/route.ts` — returns or creates referral code for signed-in user
- `app/api/referrals/summary/route.ts` — referral stats and history for settings UI
- `app/r/[code]/route.ts` — public landing route, drops httpOnly cookie, redirects to signup
- `lib/bootstrapAccount.ts` — already calling attributeReferralOnSignup on first sign-in
- `app/settings/referrals/page.tsx` — partially built

### What was added or completed this session

- `middleware.ts` — added /r/ to public routes so referral landing works for signed-out visitors
- `app/api/billing/checkout/route.ts` — detects pending referral for monthly plan checkouts, applies STRIPE_REFERRAL_COUPON_ID (50% off 3 months) silently. Annual plan checkouts excluded from coupon — referrer still earns credit but referee pays full annual price.
- `app/api/stripe/webhook/route.ts` — added invoice.paid handler. Fires only on billing_reason = subscription_create (first invoice). Finds pending referral for the account, checks 5-reward cap, looks up referrer's stripe_customer_id, applies Stripe customer balance credit via createBalanceTransaction, marks referral as rewarded. If Stripe credit fails, leaves status as converted for safe retry.
- `app/settings/referrals/page.tsx` — completed: referral link with copy button, 3-card reward progress summary, numbered how-it-works list, referral history with masked emails and status pills
- `app/settings/layout.tsx` — Referrals added to nav between Collaborators and Appearance (visible to all users, not owner-only)
- `app/settings/settings.module.css` — howItWorksList styles added
- `migrations/20260522_phase6_referrals_up.sql` — referral_codes and referrals tables, generate_referral_code() Postgres function. Applied in Supabase.
- `migrations/20260522_phase6_referrals_down.sql` — rollback migration

### Confirmed decisions

- Referrer reward: 50% off one month per conversion, max 5 rewards, applied as Stripe credit
- Referee reward: 50% off first 3 months on monthly plans only (Stripe coupon applied at checkout)
- Annual plan referees: no coupon (already saving ~20%), referrer still earns credit
- Reward trigger: invoice.paid with billing_reason = subscription_create (not checkout.session.completed)
- Holding period: none at launch, reward_eligible_at set to converted_at
- Credit cap: 5 rewards per referrer (soft cap checked at reward time)

### Required Stripe dashboard action

Add invoice.paid to the webhook endpoint event listeners in Stripe dashboard:
Developers -> Webhooks -> Song Review production billing webhook -> Edit -> add invoice.paid

### Environment variable required

STRIPE_REFERRAL_COUPON_ID must be set in Vercel with the coupon ID from the Stripe coupon created (50% off, repeating 3 months, no customer-facing code)

### Tests run

- npx tsc --noEmit — zero errors

## 2026-05-25 — Phase 6 complete: referral system smoke tested end to end

### What we tested

Full referral journey in Stripe test mode:

1. Referral link generated at /settings/referrals (TSR-Z3XUJ)
2. Incognito window — visited /r/TSR-Z3XUJ — redirected to login correctly, cookie dropped
3. Signed up with fresh Google account (consistencyisthechallenge@gmail.com)
4. Supabase confirmed referrals row written with status = pending
5. Visited /upgrade as referred user — Stripe checkout showed "Referral — 50% off first 3 months" coupon applied automatically, total due £4.50 instead of £9.00
6. Completed checkout with test card 4242 4242 4242 4242 — landed on "Welcome to Pro" screen
7. Stripe webhook delivered checkout.session.completed and invoice.paid — both 200 OK
8. Supabase confirmed referrals row updated to status = rewarded, rewarded_at populated, credit_amount_pence = 450

### Bug found and fixed during testing

The invoice.paid webhook handler assumed the referrer always has a stripe_customer_id. Free tier users who have never paid have no Stripe customer record. Fix: when stripe_customer_id is null on the referrer's account, create a Stripe customer for them at reward time, save the ID to accounts, then apply the credit. The credit sits on their Stripe balance and automatically reduces their first invoice when they eventually upgrade.

Additionally: in test mode the referrer's existing stripe_customer_id was a live mode ID (cus_UXclw1k4MnwmuG) invisible to the test Stripe API. This is expected test mode behaviour — in production both IDs would be live mode and the credit applies correctly.

### Files changed

- app/api/stripe/webhook/route.ts — handleInvoicePaid rewritten to create Stripe customer for free-tier referrers before applying credit

### Switched back to live mode after testing

All Vercel env vars restored to live mode values. Live mode customer ID restored in Supabase.

### Known items to address in later phases

- Welcome to Pro screen shows "Unlimited songs" and "Unlimited collaborators" — copy is incorrect for both tiers and the confetti animation needs work. Deferred to Phase 8 (Final Visual Polish).
- Dashboard nudge for free users (referral awareness banner) — deferred, can add post-launch.

---

## 2026-06-07

**What we were trying to achieve:**
Phase 7 — TSR v3 brand token swap across the entire clone-clean app.

**Feature / change:**
Full palette and font change from Pulse pink/purple branding to TSR v3 warm off-black and deep red.

**Files changed:**
- `styles/globals.css` — root token definitions rewritten: --color-primary #ff1493→#C0392B, --color-bg-darkest #0d0914→#0E0A0A, removed purple/cyan vars, border radius vars set to 0, Outfit font removed (DM Sans only), glassmorphism helpers removed
- `app/dashboard/dashboard.module.css` — 26 colour/radius substitutions
- `app/settings/settings.module.css` — 9 substitutions
- `app/songs/[id]/song.module.css` — 4 substitutions
- `app/songs/[id]/versions/[versionId]/version.module.css` — 34 substitutions
- `app/upgrade/upgrade.module.css` — 7 substitutions (already used CSS vars, just needed default update)
- `app/identify/identify.module.css` — 2 substitutions
- `app/page.module.css` — 4 substitutions
- `components/AppShell.module.css` — 1 substitution
- `components/UpgradeModal.module.css` — 1 substitution
- `components/WorkspaceSwitcher.module.css` — 2 substitutions
- `lib/settingsContext.tsx` — DEFAULT_THEME updated to TSR v3 values
- `app/settings/appearance/page.tsx` — Pulse preset updated to TSR v3 red/off-black

**Notes:**
- `lib/themeManager.ts` confirmed dead code (no imports anywhere) — left untouched
- Rounded corners removed throughout (border-radius: 0 on all non-avatar/non-circle elements)
- Glassmorphism purple gradients replaced with flat dark surfaces
- Pink/purple rgba values replaced with red rgba equivalents
- Pre-audit identified 122 hits across 14 files; all resolved
- Vercel will auto-deploy on push — check live site for any missed hardcoded values
- Phase 7 complete

---

## 2026-06-07 — Phase 7 follow-up fixes (confirmed working)

**What we were trying to achieve:**
Clean up remaining pink/purple/old-radius values missed in the initial Phase 7 token swap, and fix a build-breaking CSS syntax error.

**Changes made:**
- `app/dashboard/dashboard.module.css` — fixed spaced rgba(255, 20, 147) variants, removed border-radius: 999px pill shapes, fixed indigo rgba(99,102,241) status pill colours to TSR v3, fixed purple-dark card body background rgba(22,15,35) → off-black, fixed remaining #ff69b4 pink text (6 instances), fixed infoPanel and cardInfoOverlay dark purple backgrounds
- `app/settings/settings.module.css` — fixed spaced rgba(255, 20, 147) variants
- `app/songs/[id]/versions/[versionId]/version.module.css` — fixed border-radius: 999px pill shapes, purple rgba values, dark purple modal backdrop
- `app/identify/identify.module.css` — fixed radial gradient pink/cyan glows, dark purple backdrop
- `app/page.module.css` — fixed radial gradient pink/cyan glows, dark purple backdrop
- `app/upgrade/upgrade.module.css` — fixed purple rgba box-shadows
- `components/AppSidebar.module.css` — fixed sidebar rail background rgba(11,8,18) → off-black, plan pill gradient → flat surface, brand icon glow removed
- `components/UpgradeSuccessModal.module.css` — CRITICAL: rewrote cleanly to fix PostCSS build error caused by regex stripping multi-value background property and leaving orphaned gradient lines
- `components/AccountMenu.module.css` — border-radius cleanup
- `components/WorkspaceSwitcher.module.css` — pink rgba and border-radius cleanup

**Root cause of build failure:**
Regex-based gradient removal stripped the gradient from multi-value `background` shorthand properties, leaving orphaned comma-separated values on subsequent lines. PostCSS could not parse these as valid CSS. Fix: rewrote UpgradeSuccessModal.module.css from scratch with correct TSR v3 tokens.

**Lesson learned:**
For future CSS token swaps, always rewrite multi-value `background` properties explicitly rather than using regex to strip individual values from them. Validate with a CSS parser before committing.

**Status:** Build confirmed passing. Phase 7 complete.


---

## 2026-06-13 — Loading animation: SONG/ROOM Thunder letterforms

**What we were trying to achieve:**
Replace the temporary S+R placeholder loading animation with something properly branded. The S and R were hand-drawn bezier approximations that looked rough and did not match the TSR visual language.

**Feature/change:**
Loading animation on every page now shows SONG on one line and ROOM on the line below, using real Thunder BlackLC letterforms extracted from the font file. The draw animation is identical to the Create Together animation on the login screen (stroke-dashoffset with per-letter stagger) but at 50% of the size. The animation runs once and stays frozen (same fill=freeze behaviour as the login page).

**Files changed:**
- `app/songs/[id]/versions/[versionId]/page.tsx` — replaced the loading return block with new SONG/ROOM SVG
- `app/songs/[id]/versions/[versionId]/version.module.css` — removed old loadingLogoOutline, loadingLogoFill, keyframes fillUp, and loadingLabel rules; simplified loadingLogoWrap to width:170px; height:auto; overflow:visible
- `app/loading.tsx` — new file — root-level Next.js loading UI covering dashboard, settings, song page, and all other routes without their own loading.tsx

**Notes:**
- Letter paths derived from Thunder BlackLC OTF via fonttools SVGPathPen + TransformPen, scaled to match the login page coordinate space (upem=1000 scale=0.2, Y-flip + offset). Same transform as the existing wireframe paths.
- SVG viewBox 0 0 342.8 334 with SONG row at y=0 and ROOM row at y=144. Displayed at 170px wide via CSS.
- app/loading.tsx is a server component (no use client) so it renders on every route without hydration overhead.
- The Loading label text was removed as the letterforms are self-explanatory.

---

## 2026-06-22 — Cover art upload 500ing in production (confirmed working)

**What we were trying to achieve:**
Cover art uploads on the dashboard and song/version page were failing on `song-room.live` — image picked, nothing displayed afterward, `songs.image_url` stayed `null` in the database. No error was visible to the user.

**Investigation:**
- Confirmed via Vercel runtime logs that `POST /api/songs/upload-image` was returning `500` in production, with the failure originating in the Sharp resize step (before storage upload or the DB update ever ran) — consistent with the `image_url: null` Coris found in Supabase.
- Ruled out file format/corruption: the test file was a valid 138KB JPEG.
- Ruled out stale build cache: redeployed with "Use existing Build Cache" unticked, confirmed a genuinely clean `npm install`, error persisted unchanged.
- First attempted fix — marking `sharp` as a Next.js server external package (`experimental.serverComponentsExternalPackages`) — did not resolve it.
- Root-caused by running `next build` locally and inspecting the `.next/server/.../route.js.nft.json` trace manifest: Sharp's native `linux-x64` binary *was* being correctly bundled, ruling out a Next.js file-tracing problem entirely.
- Found the actual cause in Sharp's own loader source (`node_modules/sharp/dist/sharp.cjs`): `sharp >=0.33.0` added a runtime check requiring the host CPU to support the **x86-64-v2 microarchitecture** for its prebuilt linux-x64 binary. Vercel's serverless compute doesn't satisfy this check — a known, widely-reported issue (`lovell/sharp#3870`, `lovell/sharp#4543`, multiple Vercel community threads), and the production error text matched those reports verbatim.

**Root cause:**
`sharp@^0.35.1` (added in the 2026-06-07 image-resize commit) requires x86-64-v2 CPU instructions on its prebuilt Linux x64 binary, which Vercel's serverless functions don't support. This was the first time Sharp processing actually ran in production on `clone-clean`, so it isn't a regression of previously-working code — it failed from the point that dependency was added.

**Fix:**
- `package.json` — pinned `sharp` to `0.32.6` (last version before the x86-64-v2 requirement was introduced; same resize/jpeg/toBuffer API, no other code changes needed)
- `package-lock.json` — regenerated for the pinned version
- `next.config.js` — kept `experimental.serverComponentsExternalPackages: ['sharp']` as a harmless defensive addition (not the actual fix, but reasonable practice for native modules)
- `app/api/songs/upload-image/route.ts` — wrapped the Sharp call in its own try/catch, returning a clear `400` (bad/unsupported file) or `500` (processing unavailable) with a real message instead of a bare 500
- `app/dashboard/page.tsx`, `app/songs/[id]/versions/[versionId]/page.tsx` — surfaced upload failures to the user (`window.alert`) instead of failing silently with only a `console.error`

**Files changed:**
- `package.json`
- `package-lock.json`
- `next.config.js`
- `app/api/songs/upload-image/route.ts`
- `app/dashboard/page.tsx`
- `app/songs/[id]/versions/[versionId]/page.tsx`

**Before/after:**
- Before: image upload appeared to do nothing; `image_url` stayed `null`; no error shown anywhere.
- After: cover art uploads successfully on both dashboard and song/version page; any future upload failure (bad file, transient processing issue) now shows a visible message instead of failing silently.

**Tests run:**
- `npx tsc --noEmit` — passed
- `npx next build` — passed locally; confirmed via `.nft.json` that `sharp-linux-x64.node` (libvips 8.14.5) is correctly traced into the function bundle
- Confirmed working in production by Coris on `www.song-room.live` after deploy

**Notes for v2 consumer build:**
- Do not bump `sharp` past `0.32.x` on this project without first confirming Vercel has resolved the x86-64-v2 binary issue (check `lovell/sharp#3870` for status) — `^0.35.1` will silently break cover art and any other image-processing route again.
- The earlier "Restored build cache" / Next.js bundling theories were both investigated and ruled out before finding the real cause — see commit history (`7bff7b1`, `ec346a2`) for the full trail if this resurfaces in a different form.

---

## 2026-06-22 — Desktop dashboard grid card: duplicate "assigned to me" pill pushing icon row down (confirmed working)

**What we were trying to achieve:**
On the desktop dashboard, grid view, an "N assigned to me" (or "N actions") pill was appearing directly under the song artwork by default, below the "In progress" status badge. This pushed the divider, latest-version/comment-count row, and the icon row (info / rename / cover art / delete) further down the card. That info was meant to only appear inside the info overlay triggered by clicking the info (i) icon — not in the card's default static state.

**Root cause:**
`cardStatusRow` in the desktop grid card (`app/dashboard/page.tsx`) rendered the status pill *and* an unconditional `cardActionPill` (`getMetaPillLabel(song)` — "N assigned to me" / "N actions") whenever `song.unresolvedActionCount > 0`. This was a duplicate: the exact same information already renders correctly inside `cardInfoOverlay`'s `overlayAssignRow`, which is properly gated behind `isOverlayOpen` (the info icon toggle). The static copy in `cardStatusRow` should never have existed outside the overlay.

**Fix:**
Removed the duplicate `cardActionPill` block from `cardStatusRow` in the desktop grid card, leaving only the song status pill in the default view. The overlay (toggled by the info icon) remains the only place the assigned-to-me/awaiting-response pills and "Open work" count appear.

**Files changed:**
- `app/dashboard/page.tsx`

**Before/after:**
- Before: "N assigned to me" pill always visible under the artwork on any song with unresolved actions, inconsistently pushing the icon row to a different vertical position card-to-card.
- After: default grid card shows only title, status pill, divider, and the meta/comment row before the icon row — consistent height across cards. Assigned-to-me/awaiting-response info only appears when the info icon is clicked.

**Scope note:**
Desktop list view was checked and is unaffected — its equivalent meta pill renders inline on the title's metadata row (separator-delimited, not stacked), so it never pushed the icon row and wasn't part of this issue. No change made there.

**Tests run:**
- `npx tsc --noEmit` — passed
- `npx next build` — passed locally
- Confirmed working in production by Coris on `www.song-room.live` after deploy

---

## 2026-07-18 — Stage 1 code-review security hardening

### What we were trying to achieve

Close the highest-confidence authorization, information-disclosure, and unsafe image-processing gaps identified by the full `clone-clean` code review without changing storage architecture, framework versions, or database schema.

### Feature / change being made

First staged security hardening pass for comment notifications, action creation, and cover-art uploads.

### Files changed

- `app/api/actions/create/route.ts`
- `app/api/email/notify-thread/route.ts`
- `app/api/songs/upload-image/route.ts`
- `app/api/threads/create/route.ts`
- `app/api/threads/reply/route.ts`
- `app/dashboard/page.tsx`
- `app/songs/[id]/versions/[versionId]/page.tsx`
- `lib/internalRequestAuth.ts`
- `UPDATE_LOG.md`

### Notes

- Notification requests now require a short-lived server-generated HMAC signature and validate the comment, thread, version, song, actor membership, and workspace relationship before sending.
- Notification content is read from canonical database records; recipient email addresses and raw membership/profile data are no longer returned or logged.
- Action creation now proves that its source comment belongs to the selected song before the service-role client links or later exposes it.
- Cover-art processing now authenticates before multipart parsing, enforces a 5MB JPEG/PNG/WebP limit, caps decoded pixel count, and returns safe errors.
- Client-side cover-art pickers mirror the server constraints for faster feedback.

### Verification

- `npx tsc --noEmit --incremental false` — passed.
- `npm run build` — passed; the pre-existing `/api/auth/bootstrap` dynamic-render warning remains for a later stage.

---

## 2026-07-18 — Stage 2A schema reproducibility and Stripe idempotency

### What we were trying to achieve

Make the public-comments feature reproducible from migrations and prevent Stripe webhook retries or partial failures from applying referral credit more than once.

### Feature / change being made

Migration-backed database integrity and payment-webhook idempotency.

### Files changed

- `app/api/stripe/webhook/route.ts`
- `lib/referrals.ts`
- `migrations/20260718_public_comments_up.sql`
- `migrations/20260718_public_comments_down.sql`
- `migrations/20260718_stripe_webhook_idempotency_up.sql`
- `migrations/20260718_stripe_webhook_idempotency_down.sql`
- `UPDATE_LOG.md`

### Notes

- Added the missing song visibility columns, public comments table, validation constraints, index, RLS enablement, and service-role-only grants.
- Added an atomic Stripe event ledger that rejects concurrent/processed duplicates and permits failed or abandoned work to retry.
- Referral customer creation and balance credits now use deterministic Stripe idempotency keys.
- Failed Stripe or database writes now fail the webhook so Stripe can retry instead of silently marking incomplete work successful.
- The webhook temporarily falls back to Stripe operation-level idempotency if the ledger migration has not yet been applied, allowing a migration-first rollout.

### Verification

- `npx tsc --noEmit --incremental false` — passed.
- SQL was reviewed statically; no local PostgreSQL/Supabase CLI is available to execute the migrations against a disposable database.

---

## 2026-07-18 — Stage 2B version upload integrity

### What we were trying to achieve

Prevent quota bypass, unsafe object names, duplicate version numbers, inaccurate storage totals, and common orphan rows in the signed audio-upload flow.

### Feature / change being made

Two-phase version uploads with database-backed allocation and finalization.

### Files changed

- `app/api/versions/create/route.ts`
- `app/api/versions/[versionId]/finalize/route.ts`
- `app/api/versions/[versionId]/route.ts`
- `app/songs/[id]/upload/page.tsx`
- `app/songs/[id]/versions/[versionId]/page.tsx`
- `migrations/20260718_account_storage_schema_up.sql`
- `migrations/20260718_account_storage_schema_down.sql`
- `migrations/20260718_version_upload_integrity_up.sql`
- `migrations/20260718_version_upload_integrity_down.sql`
- `UPDATE_LOG.md`

### Notes

- Added the previously undocumented storage counter, version file-size column, and current free/pro/studio plan constraint to migration history.
- Version numbers are allocated while locking the parent song, eliminating concurrent count-plus-one races.
- Storage paths are generated server-side with random object IDs rather than embedding user-supplied filenames.
- File size and extension are validated before issuing a signed URL; the stored object is then inspected for actual size and audio content type.
- Storage usage and upload finalization are committed atomically after object verification and a second quota check.
- Failed client uploads attempt to remove their pending row/object, and pending versions cannot be played as completed uploads.
- Compatibility fallbacks keep the existing path working if application code reaches production before PostgREST has refreshed the new functions, but migration-first deployment remains required.

### Verification

- `npx tsc --noEmit --incremental false` — passed.
- SQL was reviewed statically; migration execution still requires a disposable Supabase/PostgreSQL environment.

---

## 2026-07-18 — Stage 3 dashboard and landing-page performance

### What we were trying to achieve

Reduce duplicate dashboard work, prevent cross-workspace cache reuse, and lower the landing page's initial network and per-frame rendering cost.

### Feature / change being made

Page-load, refresh, caching, query-index, and animation performance improvements.

### Files changed

- `app/api/auth/bootstrap/route.ts`
- `app/api/dashboard/route.ts`
- `app/dashboard/page.tsx`
- `app/page.tsx`
- `app/page.module.css`
- `migrations/20260718_dashboard_query_indexes_up.sql`
- `migrations/20260718_dashboard_query_indexes_down.sql`
- `UPDATE_LOG.md`

### Notes

- The dashboard response now includes its action list, removing the duplicate `/api/actions` request on initial load and focus refresh.
- Dashboard song/activity caches are scoped by user and workspace, expire after five minutes, remove the old unscoped keys, and are cleared for the current workspace on sign-out.
- Focus and visibility events within one second are coalesced so a tab return does not immediately issue the same reload twice.
- Added composite indexes matching the dashboard's workspace, version, action, thread, comment, and membership lookups.
- The landing page initially references one background image and preloads each next slide only when it is needed instead of causing all six to download at once.
- The equalizer uses 72 transform/opacity animations instead of 120 height/background writes, stops in hidden tabs, and renders a static reduced-motion variant.
- Auth bootstrap is now explicitly dynamic/no-store, removing the production-build static-generation warning and avoiding raw bootstrap errors in responses.

### Verification

- `npx tsc --noEmit --incremental false` — passed.
- `npm run build` — passed, and the previous `/api/auth/bootstrap` dynamic-server warning is gone.
- First-load JavaScript remained effectively flat: landing page 158kB before/after; dashboard 180kB → 181kB after adding scoped cache/action response handling.
- Static call-path inspection confirms initial/focus dashboard loading no longer calls `loadActions()` separately; it remains only for targeted action mutations.

---

## 2026-07-18 — Stage 4 accessibility and responsive resilience

### What we were trying to achieve

Remove the highest-confidence keyboard, focus, zoom, motion, form-label, and small-screen usability barriers identified during the code review without redesigning the interface.

### Feature / change being made

Standards-based accessibility and responsive hardening for authentication, menus, dialogs, workspace switching, and version uploads.

### Files changed

- `app/layout.tsx`
- `app/page.tsx`
- `app/page.module.css`
- `app/songs/[id]/upload/page.tsx`
- `components/AccountMenu.tsx`
- `components/UpgradeModal.tsx`
- `components/UpgradeSuccessModal.tsx`
- `components/WorkspaceSwitcher.tsx`
- `components/WorkspaceSwitcher.module.css`
- `lib/useDialogFocus.ts`
- `styles/globals.css`
- `UPDATE_LOG.md`

### Notes

- Restored browser pinch zoom and added a consistent visible keyboard-focus treatment.
- Added reduced-motion behavior for global CSS animation and the landing-page SVG headline.
- Authentication fields now have programmatic labels, status/error announcements, real terms/privacy links, and a mobile layout that can scroll when forms expand.
- Upgrade dialogs and the mobile workspace sheet now trap focus, close with Escape, and restore the prior focus target.
- The account menu supports keyboard entry, arrow-key navigation, Home/End, and Escape.
- The version upload drop zone is keyboard-operable, form controls are labelled, and upload errors are announced.
- Mobile sign-out uses a 44px target; tightly packed dashboard card actions retain their existing 24px target to avoid creating overlap at narrow widths.

### Verification

- `npx tsc --noEmit --incremental false` — passed.
- `npm run build` — passed; landing first-load JavaScript remains 158kB and dashboard remains 181kB.
- Headless Chrome at 1440×900 and 375×667 — home page returned 200 with no framework error overlay, labelled email/password fields rendered, keyboard focus had a visible 2px outline, and the expanded login/forgot-password flows had no horizontal overflow.
- Reduced-motion emulation rendered no SVG animation elements or running document animations.

---

## 2026-07-18 — Stage 5 supported framework, dependency, and response hardening

### What we were trying to achieve

Remove known dependency vulnerabilities, restore an executable lint check, and add safe baseline browser-response protections without combining the change with a React major upgrade or storage-privacy migration.

### Feature / change being made

Dedicated Next.js 15 security upgrade and compatibility checkpoint.

### Files changed

- `package.json`
- `package-lock.json`
- `next.config.js`
- `next-env.d.ts`
- `eslint.config.mjs`
- `app/icon.svg`
- Dynamic route handlers under `app/api/**/[parameter]/route.ts`
- `app/auth/callback/route.ts`
- `app/invite/[token]/page.tsx`
- `app/invite/[token]/InviteActions.tsx`
- `app/listen/[songId]/layout.tsx`
- `app/r/[code]/route.ts`
- `app/songs/[id]/page.tsx`
- `app/songs/[id]/versions/[versionId]/page.tsx`
- `app/privacy/page.tsx`
- `app/terms/page.tsx`
- `lib/currentUser.ts`
- `UPDATE_LOG.md`

### Notes

- Upgraded unsupported Next.js 14.2.35 to the supported 15.5.20 backport and migrated dynamic route parameters and cookie reads to the asynchronous request API.
- Kept React at 18.3.1, which Next.js 15.5 supports, so framework security work is not combined with a separate React major-version migration.
- Updated Supabase, Stripe, Wavesurfer, and Resend; removed the unused deprecated Supabase auth-helper package.
- Overrode Next.js's vulnerable PostCSS transitive version with patched PostCSS 8.5.10.
- Added ESLint 9 with the Next.js Core Web Vitals/TypeScript configuration. Existing explicit-`any` debt is reported as warnings so the new check is usable without an unrelated type refactor.
- Added `nosniff`, frame denial, strict referrer, limited browser permissions, and one-year HSTS headers; disabled the framework disclosure header. A restrictive CSP remains a separate report-only rollout because the app currently uses inline styles and external fonts/images.
- Replaced broken legal-page font URLs and added the missing application icon, eliminating their 404 requests.
- The supported Next.js runtime increases shared first-load JavaScript: landing 158kB → 175kB and dashboard 181kB → 193kB. This is recorded as a known security-versus-payload tradeoff for later measurement.

### Verification

- `npm audit` — 0 vulnerabilities (previously 1 moderate and 3 high across four vulnerable packages).
- `npm run lint` — passed with 46 existing warnings and 0 errors.
- `npx tsc --noEmit --incremental false` — passed.
- `npm run build` — passed on Next.js 15.5.20.
- Headless Chrome verified `/`, `/privacy`, and `/terms` at a 375×667 viewport with 200 responses, no framework error overlay, and no horizontal overflow.
- Runtime header inspection confirmed all configured security headers and confirmed `X-Powered-By` is absent.

---

## 2026-07-18 — Mandatory post-update handoff protocol

### What we were trying to achieve

Make every substantial implementation handoff tell the user exactly what they need to do, where to do it, how to verify it, when to stop, and what should happen next.

### Feature / change being made

Repository-level agent workflow and rollout-reporting protocol.

### Files changed

- `AGENTS.md`
- `UPDATE_LOG.md`

### Notes

- Added mandatory `Your Actions` and `Next Step` sections to every completed-task response.
- Added a major-update protocol that distinguishes code-complete, preview/staging, deployed, and production-complete states.
- Required exact external-service instructions, expected results, failure evidence, rollout order, rollback guidance, stop conditions, and explicit user/agent ownership.
- Required each handoff to end with one recommended next step and to verify external work before describing production as complete.

### Verification

- Documentation was reviewed against the existing required workflow and output format.
- No application code, schema, dependencies, environment variables, or deployment settings were changed.

---

## 2026-07-18 — Preview-safe notification email initialization

### What we were trying to achieve

Allow preview builds to compile when notification email delivery is intentionally not configured, while preserving the route's existing runtime skip behavior.

### Feature / change being made

Lazy Resend client initialization in the thread-notification API route.

### Files changed

- `app/api/email/notify-thread/route.ts`
- `UPDATE_LOG.md`

### Notes

- Resend 4 rejects a missing API key when its client is constructed. The notification route constructed that client at module scope, so Next.js failed while collecting route data before the existing missing-key fallback could run.
- The route now trims and validates `RESEND_API_KEY` before constructing the client only when an email is actually ready to send.
- Missing preview configuration continues to return the existing `missing-resend-api-key` skip response; configured environments keep the same delivery path.

### Verification

- `npm run lint` — passed with 46 existing warnings and 0 errors.
- `npx tsc --noEmit --incremental false` — passed.
- `RESEND_API_KEY= npm run build` — passed, including page-data collection for `/api/email/notify-thread`.

---

## 2026-07-18 — Preserve public listening during two-phase uploads

### What we were trying to achieve

Keep existing public song URLs playable while the upload-integrity migration introduces pending version rows.

### Feature / change being made

Finalized-version selection and response minimization for the public song endpoint.

### Files changed

- `app/api/public/song/[songId]/route.ts`
- `app/listen/[songId]/page.tsx`
- `UPDATE_LOG.md`

### Notes

- Public URLs remain keyed by song ID and the `song-files` bucket/path contract is unchanged.
- After the upload-integrity migration, the public endpoint ignores versions whose audio upload has not been finalized, so an interrupted upload cannot replace the last playable public version.
- A legacy query fallback keeps the endpoint compatible before the new column exists during the migration-first rollout.
- The public response now returns only the version fields used by the listener instead of exposing the complete database row and storage path.

### Verification

- `npm run lint` — passed with 46 existing warnings and 0 errors.
- `npx tsc --noEmit --incremental false` — passed.
- `RESEND_API_KEY= npm run build` — passed on Next.js 15.5.20.
- A read-only local production-server check against the currently configured pre-migration Supabase schema returned `200` for an existing public song, supplied an audio URL, exercised the missing-column fallback, and confirmed `file_path` was absent from the public response.

---

## 2026-07-25 — Double-post on thread replies (confirmed working)

**What we were trying to achieve:**
On the version page, hitting the reply send button posted the comment, but there was a network delay and no feedback that it was sending. Users (Coris) assumed it hadn't worked, clicked again, and the comment double-posted.

**Root cause:**
`submitReply` in the version page had no in-flight guard and its button was only disabled on empty text — so a second click during the request fired a second POST to `/api/threads/reply`. The new-thread path (`submitThread`) already guarded this with the `posting` state; replies didn't.

**Fix:**
Reused the existing `posting` state for replies: `submitReply` now early-returns if already posting, sets `posting` for the duration, disables the reply input and button, and shows "Posting…" in the reply row while sending. Added error handling with a toast on failure.

**Files changed:**
- `app/songs/[id]/versions/[versionId]/page.tsx`

**Before/after:**
- Before: rapid double-click on reply → two identical comments, no sending feedback.
- After: button + input disable on submit, "Posting…" shows, second click is ignored — one comment per submit.

**Tests run:**
- Vercel production build passed (deploy READY).
- Confirmed working in production by Coris.

---

## 2026-07-25 — Comment channel redesign: avatars + names, two-sided, reliable author identity (confirmed working)

**What we were trying to achieve:**
Comments rendered all in red and stacked on one side when two accounts talked, because "you vs them" was decided by a first-name string (`c.author === identity`) and both test accounts resolved to "Coris". Wanted a scalable channel that works from a 2-person back-and-forth to a 5-member band, identified by avatar (Google profile photo) + name, no per-person colour.

**Root cause:**
`comments` stored only an `author` name string (with `Coris`/`Al` hardcoded from email aliases), so identity collided and no stable per-user reference existed. `profiles` had no `avatar_url`, and only the live signed-in user carried a Google photo — other members' photos weren't persisted anywhere.

**Fix (schema + code):**
- SQL migration (run manually in Supabase, v2 project `hxtsuhmqrufcdplidtov`): added `profiles.avatar_url`, added `comments.author_user_id uuid references profiles(id)` + index, and best-effort backfilled `author_user_id` for existing Coris/Al comments by email alias.
- `bootstrapAccount.ts`: persist the Google `avatar_url` to `profiles` on sign-in (only when present, never overwrite with null).
- `threads/create` + `threads/reply`: stamp each new comment with `author_user_id`.
- `versions/[versionId]/threads` GET: return each comment's `author_user_id` and resolved `author_avatar_url` (batch profile lookup).
- Version page + CSS: avatar + name message rows, match "you" by `author_user_id === currentUserId` (falls back to name), neutral bubbles (dropped the red "own" fill), fixed an operator-precedence bug in the author label, grouped consecutive messages from the same sender, initials fallback avatar (and `onError` fallback if a photo fails to load). Mark-as-action button now sizes to content on both sides.

**Files changed:**
- `lib/bootstrapAccount.ts`
- `app/api/threads/create/route.ts`
- `app/api/threads/reply/route.ts`
- `app/api/versions/[versionId]/threads/route.ts`
- `app/songs/[id]/versions/[versionId]/page.tsx`
- `app/songs/[id]/versions/[versionId]/version.module.css`
- SQL migration run manually (profiles.avatar_url, comments.author_user_id + backfill)

**Before/after:**
- Before: two accounts both rendered as "Coris" in red, stacked on one side; no avatars.
- After: you on the right, others on the left, neutral bubbles, avatar (Google photo, initials fallback) + name per run; own-match by stable user id. Other members' photos populate as they next sign in; until then, initials.

**Notes for v2 consumer build:**
- Google avatar URLs (`googleusercontent.com`) load with `referrerPolicy="no-referrer"` to avoid 403s; keep that if the img tag is refactored or moved to `next/image`.
- Route reads/writes were written to tolerate the pre-migration schema, but the migration is now applied — new comments carry `author_user_id` going forward.

**Tests run:**
- Vercel production build passed (deploy READY) for each commit.
- Confirmed working in production by Coris across two accounts.

## 2026-07-25 — Mobile lock-screen next/prev replayed the same track (confirmed working)

**What we were trying to achieve:**
Playing a song from the dashboard list, then using the phone's lock-screen media controls: pressing "next" restarted the current track instead of advancing to the next song.

**Root cause:**
The dashboard player tracks the current queue position in two places — `queueIndex` (React state) and `queueIndexRef` (a ref). The on-screen controls read the state; the Media Session lock-screen `nexttrack`/`previoustrack` handlers read the ref (via `skipTrack`). `queueIndexRef` was only updated by auto-advance (`handlePlayerEnded`) and `skipTrack` itself — **not** by `playSong` when a user taps a song. So after a manual tap the ref was stale (typically one behind the real position), and `skipTrack('next')` computed `queueIndexRef.current + 1`, which landed on the currently-playing song and reloaded it. Auto-advance on the open page worked because it updates the ref.

**Fix:**
`playSong` now sets `queueIndexRef.current` alongside `setQueueIndex(...)`, keeping the ref in sync with state so the lock-screen handlers read the correct index.

**Files changed:**
- `app/dashboard/page.tsx`

**Before/after:**
- Before: lock-screen "next" after tapping a song → restarts the same track.
- After: lock-screen next/prev advance through the song queue correctly.

**Scope note:**
The queue is the songs list (next SONG, not next version) — behaviour was correct by design; only the index the lock-screen handlers read was stale.

**Tests run:**
- Vercel production build passed (deploy READY).
- Confirmed working on device by Coris.

## 2026-07-25 — Go-live: marketing homepage at song-room.live, login moved to /login (confirmed working)

**What we were trying to achieve:**
Point song-room.live at the marketing site while keeping the app on the same domain. Chosen topology: everything served by Vercel (root). `/` = marketing, `/login` = login, `/dashboard` etc. = app. The app and its Google/Supabase auth stay on song-room.live (no subdomain migration).

**Changes:**
- **Login moved:** `app/page.tsx` + `app/page.module.css` → `app/login/`. Login now lives at `/login`.
- **Marketing at `/`:** added `public/marketing.html` (production copy of the marketing page) + a `next.config.js` `beforeFiles` rewrite `{ source: '/', destination: '/marketing.html' }`. Production copy edits vs the main-branch wireframe: removed `noindex`, canonical + og:url → `https://song-room.live/`, CTAs `login-v17.html` → `/login`, favicon/apple-touch and Be-Kind.mp4/poster → absolute GitHub Pages URLs.
- **Middleware:** `/login` and `/marketing.html` added to public routes; unauthenticated redirect target changed from `/` to `/login`; `/blog` whitelisted as public (ready for the SEO engine).
- **Login-link repoints:** all client-side `'/?redirectTo='` → `'/login?redirectTo='` in `app/songs/[id]/versions/[versionId]/page.tsx` (x2), `app/songs/[id]/upload/page.tsx` (x2), `app/dashboard/page.tsx`, `lib/useProtectedRoute.ts`, `lib/settingsContext.tsx`; `app/identify/page.tsx` unauth push → `/login`. Sign-out flows (`window.location.assign('/')`) left as-is → now land on the marketing home.
- **OAuth post-auth redirect base:** `app/auth/callback/route.ts` (x3) and `app/api/auth/bootstrap/route.ts` (x3) built `new URL('/', …)` with `google=success` — pointed at the old login at `/`. Changed to `/login` so the login page's session-sync handler runs and forwards to the requested route.
- **Build fix:** `app/auth/reset-password/page.tsx` imported the login CSS via `../../page.module.css`; updated to `../../login/page.module.css` after the move.

**Root cause of the two issues hit during cutover:**
- First build ERROR: reset-password shared the login page's CSS module by relative path; moving the login file broke it. (Production never changed — the failed build didn't deploy.)
- Google login landed on marketing: the OAuth callback still redirected to `/` (now static marketing) instead of the login page that completes the session sync. Fixed by repointing callback + bootstrap to `/login`.

**Files changed:**
- `app/login/page.tsx`, `app/login/page.module.css` (moved), removed `app/page.tsx` + `app/page.module.css`
- `public/marketing.html` (new)
- `next.config.js`, `middleware.ts`
- `app/auth/callback/route.ts`, `app/api/auth/bootstrap/route.ts`
- `app/auth/reset-password/page.tsx`
- `app/songs/[id]/versions/[versionId]/page.tsx`, `app/songs/[id]/upload/page.tsx`, `app/dashboard/page.tsx`, `app/identify/page.tsx`, `lib/useProtectedRoute.ts`, `lib/settingsContext.tsx`

**Before/after:**
- Before: `song-room.live/` = login page (Next app); no public marketing; blog assumed to be served by GitHub Pages.
- After: `song-room.live/` = indexable marketing page (canonical song-room.live), `/login` = login, protected routes → `/login?redirectTo=…`, Google + email login land on the dashboard, `/blog` pre-cleared for the SEO engine to publish into `public/blog`.

**Notes for the marketing operating system / SEO engine (PR #3):**
- Production host for song-room.live is now Vercel (clone-clean), not GitHub Pages. The marketing source of truth is `public/marketing.html` on clone-clean; the main-branch wireframe is now only a preview.
- The blog must be served by Vercel: SEO engine should output to `public/blog` and open PRs against `clone-clean` (not main). `/blog` is already whitelisted in middleware. Fix blog nav links (brand → `/`, CTA → `/login`); keep canonical `https://song-room.live/blog/…` and `SITE_URL`.
- Open: apex vs www — song-room.live 308-redirects to www.song-room.live while canonical is set to the apex; alignment still to be decided.

**Tests run:**
- Vercel production builds passed (deploys READY) for each commit.
- Verified live: `/` serves marketing (indexable), `/login` serves login, `/dashboard` logged-out → `/login?redirectTo=%2Fdashboard`, `/auth/callback` (no code) → `/login?...`, and Google login confirmed reaching the dashboard by Coris.

---

## 2026-07-30 — Refresh staged review against current clone-clean

### What we were trying to achieve

Bring the staged code-review PR up to date with the current `clone-clean` branch before applying its database migrations to the new Supabase staging environment.

### Feature / change being made

Base-branch reconciliation and newly published runtime dependency security patches.

### Files changed

- `package.json`
- `package-lock.json`
- `UPDATE_LOG.md`
- Current `clone-clean` changes merged into `codex/staged-code-review-fixes`

### Notes

- Preserved both sides of the appended update log while merging the current base branch; all application-code changes merged automatically.
- Updated the supported Next.js 15 line to a patched 15.5.21-or-newer release (resolved to 15.5.22), Sharp to 0.35.3, and PostCSS to 8.5.18.
- Added a Node.js 20.9-or-newer engine requirement because Sharp 0.35 requires that runtime.
- Forced Next.js's optional Sharp dependency to the same patched 0.35.3 version so the vulnerable nested copy is not installed.
- The remaining full-audit findings are confined to ESLint's development-only legacy glob stack. Forcing its patched major glob dependency breaks ESLint's import contract, so that toolchain migration remains separate from runtime security.

### Verification

- `npm audit --omit=dev` — 0 vulnerabilities.
- `npm run lint` — passed with 48 warnings and 0 errors.
- `npx tsc --noEmit --incremental false` — passed.
- Production build — passed on Next.js 15.5.22 with placeholder build-time service credentials.
- Full `npm audit` — 9 high-severity development-only findings in the ESLint/minimatch/brace-expansion chain; no production dependencies affected.

---

## 2026-08-01 — Align collaborator limits across pricing tiers

### What we were trying to achieve

Make the collaborator offer consistent across the public pricing page, in-app upgrade flow, and server-side plan enforcement: Free supports up to 5 collaborators, while Pro and Studio support unlimited collaborators.

### Feature or change

Pricing tier and collaborator-limit alignment.

### Changed files

- `lib/plans.ts` — changed the canonical limits to 5 collaborators on Free and unlimited on Pro and Studio; simplified the limit message to the only capped plan.
- `app/upgrade/page.tsx` — updated the Free and Pro pricing-card collaborator copy.
- `public/marketing.html` — updated the public pricing cards to show 5 collaborators on Free and unlimited collaborators from Pro.
- `public-mvp-roadmap.md` — recorded the agreed collaborator policy in the queued plan-gating specification.
- `UPDATE_LOG.md` — documented this change.

---

## 2026-08-07 — Beta feedback: database layer (beta_feedback table)

### What we were trying to achieve

Lay the foundation for open-beta feedback capture and the Founding Tester reward programme ahead of the song-room.live launch. This slice creates only the database table; the `/api/feedback` route and the banner + feedback FAB UI are the next slices.

### Feature / change being made

New `beta_feedback` table on the v2 consumer Supabase project (`hxtsuhmqrufcdplidtov`). One row per submission; the table doubles as the triage queue (`status`) and the Founding Tester reward ledger (`reward_*` columns).

### Files changed

- [migrations/20260807_beta_feedback_up.sql](/Users/impero/song-review-app/migrations/20260807_beta_feedback_up.sql)
- [migrations/20260807_beta_feedback_down.sql](/Users/impero/song-review-app/migrations/20260807_beta_feedback_down.sql)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Migration written by Claude, run manually by Coris in the Supabase SQL Editor against the v2 project. Confirmed run successfully.
- RLS enabled deny-all (no policies): anon/authenticated cannot read or write; the service-role client used by `/api/feedback` bypasses RLS. Public feedback is write-only through the API.
- `message` has a DB-level length floor (10–2000 chars) so low-effort junk can't land.
- `ip_hash` stores sha256(ip + salt) for per-IP rate limiting of logged-out submissions; the raw IP is never stored. Requires a `FEEDBACK_IP_SALT` env var when the API route is built.
- Reward is two-phase: `reward_eligible` is set on admin approval during beta (issues nothing); unique Stripe promo codes (coupon `founding_tester_6mo`) are batch-issued at launch when plan gating (Phase 10) ships.
- Founding Tester cap = 100, enforced in the admin approval route (count of `reward_eligible = true`), not as a DB constraint, so the ceiling can be raised without a migration.
- Next slices: `/api/feedback` route (honeypot, length + rate-limit guards), then the permanent beta top banner and the position-flipping feedback FAB/panel.

---

## 2026-08-07 — Beta feedback: submission route (/api/feedback)

### What we were trying to achieve

Give the beta banner and feedback FAB something to post to: a public submission endpoint that writes into the `beta_feedback` table with anti-spam guards, and without emailing the admin on every submission (the table is the triage queue).

### Feature / change being made

New `POST /api/feedback` route on the public build. Validates a submission, rate-limits it, captures silent context, and inserts one `beta_feedback` row.

### Files changed

- [app/api/feedback/route.ts](/Users/impero/song-review-app/app/api/feedback/route.ts)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Confirmed working: production build READY (commit `d2e502d`) plus live smoke tests — short message → 400, bad type → 400, honeypot filled → 200 with no DB write. None of the tests wrote a row.
- Guards: honeypot (hidden `website` field → silent fake success), message length 10–2000, type allowlist (bug|idea|other), and a per-identity rate limit of 5/hour (by `user_id` when logged in, else by salted IP hash).
- Logged-out submitters must supply an email; logged-in users are resolved via `getCurrentAuthenticatedUser()` (session).
- Silent context captured: `page_url`, `user_agent`, `viewport` (from client), plus `app_version` from `VERCEL_GIT_COMMIT_SHA` and a salted `ip_hash` (needs `FEEDBACK_IP_SALT` — now set in the clone-clean Vercel project).
- Uses the shared module-level `supabaseServer` (service-role) client, matching repo convention. No admin email is sent — feedback is reviewed from the `beta_feedback` table.
- Next: the permanent beta top banner and the feedback FAB + panel that POST here (FAB flips bottom-left on the waveform/player route); then the admin triage/approve action (sets `reward_eligible`, cap 100); then launch-time batch issue of `founding_tester_6mo` Stripe codes.

---

## 2026-08-07 — Beta feedback: banner + FAB/panel UI

### What we were trying to achieve

Surface the beta context and a one-tap feedback path in the live app, wired to `/api/feedback`, without disrupting the public artist-share experience.

### Feature / change being made

Two client components: an app-wide feedback FAB + panel, and a permanent beta banner scoped to the authenticated shell.

### Files changed

- [components/BetaFeedback.tsx](/Users/impero/song-review-app/components/BetaFeedback.tsx)
- [components/BetaFeedback.module.css](/Users/impero/song-review-app/components/BetaFeedback.module.css)
- [components/BetaBanner.tsx](/Users/impero/song-review-app/components/BetaBanner.tsx)
- [components/BetaBanner.module.css](/Users/impero/song-review-app/components/BetaBanner.module.css)
- [app/layout.tsx](/Users/impero/song-review-app/app/layout.tsx) (mount FAB app-wide)
- [components/AppShell.tsx](/Users/impero/song-review-app/components/AppShell.tsx) (mount banner in content)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Confirmed: production build READY (commit `8654b64`); FAB verified rendering on `/login`; banner correctly absent on login/public; Coris confirmed the visual in the authenticated shell.
- FAB mounted in root layout → appears on all app-router pages (login, dashboard, listen, songs). Flips to bottom-left on the `/songs/[id]/versions/[versionId]` player route to clear the transport. The static landing page at `/` (served from `public/`) is outside the app router, so no FAB there.
- Banner mounted as the first child of AppShell content → authenticated shell only; NOT on public `/listen`, login, or the marketing surface. Straw `#F0E48C` (no global token exists — kept local), black text, hard bottom border, zero radius. Sticky on desktop, static on mobile (avoids colliding with the sticky mobile workspace bar). Spans the content column, not across the 76px sidebar rail.
- Banner "send us feedback →" link and the FAB open the same panel via a window CustomEvent (`song-room:open-feedback`) — no app-wide context provider needed.
- Panel: Bug/Idea/Other chips, message textarea, honeypot, and progressive email disclosure (email field appears only when the API signals it's needed, i.e. logged-out submitters). Posts to `/api/feedback`.
- No admin email on submission, by design — feedback is reviewed from the `beta_feedback` table / the upcoming admin triage view.

---

## 2026-08-07 — Beta banner on front-door surfaces (login + marketing)

### What we were trying to achieve

Make open-beta status visible to logged-out visitors — on the marketing landing page and the login page — so people know it's beta before they sign in. The artist-share `/listen` surface is deliberately left clean.

### Feature / change being made

Added the beta banner to the two front-door surfaces, with different mounts because they're built differently.

### Files changed

- [app/login/page.tsx](/Users/impero/song-review-app/app/login/page.tsx)
- [app/login/page.module.css](/Users/impero/song-review-app/app/login/page.module.css)
- [public/marketing.html](/Users/impero/song-review-app/public/marketing.html)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Confirmed by Coris on desktop + mobile after a mobile-overlap fix.
- Login: BetaBanner added as a new first grid row (`grid-template-rows` gained a row). On mobile the login page abandons the grid for absolute positioning, so the banner wrapper is pinned `position:absolute; top:0; z-index:3` and the nav dropped to `top:35px` to avoid overlap (this was the mobile bug Coris caught).
- Marketing (static `public/marketing.html`): informational straw strip (BETA pill + "open beta" message), fixed at `top:0`, with the fixed nav moved from `top:0` to `top:34px`. No feedback link there — the app FAB/panel doesn't run on the static page; can be linked to `/login` later if wanted.
- Banner still NOT shown on `/listen` (artist-share) — intentional.
- Commits: `d60949bd` (add), `ac376690` (mobile fix).

---

## 2026-08-07 — Admin beta-feedback triage view (/admin/feedback)

### What we were trying to achieve

Give the creator a place to read incoming beta feedback and approve quality submissions, with approval doubling as the Founding Tester reward gate — no per-submission emails.

### Feature / change being made

An `ADMIN_EMAILS`-gated triage page plus two admin API routes.

### Files changed

- [lib/isAdmin.ts](/Users/impero/song-review-app/lib/isAdmin.ts)
- [app/api/admin/feedback/route.ts](/Users/impero/song-review-app/app/api/admin/feedback/route.ts)
- [app/api/admin/feedback/[id]/route.ts](/Users/impero/song-review-app/app/api/admin/feedback/%5Bid%5D/route.ts)
- [app/admin/feedback/page.tsx](/Users/impero/song-review-app/app/admin/feedback/page.tsx)
- [app/admin/feedback/FeedbackTriage.tsx](/Users/impero/song-review-app/app/admin/feedback/FeedbackTriage.tsx)
- [app/admin/feedback/feedback.module.css](/Users/impero/song-review-app/app/admin/feedback/feedback.module.css)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)

### Notes

- Confirmed working by Coris — the triage view renders live feedback with the cap counter, filters, and Approve/Reject/Spam.
- Gate: `ADMIN_EMAILS` env var (comma-separated, case-insensitive), checked in the page (`notFound()` for non-admins) and both API routes (404). Deny-all if unset. Auth middleware also redirects anon → `/login?redirectTo=/admin/feedback`. Verified anon denied (307/404), admin allowed.
- **`ADMIN_EMAILS` must match the user's SESSION email exactly.** Coris's is `corisleachman@googlemail.com`; set both the `@googlemail.com` and `@gmail.com` variants if unsure (Google alias). A temporary diagnostic page was used to surface the session email, then removed.
- GET lists `beta_feedback` (status filter: new/approved/rejected/spam/all) plus a "Founding Testers N/100 eligible" counter. PATCH `approve` sets `status=approved`, stamps `reviewed_at/by`, and sets `reward_eligible=true` only while under the 100 cap (past the cap it approves without a slot). Reject/Spam set status only.
- No Stripe code issuance here — approval only flags `reward_eligible`. Unique `founding_tester_6mo` code issuance is the launch-time batch job (Phase 10).
- Commits: `26a54aff` (build), `66312cec` (temp diagnostic), `d770fedd` (diagnostic removed).

This completes the open-beta feedback + Founding Tester capture workstream for the beta phase; the remaining reward issuance is gated to Phase 10 (plan gating).

---

## 2026-08-09 — Fix: status dropdown in desktop card (grid) view

### What we were trying to achieve

Backlog bug: in desktop card/grid view, the track status dropdown (writing / in progress / mixing / mastering / finished) was missing — it only appeared in list view.

### Feature / change being made

Ported the list-view status `<select>` into the grid card, then dropped the read-only pill so grid matches list (dropdown only).

### Files changed

- [app/dashboard/page.tsx](/Users/impero/song-review-app/app/dashboard/page.tsx)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md)
- [PRODUCT_BACKLOG.md](/Users/impero/song-review-app/PRODUCT_BACKLOG.md)

### Notes

- Root cause: the grid branch of the song card rendered only a read-only `.cardStatusPill`; the status `<select>` existed solely in the list branch (and the info sheet). Not a styling bug — the control was never added to grid.
- Fix: reused the existing `updateSongStatus` handler + `SONG_STATUS_VALUES` + `.cardStatusSelect` in the grid `.cardStatusRow`. Then removed the pill span and the now-unused `statusPillClass` helper so the build stays clean.
- Confirmed working by Coris (dropdown changes status in card view; wanted the pill dropped). Commits: `b9c03461` (add dropdown), `be268dce` (drop pill).

---

## 2026-08-09 — Feature: per-user audio visualizer toggle

### What we were trying to achieve

Backlog: let users turn off the reactive audio visualizer on the song player, as a persisted per-user preference in Settings.

### Feature / change being made

A per-user `visualizer_enabled` preference (in `profile_settings`), a dedicated API, an Appearance toggle, and player gating.

### Files changed

- [migrations/20260809_profile_settings_visualizer_up.sql](/Users/impero/song-review-app/migrations/20260809_profile_settings_visualizer_up.sql) / `_down.sql` (run 2026-08-09)
- [app/api/profile/visualizer/route.ts](/Users/impero/song-review-app/app/api/profile/visualizer/route.ts) (new)
- [app/settings/appearance/page.tsx](/Users/impero/song-review-app/app/settings/appearance/page.tsx)
- [app/songs/[id]/versions/[versionId]/page.tsx](/Users/impero/song-review-app/app/songs/%5Bid%5D/versions/%5BversionId%5D/page.tsx)
- [UPDATE_LOG.md](/Users/impero/song-review-app/UPDATE_LOG.md) / [PRODUCT_BACKLOG.md](/Users/impero/song-review-app/PRODUCT_BACKLOG.md)

### Notes

- Confirmed working by Coris (toggle saves; player honours it).
- `profile_settings` gained `visualizer_enabled BOOLEAN NOT NULL DEFAULT true` (migration run in the public DB `hxtsuhmqrufcdplidtov`).
- Dedicated `/api/profile/visualizer` GET/POST, kept separate from the theme system. The POST re-loads the user's current theme and includes it in the upsert, so a first-time row gets correct colours and existing rows are never altered.
- Player gates the 3 reactive hero canvases on the preference (default true until the fetch resolves; the visualizer only animates during playback, so no flash in practice). When off, the canvases aren't rendered → `getReactiveCanvasEntries` returns `[]` → the draw loop no-ops. Waveform + transport untouched.
- Not gated: the reactive analyser/audio-graph setup still runs when off (harmless; possible future perf optimisation).
- Commit: `0ef7554a`.

---

## 2026-08-09 — Playlist sharing (surface 1): in-app manage flow + APIs

### What we were trying to achieve

Backlog "public sharing - sequential playlists": build the in-app half first (create/manage/publish playlists) before the public player.

### Feature / change being made

Playlist CRUD APIs + a Playlists area (list + manage) + a sidebar link.

### Files changed

- `lib/playlistAccess.ts` (new)
- `app/api/playlists/route.ts`, `app/api/playlists/[id]/route.ts`, `app/api/playlists/[id]/songs/route.ts`, `app/api/playlists/[id]/songs/[songId]/route.ts`
- `app/playlists/layout.tsx`, `app/playlists/page.tsx`, `app/playlists/[id]/page.tsx`, `app/playlists/playlists.module.css`
- `components/AppSidebar.tsx` (Playlists link)
- `UPDATE_LOG.md`

### Notes

- Confirmed working by Coris (create, name, add/reorder/remove songs, publish, share link).
- Backed by the `playlists` + `playlist_songs` tables (migration run 2026-08-09). Account-scoped: routes resolve the caller's account (`resolved.identity.workspaceId`) and verify the playlist belongs to it via `lib/playlistAccess` (defence beyond RLS). Added songs must belong to the same account.
- Reorder = PATCH `/songs` with `orderedSongIds`; add appends at `max(position)+1`; remove deletes the join row; `updated_at` bumped on mutations.
- Publish = PATCH `is_public`; the share link shown is `/listen/playlist/[id]`. The public PLAYER (surface 2) is not built yet, so the link does not play.
- Commit: `7f8fd520`.

---

## 2026-08-09 — Playlist sharing (surface 2): public sequential player

### What we were trying to achieve

Complete playlist sharing: a public, no-login page that plays a published playlist's songs in sequence.

### Feature / change being made

The public API + the `/listen/playlist/[id]` sequential player.

### Files changed

- `app/api/public/playlist/[id]/route.ts` (new)
- `app/listen/playlist/[id]/page.tsx`, `listen-playlist.module.css`, `layout.tsx` (new)
- `UPDATE_LOG.md`

### Notes

- Confirmed working by Coris (real share link plays + auto-advances, logged out).
- `/api/public/playlist/[id]`: service role + explicit `is_public` check (404 if not public, no existence leak). Serves each song's LATEST version audio via `getPublicUrl` on `song-files` — songs play through the playlist even if not individually `is_public` (decision #2). Latest-version-per-song resolved in one query.
- Player: plain `<audio>` (no WaveSurfer/analyser — avoids the `createMediaElementSource`/`crossOrigin` mobile pitfalls). `play()` called inside the tap gesture (mobile-safe). Track list, transport, click-to-seek progress bar, auto-advance on `ended`. Middleware already treats `/listen/*` as public.
- Metadata layout gives link previews without leaking private playlist titles.
- Commit: `e12e2dc4`.

---

## 2026-08-09 — Playlist sharing: immersive public player + fixes

### What we were trying to achieve

Make the public playlist player match the single-song share page (big artwork, artwork-coloured background, reactive equaliser, lock-screen playback with background auto-advance), and fix bugs found in testing.

### Feature / change being made

Rebuilt the public playlist player to mirror `/listen/[songId]`, plus three fixes.

### Files changed

- `app/listen/playlist/[id]/page.tsx` (immersive rebuild)
- `app/listen/playlist/[id]/listen-playlist.module.css` (single-song styling base + EQ sizing)
- `app/api/public/playlist/[id]/route.ts` (embed-drop fix)
- `app/api/playlists/[id]/route.ts` (in-app detail hardened)
- `UPDATE_LOG.md`, `public-mvp-roadmap.md`, `PRODUCT_BACKLOG.md`

### Notes

- Confirmed working by Coris (desktop + mobile: audio, reactive EQ, per-track artwork/background, lock-screen artwork/controls + background auto-advance through all tracks, EQ sizing).
- **Immersive player** mirrors the single-song page's proven engine: WaveSurfer owns the audio element (no `crossOrigin` — Supabase CORS headers suffice, per `AUDIO_PLAYER_FIXES.md`), desktop live `AnalyserNode`, mobile `OfflineAudioContext` precompute from `ws.getDecodedData()`. Media Session gives per-track artwork/title + play/pause/next/previous so a shared playlist cycles in the background / on the lock screen. Reused the single-song `listen.module.css` as the styling base. Did NOT touch the working single-song page. Commit `c4cc132d`.
- **Fix — track switching:** reusing one WaveSurfer + `ws.load()` while playing kept track 1 audible. Now tear down + recreate the engine (and reset the analyser source) per track / next / prev / auto-advance. Commit `47a871dc`.
- **Fix — newest track missing from the public player:** the `playlist_songs -> songs(...)` FK embed inner-joins and silently dropped a membership row (confirmed via debug: raw membership = 6 rows, embed = 5). Now fetch membership plainly + resolve song meta via a direct `.in(id)`; latest version resolved per song. Applied to the public API and hardened the in-app detail API against the same risk. Commits `26d3867d` (public), `fc371874` (manage).
- **EQ sizing:** taller (160px), flush to the bottom of the player block (`playerContent`/`waveformWrap` bottom padding -> 0). Commit `caf49a25`.
- **Key learning:** avoid PostgREST to-one FK embeds (`parent.select('..., child(...)')`) when you need the full parent row set — they can inner-join-drop rows. Fetch the parent plainly and resolve related rows with a direct `.in(...)`.

---

## 2026-08-09 — UI polish: playlist manager layout + sidebar/header tidy-up

### What we were trying to achieve

Tidy several rough edges after the playlist work: the manager's publish placement and title field, the left sidebar's consistency/tooltips, and relocating the plan sticker.

### Feature / change being made

Layout + styling polish across the playlist manager, the app sidebar, and the dashboard header.

### Files changed

- `app/playlists/[id]/page.tsx`, `app/playlists/playlists.module.css`
- `components/AppSidebar.tsx`, `components/AppSidebar.module.css`
- `components/WorkspaceSwitcher.module.css`
- `app/dashboard/page.tsx`, `app/dashboard/dashboard.module.css`

### Notes

- Confirmed working by Coris.
- **Playlist manager:** publish block (Draft/Public + share link) moved directly under the title row, above the song columns, with a 30px bottom margin. Title input's 1px border removed (reads as editable heading; no focus outline, per request). Commits `5ee7917b`, `b9518ce8`, `7dd39ca2`.
- **Sidebar:** Dashboard icon now uses the same `navButton` treatment as the rest (was a permanent red-filled brand box); top icons grouped for consistent spacing. Slow browser `title` tooltips replaced with instant (~90ms), styled tooltips (surface panel, hard border, caret, right-aligned). Rail `z-index` 40 -> 50 so tooltips render above the beta banner (z-index 45). Workspace rail avatar 38 -> 44px to match the nav buttons; navTop gap 18px. Commits `7dd39ca2`, `12bf43a3`.
- **Plan sticker:** removed from the left nav; now a small tier badge in the dashboard header beside the profile avatar (shown for pro+). NOTE: only appears on the dashboard for now (that's where the top-right avatar lives) — to be revisited when the free/pro/studio tier lockup is designed, likely into a shared top bar for cross-page consistency. Commit `12bf43a3`.
- Kept the unicode nav glyphs (⌂ ≡ ⚙ ⎋); swapping to SVG icons is a possible follow-up.

---

## 2026-08-10 — Feature: multi-uploader (batch create-on-drop)

### What we were trying to achieve

Replace the slow, multi-step single-song uploader with a fast batch flow: drop several tracks, they upload in parallel in the background while you tidy names, then optional per-track artwork.

### Feature / change being made

New `/upload` flow (two steps) wired into the dashboard "New song" entry points.

### Files changed

- `app/upload/layout.tsx`, `app/upload/page.tsx`, `app/upload/upload.module.css` (new)
- `app/dashboard/page.tsx` (New-song entry points -> `/upload`)
- `UPDATE_LOG.md`, `public-mvp-roadmap.md`, `PRODUCT_BACKLOG.md`

### Notes

- Confirmed working by Coris (multiple batches upload fine).
- Model: **create-on-drop**. Per dropped audio file, in parallel: `POST /api/songs/create` -> `POST /api/versions/create` (signed URL) -> `XHR PUT` direct to storage with live progress. Reuses existing endpoints; no new infra, no migration.
- Titles auto-cleaned from filename (strip ext, `_`/`-` -> spaces, title-case), editable inline, saved via `PATCH /api/songs/[id]` on blur + on continue.
- Step 2: per-track artwork via `/api/songs/upload-image` (Sharp); local preview for instant feedback.
- Hardening: per-file **Retry** (deletes the half-made song, re-runs fresh), **Discard** (deletes all created songs), unsupported-file notice, correct `Content-Type` per format, and a post-upload **verify** (mirrors the single-song uploader) so a broken/partial upload errors for retry instead of silently succeeding.
- NOTE: one specific pre-existing MP3 plays with warped timing in its first ~30s. Confirmed **file-specific** (other tracks fine; the issue follows that one file across re-uploads) — a VBR-MP3 / player-decoding quirk, NOT an uploader or data-integrity problem.
- Commits: `3531ce2f` (slice 1), `028ed943` (slice 2), `a2ab133f` (hardening).

---

## 2026-08-10 — Playlist share preview + custom cover

### What we were trying to achieve
Give shared playlists a social preview image, and let artists set a custom cover (e.g. EP art) that represents the playlist.

### Feature / change being made
Playlist share metadata now carries an image; a custom cover can be uploaded on the manage page and overrides the default.

### Files changed
- `migrations/20260810_playlists_image_up.sql` / `_down.sql` (adds `playlists.image_url`; Coris ran UP against `hxtsuhmqrufcdplidtov`)
- `app/listen/playlist/[id]/layout.tsx` (OG/Twitter image)
- `app/api/playlists/[id]/image/route.ts` (new — POST upload / DELETE remove, Sharp)
- `lib/playlistAccess.ts`, `app/api/playlists/[id]/route.ts` (expose `image_url`)
- `app/playlists/[id]/page.tsx`, `app/playlists/playlists.module.css` (cover control)

### Notes
- Confirmed working by Coris.
- Share image resolves as: custom cover (`playlists.image_url`) if set, else the first track's artwork. Twitter card = `summary_large_image` when an image exists.
- Upload reuses the Sharp pipeline (1200px fit-inside, JPEG 85%, `song-images` bucket, `playlist-{id}-{ts}.jpg`); manage page has a cover slot + "Remove cover" (reverts to first-track art).
- Commits: `93e6d2a8` (first-track default), `2515012a` (custom cover).

---

## 2026-08-10 — Site social preview image

### What we were trying to achieve
Shares of `song-room.live` should show a branded preview image (brand name + what the app does).

### Feature / change being made
Added `song-room-preview.jpg` (1200x630) and wired Open Graph / Twitter tags.

### Files changed
- `public/song-room-preview.jpg` (new, 1200x630)
- `middleware.ts` (serve the image publicly — added to `publicRoutes`)
- `public/marketing.html` (OG/Twitter image -> the new image)
- `app/layout.tsx` (`metadataBase` + OG/Twitter; brand title "The Song Room" replacing the stale "Song Review")

### Notes
- Confirmed working by Coris. Image serves 200 at `https://www.song-room.live/song-room-preview.jpg`.
- The app gates `public/` files by default (why the old OG image lived on GitHub Pages); added the path to the middleware `publicRoutes` so it serves from the app domain. Tags use the direct `www` URL to avoid the apex->www redirect for scrapers.
- Reminder: social platforms cache OG data; a re-scrape (e.g. Facebook Sharing Debugger) is needed to refresh a previously-shared link.
- Commits: `e277bf9b`, `ec7602ae`, `d16dd044`, `48c7356c`.

---

## 2026-08-10 — Copy: em dashes -> regular dashes (marketing + login)

### What we were trying to achieve
Coris prefers regular dashes over em dashes in the preview text and across the marketing + login pages.

### Files changed
- `public/marketing.html` (37 — preview meta + visible copy)
- `app/layout.tsx` (2 — app-route preview description)
- `app/login/page.tsx` (5), `app/login/page.module.css` (9) — all code comments

### Notes
- Confirmed by Coris. Preserved one decorative pricing-list bullet (`.tier-features li::before { content: '—' }`); flagged for a future call.
- Commit: `a25d00f5`.

---

## 2026-08-11 - Supabase migration baseline and staging repair

### What we were trying to achieve

Make Supabase branches reproduce the real production schema and storage setup instead of starting with only a small subset of the application's tables.

### Feature / change being made

Canonical Supabase migration history under `supabase/migrations`, plus reproducible public media buckets for staging and future preview branches.

### Files changed

- `supabase/migrations/20260730171202_remote_schema.sql`
- `supabase/migrations/20260807090000_beta_feedback.sql`
- `supabase/migrations/20260809100000_profile_settings_visualizer.sql`
- `supabase/migrations/20260809110000_playlists.sql`
- `supabase/migrations/20260810100000_playlists_image.sql`
- `supabase/migrations/20260811080000_storage_buckets.sql`
- `UPDATE_LOG.md`

### Notes

- Fetched the existing 30 July production baseline from Supabase migration history. It contains all 18 core public tables, functions, constraints, indexes, grants, and RLS policies.
- Copied the four August migrations that had been run manually in production into the canonical Supabase migration directory, then recorded their complete SQL as applied in production migration history without rerunning them.
- Added an idempotent storage migration for the public `song-files` and `song-images` buckets. Their public status preserves single-song links, public playlists, artwork, and social share images.
- Recreated `code-review-staging` as a persistent, data-free branch. The replacement branch has all 21 production tables and both public storage buckets.
- Production application data and schema objects were not changed. Only migration-history metadata was repaired.

---

## 2026-08-11 - Staged code-review database rollout

### What we were trying to achieve

Apply the reviewed security, upload-integrity, and query-performance changes to an isolated Supabase branch before they reach production.

### Feature / change being made

Canonical staged-review migrations, database verification, and a referral-code function repair found by Supabase lint.

### Files changed

- `supabase/config.toml`
- `supabase/migrations/20260811100000_public_comments_hardening.sql`
- `supabase/migrations/20260811110000_stripe_webhook_idempotency.sql`
- `supabase/migrations/20260811120000_account_storage_schema.sql`
- `supabase/migrations/20260811130000_version_upload_integrity.sql`
- `supabase/migrations/20260811140000_dashboard_query_indexes.sql`
- `supabase/migrations/20260811150000_fix_generate_referral_code.sql`
- `app/upload/page.tsx`
- `app/api/public/playlist/[id]/route.ts`
- `app/api/dashboard/route.ts`
- `app/api/dashboard/summary/route.ts`
- `app/songs/[id]/page.tsx`
- `app/api/songs/[songId]/versions/route.ts`
- `app/api/admin/feedback/[id]/route.ts`
- `app/api/playlists/[id]/route.ts`
- `app/api/playlists/[id]/image/route.ts`
- `app/api/playlists/[id]/songs/route.ts`
- `app/api/playlists/[id]/songs/[songId]/route.ts`
- `app/listen/playlist/[id]/layout.tsx`
- `package.json`
- `package-lock.json`
- `UPDATE_LOG.md`

### Notes

- Applied each migration to `code-review-staging` separately and checked its security or data-integrity behavior before continuing.
- Confirmed Stripe webhook claiming is idempotent and version upload finalisation only increments storage once.
- Added seven indexes for common dashboard, version, action, comment, and membership reads.
- Fixed the ambiguous `code` variable in `generate_referral_code()`, which caused the function to fail database lint and could fail at runtime if called.
- Updated the multi-uploader to finalise each uploaded object before verification, and to cancel pending version rows after a failed upload.
- Public playlists now ignore pending versions, while retaining a compatibility fallback for environments where the finalisation column has not been deployed yet.
- Public playlist song lookups are constrained to the playlist workspace, protecting against accidental cross-workspace membership data when the service role reads the public feed.
- Dashboard, song entry, and version-list reads ignore interrupted pending uploads so users aren't sent to incomplete audio records.
- Updated the pinned PostCSS override to its patched release, which also removes the vulnerable transitive Nano ID release from the production dependency tree.
- Updated the recent feedback and playlist routes to Next 15's asynchronous route-parameter contract so production builds can validate them.
- Hosted Auth and API configuration is intentionally absent from `supabase/config.toml`; don't run `supabase config push` until production settings have been captured and reviewed.

---

## 2026-08-11 - Environment-aware public song links

### What we were trying to achieve

Allow public song sharing to be tested against an isolated preview database without sending listeners to the production application, where the staging song does not exist.

### Feature / change being made

The song share modal now builds its listen URL from the hostname currently serving the app, matching the existing public-playlist behaviour.

### Files changed

- `app/songs/[id]/versions/[versionId]/page.tsx`
- `UPDATE_LOG.md`

### Notes

- Production visitors still receive a production-domain link.
- Preview visitors now receive a preview-domain link, keeping the application and Supabase environment paired correctly.
- No database, storage, authentication, or production configuration was changed.

---

## 2026-08-11 - Environment-aware workspace invite links

### What we were trying to achieve

Keep emailed collaborator invites in the environment where they were created, so staging invitations do not point recipients to localhost or production.

### Feature / change being made

Workspace invitation emails now build their acceptance URL from the current request origin for both new and resent invitations.

### Files changed

- `app/api/workspace/invites/route.ts`
- `UPDATE_LOG.md`

### Notes

- Removed the localhost fallback from emailed invite links.
- Production requests still generate production links, while preview requests generate preview links.
- Manual invite-link copying already used the current browser origin and was unchanged.

---

## 2026-08-11 - Reliable environment-aware comment notifications

### What we were trying to achieve

Ensure timestamped comments and replies send collaborator notifications from protected staging deployments without trying to contact localhost or delaying the comment response.

### Feature / change being made

Comment notification delivery now runs directly as supported post-response work instead of making a fragile HTTP request back into the same deployment.

### Files changed

- `app/api/threads/create/route.ts`
- `app/api/threads/reply/route.ts`
- `app/api/email/notify-thread/route.ts`
- `lib/threadNotifications.ts`
- `UPDATE_LOG.md`

### Notes

- Removed the localhost fallback from comment and reply notification delivery.
- Kept the signed internal notification endpoint for authenticated HTTP callers.
- Preserved the existing recipient, membership, and notification-mode checks.
- Notification links now use the environment where the comment or reply was posted.
- Resend API errors are treated as delivery failures instead of being logged as successful sends.

---

## 2026-08-11 - Workspace-aware song access message

### What we were trying to achieve

Explain a deliberate workspace permission denial clearly when someone opens a song notification while a different workspace is selected.

### Feature / change being made

The version page now distinguishes a workspace access denial from a temporary loading failure and gives the user a useful recovery instruction.

### Files changed

- `.impeccable.md`
- `app/songs/[id]/versions/[versionId]/page.tsx`
- `UPDATE_LOG.md`

### Notes

- Preserved the HTTP status from failed initial version-page requests so a 403 can be rendered intentionally.
- Replaced the generic loading-failure heading with workspace-specific access copy for 403 responses.
- Removed the ineffective Retry action from this permission state. Other loading failures retain Retry.
- Saved the project's design context for future interface work.

---

## 2026-08-12 - Authenticated dashboard performance instrumentation

### What we were trying to achieve

Establish a trustworthy Stage 3 baseline for the slow authenticated dashboard before changing its data flow.

### Feature / change being made

Preview-safe request timing for authentication, workspace bootstrap, dashboard queries, response assembly, and opt-in client readiness measurements.

### Files changed

- `app/api/auth/bootstrap/route.ts`
- `app/api/dashboard/route.ts`
- `app/dashboard/page.tsx`
- `lib/bootstrapAccount.ts`
- `lib/canonicalIdentity.ts`
- `lib/requestTiming.ts`
- `UPDATE_LOG.md`

### Notes

- Added `Server-Timing` headers to the authenticated bootstrap and dashboard endpoints.
- Preview logs report only timing stages, response status, request identifiers, and record counts. They do not include user IDs, emails, workspace IDs, song titles, or comment text.
- Dashboard visits with `?perf=1` use one anonymous trace identifier across bootstrap and dashboard requests and log when songs become visible.
- Adding `cache=skip` to the trace URL bypasses the dashboard's local read cache for one cold-load measurement without deleting browser data; the fresh response still seeds the next warm run.
- Normal dashboard query order and caching are unchanged. Authorization, database schema, and production configuration are also unchanged.

---

## 2026-08-12 - Shared account bootstrap concurrency

### What we were trying to achieve

Reduce the repeated server and database delay paid by authenticated dashboard requests without changing account creation, authentication, or workspace selection rules.

### Feature / change being made

First measured Stage 4 performance batch for the canonical account bootstrap.

### Files changed

- `lib/bootstrapAccount.ts`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- Profile persistence and membership resolution now run concurrently because neither depends on the other.
- A valid active-workspace membership now avoids the redundant query for every membership belonging to the user.
- New-account creation still waits until both profile and membership checks finish, preserving the existing first-login sequence.
- The measured dashboard baseline and active review findings are recorded in `CODEBASE_REVIEW.md`.
- Preview traces confirmed that profile and membership stages overlap, removing 307 to 425 ms of serialized database waiting across the two identity calls made by an initial dashboard visit.
- End-to-end request chains still varied from 2.12 to 4.15 seconds, so no stable whole-page percentage improvement is claimed from this batch.
- No database schema, cache scope, authentication rule, or production configuration was changed.

---

## 2026-08-12 - Dashboard member-query reduction

### What we were trying to achieve

Remove database work that delays every dashboard response even when no assigned actions need collaborator names.

### Feature / change being made

Second measured Stage 4 performance batch for the authenticated dashboard query path.

### Files changed

- `app/api/dashboard/route.ts`
- `lib/workspaceMembers.ts`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- The dashboard no longer loads the entire workspace member directory alongside every versions and actions query.
- With no assigned actions, member and profile queries are skipped entirely.
- When actions are assigned, the lookup is restricted to those user IDs, still checks workspace membership, and runs alongside thread loading.
- Settings, collaborator management, invitations, and other routes retain the existing full workspace-member behavior.
- In a comparable high-latency preview sample, the dashboard `related` stage fell from 606 ms to 360 ms, a 41% reduction, and no assigned-member lookup ran for the zero-action workspace.
- Whole-route time remained dominated by variable identity and later comment-query stages, so this batch is recorded as a stage improvement rather than a stable page-load percentage.
- No database schema, permission rule, cache scope, or production configuration was changed.

---

## 2026-08-12 - Dashboard version and thread query consolidation

### What we were trying to achieve

Remove another sequential database round trip from the authenticated dashboard without changing which versions, threads, or comments are displayed.

### Feature / change being made

Third measured Stage 4 performance batch for the authenticated dashboard query path.

### Files changed

- `app/api/dashboard/route.ts`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- Finalized song versions now include their comment-thread fields through the existing database relationship.
- The dashboard no longer performs a separate thread query after loading versions.
- Comments remain a separate, workspace-constrained lookup using only thread IDs returned with finalized versions.
- The previous trace showed that the removed thread stage cost 310 ms.
- The preview response retained four songs, five versions, two threads, and three comments, with no separate `threads` timing stage.
- On latency-matched samples, the whole dashboard route fell from 2,236 ms to 1,980 ms, an 11% reduction, while identity timing stayed within 10 ms.
- No database schema, permission rule, cache scope, or production configuration was changed.

---

## 2026-08-12 - Dashboard thread and comment query consolidation

### What we were trying to achieve

Remove the final sequential comment round trip from the authenticated dashboard while preserving comment counts, activity summaries, and awaiting-response signals.

### Feature / change being made

Fourth measured Stage 4 performance batch for the authenticated dashboard query path.

### Files changed

- `app/api/dashboard/route.ts`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- Comment fields now load under their existing comment threads inside the finalized-version query.
- The dashboard no longer performs a separate comments query after versions and threads have loaded.
- Comment and thread IDs still drive the same in-memory action, activity, count, and awaiting-response assembly.
- The previous comparable trace showed that the removed comments stage cost 313 ms.
- The deployed preview retained four songs, five versions, two threads, and three comments, with no separate `threads` or `comments` timing stage.
- The comparable post-identity dashboard data path fell from about 1,027 ms to 617 ms, a 40% reduction. The whole route reached 1,366 ms in that sample, but identity variability means the data-path comparison is the reliable result.
- The user's cold dashboard check passed, and the preview runtime error scan remained clean.
- No database schema, permission rule, cache scope, or production configuration was changed.

---

## 2026-08-12 - Single-request dashboard initialization

### What we were trying to achieve

Remove the repeated authenticated identity and account-bootstrap work from the initial dashboard journey without racing first-account creation or weakening workspace validation.

### Feature / change being made

Fifth measured Stage 4 performance batch for the authenticated dashboard request path.

### Files changed

- `app/api/dashboard/route.ts`
- `app/dashboard/page.tsx`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- The authorized dashboard response now includes the canonical identity and workspace plan it already resolved.
- Initial dashboard loading uses that one response for session state and dashboard content instead of calling `/api/auth/bootstrap` and then `/api/dashboard` in series.
- First-account creation remains inside one canonical server request, so the unsafe parallel-request race is not introduced.
- Focus refreshes and other authenticated screens keep their existing behavior.
- The user's cold preview check and workspace switching both passed. Each switch returned 200 and showed the correct zero-song or four-song workspace.
- The traced cold visit contained one dashboard request and no bootstrap request. Compared with the closest preceding preview, total server work fell from about 2,825 ms across two requests to 1,750 ms in one request, a 38% reduction.
- The browser reported songs visible at 3,084 ms on that cache-bypassed visit. The request returned four songs, five versions, two threads, and three comments.
- No database schema, permission rule, cache scope, or production configuration was changed.

---

## 2026-08-12 - Concurrent active-workspace bootstrap

### What we were trying to achieve

Remove a remaining sequential database wait from canonical identity resolution after the dashboard switched to one request.

### Feature / change being made

Sixth measured Stage 4 performance batch for authenticated workspace bootstrap.

### Files changed

- `lib/bootstrapAccount.ts`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- When the HTTP-only active-workspace cookie is present, candidate workspace loading now starts alongside membership validation and the existing profile sync.
- Candidate workspace data is used only after the user's membership in that exact workspace has passed validation.
- A stale or invalid cookie still falls back to the user's canonical membership selection. First-account creation remains ordered after membership checks.
- The user's cold four-song dashboard check passed with the same five versions, two threads, and three comments.
- On that cold active-workspace trace, identity fell from 1,063 ms to 652 ms, a 39% reduction, and the full dashboard response fell from 1,750 ms to 1,188 ms, a 32% reduction.
- Warm samples remain variable because one concurrent Supabase read sometimes queues, so this is recorded as a cold-path improvement rather than a universal response-time percentage.
- No database schema, permission rule, cookie format, or production configuration was changed.

---

## 2026-08-12 - Public playlist performance instrumentation

### What we were trying to achieve

Measure the public playlist's per-song latest-version query wave before replacing it, without logging public IDs, titles, or song names.

### Feature / change being made

Stage 4 baseline instrumentation for the public playlist API.

### Files changed

- `app/api/public/playlist/[id]/route.ts`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- Preview logs now report playlist lookup, workspace lookup, ordered membership, scoped songs, and latest-version stage durations.
- Logs contain only response status, anonymous request timing, and record/query counts. Public identifiers and content are excluded.
- Playlist authorization, track order, pending-upload filtering, storage URLs, and fallback behavior are unchanged.
- The user's cold and warm public playlist checks both retained three ordered, playable tracks.
- Baseline responses took 1,240 ms and 1,409 ms. Each used three latest-version requests and spent 319 ms in that stage.
- No database schema, permission rule, cache policy, or production configuration was changed.

---

## 2026-08-12 - Public playlist query consolidation

### What we were trying to achieve

Reduce public playlist database requests without restoring the earlier response-row truncation that caused a newest track to disappear.

### Feature / change being made

Measured Stage 4 performance batch for the public playlist API.

### Files changed

- `app/api/public/playlist/[id]/route.ts`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- Latest playable versions now load through one combined query for ordinary playlists instead of one query per song.
- Version results paginate in 500-row pages and long song-ID lists split into bounded batches, so playlists with extensive version history do not depend on the server response row limit.
- Workspace-name and ordered playlist-membership reads now overlap after the playlist's public status has passed validation.
- Pending-upload filtering, missing-column fallback, cross-workspace song filtering, track order, and storage URL behavior are preserved.
- Direct preview verification returned the same three ordered tracks with one version query instead of three.
- The verified response took 1,278 ms versus the comparable 1,409 ms baseline, about 9% faster. Latest-version query count fell 67%.
- The user's public-player check confirmed that the first and last tracks both play.
- No database schema, permission rule, cache policy, or production configuration was changed.

---

## 2026-08-12 - Final readiness audit security and deletion hardening

### What we were trying to achieve

Finish the Stage 5 production-readiness audit, close any release-blocking permission or data-integrity gaps, and keep all verification isolated to staging.

### Feature / change being made

Remove permissive RLS policies, make song deletion release storage usage atomically, clean up deleted media objects, and record the final audit and rollout state.

### Files changed

- `app/api/songs/[songId]/route.ts`
- `migrations/20260520_rls_policies_up.sql`
- `migrations/20260520_rls_policies_down.sql`
- `migrations/20260812_remove_permissive_rls_policies_up.sql`
- `migrations/20260812_remove_permissive_rls_policies_down.sql`
- `migrations/20260812_song_deletion_storage_accounting_up.sql`
- `migrations/20260812_song_deletion_storage_accounting_down.sql`
- `supabase/migrations/20260812200000_remove_permissive_rls_policies.sql`
- `supabase/migrations/20260812201000_song_deletion_storage_accounting.sql`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- Removed the legacy song policy that allowed every role to read every song row and the authenticated settings policy that overrode workspace-scoped access.
- Changed the historical RLS rollback into a deliberate no-op because restoring blanket access is unsafe.
- Added a service-role-only song-deletion transaction that locks the affected records, subtracts finalized audio bytes from workspace usage, uses database cascades for related rows, and returns storage paths for object cleanup.
- The API removes returned audio paths and the current cover in batches. If object cleanup fails after the database transaction, the response reports pending cleanup while the deleted rows and workspace quota remain correct.
- Applied both new canonical migrations only to `code-review-staging`; all 14 local and staging migration versions now align.
- Verified that staging contains a private-song fixture and anonymous access to that fixture is blocked after the policy migration.
- A rollback-safe deletion fixture released exactly 123 bytes, returned one audio path, deleted the song, and left its temporary workspace at zero bytes. The temporary workspace was removed.
- `supabase db lint --linked --level warning` reported no schema errors.
- `npm audit --omit=dev` reported zero known production dependency vulnerabilities.
- Production remains unchanged. The draft PR must stay open and unmerged until the preview build and a user-facing deletion regression pass.
