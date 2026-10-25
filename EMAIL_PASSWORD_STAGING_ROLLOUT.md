# Email/password staging rollout

Status: Slice 2B, the failed-confirmation-link explanation, password recovery, and Account security code are pushed in draft PR #55. The staging-only Cloudflare Turnstile widget allows only the stable PR branch hostname, uses Managed mode with pre-clearance off, and its secret is stored in staging Supabase Auth with CAPTCHA protection enabled. The public site key, server-only auth-intent secret, Email feature flag, and Account security flag are scoped only to `codex/email-password-staging-forms` Vercel Preview. Staging custom SMTP, the signup and reset email links, and the stable PR branch Site URL are configured. On 29 September, the approved staging reauthentication and Password changed templates were saved, Password changed notifications and Secure password change were enabled, and Preview `dpl_GsmKKaH22T8Dcg4dpDzV9D8Umgf2` reached Ready with Account security enabled. The stable branch config returns `{"enabled":true,"passwordManagementEnabled":true}`; unauthenticated and invalid probes confirm both mutation routes are open but guarded. The Account security staging gate now passes. This covers recent-session and older-session password changes, notification delivery, an existing Google account adding password login without changing canonical records, and deliberate two-browser revocation. The password-changing browser remained signed in while the other session was removed and lost access after its cached token window. Production is Google-only and unchanged.

Slice 4's database blocker was repaired on 11 October after explicit approval. The same `harden_account_invites_access` migration is applied in staging and Production: `public.account_invites` now has RLS enabled with no client policy, `anon` and `authenticated` have no table privileges, the trigger helper has an empty fixed search path, and its public/client execute grants are removed. Service-role reads still succeed and the former external `rls_disabled_in_public` advisor error has cleared in both projects. Production had four pending invitations at the repair baseline. After separate approval, all four were revoked directly in the database without reading their addresses or tokens and without invoking an email route. Production now has zero pending invitations. The bounded referral-intent and Email invite fixes were pushed in commit `358b90b5`; protected Preview `dpl_7jt3sH5JvKrQwUifG6p52XenUBUy` reached Ready and passed its deployment checks. Live referral and invite acceptance remains paused until separately approved controlled staging records are created.

Controlled staging records were approved and created on 11 October. Preview `dpl_CH8drj1eiFitc8pvkcFKhcZgF3LS` from `8493a0df` safely rejects malformed invite tokens and includes the verified `Sign out and continue` recovery. The expired, revoked, and used invite states pass, and three application-created invitations reached the controlled inbox. The invite-first Email account confirmed and joined only the invited workspace, leaving the other two invitations pending. Acceptance stopped again when Supabase Auth logs were found to record the sealed auth intent inside the signup `redirect_to` value. Do not continue invite acceptance or referral signups until the confirmation-state repair below is approved, implemented, deployed, and verified.

## Confirmation-state log-safety repair, 2026-10-13

Status: the confirmation-state log-safety staging gate passes. Email was temporarily closed on branch-only deployment `dpl_6zvB8REtKWDa1euF1tGnu898YpjJ`, whose config returned `{"enabled":false,"passwordManagementEnabled":false}`. Migration `20261013171251_create_email_auth_flows.sql` is applied to staging only and verified. Documentation commit `2a351139` and implementation commit `2b588af2` are pushed. Protected Preview deployment `dpl_ANpyXyT9aTohbWnGmZdGFCaxWoVj` is Ready from branch HEAD `9b62c221`, owns the stable branch alias, and returns `{"enabled":true,"passwordManagementEnabled":true}`. On 14 October, the user passed a fresh controlled signup and password-recovery journey. Database and log checks below passed. Production is unchanged.

- Root cause: the Email routes put the sealed auth intent in `emailRedirectTo` or `redirectTo`. Supabase Auth deliberately derives its logged `referer` field from that `redirect_to` value before falling back to the HTTP Referer header. The app's `Referrer-Policy` therefore cannot keep the sealed value out of Supabase's server log. Password login and post-confirmation continuation also place the same sealed value in an application URL, which should be removed in the same bounded repair.
- Database: `public.email_auth_flows` stores a random UUID flow ID, SHA-256 normalized-email hash, constrained purpose, sealed intent, creation time, and an expiry no later than one hour. It stores no raw email, password, OTP, invite token, or Supabase token. Staging verification confirms RLS is enabled with no client policy, `PUBLIC`, `anon`, and `authenticated` have no access, and `service_role` has only `SELECT`, `INSERT`, and `DELETE`. A service-role insert/delete check passed. The expiry index exists. Supabase's intentional `rls_enabled_no_policy` information notice is expected for this server-only table. The repository filename is aligned to the hosted staging ledger as `20261013171251_create_email_auth_flows.sql`.
- Request code: signup, verification resend, and recovery now create the server-only flow first and supply `/auth/confirm?flow=UUID` as the clean Supabase redirect. The current hosted templates remain compatible because they append `token_hash` and `type` to a redirect that already has one query parameter.
- Confirmation code: the route validates and loads the unexpired flow before exchanging the OTP, then requires the sealed intent, stored purpose, token type, and verified user's email hash to agree. On success it deletes the flow, puts the still-valid intent in the secure HTTP-only cookie, and redirects to `/auth/continue` without query-carried intent. Failure stays generic.
- Same-browser code: Email/password login returns only `/auth/continue` and relies on the HTTP-only intent cookie. `/auth/continue` no longer reads `intent` from the query string.
- Existing-account recovery: the neutral check-email page now offers `Already have an account? Log in instead`. It validates the stored local return path, removes signup-only parameters, keeps the invitation destination, and opens the Email choice. `Use a different email` now preserves invite returns too. Neither action reveals whether the submitted address exists.
- Hosted code checks: an invalid flow ID fails closed to `auth=invalid_confirmation`; a fake legacy query-carried intent is ignored and reaches the ordinary missing-session boundary. Deployment-scoped searches found no error, fatal, 5xx, or sealed `v1.` log entry around these probes.
- Live Email evidence: Supabase logged one successful signup, one recovery request, two successful verification exchanges, and no failing Auth route in the inspected window. Both mail requests logged `flow=UUID` on the expected protected host. The aggregate log check found zero legacy `intent=` redirects, sealed `v1.` values, token hashes, or wrong-host redirects. Both flow rows were consumed.
- Data evidence: staging now has five Auth users, five profiles, four workspaces, six memberships, zero referrals, two pending invitations, and no orphan profile or membership. The new confirmed user has one Auth identity, one profile, one Free workspace, one owner membership, and no Stripe customer.
- Runtime evidence: the recent deployment-scoped Vercel window contains no error, fatal, 5xx, or sealed `v1.` match. The first wider Vercel request exceeded Hobby retention and was corrected to the supported 30-minute window; it was not treated as a clean result.
- Remaining staging order: resume the two pending existing-account invitations one at a time, starting with the existing-password user, then the existing-Google user. Verify database identity and membership invariants after each. Referral, paid-tier, abuse, resend, and remaining browser cases follow. Production Email stays disabled.
- Acceptance: cross-device signup, resend, recovery, invite, referral, and paid-plan intent must survive; expired, missing, reused, mismatched-email, and wrong-purpose flows must fail closed; concurrent flows must not overwrite one another; successful flows must be consumed; first-account bootstrap and invite-before-workspace behavior must remain unchanged. The ordinary log record may contain the non-secret flow UUID, but no sealed intent, OTP hash, password, invite token, raw email, or provider error.
- Rollback: remove the branch-only Email flag and redeploy first. The additive server-only table can remain inert and protected while the application is rolled back. Do not restore the query-carried intent implementation merely to resume testing. Drop the table only in a separately reviewed cleanup after no deployed code references it and all rows have expired. No hosted template rollback is required because the template shape does not change.

## Existing-password invitation checkpoint, 2026-10-18

Status: the existing-password invitation case passes for `corisleachman+songroomtest@googlemail.com`. The initial verification correctly caught that login had succeeded before the final acceptance was submitted. The user then reopened the same invitation, completed acceptance, and reported that the remaining checks passed.

- Auth evidence: the existing confirmed user signed in successfully at `2026-10-17 22:57:54 UTC`. The account still has exactly one Auth user, one identity, one profile, one owned workspace, and no Stripe customer.
- Invite evidence: one member membership was created at `2026-10-17 23:07:45.704621 UTC`, and the controlled invitation was accepted by the intended user at `2026-10-17 23:07:45.762 UTC`. The target user now has exactly two memberships: the original owned workspace and the invited workspace.
- Invariant evidence: global staging counts are five Auth users, five profiles, four workspaces, seven memberships, and one pending invitation. No Auth user, profile, identity, or workspace was duplicated.
- The final pending controlled invitation is the existing-Google case for `corisleachman@googlemail.com`. Run that case next through `Continue with Google`, keeping Email signup out of the path.
- Production remains unchanged and Google-only.

## Existing-Google invitation checkpoint, 2026-10-18

Status: the existing-Google invitation case passes for `corisleachman@googlemail.com`. The protected Preview reused the existing canonical Google identity and accepted the final controlled invitation.

- Identity evidence: the target remains one Auth user, one Google identity, one profile, and one owned workspace. The existing Stripe customer on that owned workspace is unchanged; no new Auth identity, profile, or workspace was created.
- Invite evidence: one member membership was created at `2026-10-17 23:13:02.121756 UTC`, and the controlled invitation was accepted by the intended user at `2026-10-17 23:13:02.21 UTC`. The target now has exactly two memberships: the original owned workspace and the invited workspace.
- Invariant evidence: global staging counts are five Auth users, five profiles, four workspaces, eight memberships, and zero pending invitations. All three controlled live invitations are resolved.
- Referral baseline: the documented fresh referral-test alias does not exist in Auth. Staging still has zero referral rows, and the chosen referrer has one active workspace-bound referral code. The next case is a new direct Free Email signup entered through that referral link, with confirmation completed in another browser to prove the sealed referral context survives cross-browser confirmation.
- Production remains unchanged and Google-only.

## Cross-browser referral checkpoint, 2026-10-18

Status: the cross-browser Email referral case passes. The user entered through the controlled staging referral link in one browser, completed signup confirmation in another browser, and reached the new Free workspace.

- Account evidence: the designated alias has exactly one Auth user, one identity, one profile, one Free workspace, and one owner membership. The account has no Stripe customer, subscription, or checkout session.
- Referral evidence: exactly one referral row was created for the new user and workspace, attributed to the intended referrer. It is `pending`, has no ineligible reason, and has not had the referee coupon applied. Staging moved from zero referral rows to one.
- Timing evidence: Auth creation preceded email confirmation, which preceded profile, workspace, membership, and referral creation. The referral row was written after first-account bootstrap, matching the intended verification-before-attribution order.
- Flow and log evidence: `public.email_auth_flows` is empty after confirmation. In the inspected window, Auth recorded one signup and one verification. The stable protected host was used, with one non-secret `flow` identifier and zero legacy `intent`, sealed `v1.` value, token hash, or wrong Preview host. Recent Preview runtime searches found no error, warning, fatal, `500`, or sealed-intent match.
- Global staging counts are six Auth users, six profiles, five workspaces, nine memberships, one pending referral, and zero pending invitations. There are still zero billing checkout sessions and zero billing subscriptions.
- The Pro and Studio controlled aliases do not exist in Auth. Paid-tier Email entry is next, starting with Pro annual. It must stop on the preselected upgrade confirmation and must not open Stripe automatically.
- Production remains unchanged and Google-only.

## Pro annual Email checkpoint, 2026-10-21

