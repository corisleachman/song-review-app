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

export function normalizePostLoginUpgradePath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;

  const url = new URL(value, 'https://song-room.local');
  if (url.pathname !== '/upgrade') return null;

  const allowedKeys = new Set(['plan', 'billing', 'source', 'billingStatus']);
  if (Array.from(url.searchParams.keys()).some(key => !allowedKeys.has(key))) return null;

  const plan = normalizeSignupPlan(url.searchParams.get('plan'));
  if (plan !== 'pro' && plan !== 'studio') return null;
  const source = url.searchParams.get('source');
  const billingStatus = url.searchParams.get('billingStatus');
  if (source !== 'pricing' && source !== 'checkout') return null;
  if (source === 'pricing' && billingStatus !== null) return null;
  if (source === 'checkout' && billingStatus !== 'cancelled') return null;

  const params = new URLSearchParams({
    plan,
    billing: normalizeBillingInterval(url.searchParams.get('billing')),
    source,
  });
  if (billingStatus) params.set('billingStatus', billingStatus);

  return `/upgrade?${params.toString()}`;
}
