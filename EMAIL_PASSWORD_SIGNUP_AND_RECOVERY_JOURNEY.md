# Email/Password Signup and Recovery Journey

Status: Product and technical journey plan prepared on 19 September 2026. Slice 1 reached Production through PR #54 as merge commit `fddab843`. Slice 2A is committed in draft PR #55 and passed its default-off Preview gate. Cloudflare Turnstile was explicitly selected for Slice 2B; the guarded widget, mandatory token forwarding, single-use reset behavior, and conditional CSP support are implemented locally. Hosted Turnstile keys, staging SMTP, templates, and redirect configuration remain rollout blockers. Production remains Google-only with Email disabled.

Configuration audit: Slice 0 is complete. `AUTH_CONFIGURATION_AUDIT.md` records the repository, Vercel, Production public Auth behavior, and the hosted Supabase dashboard baseline for both environments. The approved temporary safeguard disabled Production Email while leaving Google enabled. No other hosted setting changed.

## Outcome

Add email/password as a second way to enter the same Song Room account system. Google stays available. Microsoft is not part of this work.

The first useful outcome is not merely creating an auth record. A new or returning person must reach the workspace, song, invite, or plan they intended to reach, with their referral and membership context intact.

## Product decisions

1. Use email as the sign-in identifier.
2. Ask for a name during signup and store it as the person's display name. Do not introduce a unique username, public handle, or username-based login in this slice.
3. Require email verification before the app creates a profile, workspace, membership, or referral reward.
4. Keep Google and email/password side by side. Do not force existing Google users to migrate.
5. Use the existing Supabase user UUID as the canonical identity for either method. The profile, membership, referral, storage, and billing models remain provider-neutral.
6. Preserve one allowlisted post-authentication continuation path for Google, signup confirmation, password login, and password recovery.
7. Give a valid workspace invite priority over every pricing or protected-page intent.
8. Never open Stripe automatically after signup. Paid choices still open the existing plan confirmation page, and only a workspace owner can continue to checkout.

## Why this needs a complete journey

The current public flow is deliberately Google-only. Adding two fields to `/login` would leave several failures unresolved:

- `/auth/reset-password` is an old partial screen. There is no forgot-password request screen, resend-verification journey, or clear expired-link recovery.
- `/auth/callback` is written around Google and visibly returns to Login before continuing.
- Invite entry is Google-specific and stores its return path only in browser session storage.
- Tier intent is carried in query parameters through the Google journey.
- Referral attribution relies on a same-browser HTTP-only cookie that may not exist when a confirmation email is opened on another device.
- Middleware still accepts legacy `song_review_auth` and `song_review_identity` cookies before checking the Supabase session. That shortcut must not become part of the new password security boundary.
- The existing `/api/auth/verify-password` route checks a shared beta password. It is not user authentication and must not be reused.

The smallest safe release is therefore a coherent auth slice, not a standalone form.

## Existing rules to preserve

- One Supabase auth user maps to one `profiles.id` and can belong to multiple workspaces.
- Direct signup creates a personal owner workspace after verification.
- Invite-first signup accepts the invite before creating an unnecessary personal workspace. The invited workspace becomes active.
- A later workspace can still be created through the existing workspace journey.
- Referral reward creation stays idempotent by referred user and applies only to a genuinely new direct account/workspace.
- Existing paid workspaces, non-owner memberships, and active-workspace selection keep their current behavior.
- Redirect destinations use explicit route patterns. Never accept an arbitrary URL from the browser.

## Intent and continuation model

Create one server-owned auth intent used by every authentication method.

The intent should contain only validated fields:

- purpose: login, signup, invite, or recovery
- destination kind: invite, protected route, paid plan, or dashboard
- allowlisted route parameters such as song ID, version ID, plan, billing period, and source
- referral code when present
- normalized email hash when the intent must be bound to an address
- issued-at time, expiry, and format version

Seal the intent with authenticated encryption and a dedicated server secret. Keep it short-lived. Put the opaque sealed token in the verification redirect so it survives an email being opened on another device. Also keep a secure, HTTP-only, SameSite cookie for the normal same-browser journey.

Do not place a raw email, password, access token, refresh token, unrestricted return URL, or readable invite capability in the intent. A dedicated `AUTH_INTENT_SECRET` should be different in staging and Production and requires an approved Vercel configuration change. If a compact sealed token cannot safely carry invite state, use an opaque one-time server record rather than exposing the invite token.

