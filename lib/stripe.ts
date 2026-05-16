import Stripe from 'stripe';
import type { AccountPlan } from './plans';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function createStripeClient() {
  return new Stripe(requireEnv('STRIPE_SECRET_KEY'));
}

let stripeClient: ReturnType<typeof createStripeClient> | null = null;

export function getStripe() {
  if (!stripeClient) stripeClient = createStripeClient();
  return stripeClient;
}

/**
 * Returns the Stripe price ID for the given plan and billing interval.
 * Falls back to the legacy STRIPE_PRICE_ID env var when the new per-tier
 * vars are not yet configured (keeps existing test-mode setup working).
 */
export function getStripePriceId(
  plan: 'pro' | 'studio' = 'pro',
  interval: 'month' | 'year' = 'month',
): string {
  if (plan === 'studio') {
    if (interval === 'year') {
      return (
        process.env.STRIPE_PRICE_STUDIO_ANNUAL ??
        process.env.STRIPE_PRICE_ID ??
        (() => { throw new Error('STRIPE_PRICE_STUDIO_ANNUAL is not configured.'); })()
      );
    }
    return (
      process.env.STRIPE_PRICE_STUDIO_MONTHLY ??
      process.env.STRIPE_PRICE_ID ??
      (() => { throw new Error('STRIPE_PRICE_STUDIO_MONTHLY is not configured.'); })()
    );
  }

  // pro (default)
  if (interval === 'year') {
    return (
      process.env.STRIPE_PRICE_PRO_ANNUAL ??
      process.env.STRIPE_PRICE_ID ??
      (() => { throw new Error('STRIPE_PRICE_PRO_ANNUAL is not configured.'); })()
    );
  }
  return (
    process.env.STRIPE_PRICE_PRO_MONTHLY ??
    process.env.STRIPE_PRICE_ID ??
    (() => { throw new Error('STRIPE_PRICE_PRO_MONTHLY is not configured.'); })()
  );
}

export function getStripeWebhookSecret() {
  return requireEnv('STRIPE_WEBHOOK_SECRET');
}

/**
 * Maps a Stripe price ID to the corresponding AccountPlan tier.
 * Falls back to 'pro' for unrecognised price IDs (safe for subscribers
 * migrated from the old single-price model).
 */
export function getPlanForStripePriceId(priceId: string | null | undefined): AccountPlan {
  if (!priceId) return 'pro';

  const studioMonthly = process.env.STRIPE_PRICE_STUDIO_MONTHLY;
  const studioAnnual  = process.env.STRIPE_PRICE_STUDIO_ANNUAL;
  const proMonthly    = process.env.STRIPE_PRICE_PRO_MONTHLY;
  const proAnnual     = process.env.STRIPE_PRICE_PRO_ANNUAL;

  if (priceId === studioMonthly || priceId === studioAnnual) return 'studio';
  if (priceId === proMonthly    || priceId === proAnnual)    return 'pro';

  // Legacy single STRIPE_PRICE_ID or unrecognised — treat as Pro
  return 'pro';
}