Status: the Pro annual Email journey passes. The user reported that cross-browser confirmation opened Song Room's preselected Pro annual confirmation at £86 per year and did not open Stripe automatically.

- Account evidence: the designated Pro alias has exactly one Auth user, one identity, one profile, one workspace, and one owner membership. The workspace remains Free until checkout completes and has no Stripe customer or subscription.
- Billing evidence: staging still has zero checkout sessions and zero billing subscriptions. The temporary Email flow was consumed.
- Log evidence: the inspected Auth window contains one signup, one verification, one non-secret `flow` identifier, and zero legacy `intent`, sealed `v1.` value, token hash, or wrong Preview host. Recent Preview runtime searches found no error, warning, fatal, `500`, or sealed-intent match.
- Test-isolation note: the Pro account also received one valid pending referral from the earlier controlled referrer. The original referral-entry browser retained its 30-day referral cookie because confirmation and bootstrap finished in a different browser; reusing that original browser carried the cookie into the Pro signup. This does not invalidate the Pro plan-intent or no-auto-checkout result, but the case is not referral-neutral.
- Global staging counts are seven Auth users, seven profiles, six workspaces, ten memberships, two pending referrals, zero pending invitations, zero checkout sessions, and zero billing subscriptions.
- Run Studio monthly next in a brand-new private browser session that has never opened the referral link. It must stop on the preselected Studio monthly confirmation and must not open Stripe automatically.
- Production remains unchanged and Google-only.

## Studio monthly Email checkpoint, 2026-10-21

Status: the Studio monthly Email journey passes, with a deliberate recovery from an interrupted confirmation handoff. The user first opened the single-use confirmation link in the original browser and closed that window before continuation completed. Opening the same link in a fresh private browser then showed the intended expired-or-used explanation. Staging confirmed that the Auth user and Email identity existed and the address was verified, while no profile, workspace, or membership had yet been created.

- The user opened an allowlisted Studio monthly login destination in the fresh private browser, signed in with the newly confirmed account, and reported that every remaining check passed. The journey stopped on Song Room's Studio monthly confirmation at £19 per month and did not open Stripe automatically.
- Account evidence: the designated Studio alias has exactly one Auth user, one identity, one profile, one Free workspace, and one owner membership. The account has no Stripe customer, subscription, checkout session, or referral attribution.
- Timing evidence: Auth creation and confirmation occurred at 11:05 and 11:06 UTC. The recovery login occurred at 12:03:50 UTC, followed by profile, workspace, and membership creation over the next two seconds. This matches confirmation succeeding before the interrupted continuation and the later login safely completing first-account bootstrap.
- Flow evidence: the original successful confirmation flow was consumed. Two later unused signup flow rows were created for the already-confirmed address during the retry sequence, matching two successful signup requests and one resend request in Auth logs. They are server-only, email-hash-bound, non-authoritative without a successful OTP exchange, and expired closed by 12:09:56 UTC.
- Log evidence: Auth recorded successful verification and password login activity on the stable protected host. The checked window contained non-secret `flow` identifiers and zero legacy `intent`, sealed `v1.` value, or token hash. The retained Preview runtime window contained no error, warning, fatal, `500`, sealed-intent, or token-hash match.
- Global staging counts are eight Auth users, eight profiles, seven workspaces, eleven memberships, two pending referrals, zero checkout sessions, and zero billing subscriptions.
- The paid-tier Email entry gate now passes for Pro annual and Studio monthly. Broader plan variations, abuse checks, remaining browser coverage, PR conflict resolution, and Production rollout remain separate work.
- Production remains unchanged and Google-only.

## Referral and invitation repair, 2026-10-11

- Migration `supabase/migrations/20261011161736_harden_account_invites_access.sql` enables RLS on the server-only invite table, revokes all table privileges from `anon` and `authenticated`, fixes `account_invites_sync_derived_fields()` to `search_path = ''`, and revokes its execute permission from `PUBLIC` and both client roles. The migration was applied to staging first and then Production only after the staging state, advisor result, and service-role read were verified. Both hosted migration ledgers were aligned to the repository version and the linked Production migration list has no gap.
- Staging now exposes no direct client read and retains service-role access to its two accepted invite rows. Production has the same privilege state and retains service-role access to eleven rows. Its four pending rows were subsequently revoked under a count-guarded update, leaving six accepted, five revoked, and zero pending. No raw address, invite token, user ID, or workspace ID was returned.
- The Supabase advisors no longer report `rls_disabled_in_public`, and the trigger helper no longer appears in the mutable-search-path warning. The new `rls_enabled_no_policy` information notice is intentional because the table is server-only and direct client privileges are revoked.
- Local Email invite entry remains behind `isEmailPasswordAuthReady()`. When enabled, a signed-out invitee can choose Google, Email login, or Email signup. The login page reloads the canonical invite through the server route, visibly prefills the invited address, keeps it read-only, and preserves `/invite/[token]` through login or confirmation. The accept route still performs the final normalized-email check before membership creation.
- Local referral bootstrap now prefers the referral code carried in the sealed signup intent, falls back to the original-browser cookie for OAuth and same-browser flows, awaits attribution, and clears a referral cookie after the attempt. This removes the known cross-browser confirmation gap without moving referral data into the client.
- All 89 repository tests, TypeScript, focused ESLint, and `git diff --check` pass. Vercel repeated the 89 tests during the successful protected Preview build. The branch alias returns the expected enabled Email and Account security config, a signed-out Account security request redirects to Login, and a syntactically valid unused invite token returns a client-safe 404. Live referral and invite acceptance is still required before PR or Production rollout.
- A deliberately malformed non-UUID invite probe returned 500 because Postgres rejected the token before lookup. The response exposed no data, and a subsequent valid-shape unused token confirmed the intended 404 boundary. Treat malformed-token validation as a bounded follow-up rather than evidence that the secured invite path failed.
- Commit `000ec1de` added the bounded UUID-shape guard and is live on protected Preview `dpl_B5eP8Eyhxp6HKbQKcLxZbmZGKQsL`. Malformed tokens now reach the safe invalid state without a runtime error.
- Two database-only staging fixtures cover expired and revoked invites, while an existing accepted row covers the used state. Three pending invitations created through the application cover invite-first, existing-password, and existing-Google entry, and all three messages reached the controlled inbox.
- The live mismatched-account check correctly prevented acceptance but exposed no way to switch accounts. This fails the documented invite journey. The remaining invite and referral tests are paused until a focused switch-account action is deployed and verified.

## Referral and invitation read-only preflight, 2026-10-09

- Supabase's security advisor reports `rls_disabled_in_public` for `public.account_invites` in staging and Production. Direct schema checks confirmed RLS off, zero policies, and full `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER` privileges for both `anon` and `authenticated`. This is a release blocker and should be repaired before another invite link is created or reused.
- All repository access to `account_invites` goes through `lib/accountInvites.ts`, which uses the server-only service-role client. Enabling RLS and revoking the unnecessary direct-client grants should preserve the current app route while closing the exposed table. The trigger helper also has a mutable search path and broad execute grants; its hardening belongs in the same reviewed migration.
- The live staging baseline contains two accepted invites, two referral codes, and zero referral rows. The partial unique pending-invite index and unique referred-user constraint are present, with no duplicate pending targets or referral rows. No raw email, invite token, user ID, or referral code was returned by the audit.
- `InviteActions.tsx` and its contract test still enforce Google-only invite entry. There is no Email choice, locked invited address, or invite-specific Email signup intent on that page. The existing continuation route already skips direct workspace bootstrap for an invite destination, so the missing work is the safe Email entry and validation boundary rather than a new membership model.
- Email signup copies the referral cookie into the sealed intent, and resend preserves it, but `/auth/continue` does not pass the sealed referral code into bootstrap. `bootstrapAccountForUser` reads only `tsr_ref` from the current browser and launches `attributeReferralOnSignup` without awaiting completion. Same-browser referral may work, but cross-device confirmation is not reliable and cannot meet the documented acceptance gate.
- The next safe order is: approve and apply the invite-table security migration to staging and Production, verify the advisor and current server route, implement the bounded referral and Email invite fixes locally, then deploy a new protected Preview before creating any new test invite or referral record.

## Staging Account security safeguards, 2026-09-29

- After explicit approval, the staging Reauthentication template subject became `{{ .Token }} is your Song Room verification code`. Its body now identifies the password-change purpose, presents `{{ .Token }}`, says the code expires shortly, and tells an unexpected recipient that ignoring it leaves the password unchanged.
- The staging Password changed notification subject became `Your Song Room password was changed`. Its body identifies the affected account through `{{ .Email }}`, confirms when no action is needed, and sends an unexpected recipient to password recovery and `hello@song-room.live`. The notification switch is now on.
- Staging **Secure password change** is now on. **Require current password when updating** remains off. Leaked-password protection remains on, the minimum remains 12 characters, composition requirements remain unset, and the email OTP settings remain 3,600 seconds and 8 digits.
- Fresh dashboard loads showed both approved template sources, the enabled Password changed notification, and the enabled Secure password change switch. Save controls were disabled after reload. No email was sent and no password, identity, user, profile, workspace, membership, Vercel setting, deployment, or Production service changed.
- After separate approval, `SIGNED_IN_PASSWORD_MANAGEMENT_ENABLED=true` was added only to the `codex/email-password-staging-forms` Preview branch. Vercel rebuilt the known `776682a0` artifact as ready deployment `dpl_GsmKKaH22T8Dcg4dpDzV9D8Umgf2` and moved the stable branch alias to it. The alias returns `{"enabled":true,"passwordManagementEnabled":true}`. The request route returns 401 without a signed-in user, the update route rejects an empty body with the expected 12-character validation, and a signed-out page request redirects to Login with `/settings/security` preserved. Deployment error and 5xx searches were empty. Production has no matching flag and remains unchanged. Rollback is to remove the branch-only flag and redeploy first; the hosted staging safeguards can remain in place unless their own behavior fails.

## User-completed recent-session Account security test, 2026-09-30

- The user reported that every step in the requested recent-session check passed: a fresh password-account session opened Account security, accepted a new 12-or-more-character password without requesting the older-session code, delivered the Password changed notification, and allowed sign-out followed by re-entry with the new password. The agent did not see or enter the password.
- A read-only staging query found one Auth user with one Email identity, one matching profile, one owner membership, and one Free workspace created by that user. The original 27 September creation timestamps remain on the user, profile, workspace, and membership. There is still no Stripe customer, Stripe subscription, billing subscription, or referral row. Auth recorded `updated_at` at 09:37:12 UTC and `last_sign_in_at` at 09:36:51 UTC on 30 September, supporting the reported change and re-entry without exposing the account address or password.
- The deployment's following 24-hour scan returned zero error logs, zero warning logs, and zero 5xx responses. This passes the recent-session password-account gate only. The older-session emailed-code path, existing-Google-account Add password flow, identity-link preservation, and two-browser session behavior remain unverified. Keep the Preview-only flag available for those controlled tests; remove it and redeploy if a stop condition appears.

## User-completed older-session Account security test, reported 2026-10-09

