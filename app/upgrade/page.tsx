'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getPlanDisplayName,
  isPlanAtLeast,
  normalizeAccountPlan,
  type AccountPlan,
} from '@/lib/plans';
import {
  normalizeBillingInterval,
  normalizeSignupPlan,
  type BillingInterval,
} from '@/lib/signupIntent';
import styles from './upgrade.module.css';

type FeatureItem = {
  text: string;
  note?: string;
  muted?: boolean;
};

type Plan = {
  id: AccountPlan;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice?: number;
  annualMonthly?: number;
  storage: string;
  collaborators: string;
  cta: string;
  ctaVariant: 'ghost' | 'primary' | 'accent';
  popular?: boolean;
  features: FeatureItem[];
};

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try it with your band',
    monthlyPrice: 0,
    storage: '500 MB',
    collaborators: '5',
    cta: 'Stay on Free',
    ctaVariant: 'ghost',
    features: [
      { text: '500 MB storage' },
      { text: 'Up to 5 collaborators' },
      { text: 'Unlimited songs' },
      { text: 'Waveform comments' },
      { text: 'Timestamped feedback' },
      { text: 'Action tracking' },
      { text: 'Email notifications' },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For working bands and duos',
    monthlyPrice: 9,
    annualPrice: 86,
    annualMonthly: 7.17,
    storage: '10 GB',
    collaborators: 'Unlimited',
    cta: 'Upgrade to Pro',
    ctaVariant: 'primary',
    popular: true,
    features: [
      { text: '10 GB storage', note: '20× more than Free' },
      { text: 'Unlimited collaborators', note: 'Invite the whole team' },
      { text: 'Unlimited songs' },
      { text: 'Waveform comments' },
      { text: 'Timestamped feedback' },
      { text: 'Action tracking' },
      { text: 'Email notifications' },
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'For producers and larger teams',
    monthlyPrice: 19,
    annualPrice: 190,
    annualMonthly: 15.83,
    storage: '50 GB',
    collaborators: 'Unlimited',
    cta: 'Upgrade to Studio',
    ctaVariant: 'accent',
    features: [
      { text: '50 GB storage', note: 'Stems, multitracks, anything' },
      { text: 'Unlimited collaborators', note: 'No ceiling, ever' },
      { text: 'Unlimited songs' },
      { text: 'Waveform comments' },
      { text: 'Timestamped feedback' },
      { text: 'Action tracking' },
      { text: 'Email notifications' },
      { text: 'Priority support', note: 'Direct access to the team' },
    ],
  },
];

type WorkspaceAccess = {
  loading: boolean;
  isOwner: boolean | null;
  currentPlan: AccountPlan;
  error: string | null;
};

function UpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPlan = normalizeSignupPlan(searchParams.get('plan'));
  const selectedPlan = requestedPlan === 'pro' || requestedPlan === 'studio'
    ? requestedPlan
    : null;
  const checkoutCancelled = searchParams.get('billingStatus') === 'cancelled';
  const cameFromPricing = selectedPlan !== null && searchParams.get('source') === 'pricing';
  const cameFromCheckout = selectedPlan !== null
    && searchParams.get('source') === 'checkout'
    && checkoutCancelled;
  const returnToSettings = searchParams.get('returnTo') === 'settings';
  const shouldExitToDashboard = cameFromPricing || cameFromCheckout;
  const hasSelectedPlanJourney = shouldExitToDashboard;

  const [interval, setInterval] = useState<BillingInterval>(() =>
    normalizeBillingInterval(searchParams.get('billing'))
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [access, setAccess] = useState<WorkspaceAccess>({
    loading: true,
    isOwner: null,
    currentPlan: 'free',
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    const loadWorkspaceAccess = async () => {
      try {
        const response = await fetch('/api/auth/bootstrap', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null) as {
          identity?: { membershipRole?: string };
          workspace?: { plan?: string };
          error?: string;
        } | null;

        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load workspace access.');
        }

        setAccess({
          loading: false,
          isOwner: payload?.identity?.membershipRole === 'owner',
          currentPlan: normalizeAccountPlan(payload?.workspace?.plan),
          error: null,
        });
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setAccess({
          loading: false,
          isOwner: null,
          currentPlan: 'free',
          error: loadError instanceof Error
            ? loadError.message
            : 'Could not load workspace access.',
        });
      }
    };

    void loadWorkspaceAccess();
    return () => controller.abort();
  }, []);

  const handleIntervalChange = (nextInterval: BillingInterval) => {
    setInterval(nextInterval);
    if (!hasSelectedPlanJourney) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('billing', nextInterval);
    router.replace(`/upgrade?${params.toString()}`, { scroll: false });
  };

  const handleSelect = async (planId: AccountPlan) => {
    if (planId === 'free') {
      if (returnToSettings) router.push('/settings/plan');
      else if (shouldExitToDashboard) router.push('/dashboard');
      else router.back();
      return;
    }

    if (!access.isOwner) {
      setError('Only the workspace owner can change the plan.');
      return;
    }

    setError('');
    setLoading(planId);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planId,
          interval,
          returnTo: returnToSettings ? 'settings' : undefined,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'Could not start checkout.'
        );
      }

      if (!payload?.url || typeof payload.url !== 'string') {
        throw new Error('Checkout URL was missing.');
      }

      window.location.assign(payload.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.');
      setLoading(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.back}
          onClick={() => {
            if (returnToSettings) router.push('/settings/plan');
            else if (shouldExitToDashboard) router.push('/dashboard');
            else router.back();
          }}
        >
          ← Back
        </button>
        <div className={styles.heading}>
          <h1 className={styles.title}>
            {hasSelectedPlanJourney && selectedPlan
              ? `Confirm your ${getPlanDisplayName(selectedPlan)} plan`
              : 'Choose your plan'}
          </h1>
          <p className={styles.subtitle}>
            {hasSelectedPlanJourney
              ? 'Review the price below. Stripe only opens after you confirm.'
              : 'Simple pricing. No per-seat fees. No surprises.'}
          </p>
        </div>

        <div className={styles.toggle}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${interval === 'month' ? styles.toggleActive : ''}`}
            aria-pressed={interval === 'month'}
            onClick={() => handleIntervalChange('month')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${interval === 'year' ? styles.toggleActive : ''}`}
            aria-pressed={interval === 'year'}
            onClick={() => handleIntervalChange('year')}
          >
            Annual
            <span className={styles.saveBadge}>Save ~20%</span>
          </button>
        </div>
      </div>

      {checkoutCancelled && (
        <p className={styles.notice} role="status">
          Checkout was cancelled. Your plan has not changed, and your selection is still here.
        </p>
      )}
      {!access.loading && access.isOwner === false && (
        <p className={styles.notice} role="status">
          This workspace is managed by its owner. Ask them to change the plan from Settings.
        </p>
      )}
      {access.error && <p className={styles.error}>{access.error}</p>}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.grid}>
        {PLANS.map((plan) => {
          const price =
            interval === 'year' && plan.annualMonthly
              ? plan.annualMonthly
              : plan.monthlyPrice;
          const saving =
            plan.annualPrice && plan.monthlyPrice
              ? plan.monthlyPrice * 12 - plan.annualPrice
              : null;
          const isLoading = loading === plan.id;
          const isSelectedPlan = selectedPlan === plan.id && hasSelectedPlanJourney;
          const ctaVariant = hasSelectedPlanJourney && !isSelectedPlan
            ? 'ghost'
            : plan.ctaVariant;
          const isCurrentPlan = access.currentPlan === plan.id;
          const showCurrentPlanTreatment = !hasSelectedPlanJourney
            && !access.loading
            && isCurrentPlan;
          const showPopularRecommendation = Boolean(plan.popular)
            && !hasSelectedPlanJourney
            && !showCurrentPlanTreatment;
          const isIncludedInCurrentPlan =
            plan.id !== 'free'
            && !isCurrentPlan
            && isPlanAtLeast(access.currentPlan, plan.id);
          const paidActionDisabled =
            plan.id !== 'free'
            && (
              access.loading
              || access.isOwner !== true
              || isCurrentPlan
              || isIncludedInCurrentPlan
            );

          let ctaLabel = plan.cta;
          if (showCurrentPlanTreatment) {
            ctaLabel = 'Current plan';
          } else if (plan.id === 'free') {
            ctaLabel = shouldExitToDashboard ? 'Continue on Free' : 'Stay on Free';
          } else if (access.loading) {
            ctaLabel = 'Checking workspace…';
          } else if (access.isOwner === false) {
            ctaLabel = 'Owner manages this';
          } else if (isCurrentPlan) {
            ctaLabel = 'Current plan';
          } else if (isIncludedInCurrentPlan) {
            ctaLabel = `Included in ${getPlanDisplayName(access.currentPlan)}`;
          } else if (isSelectedPlan) {
            ctaLabel = `Continue with ${plan.name}`;
          }

          return (
            <div
              key={plan.id}
              className={`${styles.card} ${showCurrentPlanTreatment ? styles.currentPlan : ''} ${isSelectedPlan ? styles.selected : ''}`}
            >
              {showCurrentPlanTreatment && (
                <div className={`${styles.cardBadge} ${styles.currentPlanBadge}`}>
                  Your current plan
                </div>
              )}
              {showPopularRecommendation && (
                <div className={`${styles.cardBadge} ${styles.popularBadge}`}>
                  Most popular
                </div>
              )}

              <div className={styles.cardTop}>
                <div className={styles.planName}>{plan.name}</div>
                <div className={styles.tagline}>{plan.tagline}</div>

                <div className={styles.priceRow}>
                  <span className={styles.currency}>£</span>
                  <span className={styles.amount}>
                    {price === 0
                      ? '0'
                      : Number.isInteger(price)
                        ? price
                        : price.toFixed(2)}
                  </span>
                  {plan.monthlyPrice > 0 && (
                    <span className={styles.per}>/mo</span>
                  )}
                </div>

                {interval === 'year' && plan.annualPrice && plan.annualPrice > 0 ? (
                  <p className={styles.billed}>
                    Billed £{plan.annualPrice}/year
                    {saving && saving > 0 ? ` · saves £${saving}` : ''}
                  </p>
                ) : plan.monthlyPrice > 0 ? (
                  <p className={styles.billed}>Billed monthly · cancel any time</p>
                ) : (
                  <p className={styles.billed}>Always free · no card needed</p>
                )}
              </div>

              <ul className={styles.features}>
                {plan.features.map((f) => (
                  <li key={f.text} className={styles.feature}>
                    <span className={styles.check}>✓</span>
                    <span className={styles.featureText}>
                      {f.text}
                      {f.note && (
                        <span className={styles.featureNote}>{f.note}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`${styles.cta} ${styles[ctaVariant]}`}
                onClick={() => void handleSelect(plan.id)}
                disabled={
                  isLoading
                  || (loading !== null && !isLoading)
                  || showCurrentPlanTreatment
                  || paidActionDisabled
                }
              >
                {isLoading ? 'Redirecting…' : ctaLabel}
              </button>
            </div>
          );
        })}
      </div>

      <p className={styles.footer}>
        Secured by Stripe · Cancel any time · Storage limits are per workspace
      </p>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <UpgradeContent />
    </Suspense>
  );
}
