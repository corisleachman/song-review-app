'use client';

import { useEffect, useState, type FormEvent } from 'react';
import styles from '../settings.module.css';

type UpdateResult = { error?: string; reauthenticationRequired?: boolean };

export default function PasswordManagementForm() {
  const [codeSent, setCodeSent] = useState(false);
  const [reauthenticationRequired, setReauthenticationRequired] = useState(false);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [otherSessionsSignedOut, setOtherSessionsSignedOut] = useState(true);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [nonce, setNonce] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (resendSeconds === 0) return;
    const timer = window.setTimeout(() => setResendSeconds(seconds => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const requestCode = async () => {
    setError('');
    setSending(true);
    try {
      const response = await fetch('/api/auth/email/manage/request', { method: 'POST' });
      const payload = await response.json().catch(() => null) as UpdateResult | null;
      if (!response.ok) {
        setError(payload?.error ?? 'We could not send a verification code. Please try again later.');
        return;
      }
      setCodeSent(true);
      setNonce('');
      setResendSeconds(60);
    } catch {
      setError('Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (reauthenticationRequired && !nonce.trim()) {
      setError('Enter the verification code from your email.');
      return;
    }
    if (password.length < 12 || password.length > 128) {
      setError('Use 12 to 128 characters for your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords don’t match.');
      return;
    }
    setUpdating(true);
    try {
      const response = await fetch('/api/auth/email/manage/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce: nonce.trim() || undefined, password, confirmPassword }),
      });
      const payload = await response.json().catch(() => null) as UpdateResult | null;
      if (!response.ok) {
        if (response.status === 428 && payload?.reauthenticationRequired) {
          setReauthenticationRequired(true);
        }
        setError(payload?.error ?? 'Your password could not be updated. Please try again.');
        return;
      }
      setNonce('');
      setPassword('');
      setConfirmPassword('');
      setOtherSessionsSignedOut(response.headers.get('X-Other-Sessions-Signed-Out') !== 'false');
      setCompleted(true);
    } catch {
      setError('Check your connection and try again.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeading}>
        <h2>Account security</h2>
        <p>Add or change the password for your Song Room account.</p>
      </div>
      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Password</h3>
          <p>A recent sign-in is enough to update your password. Older sessions need a code emailed to you. If you already use Google, that sign-in will still work.</p>
        </div>
        <div className={styles.blockControl}>
          {completed ? (
            <>
              <p className={styles.blockNotice} role="status">Your password has been updated.</p>
              {!otherSessionsSignedOut && (
                <p className={styles.blockError} role="alert">We couldn’t confirm that other devices were signed out. Please sign out on those devices yourself.</p>
              )}
            </>
          ) : (
            <>
              {reauthenticationRequired && (
                <button type="button" className={styles.actionButton} onClick={() => void requestCode()} disabled={sending || updating || resendSeconds > 0}>
                  {sending ? 'Sending…' : resendSeconds > 0 ? `Send again in ${resendSeconds}s` : codeSent ? 'Send another code' : 'Send verification code'}
                </button>
              )}
              <form className={styles.securityForm} onSubmit={updatePassword} noValidate>
                {codeSent && (
                  <>
                    <p className={styles.blockReadOnly} role="status">Check your account email and enter the latest verification code.</p>
                  <label htmlFor="security-code">Verification code</label>
                  <input id="security-code" className={styles.textInput} type="text" autoComplete="one-time-code" inputMode="numeric" maxLength={64} value={nonce} onChange={event => setNonce(event.target.value)} disabled={updating} required />
                  </>
                )}
                  <label htmlFor="security-password">New password</label>
                  <input id="security-password" className={styles.textInput} type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} disabled={updating} required />
                  <p className={styles.securityHint}>Use 12 to 128 characters. Password-manager paste is welcome.</p>
                  <label htmlFor="security-confirm-password">Confirm new password</label>
                  <input id="security-confirm-password" className={styles.textInput} type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} disabled={updating} required />
                  <button type="submit" className={styles.primaryButton} disabled={updating}>
                    {updating ? 'Updating…' : 'Update password'}
                  </button>
              </form>
            </>
          )}
          {error && <p className={styles.blockError} role="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
}