- The user reported that the older-session test passed. The aged password-account session required the reviewed emailed verification code before accepting the password change. The agent did not see or enter the password or one-time code.
- A fresh read-only staging query still found one Auth user with one Email identity, one matching profile, one owner membership, and one Free workspace created by that user. The original 27 September creation timestamps remain on every canonical record. There is still no Stripe customer, Stripe subscription, billing subscription, or referral row. `auth.users.updated_at` moved to 12:12:19 UTC on 5 October, supporting a later account update without proving the nonce contents.
- In the matching two-hour window, Supabase's retained Auth platform events were all `info`: login activity, one token refresh, and one token revocation. The database audit table had no retained row for the window. Vercel returned zero errors, warnings, and 5xx responses. A header-only search of the connected Gmail mailbox found no matching verification or Password changed messages, so delivery and the code step remain supported by the user's report rather than independent mailbox evidence.
- Preview `dpl_GsmKKaH22T8Dcg4dpDzV9D8Umgf2` remains Ready, owns the stable branch alias, and returns `{"enabled":true,"passwordManagementEnabled":true}`. This closes the older-session password-account gate. Existing-Google-account Add password, exact identity-link preservation, and deliberate two-browser session behavior remain unverified.

## User-completed existing-Google-account Add password test, 2026-10-09

- The user signed in to the protected Preview with the designated Google-only staging account. Before any password change, a read-only query captured one Google identity, no password, one matching profile, and one owner membership in the account's existing Free workspace.
- The user reported that Account security accepted **Add password**, delivered the Password changed notification, and allowed sign-out followed by Email/password re-entry to the same workspace. The agent did not see or enter the password.
- The post-change query matched the exact original Auth user and workspace through non-identifying fingerprints. The Auth user now has a password, still has one Google identity, and remains the only Auth user for that email. The profile, owner membership, Free plan, creation timestamps, existing Stripe customer record, absent Stripe subscription, referral code, and zero sent or received referral rows are unchanged.
- Supabase's current Identity Linking guidance documents `updateUser({ password })` as the supported way to add password login to an OAuth account. A password does not appear as a second row in `auth.identities`; the retained Google identity plus the password-bearing Auth user is the expected state.
- This closes the existing-Google-account Add password and canonical-ID preservation gate. Deliberate two-browser session behavior remains open. Production was not queried or changed.

## User-completed two-browser session test, 2026-10-09

- The same staging Auth user signed in through two isolated browsers and both loaded the same existing workspace. A read-only baseline found exactly two live `aal1` rows in `auth.sessions`, each represented in the notes only by a non-identifying fingerprint.
- The user changed the password in the newer Browser B session through Account security and left both browsers open. The immediate post-change query found exactly one session: Browser A's row was gone and Browser B's original row remained.
- The user then confirmed that Browser A lost authenticated access after the cached access-token window, while Browser B survived a hard refresh and stayed in the same workspace. This matches Supabase's documented `scope: 'others'` behavior: affected refresh sessions are removed immediately, but an issued access token may remain valid until its expiry.
- A final query still found one password-bearing Auth user with one Google identity, one matching profile, and one owner membership in the same Free workspace. The existing Stripe customer, absent Stripe subscription, referral code, and zero sent or received referral rows are unchanged.
- This closes the Account security staging acceptance gate. Referrals, invitations, tier entry, abuse checks, the wider browser matrix, PR conflict resolution, and Production rollout remain separate work. Production was not queried or changed.

## Controlled password-recovery request, 2026-09-28

- On the stable protected PR #55 Preview, submitted one reset request for the designated staging test address. Turnstile displayed its automatic success state; no challenge was manually solved. The page returned the intended neutral confirmation and started its 60-second resend cooldown. No second request was made.
- The primary Preview's runtime logs recorded the `/api/auth/email/recover` request, with no provider warning or application error in the filtered check. Resend's record `01a0e971-956c-7c01-ac53-6a52c8710aea` shows one **Reset Your Password** email from `noreply@song-room.live` to the designated test address, marked **Sent** and **Delivered** at 20:15 UK time. Delivered is a provider event, not proof the user saw the message in their inbox.
- The rendered email button points to the stable protected Preview's `/auth/confirm` path and includes `intent`, `token_hash`, and `type=recovery`. Only the host, path, and parameter names/type were inspected. No one-time token value was copied into these notes or opened by the agent. The route is designed to verify the link and then reach `/auth/reset-password`, but that live transition and password update have not yet been tested.
- PR #55 remains draft and has its pre-existing documentation-only `UPDATE_LOG.md` merge conflict. No code, Auth setting, template, feature flag, Production service, or password changed in this check. The user must open the single-use link and enter the new password themselves; stop if the link does not lead to the reset form, reset fails, or re-entry fails.

## User-completed password recovery, 2026-09-28

- The user reported that all requested live checks passed: the delivered link reached the reset form, the new password was accepted, and sign-out followed by Email/password re-entry worked. The agent did not see or enter the password, click the one-time link, or independently observe those screens.
- A read-only staging Auth query found exactly one user for the designated test address and `last_sign_in_at` of 20:19:26 UTC on 2026-09-28. This corroborates a new sign-in after the reset email shown by Resend at 20:15 UK time, but does not by itself prove the password update or other-session revocation.
- The protected Preview remains the only environment where Email is enabled. PR #55 is still draft with its documentation-only merge conflict. Cross-device resend, existing-Google-account linking, referrals, invitations, paid-tier entry, other-session handling, and the wider browser matrix are still open before public Email rollout. No Production change was made.

## Signed-in password management candidate, default off, 2026-09-28

- A new Account security Settings section supports adding or changing a password. Supabase's current Auth implementation allows a session created within 24 hours to update without validating an emailed nonce. For older sessions, the update returns `reauthentication_needed`; only then does the interface request a code and submit it with the new 12-to-128-character password. The endpoint requests sign-out of other sessions after success and warns if that request fails. It uses the existing authenticated SSR client and same-origin POSTs, without logging password or code values. The protected-return allowlist now includes `/settings/security`.
- `SIGNED_IN_PASSWORD_MANAGEMENT_ENABLED` is a separate server-only flag that defaults off. The Settings link, page, and both API endpoints stay unavailable unless this flag and the existing Email readiness gate are true. No Vercel value has been added, no staging Supabase security switch or notification setting has been changed, and no message has been sent by this candidate.
- Before enabling on the protected Preview, review the staging Supabase reauthentication and Password changed notification templates, then turn on **Secure password change** and the Password changed notification with separate approval. Verify the recent-session path without a code, the older-session email/code path, notification delivery, Add password for an existing Google identity, Change password for a password identity, unchanged user/profile/workspace IDs, and two-browser session behavior. Supabase says revoked sessions' existing access JWTs can remain valid until expiry, so do not promise immediate logout on another device. Keep the flag off if any test fails.
- Commit `3616b40e` pushed the default-off code to draft PR #55. Primary Preview `dpl_9wyjQmNGRoPStyj7AGEdz3xAKSSF` reached Ready and both Vercel project checks plus Preview Comments passed. Its authorized config returned `{"enabled":true,"passwordManagementEnabled":false}`. Both new POST routes returned 404. An authenticated browser showed no Account security Settings link and a direct `/settings/security` visit showed 404; no browser console error was observed. The deployment-scoped runtime error and 5xx checks were empty. No flag, hosted Auth setting, email, account, or Production service changed. The enabled Add/Change password journey remains untested.

## Confirmation-link fallback, protected Preview, 2026-09-27

- Login now reads the existing `auth=confirmation_failed` and `auth=invalid_confirmation` outcomes and, only while Email is enabled, explains that the link may have expired or been used. It directs a confirmed user to the existing Email login choice and an unconfirmed user back to the page where they requested the email. It does not expose Supabase's raw error or change token verification, cookies, redirects, or the Google-only Production screen.
- The first code commit `da94f1de` explains the failure and changes the Email choice text from cream to white after an accessibility check found a pre-existing contrast shortfall. The follow-up `5ac85eb7` puts the warning on a dark backing for readability over the desktop photograph and runs the regression case at both desktop and mobile sizes. TypeScript, focused ESLint, all 82 repository tests, and the public browser suite passed. The final browser run had 18 passes and 8 expected skips. A prior four-worker run had one homepage navigation timeout that passed alone and in the two-worker rerun.
- Primary protected Preview `dpl_8HAb1BuCyZiFPJcRnzKhZgNQVMp6` reached Ready at `https://song-review-app-v2-iuvnbjywz-corisleachmans-projects.vercel.app`; both Vercel project checks and Preview Comments passed. Its authorized `/api/auth/email/config` returned `{"enabled":true}`. In the protected browser, synthetic `auth=confirmation_failed` and `auth=invalid_confirmation` URLs rendered the explanation with both account choices; ordinary `/login` rendered no warning. The warning was visually inspected over its dark backing. Browser console errors, deployment error logs, and 5xx searches were empty. One CSP report was only Vercel's injected Preview Toolbar script at `https://vercel.live`, not a Song Room resource.
- No real confirmation token was reused in automation. A physical-phone and cross-device recheck is still useful; full recovery and a cross-device resend path remain separate work. PR #55 remains draft with a documentation-only `UPDATE_LOG.md` merge conflict. No Production setting or deployment changed.

## Controlled Free signup, 2026-09-27

- The user submitted the designated staging `+songroomtest` address on the protected PR #55 Preview and saw the expected **Check your email** screen. The Cloudflare **Success!** widget on that page is the security check for requesting another message, not account confirmation.
- Staging Auth created one test user at 15:19:12 UTC and recorded email confirmation at 15:19:34 UTC. One profile, one Free workspace, and one owner membership appeared about a second after confirmation. The Free workspace has no Stripe customer or subscription ID; there is no referral row for this direct signup. These timestamps support the intended verification-before-bootstrap order. No duplicate records were found.
- Resend shows one **Confirm Your Signup** message from `noreply@song-room.live` to the designated test address, marked **Sent** and **Delivered** at 16:19 UK time. Its confirmation anchor targets the stable protected staging `/auth/confirm` route and includes `intent`, `token_hash`, and `type=signup`; no token values were copied into notes or used by the agent. Resend's insights place the valid DMARC record under **Doing great**. They flag a link-domain mismatch because the staging link uses the Vercel branch hostname while the sender uses `song-room.live`, and recommend not using a no-reply address. Treat those as rollout copy/deliverability follow-ups, not evidence of failed delivery.
- The user confirmed that opening the confirmation email on desktop took them into the new empty workspace, which prompted them to upload a first song. Opening the same one-time link later on mobile took them to the generic Login page. Email/password login then opened the dashboard, showing **No songs in Coris's workspace yet. Create your first song.** A read-only staging query after that login still found exactly one Auth user, profile, workspace, and membership. Auth recorded a later sign-in at 15:28:46 UTC. The second click did not duplicate the account or workspace.
- Code inspection explains the confusing second-click result: `/auth/confirm` sends `auth=confirmation_failed` to `/login` if `verifyOtp` rejects a used token, but the deployed Login did not display that reason. The one-time-link explanation is consistent with the sequence; we haven't captured the provider's exact error for that click. The local fallback candidate above adds a clear message, pending Preview verification.
- Vercel deployment-scoped searches found no application error or 5xx event in the checked two-hour window. No Production setting, payment, or PR merge changed.

## Entry-screen follow-up, 2026-09-26

