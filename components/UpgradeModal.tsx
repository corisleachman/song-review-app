'use client';

import { useState } from 'react';
import styles from './UpgradeModal.module.css';
import type { PlanLimitType } from '@/lib/plans';

interface UpgradeModalProps {
  isOpen: boolean;
  type: PlanLimitType;
  onClose: () => void;
}

function getCopy(type: PlanLimitType) {
  if (type === 'collaborators') {
    return {
      title: 'You’ve hit the collaboration limit',
      body: 'Free plan supports up to 2 collaborators. Upgrade to invite more people and work together.',
    };
  }

  return {
    title: 'You’ve reached your song limit',
    body: 'Free plan includes up to 5 songs. Upgrade to keep uploading and managing more tracks.',
  };
}

async function logUpgradeClick(type: PlanLimitType) {
  try {
    await fetch('/api/plan-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'upgrade_clicked',
        type,
      }),
    });
  } catch (error) {
    console.error('Error logging upgrade click:', error);
  }
}

export default function UpgradeModal({ isOpen, type, onClose }: UpgradeModalProps) {
  const [checkoutError, setCheckoutError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const copy = getCopy(type);

  const handleUpgrade = async () => {
    setCheckoutError('');
    setIsLoading(true);

    await logUpgradeClick(type);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
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

  return (
    <div className={styles.overlay} onClick={event => { if (event.target === event.currentTarget) handleClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="upgrade-modal-title">
        <h2 id="upgrade-modal-title" className={styles.title}>{copy.title}</h2>
        <p className={styles.body}>{copy.body}</p>
        {checkoutError && (
          <p className={styles.error}>{checkoutError}</p>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={handleClose}>
            Not now
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void handleUpgrade()}
            disabled={isLoading}
          >
            {isLoading ? 'Redirecting...' : 'Upgrade'}
          </button>
        </div>
      </div>
    </div>
  );
}
