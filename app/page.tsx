'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { setAuth } from '@/lib/auth';
import styles from './page.module.css';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (password === 'further_forever') {
      setAuth();
      const redirectTo = searchParams.get('redirectTo') || '/identify';
      window.location.assign(redirectTo);
    } else {
      setError('Incorrect password');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Animated background gradient */}
      <div className={styles.gradientBg}></div>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>🎵 Song Review</h1>
            <p className={styles.subtitle}>Musings of The Ramble Brothers</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password to continue..."
                autoFocus
                className={styles.input}
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              type="submit"
              disabled={isLoading}
              className={styles.submitButton}
            >
              {isLoading ? 'Unlocking...' : 'Continue'}
            </button>
          </form>

          <div className={styles.footer}>
            <p className={styles.hint}>🔑 A password is required to access this app</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.loading}>Loading...</div></div>}>
      <LoginContent />
    </Suspense>
  );
}