- A phone screenshot of the enabled Preview showed the whole signup form and Turnstile's automatic **Success!** state before the user chose Email; the Google option was below the viewport. The message confirms only the security check, not account creation.
- The staged UI change puts **Log in or sign up with Google** first and **Log in and sign up with email** second. The later phone mockup confirms lower-page positioning over the photo, left-aligned copy, an outlined Google choice, and a red Email choice. The Email choice reveals the existing route-specific form with a short motion transition; Turnstile mounts only then, under a **Security check** label. The Google OAuth handler, selected plan, redirect destination, server gates, and hosted settings are unchanged.
- Focused UI commit `c489353e` is pushed to draft PR #55. Primary Preview `dpl_2b9hadtZ8PADRmb7xtqfZuZC4mEJ` is Ready at the stable protected branch alias. At a 390×844 browser viewport, both choices were in view; no Email fields or Turnstile appeared until Email was selected. The form and hosted security check then appeared, and closing Email removed them. Both Vercel checks and a manually dispatched browser-accessibility workflow passed. Recent deployment logs had no error or 5xx event; one CSP report was Vercel's injected Preview Toolbar script. No form was submitted or account created. A real-phone check is still needed before controlled staging signup and delivery. Production remains Google-only.
- PR #55 currently has a documentation-only merge conflict in `UPDATE_LOG.md` against the advancing `clone-clean` branch. Resolve it separately before considering merge; do not discard the local uncommitted notes.
- The user checked the new signup entry screen on a real phone and confirmed it matches the two-choice behavior described above. Before any account submission, a read-only staging Auth query found zero users for the designated `+songroomtest` mailbox. The Preview is still Ready and PR #55 remains draft. A controlled signup, Auth email delivery, confirmation, and post-confirmation records remain untested.

## What the code now supports

- Returning-user email/password login through a server route.
- Name, email, password, confirmation, and consent for Free, Pro, and Studio signup entry.
- A sealed, email-bound continuation to the intended dashboard, protected page, or plan confirmation.
- A check-email state with a visible resend cooldown and change-email escape.
- Neutral provider responses for signup and resend so the public result does not reveal whether an account exists.
- Cloudflare Turnstile on login, signup, and verification resend. Tokens are mandatory, passed to Supabase Auth for hosted validation, and reset after every attempt because they are single-use.
- Conditional CSP access to `https://challenges.cloudflare.com` for scripts and child frames. The allowance is absent while the public site key is missing and remains absent from `/embed/*`.
- Default-off behavior. The UI stays Google-only unless `EMAIL_PASSWORD_AUTH_ENABLED` is exactly `true`, `AUTH_INTENT_SECRET` is at least 32 characters, and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is present.

## Completed hosted-key default-off Preview gate

- Primary Preview `dpl_6aBS3Z21Radpg4MULqau2h1tGdjU` reached Ready at `https://song-review-app-v2-6i4x6pj3z-corisleachmans-projects.vercel.app`; all four PR checks passed.
- Homepage and Login returned `200`. Signed-out Dashboard returned `307` to `/login?redirectTo=%2Fdashboard`.
- `/api/auth/email/config` returned `{"enabled":false}` and a synthetic Email login request returned `404` with the unavailable response. Opening `/auth/check-email` returned to `/login?auth=email_unavailable`.
- Rendered Login remained Google-only with one Google button, no Email or password fields, and no Turnstile script or frame.
- Standard CSP included only the exact Cloudflare challenge origin in `script-src` and `frame-src`, retained staging Supabase, `frame-ancestors 'none'`, and `X-Frame-Options: DENY`, and omitted report-only CSP. `/embed/*` excluded Cloudflare, kept `frame-src 'none'` and `frame-ancestors *`, and omitted `X-Frame-Options`.
- Deployment logs contained no error, fatal, or 5xx event. All four CSP reports were Vercel's injected Preview Toolbar script from `https://vercel.live`, not Song Room application code. Browser console errors came from a Chrome extension.
- PR #55 remains draft. No Email form was exposed, no auth email was sent, and no account was created.

## Staging gates for the controlled Preview test

1. Complete: the staging Cloudflare Turnstile widget allows only the stable staging branch hostname. Production and localhost are excluded.
2. Complete: the matching secret is stored only in staging Supabase Auth > Bot and Abuse Protection, Turnstile is selected, CAPTCHA is enabled, and the public `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is scoped to the primary Preview branch. The secret is not in Vercel.
3. Configured, delivery test pending: staging Supabase Auth now uses Resend custom SMTP with a dedicated domain-restricted sending key. The existing application Resend integration remains separate.
4. Partially complete: Resend verifies SPF and DKIM, and one reviewed `p=none` DMARC record now resolves. Confirm bounce visibility and mail authentication on a real staging Auth message before tightening DMARC.
5. Preflight complete: `song-room.live` has no configured Resend tracking subdomain. Resend says click and open tracking are disabled by default. Keep tracking off for Auth mail and inspect the first real confirmation link for unexpected rewriting.
6. Dashboard-visible baseline captured for all six Auth templates and seven disabled security notifications in `STAGING_AUTH_TEMPLATE_BASELINE.md`. This is a manual recovery reference, not a raw Management API export. No template has been edited.
7. Complete for this staging gate: Site URL now points to the stable PR #55 branch alias. The eight existing redirect allowlist entries were reviewed and left unchanged. The broad Preview wildcard remains for later narrowing after live Auth and Google callback tests.
8. Complete for the current staging gate: email confirmation is on, the hosted password minimum is 12 characters, and leaked-password protection is enabled. Secure password change and current-password enforcement remain off until the complete reset, change-password, and reauthentication journeys are implemented and tested. The current Auth rate-limit values are recorded below; do not change them without a measured reason.
9. Complete for the controlled Preview gate: a new `AUTH_INTENT_SECRET` is stored as a sensitive variable and `EMAIL_PASSWORD_AUTH_ENABLED=true` is present only on the PR's Preview branch. The enabled deployment is Ready and reports `enabled: true`. Do not copy a Production secret into Preview or add the flag to Production.
10. Leave Production Email disabled and do not add the Production feature flag during this staging step.

## Sender preflight, 2026-09-25

- Resend's `song-room.live` domain is verified in `eu-west-1`, with sending enabled and its DKIM and SPF records marked verified. The existing application uses `noreply@song-room.live` for notifications, but that does not configure Supabase Auth SMTP.
- The domain's Resend configuration offers tracking setup rather than showing tracking as enabled. Keep click tracking off for Auth mail and confirm this again before a live confirmation test.
- 123 Reg held two conflicting TXT records at `_dmarc.song-room.live`. With the user's approval, the `p=quarantine` duplicate was deleted and the `v=DMARC1; p=none;` record retained. 123 Reg reported success; both authoritative nameservers and a public resolver subsequently returned only `p=none`. Resend recommends starting with `p=none` until all legitimate senders pass DMARC, then tightening the policy.
- A dedicated `Song Room staging Supabase Auth SMTP` Resend key was created with **Sending access** restricted to `song-room.live`. Its value was entered only into staging Supabase Auth, never into code, documentation, or Vercel.
- Staging project `ivifkrtupqizyqqsxdty` saved custom SMTP using `noreply@song-room.live`, sender name `Song Room`, host `smtp.resend.com`, port `465`, username `resend`, and the default 60-second per-user interval. The dashboard confirmed success and the enabled state persisted after reload. The stored password is hidden. Templates were not changed and no Auth email was sent.

## Resend read-only sender check, 2026-09-25

- In the signed-in Resend dashboard, `song-room.live` remains Verified in `eu-west-1`. Its Configuration page offers **Configure** for tracking, which opens **New tracking subdomain**; no existing tracking subdomain or active tracking setting is shown. The checked click-tracking box on that creation form is a default for a *new*, unsaved configuration, not evidence that tracking is currently on. Resend says [both tracking types are disabled by default](https://resend.com/blog/introducing-custom-tracking-domain). Nothing was added or saved.
- The Emails > Sending view can filter by the dedicated `Song Room staging Supabase Auth SMTP` key and by delivery status, including Bounced, Delivery delayed, Failed, Delivered, and Suppressed. With that key selected and the default **Last 15 days** window, Resend showed **No results found**. This matches the absence of a staging Auth test message; it does not prove inbox delivery or link integrity.
- Next sender check is one separately approved staging Auth message to a designated test mailbox. Inspect its delivered/bounced status, recipient authentication headers, and confirmation URL without logging or sharing the one-time token. Keep click and open tracking unconfigured.

## Auth template and URL preflight, 2026-09-25

- Captured all dashboard-visible staging Auth email subjects and Source bodies, plus the seven disabled security notification states, in `STAGING_AUTH_TEMPLATE_BASELINE.md`. No Save action was taken. This manual snapshot can guide restoration, but is not a raw configuration export.
- Before the approved template change, Confirm signup linked to `{{ .ConfirmationURL }}`. The template now keeps its prior subject and copy but links to `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup`. The original application redirect carried a sealed intent; the 13 October staging repair replaces that with `/auth/confirm?flow=UUID` without changing this hosted template. A fresh post-repair confirmation link still needs live verification.
- Before the approved change, staging Site URL was `https://song-review-app-v2-git-codex-sta-642af2-corisleachmans-projects.vercel.app`, an older Preview. It now points to the current PR #55 branch alias, `https://song-review-app-v2-git-codex-ema-c75749-corisleachmans-projects.vercel.app`. Vercel reported the alias on ready deployment `dpl_6cfGzJb6c8oZh5kftFdDCdejNyFP`; Supabase reported success and the URL persisted after reload. The eight-entry redirect allowlist was not changed. Its broad Preview wildcard appears to cover this host, but a live Auth redirect has not verified that assumption. A protected Preview fetch of `/api/auth/email/config` returned `200` with `{"enabled":false}` after the hosted changes.
- The latest PR #55 Preview observed in Vercel was deployment `dpl_6cfGzJb6c8oZh5kftFdDCdejNyFP` for commit `8fa4557d`. The earlier default-off gate above was run on `dpl_6aBS3Z21Radpg4MULqau2h1tGdjU`; repeat the relevant gate on the deployment used for live email tests.

## Password and rate-limit preflight, 2026-09-25

