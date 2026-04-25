'use client';

import { useMemo } from 'react';
import styles from './UpgradeSuccessModal.module.css';

interface UpgradeSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrimaryAction: () => void;
}

export default function UpgradeSuccessModal({
  isOpen,
  onClose,
  onPrimaryAction,
}: UpgradeSuccessModalProps) {
  const particles = useMemo(
    () => Array.from({ length: 18 }, (_, index) => ({
      id: index,
      left: `${6 + (index % 6) * 16}%`,
      delay: `${(index % 6) * 0.18}s`,
      duration: `${3.8 + (index % 5) * 0.45}s`,
    })),
    []
  );

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-success-title"
      >
        <div className={styles.particles} aria-hidden="true">
          {particles.map(particle => (
            <span
              key={particle.id}
              className={styles.particle}
              style={{
                left: particle.left,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
              }}
            />
          ))}
        </div>

        <div className={styles.hero}>
          <div className={styles.badgeRow}>
            <span className={styles.planBadge}>Paid plan active</span>
            <span className={styles.sparkle}>✦</span>
          </div>
          <h2 id="upgrade-success-title" className={styles.title}>
            Welcome to Pro
          </h2>
          <p className={styles.subtitle}>
            Your workspace just unlocked the full collaboration canvas. Keep building without caps.
          </p>
        </div>

        <div className={styles.unlockGrid}>
          <div className={styles.unlockCard}>
            <span className={styles.unlockLabel}>Unlocked now</span>
            <strong>Unlimited songs</strong>
            <p>Create and organise as many tracks as your project needs.</p>
          </div>
          <div className={styles.unlockCard}>
            <span className={styles.unlockLabel}>Unlocked now</span>
            <strong>Unlimited collaborators</strong>
            <p>Invite your full band, producer, and anyone else who needs to review.</p>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Keep exploring
          </button>
          <button type="button" className={styles.primaryButton} onClick={onPrimaryAction}>
            Invite your band
          </button>
        </div>
      </div>
    </div>
  );
}
