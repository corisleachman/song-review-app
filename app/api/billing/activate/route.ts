import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not activate paid plan.';
}

export async function POST(request: NextRequest) {
  try {
    noStore();

    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    if (resolved.identity.membershipRole !== 'owner') {
      return NextResponse.json({ error: 'Only the workspace owner can activate billing.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const sessionId = body?.sessionId;

    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      return NextResponse.json({ error: 'Session id is required.' }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    const workspaceId =
      session.client_reference_id
      || session.metadata?.account_id
      || null;

    if (workspaceId !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'Checkout session does not belong to this workspace.' }, { status: 403 });
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Checkout is not marked as paid yet.' }, { status: 400 });
    }

    const stripeSubscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id ?? null;

    const stripeCustomerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? null;

    const { error: updateError } = await supabaseServer
      .from('accounts')
      .update({
        plan: 'paid',
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
      })
      .eq('id', resolved.identity.workspaceId);

    if (updateError) throw updateError;

    return NextResponse.json(
      {
        activated: true,
        plan: 'paid',
        stripeSubscriptionId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Billing activation error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
