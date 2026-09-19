# Email/password staging rollout

Status: Repository preparation for Slice 2A is complete locally on 20 September 2026. No hosted setting, secret, email template, user, or Production behavior changed.

## What the code now supports

- Returning-user email/password login through a server route.
- Name, email, password, confirmation, and consent for Free, Pro, and Studio signup entry.
- A sealed, email-bound continuation to the intended dashboard, protected page, or plan confirmation.
- A check-email state with a visible resend cooldown and change-email escape.
- Neutral provider responses for signup and resend so the public result does not reveal whether an account exists.
- Optional forwarding of a CAPTCHA token to Supabase Auth. No provider widget has been selected or added yet.
- Default-off behavior. The UI stays Google-only unless `EMAIL_PASSWORD_AUTH_ENABLED` is exactly `true` and `AUTH_INTENT_SECRET` is at least 32 characters.

## Staging gates before the feature flag is enabled

1. Choose the CAPTCHA provider. Cloudflare Turnstile and hCaptcha are the supported Supabase options. The choice changes the browser widget, Content Security Policy, public site key, and Supabase secret configuration, so it must be explicit.
2. Choose and configure a custom SMTP provider in staging Supabase. The existing application Resend integration does not mean Supabase Auth mail is configured.
3. Verify the sender domain with SPF and DKIM, publish the reviewed DMARC policy, and confirm bounce visibility.
4. Disable click tracking for authentication mail. Link rewriting can break one-time confirmation links.
5. Export every current staging Auth template before editing it.
6. Set the stable staging Site URL and reviewed redirect allowlist. Do not use an expiring deployment URL as the only Auth destination.
7. Require email confirmation, set a 12-character password minimum, review Auth rate limits, and enable the approved password protections supported by the project plan.
8. Add separate Preview values for `AUTH_INTENT_SECRET` and `EMAIL_PASSWORD_AUTH_ENABLED`. Never copy the Production intent secret into Preview.
9. Leave Production Email disabled and do not add the Production feature flag during this staging step.

## Confirmation template contract

The signup route passes a reviewed, same-origin URL shaped like:

```text
https://STAGING_ORIGIN/auth/confirm?intent=SEALED_INTENT
```

The Supabase Confirm signup template must append the token hash and type to that redirect. The link target is:

```html
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup
```

Draft visible copy:

```text
Confirm your Song Room account

Use the button below to verify your email and finish creating your account.

If you didn't ask for this, you can ignore the email.
```

Do not add email addresses, passwords, raw tokens, pricing claims, invite capabilities, or readable continuation data to the template.

## Staging verification order

1. With the feature flag absent, confirm Login remains Google-only and `/api/auth/email/config` returns `enabled: false`.
2. Configure staging SMTP, the template, URL allowlist, password policy, and the selected CAPTCHA provider.
3. Deploy code with the Email feature flag still absent. Confirm Google login and protected-page return still work.
4. Add a staging-only `AUTH_INTENT_SECRET`, then set `EMAIL_PASSWORD_AUTH_ENABLED=true` in Preview.
5. Confirm the Email UI appears only in the primary staging deployment.
6. Create one staging account. Confirm no profile, workspace, membership, referral reward, or Stripe customer exists before email verification.
7. Open the confirmation in the same browser and another browser. Confirm one account and one intended workspace are created.
8. Test resend, duplicate submit, changed email, invalid credentials, Back, refresh, expired and altered links, and the Google fallback.
9. Test Free, Pro, and Studio entry. Paid choices must stop at the existing plan confirmation and must not open Checkout automatically.
10. Scan Auth, application, delivery, and CSP logs. Stop for any 5xx, genuine blocked resource, raw provider error, duplicate record, or unexpected email disclosure.

## Rollback

Hide the Email UI by removing or setting `EMAIL_PASSWORD_AUTH_ENABLED=false` in Preview. Keep the staging Email provider available while test password identities exist so they are not locked out. Revert the application commit only if the hosted template and redirect contract remain compatible with the earlier code.
