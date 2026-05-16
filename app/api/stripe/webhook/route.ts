import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getPlanForStripePriceId, getPlanForStripeSubscriptionStatus, getStripe, getStripeWebhookSecret } from '@/lib/stripe';

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
      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
