'use client';

import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import styles from './page.module.css';

function LoginContent() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (data.success) {
        // Cookie is now set server-side in the API response — no client setAuth() needed
        const redirectTo = searchParams.get('redirectTo') || '/identify';
        window.location.assign(redirectTo);
      } else {
        setError('Incorrect password');
        setIsLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
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
            <h1 className={styles.title}>Rebel HQ</h1>
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
