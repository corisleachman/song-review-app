'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import styles from '../../login/page.module.css';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createClient());
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase writes the recovery session into the browser automatically
    // when the user arrives via the reset link. We just need to wait for it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check if a session is already present (e.g. page reload)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleReset = async () => {
    setError('');
    if (!password || !confirmPassword) {
      setError('Please fill in both fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setNotice('Password updated. Redirecting to your dashboard...');
    setTimeout(() => {
      window.location.assign('/dashboard');
    }, 1500);
  };

  return (
    <div className={styles.container}>
      <div className={styles.gradientBg}></div>
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>🎵 Song Review</h1>
            <p className={styles.subtitle}>Set a new password</p>
          </div>

          {!sessionReady && !notice && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', textAlign: 'center', margin: 0 }}>
              Verifying reset link…
            </p>
          )}

          {sessionReady && !notice && (
            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  className={styles.input}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="confirm-new-password">Confirm password</label>
                <input
                  id="confirm-new-password"
                  type="password"
                  className={styles.input}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                  onKeyDown={e => { if (e.key === 'Enter') void handleReset(); }}
                />
              </div>
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className={styles.submitButton}
              >
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </div>
          )}

          {notice && (
            <div className={styles.error} style={{ background: 'rgba(16, 185, 129, 0.14)', color: '#86efac', borderColor: 'rgba(16, 185, 129, 0.35)', marginTop: '16px' }}>
              {notice}
            </div>
          )}

          {error && (
            <div className={styles.error} style={{ marginTop: '16px' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0d0914' }} />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
