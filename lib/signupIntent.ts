export type SignupPlan = 'free' | 'pro' | 'studio';
export type BillingInterval = 'month' | 'year';

export interface SignupIntent {
  plan: SignupPlan;
  billing: BillingInterval | null;
}

export function normalizeSignupPlan(value: string | null | undefined): SignupPlan | null {
  if (value === 'free' || value === 'pro' || value === 'studio') return value;
  return null;
}

export function normalizeBillingInterval(
  value: string | null | undefined,
): BillingInterval {
  return value === 'month' ? 'month' : 'year';
}

export function getSignupIntent(
  planValue: string | null | undefined,
  billingValue: string | null | undefined,
): SignupIntent | null {
  const plan = normalizeSignupPlan(planValue);
  if (!plan) return null;

  return {
    plan,
    billing: plan === 'free' ? null : normalizeBillingInterval(billingValue),
  };
}

export function buildSignupDestination(intent: SignupIntent): string {
  if (intent.plan === 'free') return '/dashboard';

  const params = new URLSearchParams({
    plan: intent.plan,
    billing: intent.billing ?? 'year',
    source: 'pricing',
  });

  return `/upgrade?${params.toString()}`;
}

export { normalizePostLoginUpgradePath } from '@/lib/authDestination';
