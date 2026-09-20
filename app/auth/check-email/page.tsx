'use client';

import { useEffect, useRef, useState } from 'react';
import BetaBanner from '@/components/BetaBanner';
import TurnstileWidget, { type TurnstileWidgetHandle } from '@/components/TurnstileWidget';
import styles from './page.module.css';

const PENDING_AUTH_EMAIL_KEY = 'song_room_pending_auth_email';
const PENDING_AUTH_RETURN_KEY = 'song_room_pending_auth_return';
const RESEND_COOLDOWN_SECONDS = 60;
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';

export default function CheckEmailPage() {
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

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
    if (!captchaToken) {
      setMessage('Please complete the security check.');
      return;
    }
    setResending(true);
    setMessage('');
    try {
      const response = await fetch('/api/auth/email/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, captchaToken }),
      });
      if (!response.ok) throw new Error('resend_failed');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setMessage('If this address can be verified, a fresh email is on its way.');
    } catch {
      setMessage('The email couldn’t be requested just now. Please wait a moment and try again.');
    } finally {
      turnstileRef.current?.reset();
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

        <div className={styles.securityCheck}>
          <TurnstileWidget
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            action="email_resend"
            onTokenChange={token => {
              setCaptchaToken(token);
              if (token) {
                setMessage(current => current === 'Please complete the security check.'
                  || current === 'The security check could not load. Refresh the page and try again.'
                  ? ''
                  : current);
              }
            }}
            onError={() => {
              setCaptchaToken('');
              setMessage('The security check could not load. Refresh the page and try again.');
            }}
          />
        </div>

        <button
          className={styles.primaryButton}
          type="button"
          onClick={() => void resend()}
          disabled={!email || !captchaToken || cooldown > 0 || resending}
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