- Initial read-only check of staging Supabase Auth: Email is enabled, signup confirmation and secure email change are on. The hosted password minimum was 6 characters with no composition rule; leaked-password protection, secure password change, and require-current-password were off. No setting was saved during that check.
- PR #55's signup/login input requires 12 to 128 characters. The old `/auth/reset-password` page still says and checks 8 characters, relies on a browser recovery session, and has no request flow wired to it. The journey plan already treats it as dormant. Replace it with the planned SSR recovery flow and align password validation before public Email rollout; changing only the hosted minimum would otherwise leave contradictory guidance and a provider-side rejection for 8-to-11-character reset attempts.
- Current hosted limits: 30 Auth emails per hour project-wide, 30 signup/sign-in attempts per 5 minutes per IP, 30 OTP/magic-link verifications per 5 minutes per IP, and 150 token refreshes per 5 minutes per IP. The SMTP per-user send interval is 60 seconds. IP address forwarding is off. The new auth routes call Supabase from the server with the public anon key and do not add an app-level per-client-IP throttle, so do not assume the hosted per-IP limit maps cleanly to each end user behind Vercel. Inspect effective rate limiting in a controlled staging test before deciding on extra throttling or IP forwarding.
- Supabase documents a larger hosted password minimum and optional leaked-password checks; its IP-forwarding facility requires secret API keys. Do not enable that facility merely to work around proxying. References: [password security](https://supabase.com/docs/guides/auth/password-security) and [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).
- With the user's approval, the staging Email provider's minimum was raised from 6 to 12 and leaked-password protection was enabled. Supabase showed `Successfully updated settings`. After a full reload, the Email drawer still showed 12 and the protection switch on, with Save disabled. No composition rule, rate limit, other password-change control, user, application flag, or Production setting was changed. A real Auth signup and mail-delivery test is still pending.

## Confirmation template contract

The signup route passes a reviewed, same-origin URL shaped like:

```text
https://STAGING_ORIGIN/auth/confirm?flow=RANDOM_UUID
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

## Controlled Preview gate review, 2026-09-25

- PR #55 is still open and draft against `clone-clean` at `8fa4557d`; its four GitHub/Vercel checks are successful. The primary Vercel deployment `dpl_6cfGzJb6c8oZh5kftFdDCdejNyFP` is Ready and has the stable `codex/email-password-staging-forms` alias.
- Read-only Vercel variable listing for `song-review-app-v2` shows `NEXT_PUBLIC_TURNSTILE_SITE_KEY` scoped only to that Preview branch. Neither `AUTH_INTENT_SECRET` nor `EMAIL_PASSWORD_AUTH_ENABLED` appears in Preview. None of those three appears in Production. Variable values were not read or exported.
- An unauthenticated fetch of the protected Preview's `/api/auth/email/config` was intercepted by Vercel SSO (`302`), not by the app. An authorized `vercel curl` request to deployment `dpl_6cfGzJb6c8oZh5kftFdDCdejNyFP` then returned `{"enabled":false}`. The browser rendered Google-only Login with no Email controls. A signed-out `/dashboard` visit redirected to `/login?redirectTo=%2Fdashboard`; clicking Google returned to the existing Coris workspace dashboard, which loaded four songs. This verifies the default-off and protected-return journeys on the current deployment. No test account was created.
- This deployment's runtime-log window around the test showed no error, fatal, or 5xx entries. The signup code's server gate requires the flag, a server-only intent secret of at least 32 characters, and the public Turnstile key. The Confirm signup template, staging Site URL, custom SMTP, hosted password policy, and Turnstile setting are configured, but no real Auth email or confirmation redirect has been tested.
- A later signed-in, read-only Resend check found no configured `song-room.live` tracking subdomain. The dedicated staging Auth sending key had no email results in the last 15 days; delivery and link integrity remain untested. No Resend setting or mail was changed or sent.
- The safe activation order is to add a newly generated staging-only `AUTH_INTENT_SECRET` to this Preview branch, redeploy and confirm Email remains off, then add branch-scoped `EMAIL_PASSWORD_AUTH_ENABLED=true`, redeploy and run one controlled signup. Do not use a project-wide Preview or Production scope. A designated test mailbox and access to the protected Preview are needed before creating an identity. No live Stripe payment is part of this test.
- The older reset page is not a complete recovery journey. The controlled test may exercise signup, verification, login, and resend, but public Email rollout must wait for the recovery slice and its acceptance tests.

## Branch-only secret and renewed default-off gate, 2026-09-26

- With approval, generated a fresh 64-character random `AUTH_INTENT_SECRET` and sent it directly to Vercel as a sensitive, encrypted variable scoped to Preview branch `codex/email-password-staging-forms` on primary project `song-review-app-v2`. The value was never printed, exported, added to the repository, or shared with Production. Vercel's variable listing shows the intended branch scope; `EMAIL_PASSWORD_AUTH_ENABLED` remains absent. Production lists none of the Email rollout variables.
- Redeployed the existing PR #55 Preview deployment, without deploying local uncommitted files. New deployment `dpl_BknpVEitWoPL53PcMs91YyWaNZxQ` is Ready at `https://song-review-app-v2-k1uhp8k2q-corisleachmans-projects.vercel.app`; the stable branch alias points to it. The PR remains draft at commit `8fa4557d` with four successful checks.
- On the new deployment, an authorized `/api/auth/email/config` request returned `{"enabled":false}`. The protected branch-alias Login rendered only Continue with Google, with no Email fields or Turnstile challenge. A cookie-free Dashboard request returned `307` to `/login?redirectTo=%2Fdashboard`; an existing signed-in browser session loaded the Coris workspace with four songs. The Google OAuth roundtrip was not repeated. Recent runtime searches found no error, fatal, or 5xx events.
- The designated test inbox is held outside the repository. No staging Auth signup, confirmation email, new identity, feature flag, or Production change occurred. The next gated action is separately approved, branch-only `EMAIL_PASSWORD_AUTH_ENABLED=true` and its own Preview redeployment and UI check. Creating an account and sending Auth mail require another explicit approval.

## Branch-only Email flag and enabled UI gate, 2026-09-26

- With separate approval, added `EMAIL_PASSWORD_AUTH_ENABLED=true` only to the `codex/email-password-staging-forms` Preview branch on primary Vercel project `song-review-app-v2`. A variable-name listing showed the public Turnstile key, sensitive intent secret, and Email flag on that branch; Production listed none of these rollout variables. No secret value was read.
- Redeployed existing Preview `dpl_BknpVEitWoPL53PcMs91YyWaNZxQ` from the same PR commit without including local documentation changes. New Preview `dpl_5XtatCMZYYbdtoPFo7MSRfe4EeBB` is Ready at `https://song-review-app-v2-k05bqeqmh-corisleachmans-projects.vercel.app`, and the stable PR branch alias points to it. A request without Vercel authorization still received `302`, confirming the Preview remains protected.
- An authorized request to `/api/auth/email/config` returned `200` and `{"enabled":true}`. The authorized browser rendered Email and Password fields, a Cloudflare security check that displayed Success, a Log in button, and Continue with Google. No CAPTCHA was manually solved, and no credentials were entered. The Create account link led the already signed-in browser to its existing Dashboard; a cookie-free `/signup/free` request returned `200`, but the signup form was not visually checked in a signed-out browser.
- A cookie-free `/dashboard` request returned `307` to `/login?redirectTo=%2Fdashboard`. Deployment-scoped error and 5xx log searches found no entries around these checks. The Google button remained visible, but the OAuth roundtrip was not repeated. No account, Supabase setting, Auth email, PR commit, or Production service changed.
- Stop here until a separate account-test approval. The test must use the designated inbox, inspect the first real delivery and confirmation URL without exposing its token, and stop on any failure before trying the broader matrix.

## Staging verification order

1. Complete on Preview deployment `dpl_6cfGzJb6c8oZh5kftFdDCdejNyFP`: the config endpoint returned `enabled: false`; Login was Google-only; signed-out Dashboard kept the exact login redirect; Google returned to the existing workspace. Stop if a later deployment regresses any of these.
2. Staging sender: tracking is unconfigured in Resend. Designate a test mailbox that can receive `noreply@song-room.live` and confirm the tester can open the Vercel-protected Preview. Do not create an account yet; actual delivery and link integrity are checked at step 5.
3. Complete on Preview deployment `dpl_BknpVEitWoPL53PcMs91YyWaNZxQ`: a newly generated server-only `AUTH_INTENT_SECRET` of at least 32 characters is scoped to `codex/email-password-staging-forms`. The redeployment is Ready, Login is still Google-only, and the config endpoint still returns `enabled: false`.
4. Complete on Preview deployment `dpl_5XtatCMZYYbdtoPFo7MSRfe4EeBB`: branch-only `EMAIL_PASSWORD_AUTH_ENABLED=true` is present, the deployment is Ready, `/api/auth/email/config` returns `enabled: true`, and Login shows Email fields, Cloudflare security check, and Google. The protected Preview still requires Vercel authorization. Full Google OAuth and a signed-out signup form were not retested; stop before account creation until separate approval.
5. With a designated test mailbox and explicit account-test approval, create one staging account. Confirm no profile, workspace, membership, referral reward, or Stripe customer exists before email verification. Check delivery, SPF/DKIM/DMARC results, and the exact confirmation destination without exposing its one-time token in logs or reports.
6. Open the confirmation in the same browser and another authorized browser. Confirm one account and one intended workspace are created. Test resend, duplicate submit, changed email, invalid credentials, Back, refresh, expired and altered links, and the Google fallback.
7. Test Free, Pro, and Studio entry. Paid choices must stop at the existing plan confirmation and must not open Checkout automatically. Scan Auth, application, delivery, and CSP logs. Stop for any 5xx, genuine blocked resource, raw provider error, duplicate record, or unexpected email disclosure. Report the URL, step, error text, and relevant log excerpt or screenshot before continuing.

## Rollback

Hide the Email UI by removing or setting `EMAIL_PASSWORD_AUTH_ENABLED=false` on the named Preview branch and redeploying it. Leave the staging intent secret, SMTP, Turnstile, and Email provider available while test password identities exist so they are not locked out or lose their continuation and recovery path. Do not remove the branch's public site key as a shortcut while Email routes may still be used. Revert the application commit only if the hosted template and redirect contract remain compatible with the earlier code. Production needs no change for this Preview rollback.

## Password-recovery slice, protected Preview, 2026-09-28

- Added a Forgot password link within the expanded Email login form, a Turnstile-protected request page, a neutral request response, and an invalid-link retry path. The request and password-update endpoints are gated by the same branch-only Email readiness check and same-origin rule as existing Email routes.
- The recovery email link must enter `/auth/confirm` with the sealed intent, token hash, and `type=recovery`. Only a successful Supabase OTP exchange that returns the matching user and a session creates a separate, httpOnly, email-bound `recovery_verified` intent. The reset page and POST route require both that intent and the live matching session. A successful update clears the intent and attempts to sign out other sessions.
- The old browser-only reset page's eight-character instruction was replaced with the hosted 12-to-128-character rule. Focused TypeScript, lint, contract, and mocked desktop/phone browser checks passed locally. Code commit `ffb7fb2d` is pushed to draft PR #55. Primary protected Preview `dpl_9bbBYhTZu2P1z1eysELMqyyGSbbQ` is Ready at the stable `codex/email-password-staging-forms` alias, and both Vercel checks plus Preview Comments passed. The enabled config endpoint, invalid-link page, unsigned-reset rejection, and Email Login return path passed read-only hosted checks. No real recovery email, Auth token, password update, or other-session revocation has been tested yet.
- Completed with separate approval: the staging Supabase **Reset password** template link changed from `{{ .ConfirmationURL }}` to `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery`. Before saving, the subject and full source matched the original captured in `STAGING_AUTH_TEMPLATE_BASELINE.md`. The subject stayed `Reset Your Password`; the heading, sentence, and button text were unchanged. Supabase disabled Save after the edit, and a full reload showed the exact new source with Save disabled. No Auth email was sent. The generated URL and token must be checked during a separately approved live staging test, using the stable protected Preview alias without recording or sharing the token.
- Keep PR #55 draft and Production Google-only. The unique deployment URL produced Turnstile `110200`, which Cloudflare defines as an unauthorized hostname; use the configured stable branch alias for real tests. That alias rendered a successful widget. The deployed recovery pages are not a complete live reset test. With separate approval, change the staging template and run a controlled reset using the designated test mailbox. Stop on any broken redirect, Auth error, duplicate identity, unexpected email disclosure, or failed login with the new password. If needed, disable only the branch-scoped Email flag and redeploy; restore the captured staging template if the link contract must be rolled back.

## Browser matrix checkpoint, 2026-10-21

Status: the available Chromium, Firefox, WebKit, and desktop Safari coverage passes for the public Email entry boundary on protected Preview `dpl_CrWtwDedS4JR9NGhSJntxjmvbCa6` at commit `696869740dea136ab43bedca0c7ef531cb05fbbd`.

- Chromium passed all 20 applicable browser tests, with 10 intentional project skips.
- WebKit passed the repaired 390-pixel homepage overflow and upgrade-plan contrast checks. Its five automated focus failures were traced to Safari's macOS Full Keyboard Access preference rather than missing native controls.
- Real desktop Safari confirmed that plain Tab stays on page content while Full Keyboard Access is off. Safari's standard Option-Tab reached the homepage `Start for free` link, the signed-out Google login button, and the cookie `Reject` button. Enter opened the signup route and dismissed the cookie panel. The Google button showed a clear visible focus outline. No system setting was changed.
- Firefox passed all 20 applicable tests in the serial warm-build rerun, with 10 intentional skips. Four failures in the initial parallel run were Next.js development compilation timeouts; each passed with one worker and a longer assertion window.
- The protected branch config remained `{"enabled":true,"passwordManagementEnabled":true}`. The deployment-scoped error, warning, and fatal log search around the hosted Safari checks was empty. No account was created, no credential was submitted, and no email or Stripe journey ran.
- Two temporary Vercel share links were used to keep the browser checks signed out without weakening Deployment Protection. They expire automatically on 22 October 2026. Production was not changed and Production Email remains disabled.
- Effective staging abuse and rate-limit behavior remains open. It needs a separately approved bounded test because repeated invalid sign-ins could temporarily rate-limit other staging traffic through shared Vercel egress.

## Rate-limit preflight refresh, 2026-10-21

Status: the read-only configuration review is complete. The approved live run stopped safely before the rate-limit boundary because its second provider-intended submission failed between Safari and Vercel. No hosted setting, user, email, application flag, or Production service was changed.

- Staging still allows 30 Auth emails per hour project-wide, 30 signup/sign-in requests per five minutes per IP, 30 token verifications per five minutes per IP, and 150 token refreshes per five minutes per IP. The custom-SMTP per-user email interval remains 60 seconds.
- IP address forwarding remains off. The Email routes still call Supabase server-side with the public anon key, so the hosted per-IP sign-in limit may see Vercel egress rather than the visitor's address. The app has no independent login-attempt throttle.
- The proposed live proof is a five-minute quiet window followed by no more than 31 sequential login submissions for a controlled, confirmed-absent staging alias and a known-invalid password. Each submission must pass a fresh Turnstile check. Reconfirm that the alias is absent immediately before the run. Do not request recovery, resend verification, create an account, or use Production.
- Stop immediately if any email is sent, a correct session is created, an account or identity changes, a token or password appears in a URL or log, a non-uniform provider message reaches the UI, or another staging sign-in is affected unexpectedly. Capture the attempt number, visible copy, response status, relevant redacted Auth/runtime log line, and screenshot before retrying.
- After the bounded run, wait at least six minutes before the success-path control login. Review Supabase Auth logs and Preview runtime logs for the observed throttle boundary and secret-safe error handling. If no throttle appears by attempt 31, stop rather than increasing the burst; that result is evidence that the hosted limit is not a reliable visitor-level control through the current proxy path.
- Immediately before the live run, the controlled alias was reconfirmed as absent in staging Auth. Chrome loaded the app but not the Cloudflare Turnstile runtime, so it sent no login request. Real Safari on the stable branch host rendered Turnstile and reached `Success!` without changing any browser or hosted setting.
- One harness setup submission reached the application with an empty React password state and returned the expected validation `400`; it did not reach Supabase Auth. After entering the invalid password through normal browser input, the first provider-intended submission returned the uniform `Email or password wasn't recognised.` copy. Vercel recorded one `401`, and Supabase Auth recorded one password-grant `/token` request with `invalid_credentials` and status `400`.
- The next provider-intended submission displayed `That request could not be completed. Check your connection and try again.` Vercel recorded no corresponding request and Supabase recorded no second password-grant request, locating the failure between Safari and Vercel rather than inside Supabase Auth. The run stopped immediately and no later attempt was sent.
- The post-stop check still found zero Auth users for the controlled alias. No Auth mail endpoint was called. Preview logs contained neither the alias nor the test password, CAPTCHA token, token hash, or sealed intent, and there was no Email-login `5xx`. The hosted rate-limit boundary remains untested.
- A later read-only inspection of the preserved Safari page found the exact browser error for the failed POST: `Failed to load resource: The network connection was lost.` The page still showed the generic connection copy and Turnstile subsequently returned to `Success!`. Vercel request logs contained only the expected validation `400` and first provider-intended `401`; staging Supabase logs contained only one password-grant `/token` request with `invalid_credentials` and status `400`. There was no second application or provider request. This confirms a browser or network transport interruption before Vercel, but does not identify why Safari lost that connection.
- The retry harness must use a fresh stable-alias page with Safari Web Inspector open before the first submission. Submit only through the normal form, once per visibly successful Turnstile token. After every response, wait until the button is idle and the reset widget has visibly returned to `Success!` before the next submission. Count only requests present in Vercel's request log, retain Safari Network and Console evidence, and stop at the first browser transport error or any existing safety condition.
- Do not resume the burst from attempt 3. The next run starts from zero after a new five-minute quiet window, rechecks that the controlled alias is absent, retains the original maximum of 31 provider-intended requests, and requires fresh approval.

## Bounded rate-limit retry result, 2026-10-21

Status: the approved retry completed safely at the 31-request cap, but it did not reach the configured 30-per-five-minute threshold. The rate-limit gate therefore remains open.

- After a fresh five-minute quiet window, the controlled alias was reconfirmed as absent from staging Auth. The Safari harness used the stable protected branch alias, normal form submission, and a fresh successful Turnstile check for every attempt.
- Exactly 31 provider-intended submissions reached the Preview between 22:11:31 and 22:21:06 UTC. Vercel recorded 31 Email-login responses, all `401`. Staging Supabase Auth recorded 31 password-grant `/token` requests, all status `400` with `invalid_credentials`. The page kept the same `Email or password wasn't recognised.` copy throughout.
- No browser transport error, application `5xx`, provider throttle, session, account creation, or Auth email occurred. A post-run query still found zero Auth users for the controlled alias. The checked Preview log messages contained no controlled alias, password, CAPTCHA value, or Turnstile value.
- The careful batch reconciliation stretched the run across 9 minutes 34 seconds. The busiest rolling five-minute window contained 19 requests, so the run never put 31 requests inside the provider's five-minute window. The absence of `429` is expected at that measured cadence and is not evidence that the hosted limit works or fails through Vercel.
- Submissions stopped at the approved cap. Do not append more attempts to this run. The route and bucket review below supersedes the earlier proposal for a faster 31-request provider test.
- Production was not touched. No hosted setting, deployment, database row, email, or payment changed.

## Password-login rate-limit model correction, 2026-10-21

Status: the previous test targeted the wrong hosted bucket. Do not repeat it with a faster Safari harness. The remaining abuse-control gap is visitor-level throttling before the Vercel function, not proof that a single interactive user can empty Supabase's token bucket.

- The application route calls `supabase.auth.signInWithPassword`. The staging Auth evidence confirms that every provider-intended request reached `/auth/v1/token` with `grant_type=password`.
- Supabase's current [Auth rate-limit documentation](https://supabase.com/docs/guides/auth/rate-limits) puts password, refresh-token, ID-token, and PKCE grants in the token-endpoint bucket. This project has that field set to 150 requests per five minutes per IP. The bucket can hold a burst of 30 and refills at the configured rate. The separate 30-per-five-minute signup and sign-in field does not govern these password grants.
- At 150 requests per five minutes, the token bucket refills by roughly one request every two seconds. A sequential Turnstile flow taking several seconds per attempt cannot drain it, even if 31 submissions finish inside five minutes. A useful provider test would require a much faster request rate and would no longer represent the reviewed interactive flow.
- The 31-request run reached two provider-visible source addresses, split 30 requests and one request. Because IP forwarding is off, those are Vercel source addresses rather than the browser visitor. This confirms that the hosted per-IP bucket is not a dependable visitor-level control for this server-proxied route.
- A read-only Vercel Firewall lookup found no active custom firewall configuration for this project. No firewall rule or draft was created. The installed local Vercel CLI also lacks the current `firewall` subcommand, so any approved rule should be prepared through the current Vercel API or dashboard and independently inspected before publication.
- The recommended next gate is a Preview-only Vercel Firewall rate-limit rule matching exactly `POST /api/auth/email/login`, keyed by visitor IP, using a fixed five-minute window. Start with a generous threshold of 15 and log excess requests without blocking. After reviewing the matches, separately approve a Preview `429` action and verify the 16th controlled attempt is stopped before the application and Supabase. Production stays unchanged until the Preview rule and normal login recovery both pass.
- Rollback is to disable the rule or return its excess action to log-only. This approach needs no database table, secret, migration, or application deployment.

## Preview firewall draft, 2026-10-21

Status: the visitor-level observation rule is staged in Vercel and remains unpublished. It is not live on Preview or Production.

- Draft rule: `Preview email login rate observation` (`rule_preview_email_login_rate_observation_nrjuSZ`).
- Conditions are combined with AND: Request Path equals `/api/auth/email/login`, Method equals `POST`, and Environment equals `Preview`.
- Rate limit configuration: Fixed Window, 300 seconds, 15 requests, keyed only by IP Address.
- Threshold action: `Log`. The rule does not deny, challenge, redirect, or return `429` in this first stage.
- Vercel shows one pending change and the message `Review changes to publish the updated Firewall configuration to production`. The rule detail page and review dialog were inspected; Publish was not selected.
- An active-config API lookup still returned `Seawall Config not found`, consistent with there being no published custom firewall configuration for this project. The dashboard is the authoritative source for the staged draft because the available API lookup did not expose it under the attempted draft selector.
- No request was sent through the draft, no deployment occurred, and no Vercel variable, Supabase setting, database row, email, or Production service changed.

### Publication and rollback

- Publishing is a separate external action and still needs the user's explicit decision in Vercel. Do not publish the current draft automatically.
- After publication, the first check is that ordinary Preview Email login still returns its existing application result and Production remains unaffected. The observation test then sends at most 16 controlled Preview attempts with fresh Turnstile checks and confirms that only traffic over the threshold is logged.
- Before any enforcement test, change only the Preview rule's threshold action from Log to `429`, stage that edit, inspect it, and obtain a separate publish decision. Rollback is to stage and publish either Log again or a disabled rule.

## Preview firewall publication, 2026-10-23

Status: the visitor-level observation rule is published and active. It matches Preview traffic only and remains log-only, so it does not block requests or return `429`.

- Active rule: `Preview email login rate observation` (`rule_preview_email_login_rate_observation_nrjuSZ`).
- The published detail page confirms the AND-combined conditions: Request Path equals `/api/auth/email/login`, Method equals `POST`, and Environment equals `Preview`.
- The published rate limit remains Fixed Window, 300 seconds, 15 requests, keyed only by IP Address. The threshold action remains `Log`.
- Vercel displayed `Firewall changes published`, the pending-change dialog cleared, and the enabled rule appeared in the active Project rules list with the Log action.
- No login request, deployment, environment variable, Supabase setting, database row, email, or Production application configuration changed during publication verification.
- The next gate is a bounded Preview observation run of at most 16 controlled attempts with fresh Turnstile checks. That test has not been started.

### Rollback

- Stage a change that disables the rule, inspect it, and have the user publish it. Because the active action is Log, the current rule cannot deny a legitimate request while rollback is being prepared.

## Preview firewall observation run stopped safely, 2026-10-23

Status: the approved 16-attempt observation run stopped after seven provider-intended requests when Safari lost the test window. The run did not reach the firewall threshold, so it neither passes nor fails the Preview rule.

- Before the run, the controlled rate-limit alias was reconfirmed as absent from staging Auth. The published Vercel rule was active with its exact Preview-only path and method conditions, 15-request fixed-window threshold, visitor-IP key, and Log action. Its filtered traffic view contained no earlier match.
- One initial form submission returned the application's local password-length validation because Safari's accessibility value setter had not updated React state. It did not reach Supabase and is not counted as a provider-intended request.
- Exactly seven provider-intended password grants reached staging between 10:24:16 and 10:25:30 UTC. All seven returned provider status `400` with `invalid_credentials`; the Preview showed the same neutral `Email or password wasn't recognised.` copy after each attempt. Before every next counted submission, the reset Turnstile widget visibly returned to `Success!`.
- After attempt seven, the Safari automation handle switched to a Start Page and the test window was no longer present in Safari's Window menu. The test stopped immediately and no eighth provider request was sent. This is a harness interruption, not evidence of an application or firewall defect.
- The filtered Vercel Firewall traffic view remained empty. That is expected below the 15-request threshold because this rule logs only excess traffic. A post-stop staging query still found zero Auth users for the controlled alias.
- No email, successful session, account, database row, hosted configuration, deployment, or Production service changed. The inspected provider entries contained no password or controlled alias.
- Do not append nine attempts to this run. A valid retry starts from zero after a fresh five-minute quiet window and requires separate approval for at most 16 provider-intended submissions. Keep one Safari test window visible for the whole run and stop on the first transport or window-control anomaly.

### Rollback

No rollback is required for this stopped test. The active rule remains Preview-only and log-only. Its existing rollback is to stage and publish a disabled rule if observation later shows an unexpected match.

## Second Preview firewall observation run expired below threshold, 2026-10-23

Status: the separately approved restart reached nine provider-intended requests before Turnstile changed from automatic completion to an explicit human-verification checkbox. The fixed five-minute test window expired while waiting at that safety boundary, so the run stopped without sending request ten and remains inconclusive.

- The run started only after a fresh five-minute quiet window and a read-only staging query reconfirmed that the controlled alias had zero Auth users.
- Exactly nine distinct password grants reached staging between 10:30:51 and 10:32:43 UTC. All nine returned `invalid_credentials`, and the Preview retained the neutral `Email or password wasn't recognised.` response. Fresh Turnstile success was observed before each submitted request.
- After request nine, Turnstile presented a `Verify you are human` checkbox rather than completing automatically. No checkbox click or tenth submission occurred. The user later reported that the same widget displayed `Success!`, but the original five-minute firewall window had already expired.
- Seven later requests would not have proved the 15-request threshold inside the original window, so they were not sent. Do not append them to this run.
- A post-run query still found zero staging Auth users for the controlled alias. No email, successful session, account, database row, hosted setting, deployment, or Production service changed.
- The filtered firewall dashboard could not be re-read after the window because browser access to the existing tab was unavailable. Since the run stayed below the threshold, a missing excess-traffic match would not close the observation gate anyway.
- Another valid observation requires a fresh five-minute quiet window, a new run from zero, and separate approval for at most 16 provider-intended requests. Stop again if Turnstile requires an explicit user action; do not continue the count across an expired fixed window.

### Rollback

No rollback is required. The active firewall rule remains Preview-only and log-only, and this run created no persistent application data.

## Preview firewall observation gate passed, 2026-10-23

Status: the fresh bounded run completed all sixteen provider-intended requests inside one five-minute window. Vercel logged exactly one excess request, so the Preview-only observation rule matched at the reviewed threshold without blocking the journey.

- Before the run, more than five minutes had passed since earlier test traffic and the controlled alias was reconfirmed as absent from staging Auth.
- Exactly sixteen distinct password grants reached staging between 13:38:40 and 13:40:28 UTC, a span of 1 minute 48 seconds. All sixteen returned status `400` with `invalid_credentials`.
- Safari showed the same neutral `Email or password wasn't recognised.` response throughout. A fresh automatic Turnstile `Success!` preceded every submission, including request sixteen. No explicit human-verification click was needed.
- The filtered Vercel Firewall traffic page showed `Logged 1`, with `/api/auth/email/login` as the single top request path and the protected Preview host as the single top host. The active firewall and one active custom rule remained visible.
- Request sixteen still reached staging Auth, which is correct for the current Log action. The observation result proves the excess request is matched; it does not yet prove enforcement before the application or provider.
- A post-run query still found zero staging Auth users for the controlled alias. No email, successful session, account, database row, deployment, hosted setting, or Production service changed.
- The observation gate is complete. The next controlled gate is to change only this Preview rule's excess action from Log to `429` in a draft, inspect the retained path, method, environment, window, threshold, and visitor-IP key, then obtain a separate publication approval. Do not stage or publish that edit without explicit approval.

### Rollback

No rollback is required for the observation test. The active rule remains Preview-only and log-only. If a later enforcement test fails, stage and publish a return to Log before any broader rollout.

## Preview 429 enforcement draft blocked by Vercel plan gate, 2026-10-23

Status: no enforcement draft was created. The published rule remains Preview-only and its excess action remains `Log`.

- Before editing, the rule was rechecked in Vercel: Request Path equals `/api/auth/email/login`, Method equals `POST`, Environment equals `Preview`, Fixed Window is 300 seconds, the threshold is 15 requests, the key is IP Address, and the action is `Log`.
- Selecting `Too Many Requests (429)` opened Vercel's Upgrade to Pro panel. The panel lists Advanced WAF protection, including custom rules and rate limiting, as a Pro capability.
- The upgrade was not continued. `Save Rule`, review, and publish were not selected, so there is no pending firewall change.
- No billing, plan, deployment, environment variable, Supabase setting, database row, email, or Production configuration changed.
- The observation gate remains complete. The enforcement gate is blocked until there is a separate decision either to approve the Vercel plan change or to review an application-level Preview-only control.

### Rollback

No rollback is required because the requested edit was not staged. The existing published Log rule remains the current safe state.

## Application-level Email login limiter plan, 2026-10-23

Status: design complete and reviewed against the current route, migration patterns, Supabase guidance, and Vercel request-header contract. Nothing in this section has been implemented or applied. The existing Preview firewall rule remains log-only and Production remains unchanged.

### Decision

Do not upgrade Vercel for WAF enforcement at this stage. Add one shared, database-backed fixed-window limiter immediately before `supabase.auth.signInWithPassword` in `POST /api/auth/email/login`. It is a credential-abuse control, not a replacement for Vercel's automatic DDoS protection, because the request will still invoke the Vercel function and make one database call before rejection.

The limit remains the already observed value: fifteen syntactically valid login submissions per visitor IP in a database-clock five-minute window. Submissions one through fifteen may reach Supabase Auth. Submission sixteen returns `429` before the password grant. Successful and failed logins both count, and a successful login does not clear the bucket.

### Privacy and request identity

- Read the visitor address from Vercel's `x-vercel-forwarded-for` header. Vercel documents it as equivalent to its client-IP header and less exposed to an upstream proxy overwriting `x-forwarded-for`.
- Convert the address to an HMAC-SHA-256 digest with a new server-only `EMAIL_LOGIN_RATE_LIMIT_SECRET`. Use a different generated secret in Preview and Production. Do not reuse `AUTH_INTENT_SECRET`, `FEEDBACK_IP_SALT`, or any Supabase credential.
- Never store or log the raw IP, normalized email, password, CAPTCHA token, sealed intent, or full digest. The database stores only the 64-character digest, window start, attempt count, and expiry.
- If the trusted visitor header, secret, or limiter result is unavailable while the limiter is enabled, fail closed with a generic `503` and do not call Supabase Auth. A database outage would already make the provider journey unreliable; silently bypassing the new control is the less safe failure mode.

### Proposed database contract

Create one additive migration with:

- `public.email_login_rate_limits`, keyed by the client digest, with `window_started_at`, positive `attempt_count`, and `expires_at` columns plus an expiry index.
- RLS enabled and no client policy. Revoke every table privilege from `PUBLIC`, `anon`, and `authenticated`. Grant only the minimum `SELECT`, `INSERT`, `UPDATE`, and `DELETE` privileges to `service_role`.
- `public.consume_email_login_attempt(p_client_hash text)`, returning `allowed`, `attempt_count`, and `retry_after_seconds`. It uses one captured database timestamp, resets an expired bucket, and atomically increments an active bucket with `INSERT ... ON CONFLICT DO UPDATE`.
- Keep cleanup bounded and inside the same short function call: delete at most a small batch of expired rows selected through the expiry index with `FOR UPDATE SKIP LOCKED` before upserting the current client. Every caller follows the same cleanup-then-upsert lock order, avoiding an unbounded delete and reducing deadlock risk under concurrent login attempts.
- The function remains `SECURITY INVOKER`, sets `search_path = ''`, and fully qualifies every database object. Revoke execute from `PUBLIC`, `anon`, and `authenticated`; grant execute only to `service_role`.
- The threshold and window live in the function as reviewed constants, fifteen and 300 seconds. Changing either later requires a migration review rather than an unnoticed environment edit.

Explicit grants are required in the migration. Supabase's 23 October changelog reminder says existing projects move to non-exposed defaults on 30 October 2026, while RLS and grants remain separate controls. The migration must behave safely before and after that platform change.

### Proposed application contract

- Add a small server-only helper that extracts the Vercel visitor IP, produces the environment-specific HMAC, calls the service-role RPC, validates its response, and returns the allowance plus retry time.
- Add `EMAIL_LOGIN_RATE_LIMIT_ENABLED`, exact-true and default-off. Once this code is deployed, the login route must never treat a missing or false limiter flag as permission to bypass the counter. If Email is enabled while the limiter flag or secret is unavailable, return the generic `503` before Supabase Auth. Production Email must not be enabled unless this flag and its secret are present.
- Call the helper after same-origin and input validation but before creating the auth intent or calling Supabase Auth. This avoids spending a bucket entry on malformed bodies while ensuring every provider-intended password submission is counted.
- On denial, return the existing no-store Auth JSON shape with status `429`, a bounded `Retry-After` header, and neutral copy that does not reveal whether the email exists. Do not create an auth-intent cookie.
- On limiter failure, return the same no-store shape with status `503`. Server logging may include a stable limiter error code, but no address, digest, email, password, CAPTCHA value, or provider response.

### Implementation and staging order

1. Create the migration with `supabase migration new`; do not invent its timestamp. Add the helper, login-route integration, feature-flag checks, and focused tests locally. Do not deploy yet.
2. Run the repository test suite, TypeScript, focused ESLint, migration review, and `git diff --check`. Confirm the app builds with the limiter missing and Email defaulting closed.
3. After separate approval, apply the reviewed migration to staging only. Verify table RLS, grants, no policies, function ownership and `prosecdef = false`, empty search path, service-role execution, client denial, atomic concurrency, expiry reset, and Security Advisor results.
4. Add the generated secret and exact-true limiter flag only to the named Preview branch, without reading either value back. Redeploy the reviewed commit and confirm the protected alias owns the new deployment.
5. Recheck normal invalid and valid login behavior. Then run a fresh bounded sixteen-request test: requests one through fifteen must reach staging Auth, request sixteen must return application `429` with `Retry-After`, and no sixteenth password grant may appear in Supabase Auth logs.
6. After the window resets, confirm a normal Email login and recovery still work, Google remains available, no limiter field appears in logs, and the controlled absent alias still has no Auth user. Keep Production unchanged.

### Production gate and rollback

Production rollout remains separate. Apply the same reviewed migration before enabling its limiter configuration or Email UI. Add a different Production limiter secret, deploy with Production Email still hidden, verify the server-only RPC and Google regression, then enable the limiter before enabling Email.

Preview rollback is to remove or set `EMAIL_LOGIN_RATE_LIMIT_ENABLED=false` and redeploy, which deliberately closes Email login if readiness requires the limiter. The additive table and function may remain inert and inaccessible. Do not drop them during an incident. A later cleanup migration may remove them only after no deployed code references the RPC and all buckets have expired.

### Accepted limitations

- People sharing one public IP share one bucket, so a busy household or office can receive a temporary five-minute block. Monitor real `429` counts before changing the threshold.
- Rotating IPs can evade an IP-only counter. Turnstile, neutral responses, Supabase's provider limits, and the existing log-only firewall observation remain additional layers.
- This protects the password-login route only. Signup, resend, and recovery retain their current Turnstile and hosted email/provider limits unless later evidence justifies a separate reviewed control.

## Application-level Email login limiter implementation, 2026-10-23

Status: code commit `0da27eaf69051d1df28640269014f39986339acf` is pushed to `codex/email-password-staging-forms`, the reviewed migration is applied and recorded on staging project `ivifkrtupqizyqqsxdty`, and the limiter is enabled only on that protected Preview branch. Deployment `dpl_3i71r5L9AnitUFWvmnYntkr8rbbW` is Ready from the exact commit. Production database objects, Vercel limiter variables, Email configuration, and application remain unchanged.

- The migration was scaffolded with Supabase CLI 2.122.0, then applied atomically to staging with migration-history version `20261023174605`. The recorded statement is the exact local migration content apart from its final newline: 3,824 bytes with MD5 `90c19caf8431d162f969e84498de0279`. It creates the RLS-enabled `public.email_login_rate_limits` table with no client policy, explicit service-role-only table grants, an expiry index, and a service-role-only `SECURITY INVOKER` RPC with an empty search path.
- The RPC uses one database timestamp and an atomic `INSERT ... ON CONFLICT DO UPDATE`. It allows attempts one through fifteen in an aligned five-minute window and denies attempt sixteen. Expired-row cleanup is limited to 100 indexed rows, uses `FOR UPDATE SKIP LOCKED`, and runs before the current-client upsert.
- The server helper accepts only one valid `x-vercel-forwarded-for` IPv4 or IPv6 value, derives a SHA-256 HMAC using `EMAIL_LOGIN_RATE_LIMIT_SECRET`, and validates the single RPC result row. It neither logs nor stores the address, email, password, CAPTCHA value, auth intent, or full digest.
- `POST /api/auth/email/login` calls the limiter after same-origin and body validation but before creating the auth intent or calling `signInWithPassword`. Disabled or unavailable limiter configuration returns neutral `503`; a denied decision returns neutral `429` with bounded `Retry-After`. Neither path creates the auth-intent cookie or contacts Supabase Auth.
- `EMAIL_LOGIN_RATE_LIMIT_ENABLED=true` and a new sensitive `EMAIL_LOGIN_RATE_LIMIT_SECRET` exist only for the `codex/email-password-staging-forms` Preview branch. The same keys are absent from Production. Preview and Production require separate secrets, and login deliberately fails closed when the limiter is unavailable.
- All 93 repository tests pass, as do TypeScript, focused ESLint, `git diff --check`, and the optimized Next.js build with synthetic non-production Supabase placeholders. Staging PostgreSQL verification now passes: catalog objects, constraints, RLS, zero policies, exact table and function privileges, `SECURITY INVOKER`, empty search path, attempts one through sixteen, invalid-hash rejection, five-minute window reset, and a two-session atomic concurrency test all returned the expected values.
- The refreshed staging Security Advisor has zero errors. Its five warnings are pre-existing mutable-search-path findings on other functions. The limiter adds one intentional `RLS Enabled No Policy` information item because it is server-only; direct catalog checks confirm `anon` and `authenticated` have neither table access nor RPC execution. The refreshed Performance Advisor has zero errors and no warning or information item for the limiter. A read-only Production check confirms the table, function, and migration record remain absent.
- Two optional package-run SQL parsers could not be loaded by the local `npx` environment. No parser or dependency was added to the project, and the failed tooling attempts did not modify the repository.
- The protected deployment reports `{"enabled":true,"passwordManagementEnabled":true}` with `200` and no-store headers. A same-origin malformed login POST returns the expected validation `400` before the limiter or Supabase Auth. Build output completed successfully with all 93 tests, and the checked Preview runtime error and fatal logs were empty.

### Staging gate result

The application-level limiter gate passes. A corrected live run on 23 October started from zero in the `18:25 UTC` aligned window and used an exact Email `Log in` button match. Attempts one through fifteen each had a fresh automatic Turnstile `Success!`, returned the neutral invalid-credentials message, and produced exactly fifteen staging password grants between `18:27:47` and `18:28:40 UTC`. The database row held count fifteen before the final request. Attempt sixteen showed `Too many login attempts. Please wait a few minutes and try again.`, advanced the shared counter to sixteen, and produced no sixteenth Supabase password grant. The controlled alias still has zero Auth users. The direct historical Vercel request record was no longer available when reconciled on 24 October because the Hobby plan retains runtime logs for one hour, but the visible response, persisted counter, exact provider count, route contract, and focused tests agree. Production stays unchanged.

### Post-window Preview regression, 2026-10-24

Status: complete. The availability, invalid-login, successful-login, controlled-alias, limiter, and log-safety checks all pass.

- The protected config route returned `200` with `{"enabled":true,"passwordManagementEnabled":true}`. The Login and Forgot password routes both returned `200` on deployment `dpl_24PkbV6qUrAwrdtmYnoQZbM6NNdL`.
- Safari showed the Google sign-in button, the expanded Email form, the Forgot password link, and automatic Turnstile `Success!`. The recovery page showed its Email field, security check, and Send reset link action. The form was not submitted, so no recovery email was sent.
- Before the login request, the controlled rate-limit alias had zero staging Auth users and the current limiter window had zero rows. One fresh automatic Turnstile result and one provider-intended invalid login then returned the neutral `Email or password wasn't recognised.` response.
- Staging reconciliation found one current-window limiter row at attempt count one, exactly one password grant with status `400` and `invalid_credentials`, and still zero Auth users for the controlled alias.
- The checked Preview runtime warnings, errors, and fatal entries were empty. Exact searches found neither the controlled alias nor the test-only password in Vercel runtime logs. The same exact values were absent from Supabase event-message text. No limiter input field was present in the inspected provider or RPC events.
- The user then completed a successful Email/password login with an existing staging account. Staging Auth independently recorded one password grant with status `200` from the protected Preview at `16:46:02 UTC`; the current limiter window held exactly one attempt. No browser credential was inspected or recorded by the agent.
- Google availability was verified without opening an account chooser.
- Production was not queried or changed. No hosted setting, environment variable, deployment, user, email, session, or application code changed. The single limiter row expires normally.

### Rollback

Before real Production password users exist, removing the limiter flag closes Email login and the previous Preview deployment can be restored while the server-only objects remain inert. Once Production password users exist, deliberately closing login is an outage control, not a normal rollback. Restore the last verified limiter configuration or deployment instead; do not expose an unthrottled password route or drop the table during an incident.

## Atomic invitation acceptance smoke, 2026-10-25

Status: passed on the protected Preview. The staging-only fixture was removed after verification, and Production was not changed.

- A single pending invitation was created directly in staging for the existing Google user `corisleachman@googlemail.com`, without sending email. The target was not already a member of the selected controlled Studio workspace.
- The protected Preview opened the invitation, reused the expected Google identity, showed the signed-in acceptance state, and redirected to the authenticated Dashboard after `Accept invite` was selected.
- Staging recorded the invitation as accepted by the expected user and created exactly one `member` membership. The Auth user, profile, workspace, and identity counts did not increase.
- The exact invitation and exact membership were then deleted inside one count-guarded cleanup transaction. Staging returned to eight Auth users, eight profiles, seven workspaces, eleven memberships, zero pending invitations, and the target user's original two memberships.
- The checked deployment error and fatal logs were empty. The route does not write a success log, so the visible redirect plus the database state transition are the acceptance evidence.
- No invitation email, hosted-setting change, environment-variable change, deployment, or Production write occurred.

## Production rollout preparation, 2026-10-25

Status: read-only preflight complete. Production remains on `clone-clean` commit `ac0fe655`, its latest deployment is Ready, and PR #55 remains open and draft with passing checks. Production Email has not been enabled.

- Production has five Auth users, all using Google, and zero pending workspace invitations.
- Production does not yet contain `public.email_auth_flows`, `public.email_login_rate_limits`, or `public.accept_workspace_invite_atomically(uuid, uuid, text)`.
- The Production migration ledger ends at `20261011161736_harden_account_invites_access`. The three reviewed migrations required before application deployment are `20261013171251_create_email_auth_flows`, `20261023174605_email_login_rate_limits`, and `20261024165859_accept_workspace_invite_atomically`, in that order.
- The Production Vercel environment does not contain `EMAIL_PASSWORD_AUTH_ENABLED`, `AUTH_INTENT_SECRET`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `EMAIL_LOGIN_RATE_LIMIT_ENABLED`, `EMAIL_LOGIN_RATE_LIMIT_SECRET`, or `SIGNED_IN_PASSWORD_MANAGEMENT_ENABLED`.
- Apply and verify the three additive migrations while the current Google-only application remains live. Do not enable the Supabase Email provider, add rollout variables, merge PR #55, or deploy application code in the same approval step.
- After the migrations pass, configure Production-specific SMTP, templates, password safeguards, Turnstile, and fresh Production-only secrets while keeping both public Email flags off. Deploy the reviewed application with Email hidden and recheck Google before asking for a separate controlled activation approval.

### Production rollback boundary

The three migrations are additive server-only objects and may remain inert if application rollout stops. Before real Production password users exist, the UI can be closed by removing the Email flag and restoring the last verified deployment. Once real password users exist, disabling the Supabase Email provider would lock them out and is not a safe rollback. Google must remain enabled throughout.

## Production schema gate, 2026-10-25

Status: complete. The three reviewed migrations are applied to Production in their original order and version numbers. Production Email, Vercel variables, application code, and deployment remain unchanged.

- Production now records `20261013171251_create_email_auth_flows`, `20261023174605_email_login_rate_limits`, and `20261024165859_accept_workspace_invite_atomically`. A final dry run reports the remote database is up to date.
- Both server-only tables have RLS enabled, no client policy, no `anon` or `authenticated` read access, and only the reviewed `service_role` privileges. Both expiry indexes exist.
- Both functions are owned by `postgres`, remain `SECURITY INVOKER`, use an empty search path, deny execute to `PUBLIC`, `anon`, and `authenticated`, and allow only `service_role`.
- The Email flow table passed a create, read, and delete round trip. The limiter rejected a malformed hash, allowed attempts one through fifteen, denied attempt sixteen, reset an expired bucket to attempt one, and serialized two simultaneous calls as counts one and two.
- Invitation acceptance returned every reviewed branch: not found, email mismatch, revoked, expired, already used, accepted, and already accepted. Two simultaneous acceptance calls settled as `accepted` and `already_accepted`, produced exactly one membership, and left the invitation accepted by the intended user.
- All verification fixtures were removed. Production returned to five Auth users, zero pending invitations, zero Email flow rows, zero limiter rows, and no remaining controlled invitation or membership.
- The refreshed advisors add only the intentional `RLS Enabled No Policy` information notices for the two server-only tables and an expected unused-index information notice while the Email flow table is empty. They add no mutable-search-path, exposed-execution, or other warning for the new functions.

The next gate is a read-only Production hosted-configuration audit followed by a precise approval request. Keep the Supabase Email provider disabled and keep both application Email flags absent during that review.
