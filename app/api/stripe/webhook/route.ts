import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import type { AccountPlan } from '@/lib/plans';
import { getPendingReferralForAccount, markReferralConverted, markReferralRewarded, REFERRAL_REWARD_CAP } from '@/lib/referrals';
import { getPlanForStripePriceId, getStripe, getStripeWebhookSecret } from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Webhook handling failed.';
}

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

  if (stripeCustomerId !== undefined) {
    updatePayload.stripe_customer_id = stripeCustomerId;
  }

  if (stripeSubscriptionId !== undefined) {
    updatePayload.stripe_subscription_id = stripeSubscriptionId;
  }

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

async function handleCheckoutSessionCompleted(event: { data: { object: unknown } }) {
  const session = event.data.object as {
    mode?: string | null;
    client_reference_id?: string | null;
    metadata?: Record<string, string> | null;
    customer?: string | { id?: string | null } | null;
    subscription?: string | { id?: string | null } | null;
  };

  if (session.mode !== 'subscription') {
    return;
  }

  const accountId =
    session.client_reference_id
    || session.metadata?.account_id
    || null;

  const stripeCustomerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id ?? null;

  const stripeSubscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!accountId) {
    throw new Error('checkout.session.completed missing account reference.');
  }

  const stripe = getStripe();
  const subscription =
    stripeSubscriptionId
      ? await stripe.subscriptions.retrieve(stripeSubscriptionId)
      : null;

  // Derive tier from the price ID on the subscription line items
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


// ── Plan prices for referral credit calculation ───────────────────────────────
const PLAN_MONTHLY_PENCE: Record<string, number> = {
  pro:    900,   // £9.00
  studio: 1900,  // £19.00
};

async function handleInvoicePaid(event: { data: { object: unknown } }) {
  const invoice = event.data.object as {
    id: string;
    customer: string | null;
    subscription: string | null;
    amount_paid: number;
    billing_reason: string | null;
  };

  // Only act on the first subscription invoice (new subscriber)
  if (invoice.billing_reason !== 'subscription_create') return;

  const stripeCustomerId = invoice.customer;
  if (!stripeCustomerId) return;

  // Find the account this invoice belongs to
  const { data: account } = await supabaseServer
    .from('accounts')
    .select('id, plan, stripe_customer_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  if (!account) return;

  // Find a pending referral for this account
  const referral = await getPendingReferralForAccount(account.id as string);
  if (!referral) return;

  // Mark as converted
  await markReferralConverted(referral.id, {
    stripe_invoice_id:  invoice.id,
    stripe_customer_id: stripeCustomerId,
  });

  // Check reward_eligible_at (no holding period at launch — will be now())
  const eligibleAt = referral.reward_eligible_at
    ? new Date(referral.reward_eligible_at)
    : new Date();

  if (eligibleAt > new Date()) {
    // Holding period not yet elapsed — leave as converted for later retry
    return;
  }

  // Cap check — has referrer already hit 5 rewards?
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

  // Find the referrer's Stripe customer ID
  const { data: referrerAccount } = await supabaseServer
    .from('accounts')
    .select('stripe_customer_id, plan')
    .eq('id', referral.referred_by_account_id)
    .maybeSingle();

  if (!referrerAccount?.stripe_customer_id) {
    // Referrer not yet a paying customer — leave as converted, apply credit
    // when they first subscribe (handled separately if needed)
    console.warn('[referrals] Referrer has no Stripe customer ID yet:', referral.referred_by_user_id);
    return;
  }

  // Calculate credit: 50% of one month of the referrer's current plan
  const referrerPlan = (referrerAccount.plan as string) ?? 'pro';
  const monthlyPence = PLAN_MONTHLY_PENCE[referrerPlan] ?? PLAN_MONTHLY_PENCE.pro;
  const creditPence  = Math.round(monthlyPence * 0.5);

  try {
    const stripe = getStripe();
    await stripe.customers.createBalanceTransaction(
      referrerAccount.stripe_customer_id as string,
      {
        amount:   -creditPence, // Negative = credit
        currency: 'gbp',
        description: `Referral reward — 50% off one month (${referrerPlan})`,
      }
    );

    await markReferralRewarded(referral.id, creditPence, {
      stripe_invoice_id:           invoice.id,
      referrer_stripe_customer_id: referrerAccount.stripe_customer_id,
      referrer_plan:               referrerPlan,
    });
  } catch (creditErr) {
    // Leave as converted so it can be retried — never double-reward
    console.error('[referrals] Failed to apply Stripe credit:', creditErr);
  }
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

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
    }

    const body = await request.text();
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
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event);
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
