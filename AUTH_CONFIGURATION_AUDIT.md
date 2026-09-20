# Email/Password Auth Configuration Audit

Status: Slice 0 capture and the approved Production safeguard completed on 19 September 2026. Repository, Vercel, Production public Auth behavior, and the hosted Supabase Auth settings for both Song Room projects were inspected.

The audit itself was read-only. After the user explicitly approved the recommendation, the Production Email provider was disabled. Google remains enabled. No other setting, secret, project, deployment, email, DNS record, or Production data was changed.

## Readiness decision

The shared auth-boundary implementation can begin locally with Email kept off. The Email UI must not be exposed in Preview or Production yet.

Staging has Email and Google enabled, signup enabled, and email confirmation required. Production now has Email disabled and Google enabled. Neither environment is ready for a public password journey: both use Supabase's built-in trial email service and default email copy, CAPTCHA is off, leaked-password protection is off, password-change reauthentication is off, and the password policy has no explicit strengthening beyond the platform minimum.

The Production auth-user inventory contains five users. All five are confirmed Google-only identities; no password identity is present. Only aggregate provider counts were read.

The approved safeguard closes the unplanned Production direct-signup path while the complete product, delivery, recovery, abuse, and monitoring controls are built. A clean dashboard reload showed Email disabled and Google enabled. A fresh public Auth settings request reported `email: false` and `google: true`; the live Login page returned `200`, presented the Google-only entry, and a Google continuation completed at the authenticated dashboard. Staging keeps Email enabled for the controlled build, but its UI must remain feature-flagged off until custom SMTP, templates, redirect handling, and abuse controls are ready.

## Evidence sources

- Repository auth routes, middleware, tests, environment-variable references, and `supabase/config.toml`
- Read-only Vercel project and environment-variable metadata
- Production Supabase `/auth/v1/settings` using the existing public application credential in memory only
- Read-only Supabase dashboard inspection of URL configuration, providers, password policy, sessions, rate limits, attack protection, email delivery/templates, and audit-log settings in Production and staging
- Existing rollout records for Google authentication and Vercel Preview callbacks
- Current Supabase documentation referenced by `EMAIL_PASSWORD_SIGNUP_AND_RECOVERY_JOURNEY.md`

Secret values were not printed, saved, or added to the repository.

## Environment inventory

### Primary application project

| Item | Production | Preview/staging |
| --- | --- | --- |
| Vercel project | `song-review-app-v2` | `song-review-app-v2` |
| Vercel project ID | `prj_GoSvIjynlundQRAjTe4NIrwY0Gz0` | Same project |
| Node runtime | 24.x | 24.x |
| Supabase project | `hxtsuhmqrufcdplidtov` | `ivifkrtupqizyqqsxdty` |
| Supabase URL/key scope | Production-only entries exist | Preview-only sensitive entries exist |
| Service-role scope | Production-only entry exists | Preview-only sensitive entry exists |
| `NEXT_PUBLIC_APP_URL` | Production entry exists | No Preview entry listed |
| `RESEND_API_KEY` | Present | Present |
| Email auth feature flag | Missing | Missing |
| Auth-intent sealing secret | Missing | Missing |
| CAPTCHA variables | Missing | Missing |

The Preview Supabase variables are sensitive and cannot be read back through the Vercel API. Their staging classification is supported by the established deployment boundary and previous Preview CSP/runtime verification, but the exact current values were not disclosed during this audit.

### Production public Auth response

The Production Auth service reported:

| Setting | Observed value | Meaning |
| --- | --- | --- |
| Signup disabled | `false` | New Supabase auth users can be created at the service level. |
| Email provider | disabled | The approved temporary safeguard blocks Production email/password entry. |
| Google provider | enabled | The current Google journey remains available. |
| Email auto-confirm | `false` | Email confirmation is required before normal password sign-in. |
| Phone auto-confirm | `false` | Not part of this product slice. |

This endpoint exposes only public Auth behavior. It does not prove the delivery or security configuration behind it.

### Closed Production backend capability