Continuation priority:

1. Valid invite for the signed-in email.
2. Valid protected Song Room destination that started the login.
3. Valid Pro or Studio plan confirmation.
4. Dashboard.

Referral attribution is carried alongside that destination. On successful confirmation, restore the validated referral into the existing secure referral-cookie path before account bootstrap. The existing database uniqueness rules remain the final duplicate-reward guard.

Invalid, expired, altered, or already-consumed auth state falls back to a safe screen. It never falls through to a caller-supplied URL.

## Proposed routes and states

| Route | Purpose |
| --- | --- |
| `/login` | Returning-user screen with Email and Google options. Accepts only validated Song Room intent. |
| `/signup/[plan]` | Name, email, and password form with the selected Free, Pro, or Studio context. Google remains available. |
| `/auth/check-email` | Confirmation sent, resend cooldown, change-email escape, and neutral account-safety copy. |
| `/auth/confirm` | Server-side `token_hash` exchange for signup or recovery, using the SSR/PKCE cookie client. |
| `/auth/continue` | One truthful transition that resolves invite, referral, protected destination, bootstrap, and plan intent. |
| `/forgot-password` | Email request form with a uniform success response whether or not an account exists. |
| `/auth/reset-password` | Verified recovery session, new password, expired-link recovery, and successful completion. Replaces the dormant page rather than extending it in place without review. |
| `/settings/account` | Add password for a Google-created account, change password, and display the verified email. |

If a signed-in user opens Login or Signup, do not show an actionable auth form. Send them through `/auth/continue` with clear “Opening your workspace” or destination-specific copy.

## Journey specifications

### 1. Neutral new signup

1. User chooses Email on the neutral account entry screen.
2. User supplies name, email, password, password confirmation, and accepts the Terms and Privacy notice.
3. The form validates locally, submits once, and moves to `/auth/check-email`.
4. The confirmation link reaches `/auth/confirm`, creates a cookie-backed session, then calls `/auth/continue`.
5. Account bootstrap writes the profile and personal owner workspace once.
6. Dashboard opens in that workspace with a first-song action.

### 2. Tier-aware signup

1. `/signup/free`, `/signup/pro`, and `/signup/studio` show the selected tier and billing period before the form.
2. The choice survives verification through the sealed auth intent.
3. Free finishes at the dashboard.
4. Pro or Studio finishes at the existing preselected `/upgrade` confirmation.
5. Checkout starts only after an owner explicitly confirms.

### 3. Referral signup

1. `/r/[code]` continues to validate the referral and set the secure cookie.
2. Signup captures the validated code in the sealed auth intent so an email opened elsewhere does not lose attribution.
3. Confirmation restores the server-controlled referral context before first bootstrap.
4. The existing referred-user uniqueness check prevents repeat credit after refresh, resend, or a second provider login.
5. Invalid or self-referrals do not block signup.

### 4. Workspace invite

1. The invite page offers Email and Google without hiding the invited address.
2. Email signup is prefilled and locked to the normalized invited email. Existing users can switch to Login.
3. After verification or login, `/auth/continue` validates that the session email matches the invite.
4. The invite is accepted and its workspace becomes active before normal direct-signup workspace creation.
5. A mismatched signed-in account gets a clear switch-account action. It cannot accept the invite.
6. Expired, revoked, or used invites retain their existing safe outcomes and do not create a workspace by accident.

### 5. Protected-page login

1. Middleware converts the requested route into a validated intent.
2. Login shows destination context such as “Log in to open this song”.
3. Password and Google both return through `/auth/continue`.
4. The exact allowlisted destination opens after session and membership checks.
5. If access no longer exists, the user reaches a clear safe state rather than a redirect loop.

### 6. Returning password login

1. User enters email and password.
2. Invalid credentials produce one neutral message and keep the email field available for correction.
3. Success goes immediately to `/auth/continue`; it does not render Login again.
4. The screen exposes Forgot password and Continue with Google without implying that the app knows which method an email uses.

### 7. Forgot password

1. User enters an email.
2. The response is always: “If an account can use password recovery, we’ve sent an email.”
3. The page offers resend after a visible cooldown and a return to Login.
4. Recovery email links use the same server-side confirmation route and strict redirect allowlist.

