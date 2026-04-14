'use client';

import { setIdentity } from '@/lib/auth';
import styles from './identify.module.css';

export default function IdentifyPage() {
  const handleSelectIdentity = (identity: 'Coris' | 'Al') => {
    setIdentity(identity);
    window.location.assign('/dashboard');
  };

  return (
    <div className={styles.container}>
      <div className={styles.gradientBg}></div>

      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Who are you?</h1>
          <p className={styles.subtitle}>Select your identity to continue</p>
        </div>

        <div className={styles.grid}>
          <button
            onClick={() => handleSelectIdentity('Coris')}
            className={styles.card}
          >
            <div className={styles.avatar}>🎹</div>
            <h2 className={styles.name}>Coris</h2>
            <p className={styles.email}>corisleachman@googlemail.com</p>
          </button>

          <button
            onClick={() => handleSelectIdentity('Al')}
            className={styles.card}
          >
            <div className={styles.avatar}>🎤</div>
            <h2 className={styles.name}>Al</h2>
            <p className={styles.email}>furthertcb@gmail.com</p>
          </button>
        </div>
      </div>
    </div>
  );
}
