# AGENTS.md

## Purpose
This project is a song collaboration app for uploading songs, managing multiple versions, commenting against timestamps/waveforms, and tracking actions/tasks across versions.

The priority is reliability, clarity, and preserving the canonical data flow. Do not make speculative changes.

---

## Core Principles

1. Fix the root cause, not just the symptom.
2. Prefer the existing canonical server-backed data path over duplicate client-side fetching.
3. Keep changes tightly scoped to the task.
4. Do not refactor unrelated areas while fixing a bug.
5. Preserve production stability over code elegance.
6. When uncertain, inspect the current implementation before changing behavior.
7. Always explain what changed, why, and any remaining risk.

---

## Working Style

- Read the relevant files first before proposing edits.
- Identify the likely root cause.
- Make the smallest viable change that solves the issue cleanly.
- Reuse existing patterns already present in the app.
- Avoid introducing new abstractions unless they remove a repeated problem.
- Do not change naming, copy, or UI structure unless required by the task.
- Do not silently alter business logic outside the task scope.

---

## Required Workflow For Every Task

1. Summarise the task in 1 to 3 lines.
2. Inspect the relevant files and data flow first.
3. State the likely root cause or working hypothesis.
4. Create a short implementation plan.
5. Make the change.
6. Run the most relevant checks.
7. Return a concise implementation summary including:
   - changed files
   - what changed
   - what was verified
   - any open risk or follow-up
8. When a task results in a real app/documentation change, add or update an entry in `UPDATE_LOG.md` with:
   - changed files
   - what we were trying to achieve
   - which feature or change was being made

---

## Output Format

For every completed task, return:

### Summary
Brief description of the fix or change.

### Root Cause
What was causing the issue.

### Changed Files
- path/to/file.tsx
- path/to/file.ts

### Verification
- tests run
- manual flows checked
- anything not verified

### Risks / Follow-ups
Any remaining uncertainty, tech debt, or recommended next step.

### Your Actions
- State explicitly whether the user needs to do anything.
- If no action is required, write: `No action required from you.`
- If action is required, give a numbered checklist. Every step must include:
  - who should do it (`User` or `Agent`)
  - where to do it (for example Supabase SQL Editor, Vercel, Stripe, GitHub, local terminal, or the app)
  - the exact action or command, without exposing secret values
  - the expected successful result
  - what evidence or error details to return if it fails

### Next Step
End with one clear recommended next step. Do not leave multiple possible next steps without identifying which one should happen first.

---

## Major Update Handoff Protocol

Use this protocol after any substantial update, including changes that affect multiple files, database schema, authentication, billing, storage, dependencies, deployment configuration, security boundaries, or an important user journey.

1. **Separate implementation status from rollout status.**
   - Say whether the change is only local, committed, pushed, in a pull request, deployed to preview/staging, or deployed to production.
   - Use `Code complete` only for finished repository work.
   - Use `Production complete` only after required migrations, external configuration, deployment, and live verification are confirmed.
2. **List every external action still required.**
   - Cover Supabase migrations, Vercel variables/deployments, Stripe webhooks/products, Resend configuration, GitHub push/merge, cache invalidation, or other service changes.
   - Never imply that an external change has happened unless it was verified.
3. **Provide an exact verification checklist.**
   - Put checks in the safest execution order.
   - Name the environment for each check: local, preview/staging, or production.
   - Give the expected visible or data result for each check.
   - Include stop conditions: if a check fails, stop the rollout and report the URL, step, error text, relevant log excerpt, and screenshot where useful.
4. **Explain rollout and rollback.**
   - State whether migrations must run before or after application deployment.
   - Identify the relevant down migration, revert commit, feature flag, or previous deployment when a rollback exists.
   - Flag irreversible or data-destructive steps before they happen.
5. **Assign ownership clearly.**
   - Say which actions the agent can perform if authorised and which require the user because they involve credentials, dashboards, billing, production data, or approval.
   - Offer to perform safe repository/GitHub actions, but do not push, merge, deploy, or change production services without authority.
6. **Close the loop.**
   - End with one recommended next step.
   - After the user completes an external step, verify the result where access allows and update the status from code-complete toward production-complete.

---

## Project-Specific Rules

### Data and Fetching
- Prefer canonical server routes for reads where that pattern already exists.
- Do not introduce duplicate fetching paths for the same screen unless explicitly required.
- Respect the current account/workspace data boundaries.
- Be careful with caching. If debugging freshness or stuck-loading issues, inspect cache settings first.
- For production-sensitive reads, prefer explicit behavior over framework defaults.

### Song / Version / Action Model
- Preserve the distinction between:
  - song-level data
  - version-level data
  - actions tied to a specific version
  - actions visible across all versions
- Do not collapse version-specific and song-wide contexts unless the task explicitly asks for it.
- Keep source context visible where actions span versions.

### Audio / Playback
- Be careful with global audio state and cleanup behavior.
- Prevent overlapping playback across songs.
- Do not break background/lock-screen playback when fixing playback coordination bugs.
- Avoid fixes that rely on brute-force teardown of browser media behavior unless necessary.

### UI / UX
- Keep the UI simple and readable.
- Preserve existing terminology unless the task explicitly requires copy changes.
- Avoid unnecessary layout shifts.
- Prefer clear loading, empty, and error states over silent failures.

### Supabase / Backend
- Do not modify auth, storage, account membership, or schema unless the task requires it.
- Never assume schema parity across environments without checking.
- If a column may be missing in one environment, use a safe fallback where appropriate.
- Be cautious with service-role usage and keep sensitive logic server-side.

### Safety Boundaries
Do not, unless explicitly required by the task:
- change auth flows
- change billing/account model
- alter environment variable usage
- introduce new third-party dependencies
- delete files
- modify database schema
- alter deploy configuration

These require explicit justification and likely approval.

---

## Debugging Guidance

When debugging:
- trace the exact read path
- inspect server vs client boundaries
- inspect caching and loading states
- compare local vs production behavior
- check whether the bug is caused by stale data, duplicated state, or environment mismatch
- prefer observable evidence over guessing

---

## Testing Expectations

At minimum, run the most relevant checks for the touched area:
- lint if the task affects app code broadly
- typecheck when changing TypeScript logic
- targeted tests when available
- manual flow verification for the affected user journey

If something cannot be verified, say so explicitly.

---

## Git Hygiene

- Keep commits focused.
- Do not bundle unrelated changes.
- Do not rewrite large sections of a file without good reason.
- Summaries should be understandable to a non-engineer reviewing progress.

---

## Escalate Instead Of Guessing When

Escalate or flag clearly if:
- the bug points to environment/config mismatch
- a fix may require schema changes
- the issue involves auth/session/account boundaries
- the issue needs production logs or data you cannot access
- the safe fix is unclear and multiple architectural options exist
