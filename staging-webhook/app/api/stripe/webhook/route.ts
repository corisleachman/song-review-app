import Stripe from 'stripe';

export const runtime = 'nodejs';

const productionSupabaseRef = 'hxtsuhmqrufcdplidtov';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  const projectRef = process.env.STAGING_SUPABASE_PROJECT_REF;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (
    !projectRef || !/^[a-z0-9]{20}$/.test(projectRef) || projectRef === productionSupabaseRef
    || process.env.NEXT_PUBLIC_SUPABASE_URL !== `https://${projectRef}.supabase.co`
    || !process.env.SUPABASE_SERVICE_ROLE_KEY
    || !/^(sk|rk)_test_/.test(stripeKey ?? '')
    || !signingSecret?.startsWith('whsec_')
  ) {
    return Response.json({ error: 'Staging webhook configuration is invalid.' }, { status: 503 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(body, signature, signingSecret);
  } catch {
    return Response.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  if (event.livemode !== false || (
    event.type !== 'customer.subscription.updated' && event.type !== 'customer.subscription.deleted'
  )) {
    return Response.json({ error: 'Event is outside the staging webhook scope.' }, { status: 400 });
  }

  // The shared handler remains the authority for signature verification and writes.
  const { POST: handleWebhook } = await import('@/app/api/stripe/webhook/route');
  return handleWebhook(new Request(request.url, {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body,
  }));
}