### 8. Reset, expired, and used recovery links

1. A valid recovery token establishes a recovery session before the new-password form appears.
2. The user enters and confirms a password that meets the same project policy as signup.
3. Success invalidates other sessions where supported, keeps or establishes the current session deliberately, then continues to the original safe destination or dashboard.
4. Expired, altered, or already-used links never show an endless “Verifying” state. They show Request another link and Return to Login.

### 9. Verification resend and changed email

1. Check-email state shows the normalized destination address without exposing it in telemetry.
2. Resend is rate-limited and gives a visible countdown.
3. Change email returns to the original signup context without preserving the old password.
4. Every resend creates a fresh confirmation path while old or consumed links fail safely.

### 10. Password management for signed-in users

1. Password-created accounts can change their password from Settings after recent authentication.
2. Google-created accounts can choose Add a password while signed in. Supabase documents `updateUser({ password })` for this case.
3. The app should require a recent session or Supabase reauthentication nonce before this security-sensitive change.
4. A successful add/change sends the relevant security notification and does not create another profile or workspace.

### 11. Existing Google account enters email signup

Supabase returns an obfuscated response and does not send a verification email when that verified email already belongs to an OAuth account. Keep the public response neutral. On the check-email screen, show generic help: “Already use Google? Continue with Google, then add a password in Settings.” Do not reveal whether that address exists.

### 12. Existing password account chooses Google

Allow Supabase automatic identity linking only when its verified-email rules succeed. The canonical Supabase user ID must remain unchanged in staging tests. Do not build a client-side merge, match on display name, or use manual linking as the default path.

### 13. Sign out and re-entry

Sign out clears the Supabase session, active workspace state that should not survive sign-out, legacy auth cookies, and pending auth intent. Re-entry through either provider uses the last valid workspace only after membership validation.

## Password and abuse controls

- Start with a 12-character minimum and allow password-manager paste. Do not impose composition rules that block long passphrases unless staging usability shows a clear reason.
- Enable Supabase leaked-password protection if the project plan supports it.
- Enable recent-login reauthentication for password changes.
- Review and record Supabase limits for email sends, token verification, signup, login, refresh, and recovery in both environments.
- Use Cloudflare Turnstile on signup, login, verification resend, and the future password-recovery request before public release. Supabase Auth validates the token using its hosted Turnstile secret; the application must never expose or duplicate that secret.
- Use neutral login, signup, resend, and recovery responses that do not confirm whether an email exists.
- Map Supabase failures to stable Song Room copy. Do not put raw provider messages in query parameters or user-visible URLs.
- Keep confirmation and recovery tokens out of analytics, application logs, error reports, and referrer-bearing third-party requests.
- Apply server-side validation to name, email, intent, token type, and destination. Client validation is only a convenience.

## Auth email requirements

Production must use a custom SMTP service before password signup is enabled. Supabase's default sender is for trial use and is rate-limited. The sender domain, SPF, DKIM, DMARC, reply behavior, bounce handling, and delivery monitoring need explicit verification.

Required templates:

- Confirm signup
- Reset password
- Email changed
- Password changed
- Identity linked and unlinked, if enabled by the project plan

Use a custom confirmation link with `token_hash` and the intended token type, exchanged by `/auth/confirm`. Disable click tracking for auth emails because URL rewriting can break one-time links. Test provider link scanning so a mail-security bot cannot consume a confirmation before the user clicks it.

The template must say what happens, how long the link lasts, and what to do if the person did not request it. It must not contain pricing claims that can drift from the app.

## UI behavior

- Keep Login and Create account as distinct modes, with the current tier named on signup.
- Use one primary action per state.
- Keep Google visible but secondary when the user has chosen Email, and reverse that hierarchy only when they deliberately choose Google.
- Show password requirements before submission and announce errors next to the affected field.
- Use `autocomplete="name"`, `email`, `current-password`, and `new-password` correctly.
- Keep focus management, keyboard order, 44-pixel touch targets, reduced-motion behavior, and phone/tablet overflow in the acceptance gate.
- Replace the current apparent return to Login with one persistent progress state that names the next destination. This should also improve the separately logged Google sign-in return experience.

## Instrumentation

Record server-backed events without email addresses, names, passwords, tokens, invite tokens, or full destination URLs:

