'use client';

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import BetaBanner from '@/components/BetaBanner';
import TurnstileWidget, { type TurnstileWidgetHandle } from '@/components/TurnstileWidget';
import styles from '@/app/auth/check-email/page.module.css';

const RESEND_COOLDOWN_SECONDS = 60;
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown(current => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const requestLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || cooldown > 0) return;
    setError('');
    if (!captchaToken) {
      setError('Please complete the security check.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/email/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, captchaToken }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? 'We couldn’t request a link just now. Please try again.');
        return;
      }
      setSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError('We couldn’t request a link just now. Check your connection and try again.');
    } finally {
      turnstileRef.current?.reset();
      setCaptchaToken('');
      setLoading(false);
    }
  };

  return (
    <main className={styles.root}>
      <BetaBanner />
      <section className={styles.card} aria-labelledby="forgot-password-title">
        <a className={styles.brand} href="/">The Song Room</a>
        <p className={styles.eyebrow}>Account recovery</p>
        <h1 id="forgot-password-title">Reset your password</h1>
        {searchParams.get('status') === 'invalid_link' && (
          <p className={styles.error} role="alert">That reset link has expired or already been used. Request another below.</p>
        )}
        <p className={styles.intro}>Enter your email and we’ll send a reset link if this account can use email login.</p>
        <form className={styles.form} onSubmit={requestLink} noValidate>
          <label className={styles.fieldLabel} htmlFor="recovery-email">Email</label>
          <input
            id="recovery-email"
            className={styles.fieldInput}
            type="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={event => setEmail(event.target.value)}
            disabled={loading}
            required
          />
          <span className={styles.securityLabel}>Security check</span>
          <div className={styles.securityCheck}>
            <TurnstileWidget
              ref={turnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              action="password_recovery"
              onTokenChange={token => {
                setCaptchaToken(token);
                if (token) setError(current => current === 'Please complete the security check.' ? '' : current);
              }}
              onError={() => {
                setCaptchaToken('');
                setError('The security check could not load. Refresh the page and try again.');
              }}
            />
          </div>
          <button className={styles.primaryButton} type="submit" disabled={loading || cooldown > 0}>
            {loading ? 'Requesting…' : cooldown > 0 ? `Send again in ${cooldown}s` : 'Send reset link'}
          </button>
        </form>
        {sent && <p className={styles.status} role="status">If this address can use password recovery, we’ve sent a link. Check your inbox and spam folder.</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <a className={styles.textLink} href="/login?email=1">Return to Login</a>
      </section>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className={styles.root} />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
