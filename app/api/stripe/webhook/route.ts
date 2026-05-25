import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import type { AccountPlan } from '@/lib/plans';
import {
  getPendingReferralForAccount,
  markReferralConverted,
  markReferralRewarded,
  REFERRAL_REWARD_CAP,
} from '@/lib/referrals';
import { getPlanForStripePriceId, getStripe, getStripeWebhookSecret } from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// ── Credit amounts (pence) for referrer reward ────────────────────────────────
const PLAN_MONTHLY_PENCE: Record<string, number> = {
  pro:    900,   // £9.00
  studio: 1900,  // £19.00
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Webhook handling failed.';
}

// ── Account plan helpers ──────────────────────────────────────────────────────

async function updateAccountPlanByWorkspaceId(params: {
  accountId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  plan: AccountPlan;
}) {
  const { accountId, stripeCustomerId, stripeSubscriptionId, plan } = params;

  const updatePayload: {
    plan: AccountPlan;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
  } = { plan };

  if (stripeCustomerId !== undefined) updatePayload.stripe_customer_id = stripeCustomerId;
  if (stripeSubscriptionId !== undefined) updatePayload.stripe_subscription_id = stripeSubscriptionId;

  const { error } = await supabaseServer
    .from('accounts')
    .update(updatePayload)
    .eq('id', accountId);

  if (error) throw error;
}

async function updateAccountPlanByCustomer(params: {
  stripeCustomerId: string;
  stripeSubscriptionId?: string | null;
  plan: AccountPlan;
}) {
  const { plan } = params;
  const updatePayload: {
    plan: AccountPlan;
    stripe_subscription_id?: string | null;
  } = { plan };

  if (params.stripeSubscriptionId !== undefined) {
    updatePayload.stripe_subscription_id = params.stripeSubscriptionId;
  }

  const { error } = await supabaseServer
    .from('accounts')
    .update(updatePayload)
    .eq('stripe_customer_id', params.stripeCustomerId);

  if (error) throw error;
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleCheckoutSessionCompleted(event: { data: { object: unknown } }) {
  const session = event.data.object as {
    mode?: string | null;
    client_reference_id?: string | null;
    metadata?: Record<string, string> | null;
    customer?: string | { id?: string | null } | null;
    subscription?: string | { id?: string | null } | null;
  };

  if (session.mode !== 'subscription') return;

  const accountId =
    session.client_reference_id || session.metadata?.account_id || null;

  const stripeCustomerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id ?? null;

  const stripeSubscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!accountId) throw new Error('checkout.session.completed missing account reference.');

  const stripe = getStripe();
  const subscription = stripeSubscriptionId
    ? await stripe.subscriptions.retrieve(stripeSubscriptionId)
    : null;

  const priceId = subscription?.items?.data?.[0]?.price?.id ?? null;
  const subscriptionStatus = subscription?.status ?? 'active';
  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const plan = isActive ? getPlanForStripePriceId(priceId) : 'free';

  await updateAccountPlanByWorkspaceId({
    accountId,
    stripeCustomerId,
    stripeSubscriptionId,
    plan,
  });
}

async function handleSubscriptionUpdated(event: { data: { object: unknown } }) {
  const subscription = event.data.object as {
    id: string;
    status: string;
    customer: string | { id: string };
    items?: { data?: Array<{ price?: { id?: string } }> };
  };

  const stripeCustomerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const plan = isActive ? getPlanForStripePriceId(priceId) : 'free';

  await updateAccountPlanByCustomer({
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    plan,
  });
}

async function handleSubscriptionDeleted(event: { data: { object: unknown } }) {
  const subscription = event.data.object as {
    customer: string | { id: string };
  };

  const stripeCustomerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  await updateAccountPlanByCustomer({
    stripeCustomerId,
    stripeSubscriptionId: null,
    plan: 'free',
  });
}

