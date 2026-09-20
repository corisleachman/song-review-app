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
- Both Vercel checks passed for commit `30dd23b0`.
- The user-facing preview regression passed: a disposable uploaded song deleted normally, remained absent after refresh, and was also removed from the playlist that contained it.
- Production remains unchanged. Code and staging gates are complete; the draft PR stays open and unmerged pending explicit approval for the migration-first production rollout.

---

## 2026-08-13 - Production rollout record and static-asset middleware exclusion

### What we were trying to achieve

Close the staged review rollout accurately and prevent authentication middleware from refreshing stale sessions for static files such as `/icon.svg`.

### Feature / change being made

Record the completed migration-first production rollout and narrow the auth middleware matcher to application page routes.

### Files changed

- `middleware.ts`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- Applied all eight pending canonical migrations to production before merging application code; all 14 local and production migration versions align and linked database lint reports no schema errors.
- Anonymous production reads return no private songs, and privileged deletion and Stripe RPCs reject anonymous callers.
- Squash-merged PR #2 as `648019f9` and promoted the identical validated preview tree as production deployment `dpl_Eo9XPBCMdnxLUXJFYxwHMHcuiLXj`.
- Live homepage, login, protected dashboard, public song, public playlist, signed-in dashboard, song-open, and playback checks passed. Vercel reported no `5xx` entries.
- One already-used refresh token was logged for `/icon.svg` with a `307` response and no user-facing failure. The matcher now excludes any path ending in a file extension, avoiding authentication work for icons, scripts, stylesheets, images, and similar static assets.
- The middleware remains defense in depth. API routes continue to enforce their own authorization.
- Eleven focused matcher cases passed, covering protected pages, API paths, Next.js assets, the app icon, and ordinary static files.
- Targeted middleware lint, full TypeScript checking, the placeholder-environment production build, and `npm audit --omit=dev` passed. Existing repository-wide lint warnings remain non-blocking and unchanged.

---

## 2026-08-13 - Critical regression contract suite

### What we were trying to achieve

Turn the highest-risk security and data-integrity checks from the staged review into an executable safety net for future changes.

### Feature / change being made

Add a dependency-free Node test command covering authentication routing, workspace boundaries, public sharing, upload integrity, privileged database functions, RLS cleanup, and deletion accounting.

### Files changed

- `package.json`
- `tests/critical-contracts.test.mjs`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- `npm test` now validates the actual middleware matcher against protected, API, Next.js asset, and ordinary static-file paths.
- The existing `prebuild` step runs the suite before deployment assets are prepared, so a broken contract fails the Vercel build.
- Invite-email tests prevent localhost links by requiring both invite paths to use the incoming request origin.
- Workspace and public-sharing checks guard active-workspace ownership, explicit public status, finalized uploads, comment permission, and batched public-playlist version reads.
- Upload and deletion checks guard row locking, quota accounting, finalized-byte handling, storage cleanup reporting, and service-role-only RPC access.
- The unsafe RLS rollback is checked to ensure it cannot recreate blanket policies.
- These are source-level contract tests. Live database, browser, and accessibility behavior still require separate integration coverage.

---

## 2026-08-13 - Playlist cover upload hardening

### What we were trying to achieve

Prevent oversized, unsupported, or extreme-resolution playlist covers from consuming avoidable server memory and image-decoding work.

### Feature / change being made

Bring playlist-cover validation in line with the established song-cover upload boundary.

### Files changed

- `app/api/playlists/[id]/image/route.ts`
- `app/playlists/[id]/page.tsx`
- `tests/critical-contracts.test.mjs`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- Requests over the multipart allowance are rejected before `formData()` parsing.
- Empty files, files over 5 MB, and MIME types other than JPEG, PNG, or WebP are rejected before creating the input buffer.
- Sharp now fails on decode errors and refuses inputs over 40 megapixels before resizing to the existing 1200-pixel JPEG output.
- The playlist file picker now advertises only the server-supported formats.
- The deployment-gated contract suite checks the limits and validation order so future edits cannot silently remove them.
- Preview verification confirmed that a normal JPEG persisted after refresh and appeared on the public share page.
- The oversized-file check exposed misleading optimistic feedback: the rejected local image remained in the thumbnail and the inline message only said `Upload failed`. Client validation now runs before upload, rejected files never replace the displayed cover, and an accessible dialog explains the limit and offers to choose another image.
- The final preview recheck passed: the saved cover remained unchanged, the prominent size dialog appeared, Escape closed it, and `Choose another image` reopened the picker.
- Google preview sign-in required the exact temporary Vercel hostname in Supabase Auth Redirect URLs. Once allowed, OAuth stayed on the preview host and the corrected build could be tested.
- No database schema, storage policy, dependency, or deployment configuration changed.

---

## 2026-08-13 - Backlog gate responsive layout fixes

### What we were trying to achieve

Keep persistent beta and privacy controls clear of dashboard playback, and make the homepage description readable on phones without obscuring the animated headline.

### Feature / change being made

Responsive safe-area coordination for the dashboard mini-player and a mobile-specific hero-grid composition.

### Files changed

- `app/dashboard/page.tsx`
- `components/BetaFeedback.module.css`
- `public/cookie-consent.css`
- `public/marketing.html`
- `tests/critical-contracts.test.mjs`
- `UPDATE_LOG.md`

### Notes

- The dashboard measures the rendered mini-player and publishes its height through the shared `--tsr-player-safe-area` CSS property.
- Cookie consent and beta feedback controls add that safe area to their normal bottom spacing, including mobile spacing and the expanded cookie banner.
- Closing the player or leaving the dashboard removes the temporary CSS property so other pages retain their existing positions.
- On screens up to 900 pixels wide, the descriptive bento panel now occupies row 2 and the decorative image cells move to row 3, separating the copy from the bottom-aligned animated headline.
- Contract tests guard the shared offset and mobile grid placement.
- Source-path verification confirmed that public playlists advance when a track finishes, the desktop card status selector uses the canonical status update handler, the visualizer preference is persisted and respected by the song player, and the email login controls call Supabase sign-in, sign-up, and password-reset methods.
- Responsive browser checks at 390 by 844 and 1440 by 900 found zero overlap between the description and headline, no error overlay, and no console errors.
- All 18 contract tests, TypeScript checking, focused lint, and the placeholder-environment production build passed. Existing lint warnings remain unchanged.
- No database, authentication, billing, storage, dependency, or deployment configuration changed.

---

## 2026-08-14 - Desktop player rail clearance

### What we were trying to achieve

Keep the desktop Settings and Sign out controls accessible when the dashboard mini-player is open.

### Feature / change being made

Keep the dashboard player clear of the persistent 76-pixel desktop navigation rail and move Cookie settings into that rail.

### Files changed

- `components/AppShell.tsx`
- `components/AppSidebar.tsx`
- `app/dashboard/dashboard.module.css`
- `public/cookie-consent.css`
- `public/cookie-consent.js`
- `tests/critical-contracts.test.mjs`
- `UPDATE_LOG.md`

### Notes

- The desktop mini-player now begins at the right edge of the navigation rail instead of covering it.
- Cookie settings is now a labelled desktop sidebar action, so it no longer covers the sidebar or song-card controls.
- The consent controller listens for the sidebar action and opens the existing cookie preferences banner without duplicating consent logic.
- Mobile and public pages keep the existing floating Cookie settings control. The mobile player remains full-width because the desktop rail is hidden there.
- Contract coverage checks the desktop player offset, mobile fallback, and shared cookie-settings action.
- All 18 contract tests, TypeScript checking, and focused lint passed.

---

## 2026-08-14 - Google-only beta authentication

### What we were trying to achieve

Stop first-time workspace invitees from mistaking an existing-account email login form for account creation.

### Feature / change being made

Use Google as the only login and account-creation path during beta.

### Files changed

- `app/invite/[token]/InviteActions.tsx`
- `app/invite/[token]/page.tsx`
- `app/login/page.tsx`
- `app/login/page.module.css`
- `PRODUCT_BACKLOG.md`
- `tests/critical-contracts.test.mjs`
- `UPDATE_LOG.md`

### Notes

- Signed-out invitees now see one Google action and an explanation that Song Room creates a new account automatically when needed.
- The invite-specific email/password form and its existing-user authentication call were removed.
- The login page now has one Continue with Google action for both returning and first-time users.
- Email/password login, email signup, password reset, and their unused interface styles were removed from the beta login page.
- The invite OAuth callback still returns users to the original invite before acceptance.
- Email/username accounts and additional providers such as Microsoft are recorded in `PRODUCT_BACKLOG.md` for post-beta evaluation.
- Contract coverage guards the Google-only invite and login boundary.
- All 19 contract tests, TypeScript checking, focused lint, and the placeholder-environment production build passed. Existing repository warnings remain unchanged.

---

## 2026-08-14 - Song page floating-control clearance

### What we were trying to achieve

Prevent Cookie settings and Beta Feedback from overlapping in the bottom-left corner of song-version pages.

### Feature / change being made

Give the left-positioned song-page Feedback control a shared Cookie settings clearance on desktop and mobile.

### Files changed

- `components/BetaFeedback.tsx`
- `components/BetaFeedback.module.css`
- `public/marketing.html`
- `public/cookie-consent.css`
- `tests/critical-contracts.test.mjs`
- `UPDATE_LOG.md`

### Notes

- Feedback remains on the left of song-version pages so it still clears the player transport area.
- Feedback now stacks above Cookie settings instead of occupying the same fixed corner.
- The shared clearance is 56 pixels on desktop and 52 pixels on screens up to 720 pixels wide, matching the Cookie settings spacing in each context.
- Other routes keep Feedback in its existing bottom-right position.
- Contract coverage guards the shared desktop and mobile clearance values.
- All 19 contract tests, TypeScript checking, focused lint, and the placeholder-environment production build passed. Existing repository warnings remain unchanged.

---

## 2026-08-14 - Cookie preferences moved into Settings

### What we were trying to achieve

Remove the permanent Cookie settings control from the product interface after a visitor has accepted or rejected analytics cookies.

### Feature / change being made

Keep the initial consent banner, move later preference changes into Settings, and return Beta Feedback to the bottom-right position.

### Files changed

- `app/settings/layout.tsx`
- `app/settings/privacy/page.tsx`
- `components/AppShell.tsx`
- `components/AppSidebar.tsx`
- `components/BetaFeedback.tsx`
- `components/BetaFeedback.module.css`
- `public/cookie-consent.js`
- `public/cookie-consent.css`
- `tests/critical-contracts.test.mjs`
- `UPDATE_LOG.md`

### Notes

- First-time visitors still receive the existing analytics accept-or-reject banner.
- Accepting or rejecting no longer creates a permanent floating Cookie settings button.
- The always-visible Cookie settings action was removed from the authenticated app sidebar.
- Settings now includes a Privacy & cookies page whose Cookie settings button opens the canonical consent panel.
- Beta Feedback now uses its established bottom-right position on song pages and other routes.
- No consent storage key, Google Analytics loading behaviour, or saved preference semantics changed.
- All 19 contract tests, TypeScript checking, focused lint, JavaScript syntax checking, and the placeholder-environment production build passed. Existing repository lint warnings remain unchanged.

---

## 2026-08-14 - Feedback clears the mini-player on first playback

### What we were trying to achieve

Keep the fixed Feedback control above the dashboard mini-player from the first song selected, rather than only after switching to another song.

### Feature / change being made

Populate the dashboard playback queue before the first `playingId` render so the mini-player mounts in time for the existing safe-area measurement effect.

### Files changed

- `app/dashboard/page.tsx`
- `tests/critical-contracts.test.mjs`
- `UPDATE_LOG.md`

### Notes

- The existing mini-player measurement, resize observation, and Feedback positioning remain unchanged.
- Regression coverage now protects the queue-before-render ordering required on first playback.
- All 19 contract tests, TypeScript checking, focused lint, and the placeholder-environment production build passed. Existing repository lint warnings remain unchanged.

---

## 2026-08-14 - Prominent dashboard mini-player

### What we were trying to achieve

Make the dashboard player easier to notice and operate by using the empty middle of the bar instead of concentrating track information at one edge and controls at the other.

### Feature / change being made

Recompose the mini-player into a track identity area, a central transport and scrubber area, and a separate close control.

### Files changed

- `app/dashboard/page.tsx`
- `app/dashboard/dashboard.module.css`
- `tests/critical-contracts.test.mjs`
- `UPDATE_LOG.md`

### Notes

- Artwork, track title, and queue position form the left identity group.
- Previous, play or pause, next, Shuffle, Loop, elapsed time, total time, and the scrubber now occupy the centre of the desktop player.
- The play control, artwork, contrast, and timeline have stronger visual weight while preserving Song Room's existing palette.
- Mobile uses a separate identity row above the transport and timeline so no playback control is removed.
- Shuffle randomises the player queue while leaving the dashboard song order unchanged, and restores the original queue when switched off.
- Loop repeats the current song through the native audio loop behaviour.
- Core playback, ordinary queue progression, Media Session handling, and safe-area measurement remain on their existing paths.
- All 20 contract tests, TypeScript checking, focused lint, and the placeholder-environment production build passed. Existing repository lint warnings remain unchanged.

---

## 2026-08-14 - Keyboard-accessible primary controls

### What we were trying to achieve

Make important upload, navigation, artwork, and public-playlist actions operable without a mouse or touchscreen.

### Feature / change being made

First focused follow-up for `A11Y-001`, replacing confirmed pointer-only surfaces with native buttons while preserving their existing application handlers.

### Files changed

- `app/upload/page.tsx`
- `app/upload/upload.module.css`
- `app/playlists/[id]/page.tsx`
- `app/playlists/playlists.module.css`
- `app/dashboard/page.tsx`
- `app/dashboard/dashboard.module.css`
- `app/listen/playlist/[id]/page.tsx`
- `app/listen/playlist/[id]/listen-playlist.module.css`
- `tests/critical-contracts.test.mjs`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- The initial uploader, add-more control, per-song artwork picker, and playlist-cover picker now use native buttons that activate with Enter or Space and retain drag-and-drop where applicable.
- The dashboard Add song card and mini-player song identity now use native buttons without changing their existing routes.
- Public-playlist track rows now use native buttons, identify the current track, and announce each track's playlist position.
- Existing upload, playback, and navigation handlers are unchanged. Browser-default button styling is reset only on the converted controls.
- Contract coverage guards each converted surface. Modal focus management, compact touch targets, and normal-text contrast remain separate follow-ups.

---

## 2026-08-16 - Embeddable playlist player (Pro/Studio)

### What we were trying to achieve

Let Pro and Studio workspaces put a public playlist on their own websites, so a shared playlist can live inside a blog post, artist site, or press page rather than only behind a song-room.live link.

### Feature / change being made

New frameable `/embed/playlist/[id]` route rendering a self-contained, branded WaveSurfer player that reflows to its container width. Gated to Pro/Studio server-side; the manager share box now offers the copy-paste iframe snippet (or an upgrade prompt on Free).

### Files changed

- `next.config.js`
- `middleware.ts`
- `app/embed/playlist/[id]/page.tsx` (new)
- `app/embed/playlist/[id]/layout.tsx` (new)
- `app/embed/playlist/[id]/EmbedPlayer.tsx` (new)
- `app/embed/playlist/[id]/embed.module.css` (new)
- `app/api/playlists/[id]/route.ts`
- `app/playlists/[id]/page.tsx`
- `app/playlists/playlists.module.css`
- `UPDATE_LOG.md`
- `public-mvp-roadmap.md`

### Notes

- Framing: split the security headers so `/embed/*` omits `X-Frame-Options` and sends `Content-Security-Policy: frame-ancestors *`, making it embeddable on any site; every other route keeps `X-Frame-Options: DENY`. Verified in production (embed route 200 + CSP present + no XFO; `/dashboard` still 307 to login with XFO DENY).
- Middleware: `/embed/` added to the public bypass (mirrors `/listen/`) so third-party frames are not redirected to login.
- Gating is enforced server-side on the route (public + account plan at least pro), not just hidden in the UI, so the iframe URL cannot be hand-crafted to bypass it. Free/private playlists get a branded locked/unavailable card. Route is `noindex`.
- Manager: GET now returns the workspace plan; the Public share box shows the iframe copy block directly under the Copy-link row for Pro/Studio, or an "Embedding is a Pro feature" upgrade prompt (to `/settings/plan`) for Free.
- Default snippet is `width="100%" height="240"`; the player reflows via CSS container queries (drops thumbnails and footer link in narrow sidebars).
- Engine was ported faithfully from the `/listen` immersive player (destroy+recreate per track, desktop live Web Audio / mobile OfflineAudioContext precompute, Media Session) into a standalone `EmbedPlayer` rather than refactored into a shared hook, to avoid regressing the shipped player. Follow-up: extract a shared `usePlaylistPlayer` hook as the single source of truth.
- Verification: local `tsc --noEmit` clean, all 20 contract tests pass, focused lint 0 errors (2 pre-existing `<img>` warnings consistent with the listen player). Production build READY; Coris-confirmed the embed works end to end.

---

## 2026-08-17 - Dialog focus and semantics accessibility closeout

### What we were trying to achieve

Make every active dashboard, feedback, and song-version dialog usable without a pointer and announce its purpose clearly to assistive technology.

### Feature / change being made

Apply the existing shared dialog-focus lifecycle to the remaining overlays, complete their dialog labelling, and preserve the current visual design and application handlers.

### Files changed

