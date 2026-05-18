'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './upgrade.module.css';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try it out',
    monthlyPrice: 0,
    annualPrice: 0,
    storage: '500 MB',
    collaborators: '3',
    cta: 'Stay on Free',
    ctaVariant: 'ghost' as const,
    features: [
      '500 MB storage',
      '3 collaborators',
      'Unlimited songs',
      'Waveform comments',
      'Timestamped feedback',
      'Action tracking',
      'Email notifications',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For working bands & duos',
    monthlyPrice: 9,
    annualPrice: 86,
    annualMonthly: 7.17,
    storage: '10 GB',
    collaborators: '10',
    cta: 'Upgrade to Pro',
    ctaVariant: 'primary' as const,
    popular: true,
    features: [
      '10 GB storage',
      '10 collaborators',
      'Unlimited songs',
      'Waveform comments',
      'Timestamped feedback',
      'Action tracking',
      'Email notifications',
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'For producers & larger teams',
    monthlyPrice: 19,
    annualPrice: 190,
    annualMonthly: 15.83,
    storage: '50 GB',
    collaborators: 'Unlimited',
    cta: 'Upgrade to Studio',
    ctaVariant: 'accent' as const,
    features: [
      '50 GB storage',
      'Unlimited collaborators',
      'Unlimited songs',
      'Waveform comments',
      'Timestamped feedback',
      'Action tracking',
      'Email notifications',
    ],
  },
];

export default function UpgradePage() {
  const router = useRouter();
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSelect = async (planId: string) => {
    if (planId === 'free') {
      router.back();
      return;
    }

    setError('');
    setLoading(planId);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, interval }),
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

  const annualSaving = (plan: typeof PLANS[number]) => {
    if (!plan.annualPrice || !plan.monthlyPrice) return null;
    const saving = plan.monthlyPrice * 12 - plan.annualPrice;
    return saving;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.back}
          onClick={() => router.back()}
        >
          ← Back
        </button>
        <div className={styles.heading}>
          <h1 className={styles.title}>Choose your plan</h1>
          <p className={styles.subtitle}>
            Simple pricing. No per-seat fees. No surprises.
          </p>
        </div>

        <div className={styles.toggle}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${interval === 'month' ? styles.toggleActive : ''}`}
            onClick={() => setInterval('month')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${interval === 'year' ? styles.toggleActive : ''}`}
            onClick={() => setInterval('year')}
          >
            Annual
            <span className={styles.saveBadge}>Save ~20%</span>
          </button>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.grid}>
        {PLANS.map((plan) => {
          const price =
            interval === 'year' && plan.annualMonthly
              ? plan.annualMonthly
              : plan.monthlyPrice;
          const saving = annualSaving(plan);
          const isLoading = loading === plan.id;

          return (
            <div
              key={plan.id}
              className={`${styles.card} ${plan.popular ? styles.popular : ''}`}
            >
              {plan.popular && (
                <div className={styles.popularBadge}>Most popular</div>
              )}

              <div className={styles.cardTop}>
                <div className={styles.planName}>{plan.name}</div>
                <div className={styles.tagline}>{plan.tagline}</div>

                <div className={styles.priceRow}>
                  <span className={styles.currency}>£</span>
                  <span className={styles.amount}>
                    {price === 0 ? '0' : price.toFixed(2).replace('.00', '')}
                  </span>
                  {plan.monthlyPrice > 0 && (
                    <span className={styles.per}>/mo</span>
                  )}
                </div>

                {interval === 'year' && plan.annualPrice > 0 && (
                  <p className={styles.billed}>
                    Billed £{plan.annualPrice}/year
                    {saving && saving > 0 ? ` · saves £${saving}` : ''}
                  </p>
                )}
                {interval === 'month' && plan.monthlyPrice > 0 && (
                  <p className={styles.billed}>Billed monthly · cancel any time</p>
                )}
                {plan.monthlyPrice === 0 && (
                  <p className={styles.billed}>Always free</p>
                )}
              </div>

              <ul className={styles.features}>
                {plan.features.map((f) => (
                  <li key={f} className={styles.feature}>
                    <span className={styles.check}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`${styles.cta} ${styles[plan.ctaVariant]}`}
                onClick={() => void handleSelect(plan.id)}
                disabled={isLoading || (loading !== null && !isLoading)}
              >
                {isLoading ? 'Redirecting…' : plan.cta}
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