async function handleInvoicePaid(event: { data: { object: unknown } }) {
  const invoice = event.data.object as {
    id: string;
    customer: string;
    subscription?: string | null;
    billing_reason?: string | null;
    amount_paid?: number;
    currency?: string;
  };

  // Only process the first subscription invoice — renewals don't trigger rewards
  if (invoice.billing_reason !== 'subscription_create') return;

  const stripeCustomerId = invoice.customer;
  if (!stripeCustomerId) return;

  // Find the account for this Stripe customer
  const { data: account } = await supabaseServer
    .from('accounts')
    .select('id, plan, stripe_customer_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  if (!account?.id) return;

  // Find a rewardable referral for this account
  const referral = await getPendingReferralForAccount(account.id as string);
  if (!referral) return;

  // Mark as converted first (idempotent — safe to call even if already converted)
  await markReferralConverted(referral.id, {
    stripe_invoice_id:  invoice.id,
    stripe_customer_id: stripeCustomerId,
  });

  // Cap check — has the referrer already received the maximum rewards?
  const { count: rewardCount } = await supabaseServer
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by_user_id', referral.referred_by_user_id)
    .eq('status', 'rewarded');

  if ((rewardCount ?? 0) >= REFERRAL_REWARD_CAP) {
    await supabaseServer
      .from('referrals')
      .update({ status: 'ineligible', ineligible_reason: 'cap_reached' })
      .eq('id', referral.id);
    return;
  }

  // Find the referrer's billing account
  const { data: referrerAccount } = await supabaseServer
    .from('accounts')
    .select('id, plan, stripe_customer_id')
    .eq('id', referral.referred_by_account_id ?? '')
    .maybeSingle();

  if (!referrerAccount) {
    console.warn('[referrals] Referrer account not found — leaving as converted:', referral.id);
    return;
  }

  const stripe = getStripe();

  // If the referrer has no Stripe customer ID (free tier, never paid),
  // create one now so the credit sits on their balance ready for when they upgrade.
  let referrerStripeCustomerId = referrerAccount.stripe_customer_id as string | null;

  if (!referrerStripeCustomerId) {
    const { data: referrerProfile } = await supabaseServer
      .from('profiles')
      .select('email, display_name')
      .eq('id', referral.referred_by_user_id)
      .maybeSingle();

    try {
      const newCustomer = await stripe.customers.create({
        email:    referrerProfile?.email    ?? undefined,
        name:     referrerProfile?.display_name ?? undefined,
        metadata: {
          account_id: referrerAccount.id as string,
          source:     'referral_reward',
        },
      });

      referrerStripeCustomerId = newCustomer.id;

      await supabaseServer
        .from('accounts')
        .update({ stripe_customer_id: referrerStripeCustomerId })
        .eq('id', referrerAccount.id);
    } catch (createErr) {
      console.error('[referrals] Could not create Stripe customer for free-tier referrer:', createErr);
      return; // Leave as converted — safe to retry on next webhook replay
    }
  }

  // Calculate credit: 50% of one month of the referrer's current plan
  const referrerPlan = (referrerAccount.plan as string) ?? 'pro';
  const monthlyPence = PLAN_MONTHLY_PENCE[referrerPlan] ?? PLAN_MONTHLY_PENCE.pro;
  const creditAmountPence = Math.round(monthlyPence * 0.5);

  // Apply the Stripe customer balance credit
  try {
    await stripe.customers.createBalanceTransaction(
      referrerStripeCustomerId,
      {
        amount:      -creditAmountPence, // Negative = credit on account
        currency:    'gbp',
        description: `Referral reward — 50% off 1 month (${referrerPlan})`,
        metadata: {
          referral_id:       referral.id,
          referred_account:  account.id as string,
          stripe_invoice_id: invoice.id,
        },
      }
    );
  } catch (stripeError) {
    // Credit failed — leave as converted so it can be safely retried
    console.error('[referrals] Stripe credit failed — leaving as converted:', stripeError);
    return;
  }

  // All done — mark rewarded
  await markReferralRewarded(referral.id, creditAmountPence, {
    stripe_invoice_id:        invoice.id,
    referrer_stripe_customer: referrerStripeCustomerId,
    referrer_plan:            referrerPlan,
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
    }

    const body   = await request.text();
    const stripe = getStripe();

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
    } catch (error) {
      console.error('Stripe webhook signature verification failed:', error);
      return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
