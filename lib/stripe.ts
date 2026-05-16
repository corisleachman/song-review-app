import Stripe from 'stripe';
import type { AccountPlan } from './plans';

function requireEnv(name: 'STRIPE_SECRET_KEY' | 'STRIPE_PRICE_ID' | 'STRIPE_WEBHOOK_SECRET') {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function createStripeClient() {
  return new Stripe(requireEnv('STRIPE_SECRET_KEY'));
}

let stripeClient: ReturnType<typeof createStripeClient> | null = null;

export function getStripe() {
  if (!stripeClient) {
    stripeClient = createStripeClient();
  }

  return stripeClient;
}

export function getStripePriceId() {
  return requireEnv('STRIPE_PRICE_ID');
}

export function getStripeWebhookSecret() {
  return requireEnv('STRIPE_WEBHOOK_SECRET');
}

export function getPlanForStripeSubscriptionStatus(status: string): 'active' | 'free' {
  if (status === 'active' || status === 'trialing') {
    return 'active';
  }

  return 'free';
}

/**
 * Maps a Stripe price ID to the corresponding AccountPlan tier.
 * Falls back to 'pro' if the price ID is not recognised (safe default for
 * existing paid subscribers migrated from the old single-price model).
 */
export function getPlanForStripePriceId(priceId: string | null | undefined): AccountPlan {
  if (!priceId) return 'pro';

  const proMonthly   = process.env.STRIPE_PRICE_PRO_MONTHLY;
  const proAnnual    = process.env.STRIPE_PRICE_PRO_ANNUAL;
  const studioMonthly = process.env.STRIPE_PRICE_STUDIO_MONTHLY;
  const studioAnnual  = process.env.STRIPE_PRICE_STUDIO_ANNUAL;

  if (priceId === studioMonthly || priceId === studioAnnual) return 'studio';
  if (priceId === proMonthly    || priceId === proAnnual)    return 'pro';

  // Legacy single-price or unrecognised — treat as Pro
  return 'pro';
}
