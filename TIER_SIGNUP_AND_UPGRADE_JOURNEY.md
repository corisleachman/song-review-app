# Tier Signup and Upgrade Journey

Status: Desktop and real-device mobile Preview verification passed on 2026-08-26 on `codex/tier-aware-signup`. Durable funnel events and production rollout remain pending.

## Goal

Let a visitor choose Free, Pro, or Studio on the homepage and keep that choice through Google account creation. Upgrade suggestions should appear when they help someone complete a task, not as generic interruptions.

## Current implementation

- The homepage uses distinct Free, Pro, and Studio signup routes. Its existing billing control updates the paid routes between annual and monthly.
- `/signup/[plan]` validates the tier and redirects into the shared Google login with the selected choice.
- The login screen names the chosen tier and exact price. Its post-auth redirect accepts only canonical Song Room destinations, with a pending workspace invite taking priority.
- Free continues to the dashboard. Pro and Studio open `/upgrade` with the chosen plan and billing period selected, but do not open Stripe until the owner confirms.
- `/upgrade` defaults to annual billing, reads the chosen tier, checks canonical workspace role and plan data, and disables paid checkout for non-owners or already-covered plans.
- Stripe cancellation returns to the same plan and billing choice. An expired session also preserves that allowlisted return query through login.
- Contextual limit prompts still use the existing runtime-only event logging. Durable signup and upgrade funnel storage is not part of this code slice.

## Preview verification

- Vercel Preview uses Stripe Test mode credentials and four test price IDs. The existing live prices and referral coupon remain scoped to Production.
- The owner Google flow preserved the Pro annual choice through authentication. Stripe Sandbox showed every configured Preview price: Pro at £9/month or £86/year and Studio at £19/month or £190/year.
- Cancelling Checkout returned to the same Preview URL, plan, and billing period, with confirmation that the plan had not changed. This passed for both the original Pro annual journey and the final Studio monthly check.
- The real-device mobile Pro annual path also passed, including the Preview return, selected price, Stripe Sandbox handoff, and cancellation return.
- No test payment was submitted. The Preview webhook, durable funnel storage, and Production rollout remain outside this verification.

## Recommended beta signup routes

Use one authentication system with tier-aware entry routes. Do not build separate account systems for each plan.

| Homepage choice | Public route | Post-auth destination |
| --- | --- | --- |
| Free | `/signup/free` | `/dashboard` |
| Pro annual | `/signup/pro?billing=year` | `/upgrade?plan=pro&billing=year&source=pricing` |
| Studio annual | `/signup/studio?billing=year` | `/upgrade?plan=studio&billing=year&source=pricing` |

When a visitor switches the homepage pricing control to monthly, the Pro and Studio links should change to `billing=month`. The normal Sign in link should remain `/login` and carry no sales intent.

Each signup route should reuse the Google authentication component but name the choice clearly, for example “Create your Pro workspace” with the selected price beneath it. The paid CTA should say “Choose Pro” or “Choose Studio”, not “Start for free”.

After Google returns:

1. A pending workspace invite takes priority. The person must finish the invite flow without being diverted to checkout.
2. Free signup completes account bootstrap and opens the dashboard.
3. Pro or Studio signup completes bootstrap, then opens `/upgrade` with the chosen plan and billing period already selected.
4. The user confirms the plan before leaving for Stripe. Do not start checkout automatically after Google login.
5. If the signed-in user is not a workspace owner, explain that only the owner can change the plan and do not show an actionable checkout button.

Plan and billing values must use strict allowlists. Preserve them through OAuth in a short-lived, same-site intent cookie or an equivalently validated server flow. Never accept an arbitrary post-login URL.

## Beta acceptance criteria

- Every pricing CTA has a distinct tier-aware route on desktop and mobile.
- Annual is the default on the homepage and the plan confirmation screen. A visitor's monthly choice is preserved.
- The selected tier survives Google OAuth, first-account bootstrap, refresh, Back, and checkout cancellation.
- Free users reach the dashboard without seeing Stripe.
- Pro and Studio users see the correct plan and exact billing amount before Stripe.
- Workspace invites override pricing intent.
- Existing owners, existing paid workspaces, and non-owner members receive appropriate destinations and copy.
- The full path passes keyboard, mobile, preview/staging, and production checks.
- No paid-tier CTA claims that a card is unnecessary unless a real no-card trial is configured.

