import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { normalizeAccountPlan, isPlanAtLeast } from '@/lib/plans';
import { supabaseServer } from '@/lib/supabaseServer';
import { getStripe, getStripePriceId } from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not start checkout.';
}

export async function POST(request: Request) {
  try {
    noStore();

    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    if (resolved.identity.membershipRole !== 'owner') {
      return NextResponse.json(
        { error: 'Only the workspace owner can upgrade the plan.' },
        { status: 403 }
      );
    }

    // Parse requested plan and billing interval from body.
    // Both default safely so existing callers with no body still work.
    const body = await request.json().catch(() => ({})) as {
      plan?: string;
      interval?: string;
    };

    const targetPlan = body.plan === 'studio' ? 'studio' : 'pro';
    const interval   = body.interval === 'year' ? 'year' : 'month';

    const { data: account, error: accountError } = await supabaseServer
      .from('accounts')
      .select('id, name, plan, stripe_customer_id')
      .eq('id', resolved.identity.workspaceId)
      .single();

    if (accountError) throw accountError;

    const currentPlan = normalizeAccountPlan(account.plan);

    // Guard: don't let them check out for a plan they already have or lower
    if (isPlanAtLeast(currentPlan, targetPlan)) {
      return NextResponse.json(
        { error: `This workspace is already on the ${currentPlan} plan.` },
        { status: 400 }
      );
    }

    const stripe     = getStripe();
    const origin     = new URL(request.url).origin;
    let stripeCustomerId = account.stripe_customer_id as string | null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email:    resolved.identity.email ?? undefined,
        name:     resolved.identity.displayName,
        metadata: {
          account_id:    resolved.identity.workspaceId,
          owner_user_id: resolved.identity.userId,
        },
      });

      stripeCustomerId = customer.id;

      const { error: updateCustomerError } = await supabaseServer
        .from('accounts')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', resolved.identity.workspaceId);

      if (updateCustomerError) throw updateCustomerError;
    }

    const priceId = getStripePriceId(targetPlan, interval);

    const session = await stripe.checkout.sessions.create({
      mode:                'subscription',
      customer:            stripeCustomerId,
      client_reference_id: resolved.identity.workspaceId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/settings?billing=cancelled`,
      metadata: {
        account_id:    resolved.identity.workspaceId,
        owner_user_id: resolved.identity.userId,
        target_plan:   targetPlan,
      },
    });

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL.');
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error('Billing checkout error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
