# Settings Model

## Purpose

This document defines where settings should live now that one signed-in user can belong to multiple workspaces.

The rule is:
- user-level settings follow the person across every workspace
- workspace-level settings belong to the active workspace and are usually owner-controlled

This prevents a user from changing something in one workspace and being unsure whether they changed their own account or the band's shared workspace.

---

## Current State

`/api/profile/settings` is now the canonical user-level route for color theme values:
- `primary_color`
- `accent_color`
- `background_color`

It persists to `profile_settings.user_id`, keyed by `resolved.identity.userId`.

`/api/settings` remains as a compatibility alias for older callers.

The old `settings.user_identity` table is still used as a fallback when:
- the `profile_settings` migration has not been applied yet
- a user does not yet have a `profile_settings` row but has a legacy saved theme

The old key is transitional because:
- it is display-name-derived, not a stable auth id
- it was originally built for fixed identities such as `Coris` and `Al`
- it does not clearly answer whether the setting belongs to the person or the workspace
- it can become ambiguous when the same user belongs to multiple workspaces

The current settings page also mixes two categories:
- personal theme controls
- workspace plan, members, invites, and access controls

The mixed page is acceptable for now, but the data model should separate these concerns before adding more controls.

---

## Decision

Theme colors are user-level settings.

They describe how the signed-in person wants the app to look, not how a shared workspace should look for every collaborator.

Workspace administration settings should be workspace-level and owner-controlled.

---

## Settings Map

| Setting or control | Level | Editable by | Current location | Target persistence |
|---|---|---|---|---|
| Theme primary color | User | Signed-in user | `/api/profile/settings` via `profile_settings.user_id` | Implemented |
| Theme accent color | User | Signed-in user | `/api/profile/settings` via `profile_settings.user_id` | Implemented |
| Theme background color | User | Signed-in user | `/api/profile/settings` via `profile_settings.user_id` | Implemented |
| Display name | User | Signed-in user | `profiles.display_name` | `profiles.display_name` |
| Email | User | Auth provider | Supabase Auth / `profiles.email` | Supabase Auth / `profiles.email` |
| Notification preferences | User | Signed-in user | Not implemented | user profile settings keyed by auth user id |
| Default active workspace | User | Signed-in user | active workspace cookie | user preference if persistence is needed |
| Workspace name | Workspace | Owner | `accounts.name` | `accounts.name` |
| Workspace plan | Workspace | Owner | `accounts.plan` | `accounts.plan` |
| Stripe customer/subscription | Workspace | Owner via billing flow | `accounts` billing columns | `accounts` billing columns |
| Members | Workspace | Owner for removal, all members can view | `account_memberships` | `account_memberships` |
| Pending invites | Workspace | Owner | `account_invites` | `account_invites` |
| Member permission policy | Workspace | Owner | Not implemented | workspace settings keyed by account id |
| Reviewer/commenter role policy | Workspace | Owner | Not implemented | role/member records plus workspace policy |
| Shared workspace branding | Workspace | Owner | Not implemented | workspace settings keyed by account id |

---

## Route Shape

- `/api/profile/settings`
  - user-level preferences
  - keyed by `resolved.identity.userId`
  - editable by the signed-in user
- `/api/settings`
  - compatibility alias for `/api/profile/settings`
- `/api/workspace/settings`
  - workspace-wide settings
  - keyed by `resolved.identity.workspaceId`
  - editable by workspace owner unless a specific setting is intentionally collaborative

---

## Migration Plan

1. Apply `migrations/20260502_profile_settings_up.sql` in Supabase production.
2. Verify saving a theme writes a `profile_settings` row keyed by auth user id.
3. Keep `/api/settings` as a temporary compatibility route.
4. Add `/api/workspace/settings` only when there is an actual workspace setting to persist, such as workspace name or member permission policy.
5. Remove legacy `settings.user_identity` fallback after production data has migrated.

Do not add owner permission controls to `/api/settings`; those belong to workspace-scoped routes.

---

## Product Copy Direction

Personal theme area:
- "Personal theme"
- "These colors follow you across every workspace."

Workspace administration area:
- "Workspace settings"
- "These controls affect the current workspace."
- "Only the workspace owner can manage billing, invites, member removal, and future permission policies."

---

## Open Questions

- Should workspace owners be able to set shared branding later, separate from each user's personal theme?
- Should default active workspace persist server-side, or is the current active workspace cookie enough for MVP?
- Should notification preferences be per-user globally, or per-user per-workspace?

Recommendation for MVP:
- keep theme global per user
- keep active workspace in the cookie
- defer shared workspace branding
- treat notification preferences as user-level first
