'use client';

import styles from './BetaBanner.module.css';

export default function BetaBanner() {
  const openFeedback = () => {
    window.dispatchEvent(new CustomEvent('song-room:open-feedback'));
  };

  return (
    <div className={styles.banner} role="status">
      <span className={styles.pill}>BETA</span>
      <span className={styles.text}>
        <strong>Song Room is in open beta.</strong> Rough edges expected —{' '}
      </span>
      <button type="button" className={styles.link} onClick={openFeedback}>
        send us feedback →
      </button>
    </div>
  );
}