- `app/dashboard/page.tsx`
- `app/songs/[id]/versions/[versionId]/page.tsx`
- `app/songs/[id]/versions/[versionId]/version.module.css`
- `components/BetaFeedback.tsx`
- `tests/critical-contracts.test.mjs`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- New-song, delete-song, accepted-invite, mobile song-sheet, Beta Feedback, public sharing, action editing, version upload, and version-picker overlays now receive initial focus, contain Tab and Shift+Tab, close with Escape when allowed, and return focus to their trigger.
- Dialog titles and descriptions are connected with `aria-labelledby` and `aria-describedby`; destructive deletion uses `alertdialog`.
- Upload progress is exposed as a progress bar, upload errors use an alert role, and the current version is exposed in the picker.
- Existing creation, deletion, sharing, upload, playback, and navigation behavior is unchanged.
- All 22 contract tests, TypeScript checking, focused lint, and the placeholder-environment production build passed. Focused lint reported zero errors and 18 existing warnings.
- A local Chromium check confirmed Feedback receives initial focus, wraps Tab and Shift+Tab, closes with Escape, returns focus to its trigger, and produces no browser console errors.
- On 19 August, Coris confirmed that the authenticated dashboard and song-page dialogs in the PR #18 preview contained forward and reverse Tab navigation, closed with Escape, and returned focus to their opening controls. Both Vercel deployment checks passed after the staging Supabase variables were made available to all Preview branches.

---

## 2026-08-19 - Readable red text and touch-target accessibility

### What we were trying to achieve

Close the remaining measured accessibility gaps without making Song Room's compact desktop interface feel oversized.

### Feature / change being made

Introduce a text-only readable red and give compact controls a minimum 44-pixel target on coarse-pointer devices. The darker brand red remains unchanged for CTA backgrounds and borders.

### Files changed

- `styles/globals.css`
- `app/dashboard/dashboard.module.css`
- `app/songs/[id]/versions/[versionId]/version.module.css`
- `app/upload/upload.module.css`
- `app/playlists/playlists.module.css`
- `app/settings/settings.module.css`
- `app/listen/[songId]/listen.module.css`
- `app/listen/playlist/[id]/listen-playlist.module.css`
- `app/embed/playlist/[id]/embed.module.css`
- `app/upgrade/upgrade.module.css`
- `app/privacy/page.tsx`
- `app/terms/page.tsx`
- `components/AccountMenu.module.css`
- `components/BetaFeedback.module.css`
- `tests/critical-contracts.test.mjs`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- `#ED4D3B` is reserved for small red text and icons. It measures from 5.37:1 on the darkest app background to 4.53:1 on the lightest audited dark surface.
- Mouse-oriented desktop sizing is unchanged. The larger hit areas apply only when the device reports a coarse pointer.
- Small visual toggles retain their current appearance inside larger real button targets.
- A source contract prevents the audited surfaces from returning to low-contrast `#C0392B` text and requires their coarse-pointer target rules.
- All 23 contract tests, TypeScript checking, focused lint, and the placeholder-environment production build passed. The build reported existing lint warnings only.
- Code is complete and deployed to the PR #19 preview. The user confirmed that all audited buttons worked on mobile without an interaction defect. Separate homepage layout observations found during that check are recorded in `PRODUCT_BACKLOG.md`.

---

## 2026-08-19 - Mobile homepage backlog capture

### What we were trying to achieve

Preserve the mobile homepage issues found while verifying the accessibility preview, without expanding the active accessibility change into a homepage redesign.

### Feature / change being made

Documentation-only backlog update covering delayed copy, bento image focal positioning, CTA reach and clipping, display-heading legibility, and an open mobile hero hierarchy exploration.

### Files changed

- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- Confirmed defects are separated from the proposed “Song Room” hero-animation direction, which still needs a visual comparison before implementation.
- No application code or current PR behavior changed.

---

## 2026-08-19 - Accessibility production closeout

### What we were trying to achieve

Bring the review record into line with the completed production rollouts before starting another implementation batch.

### Feature / change being made

Documentation-only closeout for playlist-cover hardening and the three accessibility follow-ups, with the remaining findings left clearly separated from completed work.

### Files changed

- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- PR #15 merged as `da9330ce`; PRs #17, #18, and #19 merged as `0401508c`, `923372a8`, and `800fc8dd`.
- Both Vercel production checks passed for PR #19. The live privacy and login routes returned `200`, unauthenticated dashboard access correctly redirected to login, and the live privacy response contained the readable-red production artifact.
- No application code, database schema, environment variables, or production configuration changed in this closeout.
- The clipped and difficult-to-reach mobile homepage CTA is now the highest-priority confirmed interface defect in `PRODUCT_BACKLOG.md`.

---

## 2026-08-19 - Mobile homepage CTA safe-area fix

### What we were trying to achieve

Keep the main homepage signup action visible and easy to reach on an iPhone without beginning the larger mobile hero redesign.

### Feature / change being made

Phone-only homepage layout correction that removes the duplicate top navigation CTA and keeps the existing hero CTA inside the usable viewport and iOS safe area.

### Files changed

- `public/marketing.html`
- `tests/critical-contracts.test.mjs`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- Desktop and tablet navigation remain unchanged; the phone rule also covers short landscape viewports.
- The phone hero now grows when its content needs more room instead of clipping inside a fixed `100vh` and 600-pixel minimum.
- The primary hero CTA remains “Start for free”, is centred in the lower action row, and has a 48-pixel minimum height.
- The separate “Song Room” hero-animation exploration is not part of this fix.

---

## 2026-08-20 - Immediate mobile homepage description

### What we were trying to achieve

Show the homepage explanation as soon as its mobile bento section renders instead of leaving an empty text panel during the staggered image entrance.

### Feature / change being made

Phone-only motion correction that keeps the core description visible from first paint while preserving the existing bento sequence for the remaining image cells.

### Files changed

- `public/marketing.html`
- `tests/critical-contracts.test.mjs`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The description cell was fourth in a 1.4-second JavaScript stagger, delaying the copy by roughly 4.5 seconds.
- Phone portrait and short wide layouts now bypass that parent-cell opacity delay.
- Reduced-motion users receive the same immediate copy.
- The larger mobile hero hierarchy and animation exploration remains separate.
- PR #22 preview verification passed on an iPhone: the description appeared immediately as expected.

---

## 2026-08-20 - Mobile bento lead-image composition

### What we were trying to achieve

Keep people recognisable when homepage bento images are cropped on phones without leaving excessive empty headroom.

### Feature / change being made

Phone-only composition that uses one larger, centre-cropped lead image with the explanatory copy over its lower portion, followed by four supporting image cells.

### Files changed

- `public/marketing.html`
- `tests/critical-contracts.test.mjs`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The first preview changed every phone image to top-centred framing. Real-device testing showed too much empty space above some subjects and left them visibly cut off.
- The revision restores centred framing and fixes the underlying constraint by making the text-bearing lead cell roughly half the phone viewport high.
- Both crossfade layers inherit the same centred crop, while desktop composition remains untouched.
- Hidden bento cells now skip crossfade preloading, avoiding needless mobile image transfers.
- The crowded mobile dashboard song filters were captured as a separate backlog item; no dashboard UI changed in this slice.
- The revised PR #23 preview was approved on an iPhone on 2026-08-21.

---

## 2026-08-21 - Compact mobile dashboard song filter

### What we were trying to achieve

Stop the dashboard song filters from occupying several rows before the song list on phones.

### Feature / change being made

Mobile-only toolbar adaptation that presents the existing song filters and counts in one native selector beside Sort and New song.

### Files changed

- `app/dashboard/page.tsx`
- `app/dashboard/dashboard.module.css`
- `tests/critical-contracts.test.mjs`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- Filtering logic and desktop filter pills are unchanged.
- The mobile selector uses the existing filter options and state, including needs-attention, assigned-to-me, and every song stage.
- Filter, Sort, and New song retain 44-pixel touch targets. On screens no wider than 340 pixels, the New song control keeps its accessible name while showing only the plus icon.
- PR #24 preview verification passed on 2026-08-21: the compact toolbar, every song-filter option, list and empty-state updates, Sort, New song, mobile overflow, and unchanged desktop filter pills all behaved as expected.

---

## 2026-08-21 - Clearer mobile homepage display headings

### What we were trying to achieve

Keep the condensed homepage headings bold and recognisable on phones without their heavy strokes crowding into a block.

### Feature / change being made

Phone-only display type treatment that uses Thunder Bold, a larger fluid scale, and more line separation while preserving the existing copy and desktop design.

### Files changed

- `public/marketing.html`
- `tests/critical-contracts.test.mjs`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The 393-pixel baseline rendered the problem heading at 64px in Thunder Black with a 47.36px line advance.
- The revised phone rule renders that heading at 86.46px in Thunder Bold with a 72.63px line advance. The display remains condensed and forceful, but the letters and lines are easier to distinguish.
- Supporting display headings use a smaller companion tier so feature and showcase sections do not become oversized.
- Local checks at 320, 393, 430, and 600 pixels found no horizontal page or heading overflow. Desktop typography is outside the new media rule.
- PR #25 preview verification passed on a real phone on 2026-08-21. The revised headings were clear, and no unwanted collision or section height was reported.

---

## 2026-08-21 - Pricing order and annual billing default

### What we were trying to achieve

Make the public pricing section read as a clear upgrade path on every screen and present the annual saving without requiring visitors to find the toggle first.

### Feature / change being made

Consistent Free, Pro, Studio ordering plus Annual as the initial billing period on the marketing homepage.

### Files changed

- `public/marketing.html`
- `tests/critical-contracts.test.mjs`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The pricing markup was already ordered Free, Pro, Studio. A mobile CSS rule moved the featured Pro card ahead of Free when the grid stacked.
- Removing that override preserves the expected upgrade sequence while the red treatment and “Most popular” badge continue to recommend Pro.
- Annual now begins active in the HTML and the controller, preventing a monthly-price flash before JavaScript runs. Pro begins at £7.17 per month with £86 billed yearly; Studio begins at £15.83 per month with £190 billed yearly.
- Monthly remains available from the same control and retains its original prices and billing notes.
- Revised PR #25 preview verification passed on a real phone on 2026-08-22. Plans appeared as Free, Pro, Studio; Annual was selected initially; and switching to Monthly and back restored the correct prices and billing states.

---

## 2026-08-22 - Mobile Song Room bento hero

### What we were trying to achieve

Make the phone homepage communicate people creating together while giving the Song Room name a clear, memorable position in the opening screen.

### Feature / change being made

Approved variation C of the mobile homepage hierarchy: the full collaborator bento remains, “Song Room” is drawn over the upper half of the lead image, and the former phone “Create Together” sign-off is removed.

### Files changed

- `public/marketing.html`
- `tests/critical-contracts.test.mjs`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The new phone wordmark reuses the real Thunder outline paths and letter timing already used by Song Room loading screens.
- The approved concise phone explanation stays attached to the lead image, all four supporting collaborator images are present from first paint, and the primary CTA remains in the lower safe-area region. The fuller desktop explanation is unchanged.
- The small phone navigation logo is hidden so the animated wordmark becomes the first clear brand statement.
- Reduced-motion users receive the completed outline immediately. Tablet and desktop hero artwork, layout, and navigation are unchanged.
- A narrow-phone adjustment keeps the wordmark clear of the explanation at 320 pixels without reducing the CTA targets.
- Local visual verification passed at 320, 393, and 430-pixel phone widths plus a 1440-pixel desktop width. Preview verification on a real iPhone is still required before rollout.
- Preview feedback tightened the hierarchy before merge: the visible top of the Song Room drawing now uses the same inset as its left edge, the explanation has a consistent measured gap below the wordmark instead of drifting with image height, and its heading is at least the same size as the supporting text.
- A final phone preview adjustment moves the complete explanation group 12 pixels lower while preserving the heading-to-body spacing and desktop composition.
- Follow-up phone feedback adds a separate 12-pixel breathing space above “What is The Song Room?” so the yellow heading no longer crowds the outlined wordmark.
- The final PR #26 preview passed verification on a real phone on 2026-08-22, including the wordmark inset, heading separation, supporting copy hierarchy, collaborator-image composition, and lower-page actions.

---

## 2026-08-22 - Mobile interface production closeout

### What we were trying to achieve

Bring the product backlog and staged review record into line with the completed mobile production rollouts before starting another technical batch.

### Feature / change being made

Documentation-only closeout for the mobile homepage CTA, immediate copy, bento composition, compact dashboard filter, heading and pricing treatment, and final Song Room hero hierarchy.

### Files changed

- `PRODUCT_BACKLOG.md`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- PRs #21 to #26 merged as `779501d5`, `d3237af0`, `ec006494`, `a3afc4b1`, `b056cdc9`, and `d5181516`.
- Both Vercel statuses succeeded for every merge. The affected phone flows passed real-device preview checks, and the final live homepage returned `200` with the approved Song Room wordmark and copy-spacing rules.
- No application code, database schema, environment variables, or production configuration changed in this closeout.
- No confirmed P1 finding remains from the staged review. TEST-001 is the recommended next focused batch, starting with a scoped behavioral browser and automated-accessibility test plan.

---

## 2026-08-22 - Public browser and accessibility regression suite

### What we were trying to achieve

Close the staged review's browser-testing gap with a small repeatable suite that doesn't need a real account or access to production data.

### Feature / change being made

Desktop and mobile Chromium checks for the public homepage, Google-only login, primary keyboard journeys, cookie consent persistence, reduced motion, phone-width overflow, and serious or critical automated accessibility regressions.

### Files changed