## Where upgrade suggestions should appear

The best prompt is attached to a task the owner is already trying to complete.

| Moment | Recommended treatment | Email? |
| --- | --- | --- |
| Settings > Plan | Permanent plan comparison and usage | No |
| Storage is approaching its limit | Dismissible dashboard/settings notice with the exact usage | Owner-only threshold email after deduplication exists |
| An upload would exceed storage | Clear blocking dialog with Upgrade and Manage files actions | One owner notification if the limit event is not resolved in the session |
| Free workspace reaches its collaborator cap | Explain the cap inside the invite flow | One owner notification after the blocked invite attempt |
| User selects a plan-gated format or feature | Inline explanation at that control | No |
| Member encounters a plan limit | Explain what happened and identify the workspace owner | No sales CTA and no email to the member |
| First successful collaboration | Let the success breathe; no modal | No |
| General dashboard load or playback | No upgrade interruption | No |

Recommended display rules:

- Show marketing prompts only to workspace owners.
- Remember dismissals and cap repeat impressions.
- Do not cover playback, comments, uploads, or navigation with a sales prompt.
- State the current allowance, current usage, and benefit of the next plan in plain language.
- Keep removal or housekeeping options visible when upgrading is not the only solution.

## Email assessment

The supplied Flow trial-ending email does two things well: it is tied to a real deadline, and it explains the no-action outcome before asking for payment. Song Room should follow that pattern only if it introduces a genuine trial with a defined end date and downgrade behaviour.

The supplied Apollo email is a pricing-page abandonment campaign. Its useful parts are the direct Free-versus-Pro comparison and one clear action. It should not be copied into beta immediately. A visitor viewing pricing is a weak signal, and an automatic sales email can feel intrusive without consent, reliable attribution, and frequency controls.

### Recommended release order

For beta:

- Ship the tier-aware signup routes and contextual in-product prompts.
- Record durable funnel and limit events before adding nurture campaigns.
- If usage calculation and deduplication are trustworthy, send owner-only storage warnings when a threshold is crossed, not on every visit.
- Keep existing collaboration notifications separate from promotional email.

After beta data is available:

- Consider one checkout-abandonment reminder when a Stripe session was created but never completed.
- Consider one pricing follow-up only for people who actively selected a paid plan, subject to notification preferences and a legal review of the sending basis.
- Add trial-ending messages only if trials become a real product feature.

Every automated email needs an idempotency record, a minimum resend interval, the workspace owner's current role, the latest plan state, and a stop condition after upgrade. Promotional messages also need preferences and an unsubscribe route.

## Measurement needed before automation

The beta funnel should record durable server-backed events for:

- pricing plan selected, including plan and billing period
- Google auth started and completed
- account bootstrap completed
- plan confirmation viewed
- checkout started, cancelled, failed, and completed
- upgrade prompt shown, dismissed, and selected, including its context
- storage or collaborator threshold crossed

Avoid storing raw audio names, comment text, or unnecessary personal information in these events.

The likely activation sequence is first song uploaded, first collaborator invited, then first timestamped response received. Treat these as candidate milestones until beta data and user interviews show which one best predicts ongoing use.

## Scope decision

Beta blocker:

- direct Free, Pro, and Studio signup routes
- preserved tier and billing intent through Google OAuth
- plan-aware confirmation and owner handling
- accurate CTA copy and funnel measurement

Beta-safe product behaviour:

- contextual upgrade prompts at real limits
- no generic upgrade popups on dashboard load
- no promotional email sequence at launch

Later measured work:

- threshold and checkout-reminder emails
- pricing-page nurture
- trial lifecycle messaging
- broader identity providers and password accounts

## Open product decisions

- Confirm whether beta paid signups purchase immediately or receive a real trial.
- Confirm the single primary activation milestone after observing beta use.
- Decide the first storage-warning threshold after real file-size data is available.
- Confirm notification preferences and review the sending basis before promotional automation.
