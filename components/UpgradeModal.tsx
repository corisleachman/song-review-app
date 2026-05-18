'use client';

import { useRouter } from 'next/navigation';
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
      title: 'You\u2019ve hit the collaboration limit',
      body: 'Upgrade your plan to invite more collaborators to this workspace.',
    };
  }
  if (type === 'storage') {
    return {
      title: 'You\u2019ve used your storage',
      body: 'Upgrade your plan to get more storage and keep uploading.',
    };
  }
  return {
    title: 'Upgrade your plan',
    body: 'Unlock more with a Pro or Studio plan.',
  };
}

export default function UpgradeModal({
  isOpen,
  type,
  onClose,
}: UpgradeModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const copy = getCopy(type);

  const handleSeeOptions = () => {
    onClose();
    router.push('/upgrade');
  };

  const handleClose = () => {
    onClose();
  };

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
            onClick={handleSeeOptions}
          >
            See plans
          </button>
        </div>
      </div>
    </div>
  );
}