- signup started and submitted, with provider, entry kind, and plan
- verification sent, resent, completed, expired, and failed
- login completed or failed by normalized failure category
- recovery requested, completed, expired, and failed
- password added or changed
- continuation completed, with destination kind only
- invite accepted and referral attributed through existing idempotent records

Measure time from auth submit or provider return to useful destination content. This joins the existing slow Google-return investigation rather than creating a separate loading metric.

## Implementation order

### Slice 0: Hosted configuration audit

Complete. Repository and Vercel metadata, Production public Auth behavior, and the staging and Production dashboard settings were captured before changes. Both projects still use the built-in trial sender and default email copy; CAPTCHA, leaked-password protection, password-change reauthentication, explicit stronger password rules, and security notifications are off. Production has no password identities among its five confirmed users. After explicit approval, Production Email was disabled while Google remained enabled. A fresh public Auth response confirmed `email: false` and `google: true`, and a live Google continuation completed at the authenticated dashboard. Staging Email stays enabled for controlled development while Slice 1 is built with the Email UI feature flag off.

### Slice 1: Shared auth boundary

Code-complete locally on 19 September 2026. Production middleware no longer accepts the old `song_review_auth` and `song_review_identity` cookies as authentication. Browser fixtures have an explicit non-Production-only switch. Protected-route checks now validate signed Supabase claims rather than trusting the cookie-backed session object.

One destination allowlist now covers middleware, Google callback, Login, bootstrap, and the new continuation route. External, malformed, unknown, or query-expanded targets fall back to the dashboard. The new AES-256-GCM auth intent binds its purpose, destination, optional referral, optional normalized-email hash, issue time, expiry, and format version. Missing or short secrets, altered tokens, wrong keys, mismatched emails, and expired tokens fail closed.

`/auth/confirm` performs the future SSR token-hash exchange and `/auth/continue` verifies the user before bootstrap. Invite and recovery destinations deliberately skip direct-account bootstrap so they cannot create an unwanted personal workspace. `EMAIL_PASSWORD_AUTH_ENABLED` is server-only and evaluates to false unless its value is exactly `true`. No Email UI was added, no intent secret was configured, and the existing Google journey remains on its established callback behavior.

Draft PR #54 passed all four GitHub checks. Primary Preview `dpl_FRi2S1GDVmFvbAATCoVEPKA6aYZL` reached Ready and passed the automated route, redirect, legacy-cookie rejection, disabled-Email, transition-header, staging-CSP, and runtime-log checks. The deployed Login bundle contains the Google control and Google-only beta copy, with no Email or forgotten-password control. Vercel confirms that neither `EMAIL_PASSWORD_AUTH_ENABLED` nor `AUTH_INTENT_SECRET` is configured. Final documentation-head Preview `dpl_D2b43o3ME9ydGU3jdgv1xLQf21w2` passed all four checks, and the user confirmed the protected Google login, return destination, and persisted session. The full Slice 1 Preview gate is complete; the PR remains draft pending code review and explicit rollout approval.

### Slice 2: Login, signup, bot protection, and email delivery in staging

Slice 2A is committed in draft PR #55. It adds default-off Email login and tier-aware signup controls, server-side name/email/password validation, a neutral login failure, enumeration-resistant signup and resend results, a sealed email-bound continuation, a reload-safe check-email state, and a 60-second resend cooldown. Its default-off Preview gate passed.

Slice 2B selects Cloudflare Turnstile. Email readiness now requires its public site key, the widget renders explicitly on login/signup and resend, every server route requires the bounded token and forwards it to Supabase Auth, each attempt resets the single-use token, and CSP permits only Cloudflare's documented challenge origin while configured. Cloudflare's official test key produced tokens on desktop and phone layouts without a form submission. The app does not call Siteverify itself because Supabase Auth performs the hosted verification after its Turnstile secret is configured.

The remaining Slice 2 work is hosted: create environment-specific Turnstile widgets, configure the staging secret in Supabase Auth, configure custom SMTP and sender DNS, install the reviewed confirmation template, correct staging Site URL and redirects, strengthen the staging password policy, then enable the server flag in Preview only. No Production setting changes yet.

### Slice 3: Recovery and account settings

Replace the dormant reset page, add forgot-password, expired-link recovery, Add password, Change password, security notifications, and deliberate session handling.

