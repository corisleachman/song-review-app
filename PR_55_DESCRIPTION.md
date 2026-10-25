# PR #55 description source

Prepared locally on 25 October 2026 and approved for publication to PR #55. The PR description starts below; publication and deployment results must be verified separately.

---

## Summary

Add Email/password signup, login, confirmation resend, recovery, password reset, and signed-in Add/Change password alongside Google. Preserve protected destinations, referrals, workspace invitations, and paid-tier choices across confirmation browsers without duplicating the account graph.

Email entry and Account security have separate, default-off server flags. Readiness also requires the auth-intent secret, Turnstile public key, and application login limiter. Keep this PR draft until the approved review gate is complete.

## Security and data changes

- Email form mutation routes enforce same-origin requests and validate their inputs. Routes reading form data require JSON and reject bodies over the configured 16 KiB limit. Signup, login, resend, and recovery pass Turnstile tokens to Supabase; account management instead requires a verified signed-in user and the applicable recovery or reauthentication checks.
- Signup, resend, and recovery responses do not disclose whether an account exists. Application Auth logs use fixed messages and provider codes rather than credentials or full provider errors.
- Expiring confirmation state is stored in a server-only table. Confirmation links carry an opaque flow ID and the required Supabase token hash, not the sealed continuation payload or referral state. Confirmation responses use no-store and no-referrer headers. Do not record real confirmation URLs or tokens in evidence.
- The application login limiter stores an environment-specific HMAC of Vercel's visitor IP, not the raw IP. Its atomic server-only counter permits fifteen attempts per aligned five-minute window and rejects attempt sixteen with `429` before Supabase Auth. Missing required configuration or a failed counter closes the login route.
- Invitation acceptance locks the invitation and creates its membership in the same database transaction. It checks the authenticated user's canonical email and handles repeated acceptance without duplicate memberships. A mismatched signed-in user can sign out and continue with the invited address.
- Upgrade Next.js to `15.5.28` and Sharp to `0.35.5`. Include the reviewed phone-width WebKit overflow and inactive-plan contrast repairs.

## Database prerequisites

These reviewed migrations have already been applied and verified in staging and Production:

1. `20261011161736_harden_account_invites_access.sql`
2. `20261013171251_create_email_auth_flows.sql`
3. `20261023174605_email_login_rate_limits.sql`
4. `20261024165859_accept_workspace_invite_atomically.sql`

The Email-flow and limiter tables have RLS enabled without client policies. Client roles cannot access the tables or execute the limiter and invitation RPCs. Verification covered function ownership and grants, limiter expiry and concurrency, every invitation result branch, and concurrent acceptance producing exactly one membership. Temporary verification fixtures were removed. No further schema change is proposed for the hidden application deployment.

## Protected Preview evidence

The staging gates recorded in `EMAIL_PASSWORD_STAGING_ROLLOUT.md` passed:

- Free signup, SMTP delivery, confirmation across browsers, resend, password login, recovery, reset, and sign-out/re-entry.
- Recent-session password change, older-session emailed-code reauthentication, Password changed notification, Google-account Add password, and two-browser session revocation. Existing access tokens can remain valid until expiry; this is not an instant-logout promise.
- Malformed, expired, revoked, used, mismatched-account, new-account, existing-password-account, and existing-Google-account invitation cases. The atomic acceptance route was also exercised on the deployed protected Preview and its temporary fixture removed.
- Referral attribution across browsers and Pro annual/Studio monthly destination preservation. Paid journeys stopped before Stripe checkout; no live payment was submitted.
- A bounded limiter test allowed fifteen provider-intended submissions and rejected the sixteenth without a sixteenth password grant. Post-window checks covered successful Email login, recovery availability without sending mail, Google availability, controlled-alias absence, and log safety.
- Available Chromium, Firefox, WebKit, and native desktop Safari coverage. The documented Safari keyboard preference explains the automated focus exceptions. This is not a claim that every physical device ran every Auth journey.

Controlled identity checks retained the expected canonical users, profiles, workspaces, and memberships. See the dated rollout entries for the scope and cleanup of each test rather than treating all historical checkpoints as the current state.

## Repository verification

- All 94 repository tests pass.
- TypeScript passes with incremental output disabled.
- Full ESLint completes with zero errors and 48 existing warnings.
- `npm audit --omit=dev` reports zero vulnerabilities.
- The optimized Next.js build previously passed at the unchanged application code with synthetic non-Production Supabase placeholders. It was not a live Production integration test.
- `git diff --check` passes. The branch incorporates `clone-clean` commit `ac0fe655`; the previous documentation conflict is resolved with both histories retained.

The tests, TypeScript, lint, dependency audit, and whitespace checks were refreshed on 25 October 2026. Hosted journey evidence is dated separately in the rollout document and was not all repeated in this repository review.

## Rollout status

The application code is pushed and deployed only to protected Preview. Production still runs `clone-clean` commit `ac0fe655` on deployment `dpl_CwLtEzDWi1ShB67yZeFp5T9H14tp`.

The approved hidden Production configuration package is complete: dedicated domain-restricted Resend SMTP credential, tested templates, password safeguards, separate www-only Turnstile widget, canonical `https://www.song-room.live`, and independent Production-only auth-intent and limiter secrets. The limiter is enabled in saved Production configuration. Those Vercel changes take effect on a later deployment.

Supabase Email remains disabled and Google enabled. Production `EMAIL_PASSWORD_AUTH_ENABLED` and `SIGNED_IN_PASSWORD_MANAGEMENT_ENABLED` remain absent. No application merge, Production application deployment, public Email activation, or live Production Auth email test is included in this preparation.

## Remaining gates

1. The documentation push and PR refresh are approved. Recheck the exact resulting head, Preview deployment, and required checks. Keep the PR draft unless a later approval authorizes its transition.
2. With separate authority, mark ready and merge into `clone-clean`, allowing the hidden application deployment. Keep Supabase Email disabled and both public Email flags absent. Verify the exact live commit, Google login and protected destinations, hidden Email controls, closed mutation routes, server-only objects, and log safety. Stop on any failure before activation.
3. With separate activation approval, enable the Production Email provider while entry stays hidden, verify the closed application boundary, then enable only `EMAIL_PASSWORD_AUTH_ENABLED` and redeploy. Run the agreed controlled Production signup, delivery, confirmation, login, recovery, account-graph, limiter, and log checks. Approve Account security separately after that gate passes.

No Stripe payment, unrelated backlog change, redirect-allowlist cleanup, or credential-hygiene refactor is included.

## Rollback and stop conditions

Before any real Production password users exist, keep the public flags absent and restore the previous verified deployment if the hidden deployment fails. The additive server-only migrations can remain in place.

Once real password users exist, do not disable Supabase Email or routinely remove `EMAIL_PASSWORD_AUTH_ENABLED`: this shared flag closes login and recovery as well as signup. There is no independent signup-only switch in this change. Restore the last verified application and supporting configuration while preserving password login/recovery and Google. Account security can be closed independently using its own flag.

Stop for unexpected public entry, wrong-host mail, credential exposure, duplicate identity or membership, failed password change, or unexpected session behavior. Record the environment, redacted URL, step, visible error, safe log excerpt, and screenshot where useful. Never include the password, token, CAPTCHA value, or full confirmation link.
