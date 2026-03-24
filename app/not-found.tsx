'use client';

import { useRouter } from 'next/navigation';
import styles from './not-found.module.css';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <h1 className={styles.title}>404</h1>
        <p className={styles.message}>Page not found</p>
        <button onClick={() => router.push('/dashboard')} className={styles.button}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