### Slice 4: Referrals, invites, and tiers

Carry sealed auth intent across devices, prove referral idempotency, make invite-first membership work, and exercise every Free, Pro, and Studio path without automatic checkout.

### Slice 5: Controlled rollout

Enable behind a server-controlled feature flag in Preview/staging. After the complete acceptance matrix passes, configure Production SMTP/Auth settings, deploy code with the UI still hidden, run a production-safe mail smoke test, then expose Email gradually.

## Acceptance matrix

At minimum, test each applicable journey on desktop Chrome, desktop Safari, iPhone Safari, and an 11-inch iPad Safari. Use staging email addresses and Stripe Test mode.

| Area | Required checks |
| --- | --- |
| Direct signup | New email, verification in same browser and another browser, refresh, Back, duplicate submit, resend, changed email |
| Plans | Free, Pro monthly/yearly, Studio monthly/yearly, owner and non-owner, checkout cancellation, no automatic checkout |
| Referral | Same-browser and cross-device confirmation, invalid code, self-referral, repeated confirmation, existing user |
| Invite | New password user, existing password user, existing Google user, mismatched email, expired/revoked/used invite, invite before workspace creation |
| Protected routes | Dashboard, settings, song, version, and upgrade return paths; invalid and malicious redirect input |
| Login | Correct password, incorrect password, unverified account, Google option, signed-in visitor, sign-out/re-entry |
| Recovery | Existing password account, unknown email, Google-only email, expired/used/altered link, resend cooldown, change completed, other-session behavior |
| Linking | Google account adds password, password account chooses Google, same verified email keeps one user/profile/workspace, unverified conflict |
| Abuse | Rate limits, CAPTCHA, repeated requests, uniform responses, no secrets or raw provider errors in logs or URLs |
| Accessibility | Labels, error announcements, focus, keyboard, touch targets, zoom, reduced motion, no horizontal overflow |
| Operations | Delivery, SPF/DKIM/DMARC, link scanner, disabled click tracking, bounce visibility, security notifications, runtime errors |

Stop rollout if any flow creates a duplicate Supabase user, profile, workspace, membership, referral reward, or Stripe customer.

## Rollout and rollback

Configuration order matters:

1. Preserve the captured Auth baseline and export all current templates immediately before editing.
2. Configure and verify staging SMTP, redirect URLs, password policy, email confirmation, rate limits, CAPTCHA, and notifications.
3. Deploy and complete the staging matrix.
4. Prepare Production configuration and record every before-value.
5. Deploy Production code with Email hidden.
6. Apply approved Production Auth/SMTP settings.
7. Run one controlled Production signup, verification, login, recovery, and Google-regression check.
8. Enable Email and watch auth, delivery, runtime, and duplicate-account signals.

Rollback first hides Email signup/login and keeps Google available. Existing password users must still be able to recover or sign in during rollback, so do not simply disable the email provider after accounts exist. Revert application code only to a compatible version, restore recorded templates/settings if needed, and never delete password identities or user data as a rollback step.

## External actions requiring approval

- Add a dedicated auth-intent sealing secret to staging and Production Vercel environments.
- Configure Supabase Auth settings separately in staging and Production.
- Configure and verify custom SMTP credentials and sender DNS.
- Create separate Cloudflare Turnstile widgets for staging and Production, configure their public site keys in Vercel and their secrets only in the matching Supabase Auth projects.
- Approve the final auth email copy and Production enablement.

No migration is assumed by this plan. If invite-first membership cannot be made reliable without a server-side intent record, propose that schema change separately before implementation.

## Explicit non-goals

- Microsoft login
- unique usernames or public handles
- magic-link-only login
- phone authentication
- MFA enrollment UI
- billing-plan changes
- storage changes
- redesigning workspace roles

## Current Supabase references

- [Password-based Auth](https://supabase.com/docs/guides/auth/passwords)
- [Password security](https://supabase.com/docs/guides/auth/password-security)
- [Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Server-Side Rendering](https://supabase.com/docs/guides/auth/server-side)
- [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- [CAPTCHA protection](https://supabase.com/docs/guides/auth/auth-captcha)
- [Cloudflare Turnstile client rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
- [Cloudflare Turnstile CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/)
- [Signing out and session scopes](https://supabase.com/docs/guides/auth/signout)
