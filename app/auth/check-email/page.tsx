'use client';

import { useEffect, useState } from 'react';
import BetaBanner from '@/components/BetaBanner';
import styles from './page.module.css';

const PENDING_AUTH_EMAIL_KEY = 'song_room_pending_auth_email';
const PENDING_AUTH_RETURN_KEY = 'song_room_pending_auth_return';
const RESEND_COOLDOWN_SECONDS = 60;

export default function CheckEmailPage() {
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    setEmail(window.sessionStorage.getItem(PENDING_AUTH_EMAIL_KEY) ?? '');
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown(value => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const resend = async () => {
    if (!email || cooldown > 0 || resending) return;
    setResending(true);
    setMessage('');
    try {
      const response = await fetch('/api/auth/email/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error('resend_failed');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setMessage('If this address can be verified, a fresh email is on its way.');
    } catch {
      setMessage('The email couldn’t be requested just now. Please wait a moment and try again.');
    } finally {
      setResending(false);
    }
  };

  const changeEmail = () => {
    const storedPath = window.sessionStorage.getItem(PENDING_AUTH_RETURN_KEY) ?? '';
    window.sessionStorage.removeItem(PENDING_AUTH_EMAIL_KEY);
    const returnPath = storedPath.startsWith('/login?signupPlan=') ? storedPath : '/signup/free';
    window.location.assign(returnPath);
  };

  return (
    <main className={styles.root}>
      <BetaBanner />
      <section className={styles.card} aria-labelledby="check-email-title">
        <a className={styles.brand} href="/">The Song Room</a>
        <p className={styles.eyebrow}>One more step</p>
        <h1 id="check-email-title">Check your email</h1>
        <p className={styles.intro}>
          We’ve sent a verification link{email ? <> to <strong>{email}</strong></> : ''}.
          Open it to finish creating your account.
        </p>
        <p className={styles.note}>The link expires. If it doesn’t arrive, check spam before requesting another.</p>

        <button
          className={styles.primaryButton}
          type="button"
          onClick={() => void resend()}
          disabled={!email || cooldown > 0 || resending}
        >
          {resending
            ? 'Requesting…'
            : cooldown > 0
              ? `Send again in ${cooldown}s`
              : 'Send another email'}
        </button>
        <button className={styles.textButton} type="button" onClick={changeEmail}>Use a different email</button>
        <a className={styles.googleHelp} href="/login">Already use Google? Return to Login and continue with Google.</a>
        {message && <p className={styles.status} role="status">{message}</p>}
      </section>
    </main>
  );
}
