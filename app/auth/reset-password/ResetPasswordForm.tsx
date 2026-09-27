'use client';

import { useState, type FormEvent } from 'react';
import BetaBanner from '@/components/BetaBanner';
import styles from '@/app/auth/check-email/page.module.css';

export default function ResetPasswordForm({ verified }: { verified: boolean }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [otherSessionsSignedOut, setOtherSessionsSignedOut] = useState(true);
  const [error, setError] = useState('');

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password.length < 12 || password.length > 128) {
      setError('Use 12 to 128 characters for your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords don’t match.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/email/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPassword }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? 'Your password could not be updated. Please try again.');
        return;
      }
      setPassword('');
      setConfirmPassword('');
      setOtherSessionsSignedOut(response.headers.get('X-Other-Sessions-Signed-Out') !== 'false');
      setCompleted(true);
    } catch {
      setError('Your password could not be updated. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.root}>
      <BetaBanner />
      <section className={styles.card} aria-labelledby="reset-password-title">
        <a className={styles.brand} href="/">The Song Room</a>
        <p className={styles.eyebrow}>Account recovery</p>
        <h1 id="reset-password-title">Set a new password</h1>
        {!verified ? (
          <>
            <p className={styles.intro} role="alert">This reset link has expired or already been used.</p>
            <a className={styles.primaryLink} href="/forgot-password">Request another link</a>
            <a className={styles.textLink} href="/login?email=1">Return to Login</a>
          </>
        ) : completed ? (
          <>
            <p className={styles.intro} role="status">Your password has been updated.</p>
            {!otherSessionsSignedOut && (
              <p className={styles.error} role="alert">We couldn’t confirm that other devices were signed out. Please sign out on those devices yourself.</p>
            )}
            <a className={styles.primaryLink} href="/dashboard">Go to your workspace</a>
          </>
        ) : (
          <>
            <p className={styles.intro}>Use at least 12 characters. Password-manager paste is welcome.</p>
            <form className={styles.form} onSubmit={resetPassword} noValidate>
              <label className={styles.fieldLabel} htmlFor="new-password">New password</label>
              <input
                id="new-password"
                className={styles.fieldInput}
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={password}
                onChange={event => setPassword(event.target.value)}
                disabled={loading}
                required
              />
              <label className={styles.fieldLabel} htmlFor="confirm-new-password">Confirm new password</label>
              <input
                id="confirm-new-password"
                className={styles.fieldInput}
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                disabled={loading}
                required
              />
              <button className={styles.primaryButton} type="submit" disabled={loading}>
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <a className={styles.textLink} href="/forgot-password">Request another link</a>
          </>
        )}
      </section>
    </main>
  );
}