- `.github/workflows/browser-accessibility.yml`
- `.gitignore`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`
- `package.json`
- `package-lock.json`
- `playwright.config.mjs`
- `tests/browser/public-accessibility.spec.mjs`

### Notes

- The suite uses placeholder public Supabase values and never signs into an account, so pull-request runs can't mutate staging or production data.
- Axe found an existing serious contrast result on the homepage feature numbers and footer. Those exact selectors are a documented, removable baseline; every new serious or critical finding still fails CI.
- Failed GitHub Actions runs retain the Playwright report, screenshots, test results, and retry trace for seven days.
- The local visual check at 393 by 852 showed the complete approved mobile composition with no framework error overlay or browser console error.

### Production closeout

- PR #28 squash-merged into `clone-clean` as `0cc61bf6` on 2026-08-22.
- The browser-accessibility job and both Vercel preview checks passed before merge. Both production deployments passed afterward.
- The live homepage and Google-only login route returned `200`, and the workflow file is present on `clone-clean`.

---

## 2026-08-22 - Homepage contrast baseline removal

### What we were trying to achieve

Remove every known serious or critical homepage accessibility exception without flattening the approved dark editorial hierarchy.

### Feature / change being made

Colour-only contrast correction for the oversized feature numbers, footer wordmark, footer links, and copyright text, followed by removal of their temporary Axe baseline.

### Files changed

- `public/marketing.html`
- `tests/browser/public-accessibility.spec.mjs`
- `tests/critical-contracts.test.mjs`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- The 80-pixel feature numbers move from 1.13:1 to 3.50:1 using a muted red that remains secondary to the main headings.
- The small red footer wordmark now measures 4.90:1, while links and copyright text move from 4.42:1 to 4.61:1 with a minimal neutral shift.
- Layout, typography, content, animation, and interaction are unchanged.
- Desktop and mobile Chromium pass Axe with no serious or critical allowlist entries.
- Axe scans make only the existing scroll-reveal transition instantaneous, preventing machine speed from measuring text halfway through a 700ms opacity fade while keeping the final colour checks strict.
- PR #29 preview verification passed. The user confirmed the numbered feature treatment and footer look correct, with no visual issue reported.

### Production closeout

- PR #29 squash-merged into `clone-clean` as `d3d78f8c` on 2026-08-22.
- Both Vercel production deployments passed. The live homepage and login returned `200`, the expected readable colour tokens were present, and a live desktop Axe scan found no serious or critical violations.

---

## 2026-08-22 - Report-only Content Security Policy

### What we were trying to achieve

Start CONFIG-001 without risking a production outage by observing CSP violations before enforcing any new browser restriction.

### Feature / change being made

Route-aware `Content-Security-Policy-Report-Only` headers for the app and embeddable playlist player, plus a bounded same-origin report collector for sanitized Vercel runtime logging.

### Files changed

- `next.config.js`
- `app/api/csp-report/route.ts`
- `tests/critical-contracts.test.mjs`
- `tests/browser/public-accessibility.spec.mjs`
- `playwright.config.mjs`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Notes

- The policy reflects the browser sources currently used by Supabase auth and storage, Google Analytics, Google fonts and avatars, and GitHub-hosted marketing media.
- The header is report-only and cannot block page scripts, styles, images, audio, fonts, API traffic, authentication, or checkout navigation.
- Existing enforced framing remains unchanged: normal routes retain `X-Frame-Options: DENY`, while `/embed/*` remains intentionally frameable through its existing `frame-ancestors *` policy.
- `/api/csp-report` accepts the standard CSP and Reporting API content types, rejects bodies over 16 KB, processes at most 10 reports per request, strips query strings and hashes, and never logs policy text or script samples.
- Contract tests cover the standard and embed header variants plus report-input safeguards. The browser suite checks the real response header and valid/oversized report responses.
- Local verification passed: 32 contract tests, 7 browser checks across desktop and mobile Chromium with 3 expected project-specific skips, lint with no errors and 53 pre-existing warnings, the production build, and the production-dependency audit with zero known vulnerabilities. Preview observation and production rollout remain pending, and CSP enforcement is explicitly outside this change.
- Preview verification on 2026-08-23 passed Google sign-in, dashboard loading, song playback, upload, public sharing, and playlist embedding. The repeated `/_next/static/css/... was preloaded but not used` browser messages are non-blocking Next.js preload timing warnings and are unrelated to CSP.
- The report collector captured preview-only Vercel Toolbar sources at `https://vercel.live` and a real Google Tag Manager image beacon at `https://www.googletagmanager.com/a`. The toolbar is not part of Song Room and remains excluded; `img-src` now includes `https://www.googletagmanager.com` for the legitimate beacon.
- The observed preview requests returned only successful or redirect statuses in the available runtime window, with no 5xx status.
- Revised local verification passed all 32 contract tests and a complete optimized Next.js build using the same inert Supabase placeholders as public CI. The normal build command's first run stopped only because this restarted local workspace had no Supabase variables loaded.
- Revised preview deployment `dpl_E477RGjURnc6QbXdJuJceSGuVKVq` reached Ready and all PR checks passed. The landing page loaded after analytics consent, and deployment-specific runtime inspection found no CSP reports, error or fatal logs, or failed application requests.

---

## 2026-08-23 - Tier signup and upgrade journey assessment

### What we were trying to achieve

Turn the homepage pricing choices into distinct beta-ready signup journeys and decide where plan suggestions or automated emails can help without interrupting the core collaboration experience.

### Feature / change being made

Documentation-only product and technical specification for tier-aware Google signup, post-auth plan confirmation, contextual upgrade prompts, lifecycle-email boundaries, and funnel measurement.

### Files changed

- `TIER_SIGNUP_AND_UPGRADE_JOURNEY.md`
- `PRODUCT_BACKLOG.md`
- `public-mvp-roadmap.md`
- `UPDATE_LOG.md`

### Notes

- Current code confirms that all three homepage plan buttons point to `/login`, while the login callback carries only a restricted post-auth destination and `/upgrade` does not read the selected plan or annual homepage default.
- The recommended route contract uses one Google authentication system with separate Free, Pro, and Studio entry URLs. Paid users confirm the preselected choice before Stripe; workspace invites take priority and checkout stays owner-only.
- Existing limit prompts are the right starting point for in-product upgrades. Generic launch popups and promotional nurture are excluded from beta.
- The attached Flow and Apollo emails were treated only as reference material. Trial-expiry messaging is appropriate only for a real trial; pricing-abandonment email is deferred until Song Room has consent handling, durable events, deduplication, and evidence that the message is useful.
- No application code, database schema, environment variable, email automation, or production behaviour changed in this assessment.

---

## 2026-08-23 - Tier-aware signup and plan confirmation

### What we were trying to achieve

Keep a visitor's Free, Pro, or Studio choice from the homepage through Google account creation, then take them to the right first destination without sending anyone to Stripe automatically.

### Feature / change being made

Allowlisted tier entry routes, plan-aware Google login copy and redirect handling, owner-aware paid-plan confirmation, and checkout-return preservation.

### Files changed

- `lib/signupIntent.ts`
- `app/signup/[plan]/page.tsx`
- `middleware.ts`
- `app/login/page.tsx`
- `app/login/page.module.css`
- `app/upgrade/page.tsx`
- `app/upgrade/upgrade.module.css`
- `app/api/billing/checkout/route.ts`
- `public/marketing.html`
- `tests/critical-contracts.test.mjs`
- `tests/browser/public-accessibility.spec.mjs`
- `TIER_SIGNUP_AND_UPGRADE_JOURNEY.md`
- `PRODUCT_BACKLOG.md`
- `public-mvp-roadmap.md`
- `UPDATE_LOG.md`

### Notes

- Free, Pro, and Studio now have distinct homepage routes. The paid links follow the annual/monthly control, while the normal Sign in link remains neutral.
- One Google auth system remains canonical. Only allowlisted plan, billing, and checkout-cancellation destinations can cross the callback boundary, and a stored workspace invite wins over pricing intent.
- Paid selections open a confirmation screen with the exact plan and price. Workspace role and current plan come from `/api/auth/bootstrap`; only an owner of an eligible workspace can start the existing Stripe checkout route.
- Cancelling Stripe returns to the same selected plan and billing period. Middleware keeps that safe query through a fresh login if the session has expired.
- The newly exercised upgrade page also received readable small-print colours after Axe exposed existing serious contrast failures.
- Local contract, TypeScript, and desktop/mobile browser checks pass. Preview Google OAuth, real Stripe test checkout/cancellation, production rollout, and durable funnel storage remain pending.

---

## 2026-08-26 - Tier-aware signup Preview verification

### What we were trying to achieve

Validate the external Preview configuration and the owner paid-plan journey before deciding whether PR #31 is ready for production.

### Feature / change being made

Verification notes for the Vercel Preview Stripe Test separation, Google account handoff, all four paid-price mappings, and cancellation return.

### Files changed

- `PRODUCT_BACKLOG.md`
- `TIER_SIGNUP_AND_UPGRADE_JOURNEY.md`
- `public-mvp-roadmap.md`
- `UPDATE_LOG.md`

### Notes

- Preview now has its own Stripe Test secret and four test price IDs. The existing live prices and referral coupon are Production-only, and the Production webhook configuration was not changed.
- Refreshed Preview deployment `dpl_6WHLuBoKseuGXv5StTP8Y3Zt2TDj` reached Ready for commit `e63b768aa612878719be1656bf4dc9ba19535e0c` after the latest production base was merged. All PR checks passed and the merge state was clean.
- The real Google owner flow reached the selected Pro annual confirmation. Stripe Sandbox showed all four expected Preview prices: Pro at £9/month or £86/year and Studio at £19/month or £190/year.
- Cancelling Checkout returned to the same Preview selection and showed that the plan had not changed. This passed for the original Pro annual journey and the final Studio monthly check. Deployment-specific inspection found no error or fatal runtime logs during the test window.
- The real-device mobile Pro annual path passed, including the Preview return, selected price, Stripe Sandbox handoff, and cancellation return.
- No payment was submitted. Preview webhook delivery and the Production rollout remain pending.

## 2026-08-26 — SEO discoverability (robots + sitemap) + dependency scanning

### What we were trying to achieve

Work through a pre-launch checklist (SEO, security, UX) against the live build and close the concrete gaps. The site had no robots.txt, no sitemap.xml, and no automated dependency scanning.

### Feature / change being made

Added Next.js App Router `robots.ts` and `sitemap.ts` for crawler discoverability, and enabled Dependabot for dependency scanning. Logged the remaining checklist items to PRODUCT_BACKLOG.md.

### Files changed

- `app/robots.ts` (new)
- `app/sitemap.ts` (new)
- `PRODUCT_BACKLOG.md` (pre-launch checklist audit appended)
- `.github/dependabot.yml` (new — on the `main` default branch, as Dependabot requires)

### Notes

- Confirmed working: production deploy `dpl_iAQPNVMhkN3s48sTmPuPgSG3VFs1` (commit `aa86caa`) reached Ready; live at https://song-room.live/robots.txt and https://song-room.live/sitemap.xml.
- Output uses the non-www host because `NEXT_PUBLIC_APP_URL=https://song-room.live`; consistent with the marketing canonical.
- Dependabot config must live on the default branch, so it sits on `main` with `target-branch: clone-clean` (update PRs open against production). `sharp` is ignored to preserve the 0.32.6 pin required by Vercel.
- The npm-audit CI workflow (`.github/workflows/dependency-audit.yml`) was NOT committed — the PAT lacks the Workflows permission; it needs to be added manually in the GitHub UI.
- Secret rotation (Supabase service-role key, Resend key, GitHub PAT) is being handled separately.


## 2026-08-26 — Public /trust page (security & launch readiness)

### What we were trying to achieve

Give the security + discoverability showcase a permanent home on our own domain (rather than the GitHub Pages wireframe), so it can be linked and shown publicly — including in launch content.

### Feature / change being made

New public `/trust` route presenting the in-place security and SEO/discoverability measures as two checked-off sections. Public-safe: only genuine, implemented measures are shown — no gaps, keys, project IDs, or internal paths.

### Files changed

- `app/trust/page.tsx` (new — follows the `/privacy` + `/terms` self-contained page pattern: inline styles, sticky nav, ThunderLC title)
- `middleware.ts` (added `/trust` to `publicRoutes` so it renders unauthenticated)
- `app/sitemap.ts` (added `/trust`)

### Notes

- Confirmed working: production deploy `dpl_G3F56vGYy9oSyuWKhLsQ8i46Q1ew` (commit `a84d1e3`) reached Ready; live at https://www.song-room.live/trust (HTTP 200, unauthenticated), and present in the sitemap.
- Design mirrors the approved launch-readiness wireframe (straw-yellow check grid) inside the app's legal-page chrome.
- Content is a manual snapshot: when a new protection ships (e.g. signup bot protection), update the item lists + the "12/11" counts in `app/trust/page.tsx`.
- The original GitHub Pages version remains at `wireframes/Song Room Branding/launch-readiness-v1.html` as the design reference.

---

## 2026-08-27 - Stripe customer recovery before Checkout

### What we were trying to achieve

Restore paid-plan Checkout for workspaces whose saved Stripe customer ID belongs to an old or deleted Stripe account, as exposed by the PR #31 production smoke test.

### Feature / change being made

Validate an existing Stripe customer before creating a subscription Checkout Session. If Stripe confirms that the customer is missing or deleted, create a replacement under the currently configured Stripe account and save its ID to the same workspace before continuing.

### Files changed

- `app/api/billing/checkout/route.ts`
- `tests/critical-contracts.test.mjs`
- `UPDATE_LOG.md`

### Notes

- Valid Stripe customers continue through the existing Checkout path without being changed.
- Only a confirmed missing or deleted customer triggers replacement. Authentication, permissions, rate limits, and other Stripe failures still stop Checkout and surface through the existing error response.
- No Stripe object, Supabase record, environment variable, Preview deployment, or Production deployment was changed while preparing this local hotfix.
- Preview verification and production rollout remain pending.

---

## 2026-08-27 - Plan confirmation hierarchy

### What we were trying to achieve

Remove the conflicting double highlight shown after a user cancels Stripe Checkout and returns to a specific plan confirmation page.

### Feature / change being made

Reserve the strong card border and primary paid action for the selected plan during a plan-specific confirmation journey. Keep the Pro “Most popular” treatment on the normal comparison screen, where it remains useful.

### Files changed

- `app/upgrade/page.tsx`
- `tests/critical-contracts.test.mjs`
- `UPDATE_LOG.md`

### Notes

- A Studio confirmation now highlights Studio alone, hides the Pro promotional badge, and gives alternative plans quieter actions.
- A Pro confirmation behaves the same way in reverse.
- The general “Choose your plan” view still highlights Pro as the most popular option.
- The change is visual hierarchy only. Plan selection, prices, workspace permissions, and Stripe Checkout behaviour are unchanged.

---

## 2026-08-27 - Current-plan hierarchy and Settings return path

### What we were trying to achieve

Make the general plan comparison reflect the workspace's actual account state and keep users inside Plan & Billing when they cancel a Stripe Checkout that started there.

### Feature / change being made

Give the current workspace plan the strong comparison-card treatment and a “Your current plan” badge. Carry a strictly validated Settings return context through Checkout cancellation so the Back control returns to Plan & Billing instead of the dashboard.

### Files changed

- `app/settings/plan/page.tsx`
- `app/upgrade/page.tsx`
- `app/upgrade/upgrade.module.css`
- `app/api/billing/checkout/route.ts`
- `tests/critical-contracts.test.mjs`
- `UPDATE_LOG.md`

### Notes

- The current plan is now the only strongly highlighted card on the general comparison screen. Pro can retain a quieter “Most popular” recommendation without competing with workspace state.
- Plan-specific confirmation journeys still highlight only the selected plan.
- Only the exact `settings` return value is accepted by the Checkout route. Other values fall back to the existing dashboard return behaviour.
- No Stripe products, prices, customers, subscriptions, environment variables, or production settings were changed.

---

## 2026-08-28 — Dashboard background audio: reliable auto-advance + next-track preload

### What we were trying to achieve

The dashboard mini-player stopped advancing to the next track once the phone was locked or backgrounded — e.g. playing from the dashboard, pocketing the phone for a run, or handing off to a car. Playback reached the end of a track and stalled instead of moving on. In the car, the head-unit controls showed no "next" option, and after manually skipping the artwork and controls didn't refresh. Goal: make end-of-track auto-advance and the lock-screen / car (CarPlay / Android Auto) controls work reliably while the app is backgrounded, and preload the upcoming track so changeovers are smooth.

### Feature / change being made

Bug fix + enhancement to the dashboard `<audio>` playback engine. Track changes no longer wait on the network and now happen synchronously inside the `ended` / Media Session task, so they are permitted while the screen is locked. Added background whole-queue URL resolution at play time, single-next-track byte preloading via a hidden audio element, and Media Session `setPositionState` for lock-screen / CarPlay position and next/prev reliability.

### Files changed

- `app/dashboard/page.tsx`

### Notes

- Root cause: `onEnded → handlePlayerEnded` `await`ed a `/api/versions/[id]` fetch to resolve the next track's public URL *before* calling `play()`. A locked mobile tab freezes that fetch, and even when it resolves, a `play()` that lands after an `await` is blocked in the background — so playback died at the end of track 1 and the car's Media Session went stale (no next control, stale artwork).
- Fix: `hydrateUpcomingUrls()` resolves every upcoming track's URL in the background as soon as playback starts (public `getPublicUrl` URLs, no expiry, safe to resolve ahead of time). `startResolvedTrack()` / `moveToIndex()` perform a synchronous `src`-swap + `play()` when the URL is already resolved (the normal case); an async resolve is only used as a foreground fallback. `handlePlayerEnded` and `skipTrack` are now synchronous.
- Preload: exactly one next track's bytes are warmed via a hidden `<audio preload="auto">` element. Intentionally one track only — mobile browsers throttle byte-level preload on backgrounded elements, and buffering 2–3 tracks ahead wastes cellular data for tracks the listener may skip.
- Media Session: added `setPositionState` on `loadedmetadata` / `timeupdate` / `durationchange` for accurate lock-screen / CarPlay scrubbing and reliable next/prev. Background URL resolution runs silently (no `window.alert` on a locked phone).
- Deploy: production `dpl_7rY4dNcVkxsyaM1x9YbamMrUMG32` (commit `fd40abf`) reached Ready; passed the `npm test` prebuild gate and `npx tsc --noEmit`.
- **Verification status: VERIFIED (auto-advance).** Confirmed on a real mobile device on Wi-Fi, and in-car over cellular (2016 BMW X5 — Bluetooth only, no CarPlay/Android Auto): with the phone locked and off Wi-Fi, playback now rolls from one track to the next on its own. This was the original reported failure and it is resolved.
- **Known limitation (not a regression, not fixable from the web app):** On the iDrive head unit, rotating the controller / using the wheel to *browse the track list* shows only the currently-playing track, and selecting it replays that track. A web app cannot publish a browsable queue to the OS media session — the Web Media Session API only exposes the *current* track's metadata, so iOS/Android hand the car a single-item list. Native apps (e.g. Spotify) populate this via platform queue APIs that are unavailable to web pages. The car controls a web app *can* drive are play/pause and skip next/previous via AVRCP passthrough (`nexttrack` / `previoustrack` handlers). Dedicated skip-button behaviour on this specific head unit is still to be confirmed separately.

---

## 2026-08-28 - PR #40 plan journey Preview verification

### What we were trying to achieve

Confirm that Stripe customer recovery, plan-card hierarchy, and the Settings return path work together in the real Preview journey before production rollout.

### Feature / change being made

Verification-only closeout for the PR #40 Preview. No application behaviour was changed in this entry.

### Files changed

- `UPDATE_LOG.md`

### Notes

- The general plan comparison correctly highlighted the workspace's actual plan with the “Your current plan” badge while keeping the Pro recommendation visually quieter.
- Starting a Pro or Studio upgrade from Settings reached Stripe Test Checkout without the stale-customer error.
- Cancelling Checkout returned to the selected plan confirmation, where only that plan was highlighted.
- The confirmation page's Back control returned to Settings → Plan & Billing instead of the dashboard.
- No Stripe payment was submitted. Production rollout remains pending.

---

## 2026-08-28 - Mobile global navigation and priority mobile backlog

### What we were trying to achieve

Restore the authenticated destinations that disappeared when the desktop sidebar is hidden on mobile, and capture two beta-priority mobile usability gaps while they were fresh.

### Feature / change being made

Connect the existing accessible account-menu pattern to the mobile workspace header. The profile control now exposes Dashboard, Playlists, Settings, and Sign out without adding more permanent controls to the already tight header. Record the missing signed-out Login route and the proposed single Edit journey for mobile song management without implementing those separate changes yet.

### Files changed

- `components/AccountMenu.tsx`
- `components/AccountMenu.module.css`
- `components/WorkspaceSwitcher.tsx`
- `components/WorkspaceSwitcher.module.css`
- `tests/critical-contracts.test.mjs`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The workspace name remains the trigger for switching workspaces. The profile image or account initial is now the trigger for global account navigation.
- The menu preserves arrow-key navigation, Escape-to-close, visible focus, and coarse-pointer targets of at least 44 pixels.
- Desktop navigation, workspace switching, account permissions, song behaviour, and billing behaviour are unchanged.
- The two newly logged backlog items need their own scoped design and implementation work.

---

## 2026-08-28 - Preserve profile photos across the mobile app shell

### What we were trying to achieve

Keep the authenticated profile image visible after moving from the dashboard into Settings, Playlists, or Upload through the new mobile account menu.

### Feature / change being made

Carry the canonical avatar URL already returned by the Settings summary through `SettingsProvider` and into every Settings-backed `AppShell`. Record the separate mobile Settings section-navigation problem without changing that layout in this fix.

### Files changed

- `lib/settingsContext.tsx`
- `app/settings/layout.tsx`
- `app/playlists/layout.tsx`
- `app/upload/layout.tsx`
- `tests/critical-contracts.test.mjs`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- No extra profile request was added. Settings reuses `identity.avatarUrl` from its existing canonical summary response.
- The initial remains the fallback when an account genuinely has no profile image.
- Authentication, workspace switching, navigation destinations, permissions, and profile storage are unchanged.

---

## 2026-08-28 - PR #41 mobile navigation Preview verification

### What we were trying to achieve

Confirm on a real mobile viewport that the restored account navigation reaches Settings and keeps the authenticated profile image visible across the app shell.

### Feature / change being made

Verification-only closeout for the PR #41 Preview. No application behaviour changed in this entry.

### Files changed

- `UPDATE_LOG.md`

### Notes

- The mobile profile control displayed the new account menu correctly and opened Settings from the dashboard.
- The first Settings check exposed a missing profile photo because its provider discarded the canonical avatar URL; that regression was corrected in commit `a3a3511d` without adding another request.
- The refreshed Preview then showed the same real profile image in Settings as the dashboard.
- The wrapped Settings section navigation was captured separately as P2 beta polish. It was not changed in PR #41.
- All 35 contracts, TypeScript, the browser accessibility job, and both Vercel Preview deployments passed before this manual check.
- Production rollout remains pending.

---

## 2026-08-29 - Expose Login in the signed-out mobile homepage

### What we were trying to achieve

Give returning mobile users an immediately visible route into their existing account instead of making them hunt for a desktop-only Sign in link or reuse a signup route.

### Feature / change being made

Keep “Start for free” as the primary phone action and replace the phone-only “See how it works” action with a distinct “Log in” link. Larger screens keep their existing navigation and explainer action.

### Files changed

- `public/marketing.html`
- `tests/critical-contracts.test.mjs`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The Login action uses the existing `/login` route and a 44-pixel minimum touch target.
- Signup routing, Google authentication, desktop navigation, and the desktop “See how it works” link are unchanged.
- Preview verification passed on PR #42. Production rollout remains pending.

---

## 2026-08-29 - PR #42 mobile Login Preview verification

### What we were trying to achieve

Confirm on a real mobile viewport that returning signed-out users can immediately reach Login without weakening the Free signup journey.

### Feature / change being made

Verification-only closeout for the PR #42 Preview. No application behaviour changed in this entry.

### Files changed

- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- “Start for free” and “Log in” were both visible in the opening mobile view.
- “Log in” reached the existing account login journey.
- “Start for free” continued to open the Free signup journey.
- Preview verification passed. Production rollout remains pending.

---

## 2026-08-29 - Consolidate mobile song management into one Edit sheet

### What we were trying to achieve

Remove the four competing management icons from every compact mobile song row while keeping every existing song-management capability easy to reach.

### Feature / change being made

Show one accessible pencil control on mobile and use the existing full-screen song sheet as the single place to rename a song, change its cover image, update its stage, inspect activity, open it, or start the confirmed deletion flow. Keep the existing desktop controls unchanged.

### Files changed

- `app/dashboard/page.tsx`
- `app/dashboard/dashboard.module.css`
- `tests/critical-contracts.test.mjs`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The song artwork and row remain the primary route into the song; Edit is not the only navigation path.
- Title and cover changes reuse the existing APIs and upload validation.
- Delete remains owner-only and still requires the existing confirmation dialog.
- The Edit control and sheet actions use touch targets of at least 44 pixels. The sheet is keyboard-labelled, focus-trapped, Escape-dismissible, and scrollable on short screens.
- Preview and production verification remain pending.

---

## 2026-08-29 - Refine the PR #43 mobile Edit sheet hierarchy

### What we were trying to achieve

Keep the sheet's primary Open song action immediately visible on taller phones, prevent the global Feedback control from covering it, and move destructive deletion away from routine editing controls.

### Feature / change being made

Place a 90%-opaque Open song button over the lower part of the artwork, move the owner-only Delete song action into a visually separated danger area at the end of the sheet, and raise the modal sheet above page-level floating controls. Capture a separate future reduction of the global Feedback button without changing that component in this slice.

### Files changed

- `app/dashboard/page.tsx`
- `app/dashboard/dashboard.module.css`
- `tests/critical-contracts.test.mjs`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- Tapping elsewhere on the artwork still closes the sheet; the overlaid action stops propagation and opens the song.
- Delete remains owner-only and still enters the existing confirmation flow.
- The refined PR #43 Preview passed its real-device mobile check. The final copy polish removes the redundant visible “Danger zone” heading while retaining the consequence text and right-aligned Delete song action; a refreshed Preview visual check remains pending.
- The compact bug-icon treatment for Feedback is backlog-only.

---

## 2026-08-29 - PR #43 mobile Edit sheet Preview verification

### What we were trying to achieve

Confirm on a real mobile device that the consolidated song-management sheet is clearer, keeps its primary action visible, and separates destructive deletion from routine editing.

### Feature / change being made

Verification-only closeout for the PR #43 Preview. No application behaviour changed in this entry.

### Files changed

- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The single Edit button passed and was judged substantially clearer than the former four-icon row.
- Open song remained visible over the artwork, the editing controls worked, and the global Feedback control no longer covered sheet actions.
- Delete song remained at the end of the sheet, retained its consequence text and confirmation flow, and no longer displayed the redundant “Danger zone” heading.
- All 36 contracts, TypeScript, the browser accessibility job, and both Vercel Preview deployments passed.
- PR #43 is clean and mergeable against `clone-clean`. Production remains unchanged pending explicit merge authority.

---

## 2026-08-30 - Compact the mobile Settings navigation

### What we were trying to achieve

Replace the large wrapping grid of Settings links on phones with a clearer section switcher that uses less vertical space.

### Feature / change being made

Show one labelled native section selector on mobile, keep its options restricted by the existing owner permissions, and preserve the current desktop Settings sidebar without introducing a second navigation data source.

### Files changed

- `app/settings/layout.tsx`
- `app/settings/settings.module.css`
- `tests/critical-contracts.test.mjs`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The selector shows the active Settings section and routes through the existing Next.js navigation path.
- Its native interaction, visible label, focus ring, and 44-pixel minimum height cover touch and keyboard use.
- Preview and real-device verification remain pending.

---

## 2026-08-30 - Remove the collapsed edit-sheet rail from the mobile player

### What we were trying to achieve

Remove the stray one-pixel rule that appeared across the mobile playback controls and made the player look visually split.

### Feature / change being made

Hide the collapsed song edit sheet's top border while the mini-player is open. The sheet keeps its divider when it is actually visible, and the mini-player returns to its existing translucent treatment.

### Files changed

- `app/dashboard/dashboard.module.css`
- `tests/critical-contracts.test.mjs`
- `UPDATE_LOG.md`

### Notes

- Rendered DOM inspection identified the exact one-pixel element as `.bottomSheetWithPlayer`, whose collapsed top border was left 76 pixels above the viewport edge behind the player controls.
- Making only the border colour transparent did not work because the sheet's opaque background still painted underneath the transparent border box. The collapsed state now removes the border width entirely.
- The two earlier player-surface changes were reverted because the player itself was not painting the line.
- Playback state, queue behaviour, transport layout, safe-area spacing, and player stacking are unchanged.
- Corrected Preview passed all automated checks and was verified on an iPhone 17 Pro Max and in Chrome's mobile emulator. The unwanted rule is gone and the transport controls continue to work normally.

---

## 2026-09-01 - Return complete referral links in every environment

### What we were trying to achieve

Fix referral links that appeared as a relative path such as `/r/TSR-GNPKT` when the optional public app URL variable was absent.

### Feature / change being made

Build referral links from the authenticated API request origin so Preview links point to the current Preview and production links point to the live site.

### Files changed

- `app/api/referrals/code/route.ts`
- `app/api/referrals/summary/route.ts`
- `app/r/[code]/route.ts`
- `tests/critical-contracts.test.mjs`
- `UPDATE_LOG.md`

### Notes

- The referral code and reward logic are unchanged.
- Both referral endpoints now follow the request-origin pattern already used by workspace invites and Stripe return URLs.
- The referral entry route now redirects with an absolute URL from the same request origin. This fixes the Vercel runtime error raised by its former relative `/?ref=...` redirect.
- Preview verification passed. The Settings field displayed the complete Preview URL, copying it preserved the full address, and opening the referral route redirected successfully instead of returning HTTP 500.

---

## 2026-09-01 - PR #44 Preview verification

### What we were trying to achieve

Confirm the compact mobile Settings navigation and the corrected referral journey together before merging PR #44.

### Feature / change being made

Verification-only closeout for the PR #44 Preview. No additional application behaviour changed in this entry.

### Files changed

- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The mobile Settings section selector passed and replaced the former wrapping link grid.
- The desktop Settings sidebar remained unchanged.
- The authenticated Settings header displayed the user's profile image correctly.
- Referral fields returned complete environment-specific URLs, and opening the copied Preview link completed the referral redirect without an HTTP 500 response.
- All GitHub checks and both Vercel Preview deployments passed. Production remains unchanged pending the approved squash merge.

---

## 2026-09-02 - Start the consolidated commenting workspace

### What we were trying to achieve

Turn waveform seeking back into an effortless listening action and move timestamped collaboration into a dedicated responsive comments workspace.

### Feature / change being made

Record the approved user journey, responsive behaviour, accessibility requirements, data boundaries, failure handling, acceptance criteria, and rollback plan before changing the authenticated version page. Close the already-verified PR #44 rollout record at the same time.

### Files changed

- `COMMENTING_WORKFLOW_REDESIGN.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- PR #44 squash-merged as `2fb7cd8e`; the `song-review-app-v2` production deployment completed successfully.
- The live homepage returned 200, protected Settings redirected to the allowlisted login destination, and the live referral entry redirected without an HTTP 500 response.
- The commenting change is confined to the authenticated version review experience and should reuse the current thread APIs and canonical server data.
- No database migration, storage change, billing change, new dependency, or external configuration is planned.

---

## 2026-09-02 - Build the consolidated commenting workspace and compact Feedback control

### What we were trying to achieve

Make waveform seeking quick and interruption-free, give timestamped conversations a stable review surface, and replace the oversized floating Feedback button with a discreet bug control.

### Feature / change being made

Separate waveform seeking from comment creation, move existing threads and replies into one responsive comments workspace, preserve comment-linked actions and deep links, and keep unfinished drafts recoverable during failures and guarded during navigation.

### Files changed

- `app/songs/[id]/versions/[versionId]/VersionCommentsPanel.tsx`
- `app/songs/[id]/versions/[versionId]/page.tsx`
- `app/songs/[id]/versions/[versionId]/version.module.css`
- `components/BetaFeedback.tsx`
- `components/BetaFeedback.module.css`
- `tests/critical-contracts.test.mjs`
- `COMMENTING_WORKFLOW_REDESIGN.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- Empty waveform taps and clicks now seek only. Keyboard users can seek in five-second steps with the arrow keys, jump with Home and End, and hear the current slider value.
- `Add comment at {time}` pauses playback, captures the playhead time, and opens the same comments component as a fixed desktop rail, compact side drawer, or phone sheet.
- Existing markers open the matching conversation. A new comment within two seconds of an existing thread offers Reply or Start separate comment rather than merging silently.
- Existing thread, reply, action, notification, deep-link, version, and workspace data paths remain unchanged.
- Failed posts retain their draft and timestamp. Leaving or changing version with a draft asks before discarding it.
- The Feedback form is unchanged, but its large labelled trigger is now a 44-pixel bug icon with an accessible name and expanded state.
- Marketing copy now describes free waveform seeking followed by an explicit timestamped comment action, matching the shipped interaction.
- `npm test`, TypeScript checking, focused ESLint, and the Next.js compile/type phase pass. The local full build reaches page-data collection and then stops because local Supabase variables are intentionally absent; Preview will provide the environment-backed production build check.
- No migration, new dependency, external configuration, or production change is included.
- Draft PR #46 is open against `clone-clean`, and the `song-review-app-v2` Preview completed its environment-backed build successfully.
- Automated browser accessibility, Preview deployment, and Vercel checks all pass.
- Preview routing sends a signed-out `/dashboard` visit to `/login?redirectTo=%2Fdashboard`, preserving the intended destination.
- The Preview renders the Feedback trigger as a 44 by 44 pixel accessible control. Its dialog opens, reports its expanded state, closes with Escape, and restores focus to the trigger.
- The Preview homepage now shows the corrected seek-first commenting copy.
- Authenticated song review behaviour still requires the approved consolidated manual test deck before PR #46 can leave draft or merge.

---

## 2026-09-02 - Refine the PR #46 commenting experience after device testing

### What we were trying to achieve

Remove crowding from the desktop comments header, make new comments feel immediate, and restore the shared beta and Feedback controls on the mobile song page.

### Feature / change being made

Reflow the narrow comments header into two rows, render thread and reply submissions optimistically while the canonical server request completes, and reserve the measured mobile navigation height for global floating controls.

### Files changed

- `app/songs/[id]/versions/[versionId]/VersionCommentsPanel.tsx`
- `app/songs/[id]/versions/[versionId]/page.tsx`
- `app/songs/[id]/versions/[versionId]/version.module.css`
- `tests/critical-contracts.test.mjs`
- `UPDATE_LOG.md`

### Notes

- New threads and replies now appear in the conversation immediately with a quiet `Sending…` state. The canonical APIs and database remain authoritative.
- Successful requests replace the temporary record and revalidate threads in the background. Failed requests remove the temporary record, restore the exact draft, and keep the existing error recovery path.
- The timestamp, thread actions, and All comments control now occupy a structured two-row header rather than competing for one narrow line.
- The version page now renders the shared beta banner used elsewhere in the authenticated app.
- The mobile bottom navigation publishes its measured height through `--tsr-player-safe-area`, keeping the global Feedback trigger visible above it across device safe areas.
- No API contract, database schema, storage, billing, dependency, or production configuration changed.

---

## 2026-09-02 - PR #46 consolidated Preview verification passed

### What we were trying to achieve

Close the approved desktop and real-device mobile test deck before requesting authority to merge the commenting workspace into production.

### Feature / change being made

Verification-only closeout for the PR #46 Preview. No application behaviour changed in this entry.

### Files changed

- `COMMENTING_WORKFLOW_REDESIGN.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- Waveform seeking remained independent from comment creation on desktop and mobile.
- The desktop comments rail, compact drawer, phone sheet, markers, replies, nearby-thread choice, Mark as action, deep links, and draft guard passed.
- The refined thread header no longer overlaps its timestamp or crowds the All comments control.
- Optimistic new comments and replies appeared immediately, then reconciled with the canonical server response without duplication.
- The mobile beta banner and compact Feedback control remained visible without covering the fixed navigation or song controls.
- All repository, browser accessibility, and Vercel Preview checks passed on commit `981bcb65`.
- PR #46 remains a draft and production is unchanged pending explicit merge approval.

---

## 2026-09-02 - PR #46 production closeout

### What we were trying to achieve

Close the consolidated commenting and compact Feedback rollout after the approved merge and confirm that the live deployment remained healthy.

### Feature / change being made

Verification-only production closeout for PR #46. No application behaviour changed in this entry.

### Files changed

- `COMMENTING_WORKFLOW_REDESIGN.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- PR #46 squash-merged into `clone-clean` as `0c78ae81`.
- Production deployment `dpl_3ENYccxC1rxauqmi5KkzRt1EWXYo` reached Ready and serves both live Song Room domains.
- The live homepage and login returned 200, the protected dashboard retained its allowlisted login redirect, and the homepage contained the corrected seek-first review copy.
- The initial production runtime error scan returned no errors.
- No migration, external configuration change, or irreversible rollout step was involved.
- Rollback remains a revert of `0c78ae81` or restoration of the preceding Vercel production deployment.

---

## 2026-09-02 - Prepare CSP enforcement candidate

### What we were trying to achieve

Move the tuned Content Security Policy from observation to browser enforcement without changing its known-good source allowlist or the embeddable playlist framing contract.

### Feature / change being made

Replace the route-aware `Content-Security-Policy-Report-Only` header with `Content-Security-Policy`, while keeping the sanitized same-origin report collector and `Reporting-Endpoints` header active for blocked-request monitoring.

### Files changed

- `next.config.js`
- `tests/critical-contracts.test.mjs`
- `tests/browser/public-accessibility.spec.mjs`
- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The available seven-day Vercel production log window contains no CSP warnings or reports.
- A fresh production crawl covered the homepage with analytics consent, login, privacy, terms, trust, blog pages, an invalid invite, a public-listen error state, and an embed error state. No `securitypolicyviolation` events or CSP console errors were observed.
- A source diff from PR #30 found no new third-party browser origin. Supabase, Google Analytics, Google fonts and avatars, and GitHub-hosted media remain covered by the existing policy.
- Normal routes still enforce `frame-ancestors 'none'` and `X-Frame-Options: DENY`. Embed routes still omit `X-Frame-Options` and enforce `frame-ancestors *` as part of the full policy.
- All 39 contract tests, TypeScript, focused ESLint, 13 applicable browser checks across desktop and mobile Chromium, and the optimized Next.js production build pass. The build retains its pre-existing lint warnings.
- Code is local only. Preview deployment and authenticated verification remain pending explicit Git/GitHub authority. Production remains on the report-only policy.
- Roll back the candidate by reverting the focused header commit. After production rollout, the preceding production deployment remains the immediate operational rollback.

---

## 2026-09-02 - PR #47 enforced CSP Preview verification passed

### What we were trying to achieve

Close the authenticated browser and console release gate before moving the tuned Content Security Policy from report-only observation into production enforcement.

### Feature / change being made

Verification-only closeout for the PR #47 Preview. No application behaviour or allowlist source changed in this entry.

### Files changed

- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- Draft PR #47 and both Vercel Preview checks passed on commit `caf49abe`.
- Primary deployment `dpl_FD6sxrB2nhWKoi5cMk5X9r4o27G4` reached Ready and served the enforced header against the staging Supabase origin.
- Standard routes retained `frame-ancestors 'none'` and `X-Frame-Options: DENY`; the embed route retained the complete enforced policy with `frame-ancestors *` and no `X-Frame-Options` header.
- The signed-out dashboard redirect, report collector, Google sign-in, authenticated dashboard, playback, song review, comments, actions, Plan and Billing journey, and Stripe Test Checkout cancellation path passed.
- The Preview runtime error scan was clean. A deliberate synthetic violation returned 204 and was the only CSP report in the inspected window.
- The browser console showed Vercel's Preview-only injected Toolbar script being blocked from `https://vercel.live`. This is not Song Room application code and remains intentionally excluded rather than widening the production policy for optional Preview tooling.
- `content.js`, `about:blank`, Chrome runtime messaging, and `Grammarly-check.js` messages were browser-extension activity and did not affect the tested journeys.
- No migration, dependency, environment variable, or irreversible rollout step is involved. Production remains on report-only until PR #47 merges and its production deployment is verified.

---

## 2026-09-03 - PR #47 production closeout

### What we were trying to achieve

Finish the approved CSP rollout and verify that enforcement did not block a real Song Room resource or change the embed framing contract.

### Feature / change being made

Verification-only production closeout for PR #47. No application behaviour or allowlist source changed in this entry.

### Files changed

- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- PR #47 squash-merged into `clone-clean` as `7e4faacd0c7ccd1ef35b700f53ecd7ef4399db16`.
- Primary production deployment `dpl_Fw7k7gH1UrK9Z18EtHJKpi3BsLst` and secondary deployment `dpl_85UaWqDEFCEmxUGmhVM2QbNL6EMB` reached Ready.
- The live homepage and login returned 200, and the signed-out dashboard retained `/login?redirectTo=%2Fdashboard`.
- Standard responses contain `Content-Security-Policy`, not `Content-Security-Policy-Report-Only`, with the production Supabase origin, `frame-ancestors 'none'`, and `X-Frame-Options: DENY`.
- The embed response retains the complete enforced policy with `frame-ancestors *` and no `X-Frame-Options` header.
- The production runtime scan found no application error, 5xx response, genuine blocked Song Room resource, or CSP report. Vercel's injected Preview Toolbar warning did not apply to production application code.
- Rollback is a revert of `7e4faacd` or restoration of primary deployment `dpl_3ENYccxC1rxauqmi5KkzRt1EWXYo`, the preceding `clone-clean` production baseline at `0c78ae81`.

---

## 2026-09-03 - Harden signed audio uploads before beta

### What we were trying to achieve

Close the remaining audio-upload validation gap before beta without changing authentication, plans, storage accounting, or the supported audio formats.

### Feature / change being made

Bind file extensions to accepted MIME types before allocating a signed upload, store one canonical Content-Type, verify actual size and a bounded audio/container signature before finalization, and add matching Supabase Storage bucket restrictions.

### Files changed

- `lib/audioUploadPolicy.mjs`
- `app/api/versions/create/route.ts`
- `app/api/versions/[versionId]/finalize/route.ts`
- `app/upload/page.tsx`
- `app/songs/[id]/upload/page.tsx`
- `app/songs/[id]/versions/[versionId]/page.tsx`
- `supabase/migrations/20260903163658_audio_upload_bucket_restrictions.sql`
- `tests/critical-contracts.test.mjs`
- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- Read-only checks confirmed that `song-files.file_size_limit` and `song-files.allowed_mime_types` are currently unset in staging and production.
- MP3, WAV, M4A, AAC, FLAC, OGG, AIF, and AIFF keep their existing 200 MB product limit. Browser MIME aliases are accepted, while the upload request uses the extension's canonical audio type.
- Empty, oversized, unsupported-extension, and extension/MIME mismatch requests are rejected before a signed URL is issued. Invalid JSON now returns 400 instead of falling into the generic 500 response.
- Finalization checks the stored object's actual size, path extension, canonical-compatible MIME metadata, and at most 64 KB of format-identifying bytes. Failed stored-object validation removes the object and pending version through the existing cleanup path.
- A temporary Storage inspection failure returns retryable 409 and leaves the pending object intact, matching the existing client retry behaviour.
- The migration adds a 200 MB `song-files` bucket cap and an allowlist covering the accepted canonical and browser MIME values. It has not been applied to staging or production.
- All 41 contract tests, TypeScript, focused ESLint with no errors, and the optimized Next.js production build pass. Existing repository lint warnings remain.
- Code is local only on `codex/audio-upload-hardening`. No migration, Preview deployment, commit, push, pull request, or production change has been made.
- Rollout should apply the migration to staging first, deploy a Preview, then test representative valid formats plus empty, oversized, mismatched, and renamed non-audio files. Stop before production if a supported real audio file is rejected or an invalid object finalizes.
- Rollback is an application revert plus a forward bucket update restoring `file_size_limit` and `allowed_mime_types` to `NULL`; existing stored audio objects are not rewritten or deleted by this migration.

---

## 2026-09-04 - Verify audio upload hardening on staging

### What we were trying to achieve

Prove that the shared upload policy and Storage bucket restrictions accept supported audio while stopping empty, oversized, unsupported, and disguised files before any production rollout.

### Feature / change being made

Staging migration and authenticated Preview verification for the beta audio-upload hardening candidate.

### Files changed

- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- Commit `7a79faaf4955bc9214b874dd60f743afaf67ce5a` is pushed on `codex/audio-upload-hardening`. No pull request has been opened.
- Migration `20260903163658_audio_upload_bucket_restrictions.sql` is applied to staging project `ivifkrtupqizyqqsxdty` only. The staging `song-files` bucket now has a 209,715,200-byte cap and the intended accepted MIME list. Production is unchanged.
- Primary Preview deployment `dpl_8FB7HadGRBZqKxa1MP1vRLvLKT6F` and secondary deployment `dpl_Bxzdy8mYCH83q4kS6Fad7vZMaSuz` reached Ready. Both Vercel commit statuses and the GitHub Preview Comments check passed.
- Authenticated uploads finalized successfully for MP3, WAV, and M4A fixtures. Empty, 201 MB, and unsupported `.txt` fixtures were stopped in the client with specific messages.
- A renamed non-audio `.mp3` reached the signed-upload boundary but failed the server signature check with 400. The existing cleanup request removed its pending version and storage object; read-only staging checks found only the three valid finalized fixtures.
- The primary deployment's 250-entry runtime sample contained no 5xx response or error-level event. Browser console checks found no application error. Known Vercel Preview Toolbar CSP reports remain unrelated to Song Room resources.
- Rollback before production is an application revert plus a forward bucket update restoring the staging `file_size_limit` and `allowed_mime_types` values to `NULL`. The migration does not rewrite or delete existing audio.
- The three valid fixtures remain on the shared staging test song as explicit verification evidence. Removing them is a separate destructive cleanup action.

---

## 2026-09-07 - Open audio upload hardening draft PR

### What we were trying to achieve

Put the staging-verified audio upload restrictions into a focused review against the real production branch without changing production.

### Feature / change being made

GitHub review handoff for the beta audio-upload hardening candidate.

### Files changed

- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- Draft PR #48 is open from `codex/audio-upload-hardening` into `clone-clean` and GitHub reports it mergeable.
- Both Vercel checks, Preview Comments, and the public browser and accessibility suite passed on the reviewed implementation and staging-verification tree.
- The pull request records the migration-first production order, stop conditions, and forward bucket rollback.
- Production remains on `clone-clean` commit `7e4faacd`; the production Supabase bucket and live deployments are unchanged.

---

## 2026-09-07 - Recover stalled signed audio upload responses

### What we were trying to achieve

Keep a fully transferred audio file from leaving the interface and pending version stuck forever when Storage persists the object but does not finish its PUT response.

### Feature / change being made

Shared post-transfer response recovery for all three signed audio upload journeys.

### Files changed

- `lib/signedAudioUpload.mjs`
- `app/api/versions/[versionId]/finalize/route.ts`
- `app/upload/page.tsx`
- `app/songs/[id]/upload/page.tsx`
- `app/songs/[id]/versions/[versionId]/page.tsx`
- `tests/critical-contracts.test.mjs`
- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- PR #48 merged as `6f655f23` after production migration `20260903163658` was applied and verified. Primary deployment `dpl_3sL1SuU2q7LvzENQ4Li9JWmaBSzQ` reached Ready.
- The live 201 MB rejection and renamed non-audio signature rejection passed. The invalid pending upload and object were removed, and the runtime scan remained clear of 5xx and error-level events.
- A valid AIFF uploaded all 475,278 bytes and appeared in Storage with canonical `audio/aiff` metadata, but the browser's PUT never emitted completion or error. No finalization request followed, leaving the version pending and the interface at 100%.
- Draft PR #50 opened against `clone-clean` at commit `687e7c9a`. All GitHub and Vercel checks passed, and primary Preview deployment `dpl_G2wv7TvFteAdrSBrZooXNcX2cXqz` reached Ready.
- A clean authenticated Preview upload of the 475,278-byte `preview-recovery-check.aiff` fixture reproduced the stall. `/api/versions/create` returned 201 and the interface showed 100%, but no finalization request followed after 17 seconds.
- Rounded completion without an exact byte-count event was the first working hypothesis. The next Preview build used the displayed percentage but the valid AIFF again remained at 100% after 17 seconds. Repeated progress resetting the timer was a second hypothesis; neither was captured in event telemetry.
- The shared uploader now arms its 15-second response timer once on the first displayed 100% event. Later progress events cannot postpone recovery indefinitely.
- If the Storage response remains open after that timer, the client proceeds to the server finalizer, which still proves object presence, actual size, MIME, and file signature before committing the version.
- Normal 2xx completion, non-2xx rejection, network errors, progress reporting, cleanup, and final verification retain their existing behaviour.
- On 17 September, candidate `c3e0f2e9` also reproduced the stall on Ready Preview `dpl_B6wGmjj1J32y8EAAgNmNhWmrPhtD`. The verified 475,278-byte AIFF was selected in Chrome, allocation returned 201, and no finalization request appeared despite the visible 100% state. The loaded page asset was `page-dbca185b7d8cb777.js`; all four PR checks passed.
- Added opt-in `?uploadDebug=1` console diagnostics to identify whether the shared uploader starts its grace timer, fires it, or receives a Storage response or error. Diagnostics include only fixed event names, elapsed time, byte counts, and HTTP status, never signed URLs, tokens, filenames, or file content. Recovery behaviour is unchanged by this diagnostic slice.
- Preview `dpl_A8JyLAgUmUphDvZJuqdwbo1C8Xi1` reached Ready with all checks passing. The diagnostic AIFF test produced four uploader events within 600ms, but the browser connector rendered their object payloads only as `Object`. Diagnostics now use serialized JSON and the review-page finalizer records request/response boundaries. This avoids mistaking an unfinished runtime-log entry for proof that a request was never sent.
- Ready Preview `dpl_BBP3HxbWRkJ5QAHrWG5dL4z72MW7` at `f98deed0` provided readable evidence: Storage returned 200 after 923ms and `finalize_requested` followed immediately. The interface remained at 100% without a finalizer response. For this test, the broken boundary is finalization, not direct upload completion. Added Preview-only, explicitly requested server stage markers to identify which finalizer operation is pending; markers contain only fixed stage names and elapsed time. Production tracing remains disabled.
- Candidate `38117657` passed all four PR checks and primary Preview `dpl_4X7qCnDCzfy6QCKMLuze9EUesKu4` reached Ready. Storage returned 200 after 603ms. The finalizer's last server marker was `signature_fetch_started` at 1,734ms, with no download headers or client response afterward. A staging-only read confirmed version `e70940cb-6ba2-401a-8e52-6591a41d0547` is unfinalized and its object has the correct 475,278-byte size and `audio/aiff` metadata. Staging reports `ACTIVE_HEALTHY`; an existing public M4A range GET returned 206 and 64 bytes in 1.18 seconds from the local terminal. Underlying signed-download failure remains undiagnosed. Local contracts (43/43), TypeScript, and focused lint passed; the review page retains its existing five lint warnings. No signature check was bypassed or pending test data deleted. Rollout stays paused while the signed range GET is investigated.
- Continued signed-download investigation with a Preview-only native HTTPS comparison, enabled only by the existing explicit upload-debug header. It reads at most the requested signature prefix and destroys the request after ten seconds. Only numeric status/byte counts or fixed error categories are recorded; the signed URL, token, filename, and file content stay unlogged. The normal fetch and authoritative signature validation still run afterward. This distinguishes a signed-endpoint failure from the framework fetch transport without changing production behaviour.
- The pending production AIFF version and object remain untouched until explicit cleanup approval. PR #50 remains draft; production is unchanged and its upload closeout is not complete.

### 2026-09-17 - Correct the finalizer diagnosis and bound signature-read lifetime

- Full invocation logs supersede the earlier CLI log summaries: the signed GET DID return headers. On `856c31fe`, native HTTPS received 206 and 65,536 bytes, followed by framework fetch headers and `signature_body_started`; the body read never finished and Preview requests timed out with 504 after 300 seconds. Earlier claims of missing headers were incorrect.
- The installed Next.js fetch wrapper tees responses for deduplication. Cancelling one branch can wait for the unconsumed cached branch. A regression using Next's own `cloneResponse` reproduces that wait when the source remains open.
- Moved bounded signature reading into `lib/audioSignatureRead.mjs`. The request now carries an explicit abort signal, which opts out of Next response deduplication, has a ten-second read deadline, and aborts its owned transport on completion. Body cleanup is initiated without awaiting a tee cancellation promise.
- Removed the temporary native HTTPS comparison. Signed delivery, the 64 KiB prefix cap, membership checks, metadata restrictions, signature validation, quota accounting, and finalization RPC remain intact.
- Changed files: the finalizer route, new signature reader, `tests/audio-signature-read.test.mjs`, contract tests, and the review/backlog/log documents. Local tests passed 47/47; TypeScript and focused ESLint passed. Preview upload verification is still required before rollout.

---

## 2026-09-17 - Defer AIFF playback and block new AIFF uploads

### What we were trying to achieve

Stop accepting a format with a reproduced playback failure while preserving the upload-completion fix and keeping beta-critical work first.

### Feature / change being made

Temporary client/server AIFF upload restriction and lower-priority playback backlog.

### Files changed

- `lib/audioUploadPolicy.mjs`
- `app/api/versions/create/route.ts`
- `app/upload/page.tsx`
- `app/songs/[id]/upload/page.tsx`
- `app/songs/[id]/versions/[versionId]/page.tsx`
- `tests/critical-contracts.test.mjs`
- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The user's latest staging AIFF version `48a7d162-bd75-4f8e-b7fc-b8c6239605d5` finalized four seconds after allocation, with matching 623,130-byte Storage metadata. The finalizer returned 200 on Preview `dpl_BRgru3UvRRzAECzYhqacVACNbTBr`; subsequent version/page requests returned 200. This verifies the prior finalizer fix for this upload, not successful playback.
- The user reported silence and the generic waveform retry message after pressing Play. AIFF browser compatibility is a working diagnosis, not proof that every other supported format works. Earlier M4A waveform retries are still unexplained.
- New AIFF/AIF metadata is rejected before allocation; all three pickers share the supported extension list. Drag/drop rejection presents specific WAV/MP3 export guidance. Previously allocated/stored AIFF inspection remains available, avoiding deletion or reinterpretation of historical versions.
- No migration, Storage setting, dependency, authentication or billing change. Production and existing test objects remain untouched. AIFF playback support is recorded as P3, after beta-critical work.
- Local checks: 47 tests passed, TypeScript passed, focused ESLint had no errors and six existing warnings. Supported MP3/WAV upload and playback plus AIFF rejection still need Preview verification before merge approval. Rollback is the app revert or preceding deployment; no data rollback is needed.

---

## 2026-09-18 - Diagnose shared playback retry loop after MP3 upload

### What we were trying to achieve

Identify why a supported MP3 fails to play after the upload completion fix, without treating this as an AIFF-only limitation.

### Feature / change being made

Diagnostic evidence and beta-blocking playback backlog. No application change or rollout in this slice.

### Files changed

- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- Staging version `8082846d-c43f-4d8f-9e61-0cab43f02466` finalized at 09:41:49 UTC with 8,300,586 bytes and matching Storage `audio/mpeg` metadata. Preview finalizer and version/page requests returned 200. These checks prove upload completion, not playback.
- The user's console shows repeated twelve-second timeouts with load IDs 26, 29 and 32. The source arms a waveform deadline during initialization despite loading only on Play, resets its automatic-retry allowance on every nonce change, and doesn't resume lazy loading after reinitialization. These are definite lifecycle defects, though client network/decode behaviour may have additional causes.
- Logged a P1 beta blocker above the tablet presentation items and retained deferred AIFF support separately. The focused proposed fix is actual-load deadlines, a bounded retry allowance, and resumption only after user-requested loading. Background playback and coordination need regression checks.
- Application implementation requires agreement on this focused playback scope. PR #50 remains draft at `aea04a0f`; production and all stored files are unchanged. No application tests were run for this documentation-only diagnostic update; read-only staging/runtime checks and source inspection supplied the evidence.

---

## 2026-09-18 - Confirm MP3 playback after connectivity recovered

### What we were trying to achieve

Correct the provisional playback assessment using the user's successful retest of the same file and deployment.

### Feature / change being made

Preview MP3 playback evidence and reclassification of timeout/retry resilience work.

### Files changed

- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The user confirmed MP3 playback on the same `aea04a0f` Preview and version `8082846d-c43f-4d8f-9e61-0cab43f02466` after refreshing with improved connectivity. Initial download speed was reportedly about 15 KB/s. No file or application code changed between failure and success.
- This supersedes the earlier provisional P1 blanket playback blocker. MP3 playback has passed by user observation; connectivity is a plausible explanation for the initial timeout, not a controlled diagnosis of every preceding failure.
- Retained the definite deadline/retry source findings as P2 resilience work below the P1 iPad items. No player code was changed, and no implementation approval was inferred. AIFF playback support remains deferred as P3 with new-upload restriction in Preview.
- Documentation-only update, local and uncommitted. Diff checks passed. Production is unchanged; WAV playback and AIFF rejection still need explicit Preview confirmation before rollout approval.

---

## 2026-09-18 - Confirm WAV upload and playback in PR #50 Preview

### What we were trying to achieve

Complete the supported-format upload/playback checks without expanding the player implementation scope.

### Feature / change being made

User-verified WAV success recorded alongside the successful MP3 retest.

### Files changed

- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The user confirmed a WAV successfully uploaded and played on the current PR #50 Preview. This is user-observed evidence; no WAV version URL was supplied, and no independent database or browser playback check was performed in this slice.
- MP3 and WAV upload/playback checks are now passed. New AIFF rejection still needs explicit Preview confirmation before rollout approval. Idle/slow-network player resilience remains a separate P2 follow-up, and AIFF playback support remains P3.
- Documentation-only update, local and uncommitted. Diff checks passed. No application, service or production change; existing files and the separate iPad notes are preserved.

---

## 2026-09-18 - Confirm AIFF rejection and approve PR #50 rollout

### What we were trying to achieve

Close the remaining Preview check and record explicit production rollout authority.

### Feature / change being made

PR #50 Preview verification and rollout approval, without adding player or tablet changes.

### Files changed

- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The user confirmed seeing the AIFF rejection message and explicitly requested PR #50 rollout. MP3 and WAV upload/playback previously passed by user observation.
- Production rollout is approved: commit and push the focused verification notes, wait for all checks, mark ready, squash-merge into `clone-clean`, then verify both Production deployments and the live site. Stop on deployment failure, incorrect production origin, new application errors or a failed upload/playback smoke test.
- No migration or service configuration change is required. Existing audio and pending test data are preserved. Slow-network player resilience and AIFF playback support remain separate deferred work; iPad backlog additions are excluded from this PR.
- Rollback is a revert of the PR #50 squash commit or restoration of the preceding primary Production deployment `dpl_3sL1SuU2q7LvzENQ4Li9JWmaBSzQ` at `6f655f238089678078db1307225782f580e78479`. The already-applied PR #48 migration stays in place.
- Documentation-only verification update. Production is unchanged until the approved merge; live verification remains required.

---

## 2026-09-18 - Deploy approved PR #50 to primary Production

### What we were trying to achieve

Roll out the verified upload completion fix and temporary AIFF restriction without changing unrelated services or player behaviour.

### Feature / change being made

Approved PR #50 merge, deployment verification and explicit tracking of the remaining authenticated live smoke test.

### Files changed

- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- Verification notes were committed as `4df535f9f1d01c18bbd0db3db3cdde7d6f39d75e` and pushed. All fresh checks passed: both Vercel Preview builds, Preview comments and browser accessibility CI (13 passed, 5 expected skips). Local reruns passed 47 contract tests, TypeScript and focused ESLint (zero errors, six existing warnings).
- PR #50 was marked ready and squash-merged into `clone-clean` at 10:40:27 UTC as `6a09241ee4bcf8d0569d65f4645ad16e3e633248`. Its parent is the previous Production baseline `6f655f238089678078db1307225782f580e78479`.
- Primary Production deployment `dpl_CGr85ktfsnHnR5syLVQnngEVDobL`, `https://song-review-app-v2-1a3wv5g21-corisleachmans-projects.vercel.app`, reached Ready with the merge SHA and aliases including `www.song-room.live` and `song-review-app-v2.vercel.app`. The deployment-specific hostname has Vercel SSO protection; public aliases were verified without changing protection.
- Legacy project build `dpl_DKLwerEnw6hN5uF7WTEo3hayiSDy` also reached Ready with the merge SHA, but Vercel classifies it Preview (`target: null`). Read-only inspection shows that project's existing Production builds originate from `main`. This is a legacy project configuration distinction, not a change to the Song Room production branch. No promotion or configuration change was made; do not describe both builds as Production.
- On both public primary aliases, homepage and login returned 200; signed-out dashboard returned 307 to `/login?redirectTo=%2Fdashboard`. Standard responses have enforced CSP, no report-only header, `frame-ancestors 'none'` and `X-Frame-Options: DENY`. The actual `/embed/playlist/*` route returned its unavailable-playlist gate with 200, `frame-ancestors *` and no X-Frame-Options. CSP contains Production Supabase `hxtsuhmqrufcdplidtov.supabase.co`, not staging. An earlier nonexistent `/embed/<song-id>` diagnostic returned expected 404; it wasn't a valid embed route.
- Signed-out POSTs to upload creation and finalization returned 401. No test audio or database rows were created or deleted during these live checks.
- After at least sixty seconds of observation following Ready, deployment-scoped Production logs from merge time through 10:43:30 UTC contained no error/fatal entries, 5xx responses or CSP-report matches. Status counts confirmed recorded requests. This is an early, bounded observation window, not proof of every authenticated journey or future traffic.
- Deployed to Production; not yet production complete. Browser policy blocked agent access to the authenticated test journey. The remaining user check is a supported MP3 or WAV upload/playback plus AIFF rejection on `https://www.song-room.live`. Stop and report the URL, file type/size, exact error, console excerpt and screenshot if it fails. Don't submit a live Stripe payment.
- No migration, dependency, environment, billing, authentication or Storage-policy change. Rollback is reverting `6a09241ee4bcf8d0569d65f4645ad16e3e633248` or restoring preceding primary deployment `dpl_3sL1SuU2q7LvzENQ4Li9JWmaBSzQ`; retain the already-applied PR #48 migration. Existing files, pending test data and separate iPad notes are preserved.
- These post-deployment documentation notes remain local and uncommitted; the pre-merge verification notes are included in the merged PR. No additional branch push or direct write to `clone-clean` was made.

---

## 2026-09-18 - Record live AIFF rejection and intermittent MP3 first-play failure

### What we were trying to achieve

Close the live rollout checks using the user's actual result without treating playback recovery as an unqualified pass.

### Feature / change being made

Production smoke-test evidence and P1 first-play reliability backlog; no player implementation or further rollout.

### Files changed

- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The user confirmed the expected AIFF rejection message in Production and successful MP3 upload. The first Play press did nothing. After leaving and returning to the page, another Play press loaded the same MP3. Upload/rejection passed by user observation; first-play reliability didn't pass, so the full journey isn't production complete.
- Promoted PLAYBACK-001 from P2 resilience to P1 beta journey reliability, before the iPad presentation items. This doesn't assert a blanket MP3 format failure or prove a PR #50 regression; earlier player lifecycle findings remain relevant and weren't changed by PR #50.
- Source inspection found that the enabled Play button silently returns before WaveSurfer exists. Initialization debounces for 80 milliseconds and asynchronously imports WaveSurfer; the twelve-second timeout starts before lazy loading. Automatic retries reset their allowance and don't resume requested loading. These are observable code paths, not confirmed causes of this particular first-click failure.
- Deployment-scoped Production logs in the thirty-minute window ending approximately 10:50:42 UTC showed no error/fatal entries, 5xx responses or CSP-report matches. Server logs don't capture browser-only playback failures. Existing client version-init logging is present; no new instrumentation was added.
- Browser policy still prevents agent verification of the authenticated test journey. No exact tested live version URL, browser/device or first-click timing was supplied. Don't infer those from ambient UI context or claim independent reproduction. Collect that context and relevant version-init console lines before selecting a focused fix.
- These documentation changes are local and uncommitted. No app code, service configuration, production data, commit, push, merge or deployment changed. Existing iPad notes and pending test files are preserved.

---

## 2026-09-18 - Identify affected live version and record successful immediate MP3 retest

### What we were trying to achieve

Refine the intermittent playback assessment with the exact affected page and the user's fresh first-press test.

### Feature / change being made

Production evidence update only; no player fix or further deployment.

### Files changed

- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The user supplied the affected live page: `https://www.song-room.live/songs/48da7337-f2fc-4df4-93e3-d4633aceae30/versions/c8b3db65-6c2a-4102-ac6e-16784bb6719b`. Browser/device: desktop Chrome. Play was pressed once the button was visible; exact elapsed initialization time wasn't measured.
- A subsequent MP3 version played on the first press immediately after upload, after approximately three to four seconds of loading. That version's URL wasn't supplied. This is user-observed success, not independent agent browser verification.
- Upload and AIFF rejection checks are passed, as is this fresh first-press playback smoke test. Retain the earlier intermittent failure as P1 first-play reliability; don't describe playback as consistently broken, assume background loading was the cause, or mark the full journey production complete.
- Initialization timing remains a plausible explanation from prior source inspection, but browser console/network evidence is still missing. No regression attributable to PR #50 is established, and no rollback or player implementation was inferred from the retest.
- Documentation-only update, local and uncommitted. No app code, data or production service changed. Existing iPad notes are preserved; diff checks passed.

---

## 2026-09-18 - Reproduce first-play initialization and retry lifecycle defects locally

### What we were trying to achieve

Test whether an early Play press is discarded and whether lazy waveform initialization produces idle timeout/retry failures, without touching Production or uploading more files.

### Feature / change being made

Controlled offline diagnosis of PLAYBACK-001. No application implementation or rollout.

### Files changed

- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`
- Temporary diagnostic artifact: `/tmp/song-room-first-play.YMUnpQ/diagnose.cjs` (outside the repository).

### Notes

- The harness extracts the actual initialization callback, hero Play handler, disabled expression, waveform lifecycle effect and retry callback from the current TSX using TypeScript's AST. Type annotations are transpiled away. Only the WaveSurfer module import boundary is replaced with a controlled promise; media events, state setters, refs and timers are mocked. It doesn't access a browser, network, production data or audio files.
- Four diagnostic scenarios passed. First, presses before the initialization debounce and during delayed import are accepted by the enabled button but cause no audio load, playback or pending request; completion of initialization doesn't resume them. Another press after initialization loads and plays. Second, a first press after initialization loads once, waits for ready and plays normally without navigation.
- Third, an idle page triggers the twelve-second timeout despite zero audio loads. Three successive automatic retries each reset their allowance on lifecycle reinitialization. Fourth, a timeout after a requested load replaces the player but doesn't resume loading or playback. These reproduce current defects; they aren't regression acceptance tests for a future fix.
- This confirms initialization and retry lifecycle defects under controlled conditions, not which defect occurred in the user's desktop Chrome session. It doesn't verify real WaveSurfer download/decoding, browser gesture restrictions, React scheduling, background playback or single-player coordination.
- Command: `node /tmp/song-room-first-play.YMUnpQ/diagnose.cjs`. Baseline `npm test` also passed 47/47; documentation diff checks passed. No application TypeScript or production configuration changed.
- Recommended next slice: preserve first-Play intent through initialization, start deadlines only during actual loads, bound retries across reinitialization and resume requested loading when retrying. Implement only after agreement on this focused scope, with a separate Preview and background-playback regression gate before any production rollout.
- Documentation changes remain local and uncommitted. Existing iPad notes, pending test data and the deployed PR #50 upload fix are unchanged. The temporary diagnostic artifact is outside git and should be converted into repository regression tests alongside an approved fix.

---

## 2026-09-18 - Promote email/password signup and defer Microsoft login

### What we were trying to achieve

Reflect the user's near-term signup priorities without bundling password authentication with a second OAuth provider or changing current Production authentication.

### Feature / change being made

Backlog reprioritisation and planning requirements for complete signup and recovery journeys.

### Files changed

- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- Email/password signup is now near-term P1 product work after the current playback and tablet fixes, rather than deferred until post-beta feedback. This placement is a scheduling assumption consistent with the user's request to continue the existing priority list.
- The planning gate covers username versus display-name behaviour, neutral and tier-aware signup, referrals, invitations, verification/resend, protected-page return paths, forgot/reset/change password, expired links, existing Google identities, safe account linking and session recovery. Attribution, invite priority and owner-only billing must survive these journeys.
- Microsoft login is a separate deferred growth-stage item to revisit when the app gains traction and income. It isn't a prerequisite for password signup.
- No auth route, provider setting, schema, email service or Production configuration changed. Google-only describes current deployed behaviour, not the future product restriction. Auth implementation and external rollout will need separate review and approval after the journey plan.
- Documentation changes are local and uncommitted. Existing iPad notes and earlier upload/playback rollout evidence are preserved.

---

## 2026-09-18 - Preserve first-Play intent and bound player retries

### What we were trying to achieve

Continue the priority list by addressing the controlled initialization and retry defects behind PLAYBACK-001, without treating the intermittent Production MP3 report as a file-format failure.

### Feature / change being made

A focused authenticated version-player lifecycle fix and regression tests. Repository work is complete locally; real-browser verification and rollout aren't complete.

### Files changed

- `app/songs/[id]/versions/[versionId]/page.tsx`
- `tests/player-lifecycle.test.mjs`
- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Implementation and status

- Local branch: `codex/player-first-play-readiness`, based on Production `clone-clean` commit `6a09241ee4bcf8d0569d65f4645ad16e3e633248`. Nothing from this candidate is committed, pushed, in a PR or deployed. Production remains on PR #50.
- The Play button previously discarded a press before WaveSurfer existed. Initialization also started a twelve-second failure deadline while audio was still deliberately unloaded, and retries reset their own allowance without resuming the requested load.
- Preserve Play intent through delayed initialization and retry. Start the deadline only when an audio load starts; allow one automatic retry per version/audio session, reset that allowance on explicit manual retry, and keep exhausted failures stable and recoverable. Button and desktop Space share the handler.
- Cancel stale initialization/polling callbacks and ignore old player events after navigation or retry. Keep the existing native fallback, but prevent duplicate fallback from its two error channels and stop asynchronous fallback from attaching to a newer session. Recheck reactive drawing when media becomes ready.
- Canonical reads, upload finalization, authentication, billing, storage, dependencies and environment configuration are unchanged. The existing background and single-player architecture isn't redesigned. The specific user-observed Chrome failure still isn't independently reproduced in a real browser.

### Local verification

- `npm test`: 69 passed, including 22 new tests exercising actual page callbacks with mocked media, timers and delayed WaveSurfer import. Cases include early Play, idle initialization, automatic/manual retries, stable exhaustion, stale events, fallback, rejected playback, navigation, Strict Mode, missing containers and keyboard handling.
- `npx tsc --noEmit --incremental false`: passed.
- Focused ESLint on the page and new test: zero errors; five existing page warnings remain.
- Optimized Next.js build: passed with existing lint warnings. The first run compiled but couldn't collect page data without a Supabase URL. The successful rerun used command-scoped, non-production placeholders for the Supabase URL and keys, not environment-file edits or real service credentials.
- Build-generated cookie-consent additions in two previously clean blog files were removed from the candidate. Existing uncommitted documentation and upload-test fixtures are preserved.
- No real browser gesture, media download, background/lock-screen playback or Preview journey was verified. An earlier browser-access policy block remains in force; don't bypass it with another browser mechanism. Offline callback tests aren't a substitute for authenticated browser checks.

### Required Preview gate and ownership

1. Agent, GitHub after explicit commit/push authority: commit the focused candidate, push `codex/player-first-play-readiness` and open a draft PR into `clone-clean`, never `main`. Expect passing checks and a Ready primary-project Preview matching the candidate SHA and staging Supabase origin. No new migration or external configuration is required.
2. User, authenticated Preview: open MP3 and WAV versions, leave them idle beyond twelve seconds and expect no loading error or repeated initialization; audio should remain unloaded until requested.
3. User, authenticated Preview: press Play immediately after upload and during delayed first initialization/direct version entry. Expect one visible loading state followed by playback without another press. Test desktop Space too, and confirm typing in a comment doesn't trigger playback.
4. User, authenticated Preview with throttled/offline networking: interrupt a requested load. Expect at most one automatic retry, then a stable readable failure rather than flashing errors. Restore connectivity and press the manual retry or Play control; expect playback recovery.
5. User, authenticated Preview: navigate between versions during initialization, loading and playback. Expect no old-version autoplay or overlapping audio. Check seeking, comments, recoverable drafts, visualizer and existing player coordination, plus pause/resume and background/lock-screen controls on supported desktop/mobile browsers.
6. User, authenticated Preview: retain MP3/WAV upload/playback success and the AIFF rejection message. Never submit a live Stripe payment. If any step fails, stop rollout and return the URL, browser/device, exact step, visible error, console/network excerpt and screenshot where useful.
7. Agent, GitHub/Vercel only after the Preview gate passes and rollout is explicitly authorised: merge into `clone-clean`, wait for primary Production, verify live routes and runtime logs, and obtain the same first-Play smoke test on the live app. Until then, don't claim Production complete.

### Rollback and next step

- No migration, dependency or service-setting rollback is involved. If this candidate is later merged, revert its future squash commit or restore the current PR #50 primary deployment `dpl_CGr85ktfsnHnR5syLVQnngEVDobL`. Record the actual merge/deployment IDs during rollout rather than inventing them now.
- Recommended next step: obtain authority to commit/push the focused candidate and prepare its Preview PR before starting the tablet fixes. Email/password journey planning follows those fixes; Microsoft login stays deferred.

---

## 2026-09-18 - Prepare approved first-Play Preview PR

### What we were trying to achieve

Publish the focused player candidate for Preview verification after the user approved committing, pushing and opening a draft PR.

### Feature / change being made

Repository publication only. Approval doesn't include merging or deploying this candidate to Production.

### Files changed

- `app/songs/[id]/versions/[versionId]/page.tsx`
- `tests/player-lifecycle.test.mjs`
- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- Rechecked the candidate on `codex/player-first-play-readiness`, based on the unchanged `origin/clone-clean` commit `6a09241e`. No existing PR for this branch was found.
- Fresh local checks passed: 69 tests, TypeScript and focused ESLint with zero errors and five existing page warnings. The preceding optimized build passed with build-only placeholders as documented above.
- Commit only the five named files. Preserve unrelated `.DS_Store` files and `.codex-upload-test/` outside git. Earlier upload rollout evidence, iPad notes and the approved password-signup priority remain in the documentation.
- Open a draft PR with base `clone-clean`; wait for GitHub checks and the primary `song-review-app-v2` Preview to be Ready before requesting authenticated journey testing. No migration, credentials, service configuration or Production change is required for Preview preparation.
- Published implementation commit `fae8ee0d20f6ebe335571b5febce330f9a5cb2ec` and opened [draft PR #52](https://github.com/corisleachman/song-review-app/pull/52), verified OPEN/draft with base `clone-clean` and the intended head branch. Both Vercel checks and the browser-accessibility workflow were pending at publication. The initial primary Preview is `dpl_GNXqSKKMcwxKh8vJt4wwGcajzAZu`; it was BUILDING when inspected. Check the final PR head after this publication-note commit rather than treating that initial deployment as final evidence.
- Primary branch Preview alias: `https://song-review-app-v2-git-codex-pla-1e4eb4-corisleachmans-projects.vercel.app`. Use it only once the primary deployment is Ready and matches the final PR head. The existing staging test version is `/songs/08e6a6e2-a6b7-441a-b32d-fcec9d89dcb7/versions/8082846d-c43f-4d8f-9e61-0cab43f02466`; don't carry Production song IDs into staging or create more Production uploads for this gate.
- The named implementation files and preserved review/backlog notes are now committed; unrelated upload fixtures and `.DS_Store` files remain untracked. Earlier local-only status statements above describe their checkpoints and are superseded by this publication entry.
- Real-browser verification remains pending under the checklist above. Any failing check stops progression; don't merge or promote a staging-backed Preview to Production. The user still needs to test the authenticated journeys and separately approve rollout after they pass.

---

## 2026-09-19 - Approve PR #52 after authenticated Preview checks

### What we were trying to achieve

Close the manual Preview gate for the first-Play reliability fix and proceed through the approved Production rollout without changing the scope.

### Feature / change being made

PR #52 verification evidence and rollout approval. No new player behaviour, service configuration or data change.

### Files changed

- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The user reported that all requested checks passed and instructed the agent to continue. Treat that as authenticated Preview evidence for the checklist recorded above and authority to mark PR #52 ready, squash-merge it into `clone-clean` and verify the resulting Production deployment.
- The verified Preview candidate before this note was primary deployment `dpl_CpEoFwCV1bCAPhqrKL6MEnXTvJjD`, Ready against head `489cb1541dc38cc107ca1cf63bcaca14eab1bb92`. All four PR checks passed; the browser/accessibility workflow reported 13 passed and five expected skips.
- This evidence is user-reported for the authenticated song/version journeys. The agent didn't independently operate the protected browser session. Don't broaden it into proof about untested browsers, devices or network conditions.
- After committing this note, wait for every check on the new head. Stop if any fails. Then mark the PR ready and squash-merge only into `clone-clean`, never `main`.
- Git-triggered Production is expected for both Vercel projects. Classify deployments by target and project: verify the primary `song-review-app-v2` Production artifact and the live domain; don't promote a staging-backed Preview. Confirm the legacy project's resulting target rather than assuming it is Production.
- Production verification: homepage and login return 200; signed-out dashboard retains `/login?redirectTo=%2Fdashboard`; standard responses have enforced CSP, no report-only policy, `frame-ancestors 'none'` and `X-Frame-Options: DENY`; embed retains `frame-ancestors *` without X-Frame-Options; CSP contains Production Supabase and excludes staging. Scan deployment-scoped runtime errors and CSP reports. Browser-only first-Play success still requires a live authenticated smoke test before calling the journey Production complete.
- No migration, dependency, environment variable, authentication, billing or storage change is involved. Rollback is a revert of the future PR #52 squash commit or restoration of current primary Production deployment `dpl_CGr85ktfsnHnR5syLVQnngEVDobL`.

---

## 2026-09-19 - Close PR #52 and capture the slow sign-in return journey

### What we were trying to achieve

Record the completed first-Play rollout and preserve a separate user-observed authentication experience for later measurement, without starting an auth or loading-state change.

### Feature / change being made

Documentation-only Production closeout and backlog capture.

### Files changed

- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- The user confirmed the authenticated live first-Play check passed after PR #52 deployed. PR #52 squash-merged into `clone-clean` as `9c483ee136238e8f80cc77c8e13b53050d5ada9a`; primary Production `dpl_2SyH8hq57prmZeAdfYt4V7oM7Gf3` was Ready on the exact merge SHA. Homepage/Login, signed-out redirect, route-specific CSP/framing and deployment-scoped runtime checks passed. The legacy deployment `dpl_DG3qbAsATdyfiAYXa2gubbGmgNwc` was Ready with target `null`, not Production. Rollback remains a revert of `9c483ee1` or restoration of `dpl_CGr85ktfsnHnR5syLVQnngEVDobL`.
- The new backlog item records a separate Production journey: Google account selection returns visibly to Login for an estimated three to five seconds, then the destination song presents the outlined Song Room loader for about three more seconds. The combined post-selection experience feels like six to eight seconds and creates uncertainty because two different waiting states appear in sequence.
- Treat the durations as user-observed estimates. No browser trace, server timing or environment comparison was collected, so OAuth callback, session, bootstrap, redirect, route data and animation phases remain candidates rather than diagnosed causes.
- Before implementation, instrument and compare the complete journey. Assess both actual latency and continuity: one truthful transition with destination context may improve confidence, while callback/bootstrap/route work should be removed or overlapped only when measurements identify it.
- Keep this work compatible with protected redirects, tier selection, referrals, workspace invitations and existing Google identities. Carry the resulting post-auth pattern into the planned email/password journeys.
- No application code, authentication provider, Supabase setting, schema, environment variable, email service, billing, storage, deployment or Production data changed for that capture. Its local documentation was carried forward intact onto `codex/ipad-homepage-readiness` when the next priority slice began.

---

## 2026-09-19 - Add a composed 11-inch iPad homepage treatment

### What we were trying to achieve

Fix the real-device homepage typography and layout failures recorded from an 11-inch iPad Air, without changing the established phone or desktop presentation.

### Feature / change being made

A focused tall-tablet breakpoint, readable display typography and regression coverage. Repository work is complete locally; Preview, real-device checks and rollout aren't complete.

### Files changed

- `public/marketing.html`
- `tests/critical-contracts.test.mjs`
- `tests/browser/public-accessibility.spec.mjs`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Root cause and implementation

- The shared `max-width: 900px` rules flattened the hero and major content sections into one-column phone-like stacks. The considered phone composition and clearer display typography started only at 600px, leaving common iPad portrait widths with Thunder Black at a `0.74` line-height, hidden Sign in navigation and excessive vertical dead space.
- Add a bounded `601px` to `900px` tall-viewport mode. The hero now pairs a lead image with one supporting image and its descriptive panel. Sign in and Start for free remain visible with 44-pixel targets.
- Restore paired tablet compositions for the problem/chat, product, feature, proof and showcase sections. Bound horizontal padding, text measures, feature spacing and screenshot sizing without changing page copy or the phone and desktop breakpoints.
- Use Thunder Bold, normal kerning, a `0.84` line-height and bounded fluid sizes for the main tablet headings. Reduced-motion users now see the completed outlined hero headline instead of its invisible animation start state.

### Local verification and status

- `npm test`: 70 passed, including the new tablet CSS contract.
- Public Playwright suite: 14 passed with six expected project skips. The 820×1180 tablet case confirms two-column hero/problem/product/feature/showcase layouts, visible account routes, a 44-pixel Sign in target, 16-pixel body copy, readable heading metrics, the reduced-motion hero fallback, no horizontal overflow and no blocking accessibility violations.
- Inspected local 820×1180 Chromium captures for the hero, problem/chat, first feature, showcase, proof and pricing sections. The display words remain distinct and the paired content relationships are restored.
- Optimized Next.js build passed with command-scoped non-production Supabase placeholders and existing lint warnings. Build-generated cookie-consent additions in two otherwise untouched blog files were removed after verification.
- Published initial implementation commit `29325d35` on `codex/ipad-homepage-readiness`, based on Production `clone-clean` commit `9c483ee1`, and opened [draft PR #53](https://github.com/corisleachman/song-review-app/pull/53) with base `clone-clean`. All four checks passed on documentation head `ce84e942`; primary Preview `dpl_EPZHhbsaPYJwpL3NjYJn97ouGpvw` reached Ready for that exact SHA. Chrome's 11-inch iPad emulation looked clear, but a subsequent desktop Safari screenshot failed the heading-readability gate. The PR therefore remains draft and unmerged. Nothing from this slice is deployed to Production. The earlier PR #52 closeout and slow sign-in backlog note remain preserved.
- The original user screenshots are evidence of the Production defect, not evidence that this local fix works in iPad Safari or Chrome. The remaining gate is the complete real-device checklist recorded in `PRODUCT_BACKLOG.md`, including portrait, landscape, rotation, browser chrome changes, touch use, font completion and 200% zoom.
- No migration, dependency, authentication, billing, storage, environment-variable or service-setting change is involved. A future rollback is a revert of this slice's eventual merge commit or restoration of the preceding Vercel Production deployment, which must be recorded during rollout.

### Recommended next step

Publish the desktop typography refinement, wait for every check and the replacement primary Preview, then repeat desktop Safari before the real-device iPad gate. Do not merge on Chrome emulation alone.

---

## 2026-09-19 - Refine PR #53 display typography after desktop Safari finding

### What we were trying to achieve

Make the marketing display headings readable in desktop Safari as well as the tall-tablet composition, without replacing the brand typeface or changing unrelated page content.

### Feature / change being made

A shared wide-screen heading treatment and regression coverage within draft PR #53. The PR remains unmerged while the revised Preview is tested.

### Files changed

- `public/marketing.html`
- `tests/critical-contracts.test.mjs`
- `tests/browser/public-accessibility.spec.mjs`
- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Root cause and implementation

- The first PR #53 Preview looked clear in Chrome's 11-inch iPad emulation and all automated checks passed. A desktop Safari screenshot then showed the problem heading as dense blocks. This is a failed manual Preview gate, so the PR stays draft.
- Safari is rendering the specified font rather than falling back. The wide breakpoint still used Thunder Black at a `0.74` line-height and allowed lead headings to grow to 140 pixels, while phone and tall-tablet rules used the clearer Thunder Bold treatment at `0.84`.
- Apply Thunder Bold, normal kerning and a `0.84` line-height to the main marketing headings at the shared level. Bound lead headings at 120 pixels and supporting headings at 80 pixels. Keep Thunder Black for short accents such as feature numbers and prices.
- Add a source contract for every shared heading and a 1440×900 browser check covering computed family, size, line-height and horizontal overflow.

### Verification status

- `npm test`: 71 passed, including the new shared desktop typography contract.
- Focused ESLint passed for both changed test files. The public Chromium suite passed 15 tests with seven expected project skips, including the new 1440×900 heading check and the 820×1180 tablet case.
- Local Playwright WebKit renders at 1440×900 and 820×1180 returned 200, loaded Thunder Bold at a `0.84` line-height, had no horizontal overflow, browser page errors or framework overlay, and were visually inspected at the Problem section.
- The optimized Next.js build passed with command-scoped non-production Supabase placeholders and existing lint warnings. Its generated cookie-consent additions in two otherwise untouched blog files were removed after verification.
- A replacement Preview is still required after this refinement.
- Desktop Safari at normal zoom and 200% zoom is now the first manual gate. A real 11-inch iPad Safari and Chrome check remains required because Chrome device emulation isn't real-device evidence.
- No migration, dependency, authentication, billing, storage, environment-variable or service-setting change is involved. Nothing from PR #53 is deployed to Production.

---

## 2026-09-19 - Approve PR #53 after the desktop Safari retest

### What we were trying to achieve

Close the available manual Preview gate for the homepage typography refinement and proceed with the approved PR #53 rollout without overstating unavailable device coverage.

### Feature / change being made

Documentation-only Preview evidence and rollout approval. No further homepage behaviour or styling change.

### Files changed

- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Verification evidence and rollout boundary

- The user confirmed the revised homepage looks great in desktop Safari on primary Preview `dpl_GM3rwftoCetk3CsaXDnJfcWh63ty`, built from refinement commit `960fc041a6a191defd9585bebad5de759809d716`.
- All four GitHub and Vercel checks passed on that head. Earlier local verification covered 71 contract tests, 15 Chromium browser passes with seven expected project skips, focused ESLint, an optimized build and clean desktop/tablet WebKit renders.
- Chrome's 11-inch iPad emulation looked clear. A physical 11-inch iPad wasn't available for the revised candidate, so Safari/Chrome orientation, rotation, browser chrome and 200% zoom on that device remain follow-up coverage, not completed evidence.
- The user's instruction to continue authorises marking PR #53 ready, squash-merging it into `clone-clean`, waiting for the resulting deployments and checking the live homepage. Stop rollout if the documentation-only head fails or the Production deployment is unhealthy.
- No migration, dependency, authentication, billing, storage, environment-variable or service-setting change is involved. Rollback is a revert of the future PR #53 squash commit or restoration of the preceding primary Production deployment.

---

## 2026-09-14 - Record 11-inch iPad homepage failures

### What we were trying to achieve

Capture real-device tablet problems before beta planning resumes so the homepage presentation isn't treated as finished based only on phone and desktop checks.

### Feature / change being made

High-priority backlog coverage for the 11-inch iPad homepage layout and display typography.

### Files changed

- `PRODUCT_BACKLOG.md`
- `UPDATE_LOG.md`

### Notes

- Three screenshots from the live homepage on an 11-inch iPad Air show two distinct P1 presentation failures: dense display headings and an unfinished tablet composition.
- The code supports the reported breakpoint gap. Major sections collapse to one column at 900px, while the clearer phone typography, reworked hero, and returning-user Login action activate only at 600px and below.
- The tablet backlog now calls for a content-driven composition rather than an enlarged phone stack. It also requires the returning-user route to stay visible.
- Acceptance testing must include a real 11-inch iPad Air in both orientations, Safari and Chrome, rotation, font completion, touch use, and 200% zoom.
- No application code, deployment, or production data was changed in this documentation-only update.

---

## 2026-09-19 - Plan email/password signup and recovery

### What we were trying to achieve

Turn the promoted email/password backlog item into an implementation-ready set of user journeys without changing the deployed Google-only authentication boundary.

### Feature / change being made

Documentation-only product, security, rollout, and acceptance planning for email/password signup, login, verification, recovery, referrals, invitations, tier choices, and existing Google accounts.

### Files changed

- `EMAIL_PASSWORD_SIGNUP_AND_RECOVERY_JOURNEY.md`
- `PRODUCT_BACKLOG.md`
- `TIER_SIGNUP_AND_UPGRADE_JOURNEY.md`
- `WORKSPACE_MODEL.md`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Findings and decisions

- Email is the sign-in identifier. The requested username is treated as a display name, not a unique handle or a second authentication identifier.
- Google remains available. Microsoft stays deferred and is not a dependency.
- Both methods must resolve to the same Supabase user UUID, profile, memberships, referral history, workspace state, and billing boundary.
- The current login, callback, and invite paths are Google-specific. The existing reset-password page is incomplete, and middleware still accepts legacy auth cookies before checking Supabase. The shared beta-password endpoint is unrelated to user accounts and must not be reused.
- Use one sealed, expiring, allowlisted auth intent across Google, email confirmation, recovery, referrals, invites, protected routes, and tier selection. A secure same-browser cookie remains useful, but the sealed email continuation is required for cross-device confirmation.
- A valid invite stays first in destination priority and should create membership before an unnecessary personal workspace. Protected destinations come next, then paid plan confirmation, then dashboard.
- Existing Google users add a password only while authenticated through Settings. Supabase documents this with `updateUser({ password })`. Supabase automatic linking for the same verified email must retain one UUID in staging tests; there will be no client-side account merge.
- Production needs custom SMTP, reviewed redirect URLs, SSR/PKCE token exchange, uniform anti-enumeration responses, rate-limit review, password policy, recent-login reauthentication, security notifications, and CAPTCHA before Email is exposed.
- Supabase's current documentation warns that signup against an existing OAuth email returns an obfuscated response without sending a verification email. The neutral check-email screen therefore includes non-account-specific help for people who already use Google.
- Rollback hides Email first while preserving Google and recovery for any password accounts already created. Disabling the provider or deleting identities isn't a safe rollback.

### Status and verification boundary

- This branch starts from Production `clone-clean` merge `5dc27863` after PR #53. The backlog now records primary Production deployment `dpl_DAJqpPQhNMphgGYKTbE1mvb2Bp6M` as Ready. Physical 11-inch iPad testing remains useful follow-up coverage.
- Current Supabase password, identity-linking, SSR, email-template, rate-limit, CAPTCHA, password-security, and sign-out documentation was checked before writing the plan.
- No application code, database schema, Supabase setting, SMTP service, DNS record, Vercel variable, dependency, authentication provider, billing rule, storage behavior, deployment, or Production data changed.
- Implementation should begin with a read-only capture of hosted staging and Production Auth settings, followed by the shared auth boundary while the public UI remains Google-only.

---

## 2026-09-19 - Start the hosted authentication configuration audit

### What we were trying to achieve

Capture the existing staging and Production authentication boundary before writing email/password code or changing any hosted service.

### Feature / change being made

Read-only configuration inventory and a completed baseline for Slice 0.

### Files changed

- `AUTH_CONFIGURATION_AUDIT.md`
- `EMAIL_PASSWORD_SIGNUP_AND_RECOVERY_JOURNEY.md`
- `PRODUCT_BACKLOG.md`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Findings

- Primary Vercel project `song-review-app-v2` uses Node 24.x. It has separate Production and Preview entries for Supabase URL, public key, and service-role key. `RESEND_API_KEY` is present across environments, but that does not prove Supabase Auth SMTP is configured.
- Production Supabase publicly reports signup enabled, Google enabled, Email enabled, and email auto-confirm disabled. Confirmation is therefore required. The Song Room UI remains Google-only.
- A read-only aggregate Auth inventory found five confirmed Production users, all with Google as their only provider. No email address or other user-level detail was printed.
- Because the public Auth service has signup and Email enabled, direct password signup may already be possible outside the hidden Song Room UI. The audit did not create a user or send an email to prove that inference. After the dashboard settings are captured, decide whether to disable Production Email temporarily until the controlled rollout.
- The primary project has no Email feature flag, auth-intent sealing secret, or CAPTCHA variables. `NEXT_PUBLIC_APP_URL` is listed only for Production.
- Secondary Vercel project `song-review-app` has its core Supabase variables scoped across Production, Preview, and Development. Values were not read, so auth testing there must remain inert until its environment is classified.
- Repository configuration intentionally omits hosted Supabase Auth settings and warns against `supabase config push` before they are captured.
- After the user signed in to the correct Supabase account, both Song Room projects were inspected in read-only mode. Their provider, password, session, rate-limit, email, protection, URL, and audit-log settings were recorded without using any Save action.
- Both projects have Google and Email enabled, signup enabled, and confirmation required. Secure email change is on. Secure password change, current-password enforcement, leaked-password protection, CAPTCHA, and security notification emails are off. No stronger minimum or composition rule is set beyond the dashboard's documented six-character platform minimum.
- Both projects use Supabase's built-in trial email service and default confirmation/reset templates. Custom SMTP is off. Session time-box and inactivity timeout are unlimited, access tokens last one hour, compromised refresh-token detection is on, and signup/sign-in is limited to 30 requests per five minutes per IP.
- Production Auth uses `https://song-room.live` as its Site URL while both root and `www` are redirect-allowlisted. Staging's Site URL points at an old Preview deployment; its team wildcard still covers Preview redirects. Canonical URL selection and allowlist clean-up need a separately approved change before auth email rollout.
- Database-backed Auth audit logging is off in both projects, although the Auth log explorer remains available. Retention isn't shown in the dashboard setting.
- The completed audit recommends temporarily disabling the hidden Production Email provider while there are no password identities. That configuration change was not made and requires explicit approval plus a Google sign-in regression check.
- Vercel and Supabase secrets were not printed or written to disk. No hosted or application setting changed.

### Status and next gate

- Slice 0 is complete enough to start the local shared-auth-boundary work with Email defaulting off. No Email form or auth email should be enabled in any environment yet.
- The next state-changing decision is whether to disable Production Email temporarily. After that, Slice 1 can proceed without changing hosted Auth or the public Google-only interface.

---

## 2026-09-19 - Temporarily disable Production Email authentication

### What we were trying to achieve

Close the hidden direct email/password signup surface while the public Song Room interface remains Google-only and the complete password journey is still being built.

### Feature / change being made

Production Supabase Auth configuration only. Disable the Email provider while keeping Google enabled. Staging remains unchanged for controlled development.

### Files changed

- `AUTH_CONFIGURATION_AUDIT.md`
- `EMAIL_PASSWORD_SIGNUP_AND_RECOVERY_JOURNEY.md`
- `PRODUCT_BACKLOG.md`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Change and verification

- The user explicitly approved the Production-only setting change after the completed read-only baseline showed five confirmed Google-only users and no password identities.
- In Supabase project `hxtsuhmqrufcdplidtov`, the Email provider was switched off. Google was left enabled. No other provider, signup, template, SMTP, URL, session, password, rate-limit, database, user, or application setting changed.
- A clean dashboard reload showed Email `Disabled` and Google `Enabled`.
- A fresh non-cached public Auth settings request returned `email: false` and `google: true`.
- The live homepage and `/login` returned `200`. The Login page still showed the Google-only copy and `Continue with Google` control, and the Google continuation completed at the authenticated dashboard.
- No email was sent, no user was created, and no application deployment was required.

### Rollback

Re-enable the Email provider in Production Supabase Auth > Sign In / Providers > Email. Do this only if an unexpected Google regression is traced to the safeguard or as part of the approved controlled email/password rollout.

---

## 2026-09-19 - Build the shared email/password auth boundary

### What we were trying to achieve

Create the security and continuation foundation for future email/password signup without exposing Email controls, sending mail, or changing hosted authentication.

### Feature / change being made

Slice 1 of the approved email/password journey: verified session protection, one destination allowlist, sealed cross-device intent, default-off Email flag, and server confirmation and continuation routes.

### Files changed

- `middleware.ts`
- `app/login/page.tsx`
- `app/auth/callback/route.ts`
- `app/auth/confirm/route.ts`
- `app/auth/continue/route.ts`
- `app/api/auth/bootstrap/route.ts`
- `lib/authDestination.ts`
- `lib/authFeatureFlags.ts`
- `lib/authIntent.ts`
- `lib/authIntentCore.ts`
- `lib/signupIntent.ts`
- `next.config.js`
- `playwright.config.mjs`
- `tests/auth-boundary.test.mjs`
- `tests/critical-contracts.test.mjs`
- `AUTH_CONFIGURATION_AUDIT.md`
- `EMAIL_PASSWORD_SIGNUP_AND_RECOVERY_JOURNEY.md`
- `PRODUCT_BACKLOG.md`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Change and verification

- Production middleware now requires verified signed Supabase claims. Legacy auth and identity cookies work only when the Playwright server explicitly enables its non-Production fixture switch.
- One strict destination parser now covers middleware, Google callback, Login, auth bootstrap, and auth continuation. It retains known dashboard, settings, playlist, song, version, invite, and paid-plan journeys while rejecting external, malformed, unknown, or expanded targets.
- Auth intent uses AES-256-GCM with a versioned payload, a one-hour limit, authenticated purpose and destination, optional referral code, and an optional SHA-256 normalized-email binding. The server secret is required and must contain at least 32 characters.
- `EMAIL_PASSWORD_AUTH_ENABLED` is server-only and false unless explicitly set to `true`. The confirmation route stays unavailable while the flag is missing.
- `/auth/confirm` accepts only the planned email token types, uses the Supabase SSR cookie client, avoids raw provider errors in URLs, and hands a valid session to `/auth/continue`.
- Confirmation and continuation responses use `Cache-Control: no-store` and `Referrer-Policy: no-referrer` so one-time token and sealed-intent URLs are not retained or forwarded.
- `/auth/continue` validates the session and email binding. Invite and recovery journeys skip normal direct-account bootstrap so a new invitee cannot receive an unnecessary personal workspace before joining the invited one.
- Google-only Login copy and controls are unchanged. The existing Google callback persistence behavior remains in place for Preview regression testing.
- No environment variable, Vercel setting, Supabase setting, SMTP configuration, template, database, user, or Production deployment changed.
- `npm test` passed 77 tests. TypeScript and focused ESLint passed. The optimized Next.js build passed with inert build-time Supabase placeholders and only the repository's existing warnings. Playwright passed all 15 applicable desktop/mobile checks with seven expected project-specific skips, including the Google-only Login contract, tier entry, plan confirmation, CSP, and the 11-inch iPad composition check.

### Rollback

Revert this local Slice 1 change. The Production Email provider remains independently disabled, so reverting application code cannot expose password signup.

---

## 2026-09-19 - Verify the PR #54 Preview auth boundary

### What we were trying to achieve

Verify the deployed Slice 1 boundary without enabling Email, configuring an intent secret, creating a user, or changing hosted authentication.

### Feature / change being made

Preview evidence for draft PR #54. No application behaviour changed in this follow-up.

### Files changed

- `CODEBASE_REVIEW.md`
- `PRODUCT_BACKLOG.md`
- `EMAIL_PASSWORD_SIGNUP_AND_RECOVERY_JOURNEY.md`
- `UPDATE_LOG.md`

### Change and verification

- All four PR checks passed, including both Vercel projects and the browser-accessibility workflow. GitHub reports the draft PR as cleanly mergeable into `clone-clean`.
- Primary `song-review-app-v2` Preview deployment `dpl_FRi2S1GDVmFvbAATCoVEPKA6aYZL` reached Ready. Its branch alias is `https://song-review-app-v2-git-codex-ema-23142d-corisleachmans-projects.vercel.app`.
- The homepage and Login returned `200`. Signed-out `/dashboard` returned `307` to `/login?redirectTo=%2Fdashboard`.
- Supplying the retired `song_review_auth` and `song_review_identity` cookies did not bypass authentication; `/dashboard` still returned the same signed-out redirect.
- With Email still default-off, a fake confirmation request returned `303` to `auth=email_unavailable`. A fake continuation intent returned `303` to `auth=invalid_intent`.
- Confirmation and continuation responses contained `Cache-Control: no-store, max-age=0` and `Referrer-Policy: no-referrer`.
- Preview CSP was enforced against staging Supabase `ivifkrtupqizyqqsxdty.supabase.co`, retained `frame-ancestors 'none'`, and included `X-Frame-Options: DENY`. No report-only header was present.
- The deployed Login bundle contained `Continue with Google` and the Google-only beta message, with no Email continuation or forgotten-password control.
- The primary Vercel environment inventory contains neither `EMAIL_PASSWORD_AUTH_ENABLED` nor `AUTH_INTENT_SECRET`. No hosted variable or service setting changed.
- Deployment-scoped logs showed only the expected `200`, `303`, and `307` verification requests. The one-hour scan returned no 5xx or error-level event.
- The first Preview check stopped at the Vercel access boundary rather than using or transmitting the user's credentials. Final documentation-head Preview `dpl_D2b43o3ME9ydGU3jdgv1xLQf21w2` then reached Ready with all four checks passing.
- The user completed the protected Preview journey and confirmed that Google login, the return destination, and session persistence after reload all passed. This closes the full Slice 1 Preview gate.
- PR #54 stays draft pending code review and explicit rollout approval. Production is unchanged.

### Rollback

No rollout occurred. Revert the PR branch commit if the candidate needs to be abandoned; the independently disabled Production Email provider remains the outer safeguard.

---

## 2026-09-20 - Build default-off email signup and login forms

### What we were trying to achieve

Start Slice 2 without exposing an unfinished authentication method or changing any hosted service. The staging candidate needed coherent login, signup, verification, and resend states that reuse the shared boundary shipped in PR #54.

### Feature / change being made

Slice 2A of the email/password journey: server-gated account-entry forms, bounded server routes, check-email and resend UX, and a staging rollout contract.

### Files changed

- `app/login/page.tsx`
- `app/login/page.module.css`
- `app/auth/check-email/page.tsx`
- `app/auth/check-email/page.module.css`
- `app/api/auth/email/config/route.ts`
- `app/api/auth/email/login/route.ts`
- `app/api/auth/email/signup/route.ts`
- `app/api/auth/email/resend/route.ts`
- `lib/authFeatureFlags.ts`
- `lib/emailPasswordAuthCore.ts`
- `lib/emailPasswordAuthServer.ts`
- `middleware.ts`
- `next.config.js`
- `tests/auth-boundary.test.mjs`
- `tests/critical-contracts.test.mjs`
- `EMAIL_PASSWORD_STAGING_ROLLOUT.md`
- `EMAIL_PASSWORD_SIGNUP_AND_RECOVERY_JOURNEY.md`
- `TIER_SIGNUP_AND_UPGRADE_JOURNEY.md`
- `PRODUCT_BACKLOG.md`
- `CODEBASE_REVIEW.md`
- `UPDATE_LOG.md`

### Change and verification

- Email controls remain hidden unless the server-only Email flag is true and the auth-intent secret has at least 32 characters. The normal Production configuration therefore stays Google-only.
- Login and tier-aware signup now use distinct states. Signup collects a display name rather than creating a username or handle, applies a 12-character password minimum, uses correct autocomplete values, and keeps Google available.
- Server routes enforce same-origin JSON requests, a 16 KB request limit, normalized email validation, bounded names and passwords, strict destination normalization, and neutral public provider responses.
- Password login returns through the existing sealed continuation. Signup binds the sealed intent to the normalized email, carries the existing referral code, and refuses to return an unexpected session when hosted email confirmation is misconfigured.
- The check-email state survives a same-tab reload without putting the email address in the URL. It offers a 60-second resend cooldown, changed-email escape, and a neutral Google-account hint. Its server layout redirects to Login while Email auth is disabled.
- Confirmation, continuation, and check-email responses now use no-store and no-referrer headers. Middleware treats check-email as public.
- The API can pass a CAPTCHA token to Supabase, but no provider widget or CSP allowance was added because the provider choice is still open.
- Local TypeScript and focused ESLint passed. The test suite passed 80 tests. A local Playwright render check passed at 1440×900 and 390×844 with no page errors, error overlay, or horizontal overflow. The check-email route returned `200` and rendered correctly on the phone viewport. The default-off public Chromium suite then passed 15 applicable checks with seven expected project skips.
- No form was submitted to Supabase. No email was sent and no account was created. No Vercel variable, Supabase Auth setting, SMTP setting, database, billing setting, or Production deployment changed.
- Slice 2A was committed as `c4b08016`, pushed on `codex/email-password-staging-forms`, and opened as draft PR #55 against `clone-clean`. GitHub reports it as cleanly mergeable, and all four checks passed: `public-surfaces`, both Vercel projects, and Vercel Preview Comments.
- Primary `song-review-app-v2` Preview deployment `dpl_4QFuynYcjNPN86xdmVwf9pKMpMpi` reached Ready at `https://song-review-app-v2-ne1hum2v0-corisleachmans-projects.vercel.app`.
- The Preview homepage and Login returned `200`; signed-out `/dashboard` returned `307` to `/login?redirectTo=%2Fdashboard`. `/api/auth/email/config` returned `{\"enabled\":false}`, a disabled email-login request returned `404`, and a synthetic confirmation request returned `303` to `/login?auth=email_unavailable`.
- A live Chrome check confirmed that Login rendered only the Google account option. Opening `/auth/check-email` returned to `/login?auth=email_unavailable`; no Email or password control was exposed.
- Standard responses retained enforced CSP against staging Supabase `ivifkrtupqizyqqsxdty.supabase.co`, `frame-ancestors 'none'`, and `X-Frame-Options: DENY`, with no report-only header. `/embed/*` retained `frame-ancestors *` and omitted `X-Frame-Options`.
- Deployment-scoped scans returned no error-level event or 5xx response. The only warnings were CSP reports for Vercel's injected Preview Toolbar script at `https://vercel.live`, not Song Room application code.
- PR #55 remains draft. The enabled staging journey has not started: no Email form was submitted, no message was sent, no account was created, and no hosted or Production setting changed.

### Rollback

Discard or revert this Slice 2A branch. The default-off flag and independently disabled Production Email provider remain the outer safeguards.
