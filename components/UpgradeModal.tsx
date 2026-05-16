'use client';

import { useState } from 'react';
import styles from './UpgradeModal.module.css';
import type { AccountPlan, PlanLimitType } from '@/lib/plans';

interface UpgradeModalProps {
  isOpen: boolean;
  type: PlanLimitType;
  /** The plan the user would be upgrading to. Defaults to 'pro'. */
  targetPlan?: AccountPlan;
  onClose: () => void;
}

function getCopy(type: PlanLimitType, targetPlan: AccountPlan) {
  const tierName = targetPlan === 'studio' ? 'Studio' : 'Pro';

  if (type === 'collaborators') {
    return {
      title: 'You\u2019ve hit the collaboration limit',
      body:
        targetPlan === 'studio'
          ? 'Pro plan supports up to 10 collaborators. Upgrade to Studio for unlimited collaborators.'
          : 'Free plan supports up to 3 collaborators. Upgrade to Pro to invite more people.',
    };
  }

  if (type === 'storage') {
    return {
      title: 'You\u2019ve used your storage',
      body:
        targetPlan === 'studio'
          ? 'You\u2019ve used your 10 GB Pro storage. Upgrade to Studio for 50 GB.'
          : 'You\u2019ve used your 500 MB free storage. Upgrade to Pro for 10 GB.',
    };
  }

  // Fallback
  return {
    title: `Upgrade to ${tierName}`,
    body: `Unlock more features by upgrading to ${tierName}.`,
  };
}

async function logUpgradeClick(type: PlanLimitType) {
  try {
    await fetch('/api/plan-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'upgrade_clicked', type }),
    });
  } catch (error) {
    console.error('Error logging upgrade click:', error);
  }
}

export default function UpgradeModal({
  isOpen,
  type,
  targetPlan = 'pro',
  onClose,
}: UpgradeModalProps) {
  const [checkoutError, setCheckoutError] = useState('');
  const [isLoading, setIsLoading]         = useState(false);

  if (!isOpen) return null;

  const copy = getCopy(type, targetPlan);

  const handleUpgrade = async () => {
    setCheckoutError('');
    setIsLoading(true);

    await logUpgradeClick(type);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan, interval: 'month' }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'Could not start checkout.';
        setCheckoutError(message);
        setIsLoading(false);
        return;
      }

      if (!payload?.url || typeof payload.url !== 'string') {
        setCheckoutError('Checkout URL was missing.');
        setIsLoading(false);
        return;
      }

      window.location.assign(payload.url);
    } catch (error) {
      console.error('Upgrade checkout error:', error);
      setCheckoutError('Could not start checkout.');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCheckoutError('');
    setIsLoading(false);
    onClose();
  };

  const tierName = targetPlan === 'studio' ? 'Studio' : 'Pro';

  return (
    <div
      className={styles.overlay}
      onClick={event => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
      >
        <h2 id="upgrade-modal-title" className={styles.title}>
          {copy.title}
        </h2>
        <p className={styles.body}>{copy.body}</p>
        {checkoutError && <p className={styles.error}>{checkoutError}</p>}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleClose}
          >
            Not now
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void handleUpgrade()}
            disabled={isLoading}
          >
            {isLoading ? 'Redirecting...' : `Upgrade to ${tierName}`}
          </button>
        </div>
      </div>
    </div>
  );
}
