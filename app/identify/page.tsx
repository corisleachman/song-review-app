'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { setIdentity, getAuth } from '@/lib/auth';
import { useEffect } from 'react';
import styles from './identify.module.css';

export default function IdentifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  useEffect(() => {
    if (!getAuth()) {
      router.push('/');
    }
  }, [router]);

  const handleSelect = (identity: 'Coris' | 'Al') => {
    setIdentity(identity);
    router.push(redirectTo);
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <h1 className={styles.title}>Who are you?</h1>
        <div className={styles.buttons}>
          <button
            onClick={() => handleSelect('Coris')}
            className={styles.button}
          >
            Coris
          </button>
          <button
            onClick={() => handleSelect('Al')}
            className={styles.button}
          >
            Al
          </button>
        </div>
      </div>
    </div>
  );
}