Before the safeguard, “Google-only” described the Song Room interface rather than the Production Supabase service. Signup and Email were enabled, so a caller with the public project configuration may have been able to create an email/password auth user directly. The audit deliberately did not create a user or send an email to prove that inference.

The aggregate read-only inventory found five confirmed users, all with Google as their only provider. Production Email was therefore disabled before any known password identity depended on it. Re-enable it only through the staged rollout. Google must remain enabled throughout.

### Secondary Vercel projects

`song-review-app` also builds this repository and uses Node 24.x. Its Supabase, app URL, service-role, Resend, and shared-password variables are each scoped across Production, Preview, and Development. The audit did not read their values, so it cannot claim that those environments use distinct Supabase projects.

This secondary project must not send signup or recovery email during testing until its database and Auth destination are classified. A new server-side Email feature flag should default to off when absent, which keeps secondary deployments safe.

`song-review-app-staged-fixes` has no listed environment variables and no latest Production URL. It is not a usable auth test target.

## Repository findings

- `supabase/config.toml` intentionally contains local migration settings only. Hosted Auth and API settings are omitted, with an explicit warning not to run `supabase config push` before Production settings are captured.
- The deployed UI and invite flow are Google-only.
- `/auth/callback` is written for the Google code exchange and returns through Login.
- `/auth/reset-password` is an incomplete legacy recovery screen.
- Middleware accepts `song_review_auth` and `song_review_identity` before checking the Supabase session.
- `/api/auth/verify-password` checks the old shared beta password and is unrelated to user password authentication.
- Current contract tests deliberately reject email/password controls. They must change only when the feature slice changes.
- The repository has no auth-intent secret, Email rollout flag, CAPTCHA integration, or Auth email templates.
- Existing `RESEND_API_KEY` use for application notifications does not prove that Supabase Auth custom SMTP is configured.
- `package.json` permits Node 20.9 or newer. All three inspected Vercel projects use Node 24.x, so the announced Supabase JavaScript Node 20 support removal is not a deployment blocker here.

## Hosted Auth snapshot

### URL configuration

| Environment | Site URL | Redirect allowlist |
| --- | --- | --- |
| Production | `https://song-room.live` | `http://localhost:3000/auth/callback`; `https://song-review-app-v2.vercel.app/auth/callback`; `https://song-review-app-v2-git-clone-clean-corisleachmans-projects.vercel.app/auth/callback`; `https://song-room.live/**`; `https://www.song-room.live/**`; one stale `codex-bac` Preview wildcard |
| Staging | One old `codex-sta` Preview deployment URL | The first five Production entries; the old `codex-sta` callback; `https://*-corisleachmans-projects.vercel.app/**`; one old `codex-har` Preview wildcard |

Production Auth defaults to the non-`www` domain while current user-facing links use `www`. Both domains are allowlisted, so Google works, but the canonical choice must be settled before auth emails are written. The staging Site URL is tied to an old deployment. Its team wildcard covers current Preview deployments, but email links without an explicit redirect can still fall back to the stale Site URL. Clean-up and any narrowing of these lists must be a separately approved configuration change.

### Providers and password policy

Production and staging match except for the deliberate Email-provider safeguard:

| Setting | Observed value | Rollout decision |
| --- | --- | --- |
| New user signup | enabled | Keep app UI behind the server flag. |
| Email provider | Production disabled; staging enabled | Keep Production off until the controlled rollout; keep staging controlled. |
| Google provider | enabled | Must remain available and receive regression coverage. |
| Confirm email | enabled | Keep. Users must verify before normal sign-in. |
| Manual identity linking | disabled | Keep client-side linking out of scope; prove automatic verified-email behavior in staging. |
| Anonymous sign-in | disabled | Keep. |
| Secure email change | enabled | Keep. Both old and new addresses must confirm. |
| Secure password change | disabled | Enable recent-login protection before password settings are exposed. |
| Require current password | disabled | Decide alongside the reauthentication UX; don't rely on this alone for recovery. |
| Leaked-password protection | disabled | Enable before public release if the current plan supports it. |
| Minimum length | no override shown; dashboard documents a six-character platform minimum | Set the planned 12-character minimum in staging first. |
| Composition requirements | none selected | Keep passphrase-friendly unless testing justifies a change. |
| Email OTP/link expiry | 3,600 seconds | Review against cross-device confirmation and recovery tests. |
| Email OTP length | 8 digits | Acceptable baseline; no change proposed yet. |

