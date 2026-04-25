import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not open billing portal.';
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
        { error: 'Only the workspace owner can manage billing.' },
        { status: 403 }
      );
    }

    const { data: account, error: accountError } = await supabaseServer
      .from('accounts')
      .select('id, stripe_customer_id')
      .eq('id', resolved.identity.workspaceId)
      .single();

    if (accountError) throw accountError;

    if (!account.stripe_customer_id) {
      return NextResponse.json(
        { error: 'This workspace does not have a Stripe customer yet.' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const origin = new URL(request.url).origin;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: `${origin}/settings`,
    });

    if (!portalSession.url) {
      throw new Error('Stripe did not return a billing portal URL.');
    }

    return NextResponse.json({ url: portalSession.url }, { status: 200 });
  } catch (error) {
    console.error('Billing portal error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
