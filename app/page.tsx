'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { setAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import styles from './page.module.css';

function LoginContent() {
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createClient());
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleSessionActive, setGoogleSessionActive] = useState(false);
  const googleStatus = searchParams.get('google');
  const googleMessage = searchParams.get('message');

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setGoogleSessionActive(Boolean(data.session));

      const redirectTo = searchParams.get('redirectTo') || '/dashboard';
      const arrivedFromGoogleFlow = searchParams.get('google') === 'success';

      if (data.session && arrivedFromGoogleFlow) {
        window.location.assign(redirectTo);
      }
    });

    return () => {
      mounted = false;
    };
  }, [supabase, searchParams]);

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    const redirectTo = searchParams.get('redirectTo') || '/dashboard';
    const callbackUrl = new URL('/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('next', redirectTo);

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (signInError) {
      setError(signInError.message);
      setGoogleLoading(false);
    }
  };

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

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className={styles.submitButton}
          >
            {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
          </button>

          <div className={styles.footer}>
            <p className={styles.hint}>
              Google auth foundation is now available. The legacy password fallback remains below during migration.
            </p>
          </div>

          {googleStatus === 'success' && (
            <div className={styles.error} style={{ background: 'rgba(16, 185, 129, 0.14)', color: '#86efac', borderColor: 'rgba(16, 185, 129, 0.35)' }}>
              Google sign-in succeeded. A Supabase session is active for this browser.
            </div>
          )}

          {googleStatus === 'error' && (
            <div className={styles.error}>
              {googleMessage || 'Google sign-in could not be completed.'}
            </div>
          )}

          {googleSessionActive && googleStatus !== 'success' && (
            <div className={styles.error} style={{ background: 'rgba(16, 185, 129, 0.14)', color: '#86efac', borderColor: 'rgba(16, 185, 129, 0.35)' }}>
              Google session detected. The legacy password path is still available below while the app transition continues.
            </div>
          )}

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
              {isLoading ? 'Unlocking...' : 'Continue with Legacy Password'}
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
