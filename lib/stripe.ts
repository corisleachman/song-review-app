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

export function getPlanForStripeSubscriptionStatus(status: string): AccountPlan {
  if (status === 'active' || status === 'trialing') {
    return 'paid';
  }

  return 'free';
}