All other built-in social providers are disabled, and neither project has a custom OAuth provider.

### Sessions and rate limits

Production and staging also match here:

- Single-session enforcement is off. Session time-box and inactivity timeout are both `0` (never).
- Access tokens expire after 3,600 seconds.
- Compromised refresh-token detection is on with a 10-second reuse interval.
- Token refresh is limited to 150 requests per five minutes per IP. Token or magic-link verification is limited to 30 per five minutes per IP.
- Signup and sign-in are limited to 30 requests per five minutes per IP. Anonymous and Web3 limits are present but their providers are disabled.
- IP address forwarding is off.
- The email-send rate field is locked while the built-in email service is active and the dashboard does not show a numeric value. Custom SMTP and its intended beta send rate must be configured and tested before release.

### Delivery, protection, notifications, and logs

| Area | Production | Staging | Required follow-up |
| --- | --- | --- | --- |
| Custom SMTP | off; built-in trial sender | off; built-in trial sender | Configure a verified sender and delivery monitoring in staging first. |
| Confirmation template | Supabase default subject/body | Supabase default subject/body | Replace with reviewed Song Room copy using the planned confirmation route. |
| Reset template | Supabase default subject/body | Supabase default subject/body | Replace with reviewed neutral recovery copy. |
| Security notification emails | all listed password, email, phone, identity-link and MFA notifications off | same | Enable the applicable password and identity notifications before release. |
| CAPTCHA | off; no provider configured | off; no provider configured | Cloudflare Turnstile is selected. Create a staging widget, configure its secret in staging Supabase Auth, and test before enabling Email. |
| Audit logs in database | off | off | Auth logs remain available in the log explorer; retention isn't shown in this screen and still needs an operational decision. |

The full existing template set should be exported immediately before any edit. Authentication-email click tracking cannot be verified until a custom SMTP provider is selected; it must be disabled in the chosen provider.

## Required environment additions for implementation

These are names and scopes only. No value has been created.

| Variable | Scope | Default |
| --- | --- | --- |
| `EMAIL_PASSWORD_AUTH_ENABLED` | Server-only, separate Preview and Production values | `false` when missing |
| `AUTH_INTENT_SECRET` | Server-only sensitive value, different in Preview and Production | No fallback; intent creation fails closed |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public, separate Preview and Production values | Feature unavailable when missing |
| Turnstile secret key | Sensitive value stored in each Supabase project's Auth bot-protection settings, not Vercel | Supabase CAPTCHA protection remains off when missing |

Supabase SMTP credentials should remain in the Supabase Auth configuration unless the approved delivery design changes. They should not be copied into application variables without a reason.

## Safety gates

Before any Email UI is visible:

1. Keep the completed Production Email safeguard in place until the controlled rollout.
2. Export all current templates immediately before editing and preserve this URL/configuration snapshot as the rollback baseline.
3. Confirm the secondary Vercel project's Supabase environment or make the missing feature flag keep it inert.
4. Complete locally: add the auth-intent boundary and feature flag with Email still off.
5. Configure the canonical/staging URLs, custom SMTP, templates, password protections, security notifications, CAPTCHA, and reviewed rate limits in staging.
6. Prove Google regression, UUID preservation, invite-first membership, referral idempotency, and no duplicate workspace creation.

Stop if any environment cannot be identified confidently. Do not use a Preview deployment for signup testing merely because it builds successfully.

## Slice 0 outcome

The audit and Production safeguard are complete. Slice 1 is code-complete locally with Email defaulting off and no public Email controls. Hosted configuration is not ready for an Email UI or real signup test. No email was sent and no user was created.

Rollback for the Production safeguard is to re-enable the Email provider in the same Supabase panel. Do not do that until the controlled rollout unless an unexpected Google regression is traced to this setting. Slice 1 Preview verification has passed; code review and explicit rollout approval are now required before forms, SMTP, templates, or other hosted Auth changes begin.
