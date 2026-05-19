'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase';
import styles from './page.module.css';

const POST_LOGIN_INVITE_PATH_KEY = 'song_review_post_login_invite_path';

type AuthMode = 'idle' | 'signin' | 'signup' | 'forgot';

function normalizeRedirectTarget(value: string | null) {
  if (!value) return '/dashboard';
  if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

async function resolvePostLoginRedirect(redirectTo: string) {
  const normalized = normalizeRedirectTarget(redirectTo);

  if (normalized === '/' || normalized === '/dashboard' || normalized === '/settings' || normalized === '/identify') {
    return normalized === '/' ? '/dashboard' : normalized;
  }

  const inviteMatch = normalized.match(/^\/invite\/([^/?#]+)/);
  if (inviteMatch) {
    return normalized;
  }

  const versionMatch = normalized.match(/^\/songs\/([^/]+)\/versions\/([^/?#]+)/);
  if (versionMatch) {
    const [, songId, versionId] = versionMatch;

    try {
      const response = await fetch(`/api/versions/${versionId}`, { cache: 'no-store' });
      if (response.ok) return normalized;
    } catch (error) {
      console.error('Post-login version redirect validation error:', error);
    }

    return `/songs/${songId}`;
  }

  const songMatch = normalized.match(/^\/songs\/([^/?#]+)/);
  if (songMatch) {
    return normalized;
  }

  return '/dashboard';
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createClient());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mode, setMode] = useState<AuthMode>('idle');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const googleStatus = searchParams.get('google');
  const googleMessage = searchParams.get('message');

  useEffect(() => {
    let mounted = true;

    const syncSessionAndRedirect = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const arrivedFromOAuthFlow = searchParams.get('google') === 'success';

      if (arrivedFromOAuthFlow && data.session) {
        const requestedRedirect = searchParams.get('redirectTo');
        const storedInvitePath =
          typeof window !== 'undefined' ? window.sessionStorage.getItem(POST_LOGIN_INVITE_PATH_KEY) : null;
        const inviteRedirect =
          storedInvitePath && /^\/invite\/[^/?#]+$/.test(storedInvitePath) ? storedInvitePath : null;
        const redirectCandidate =
          inviteRedirect && (!requestedRedirect || requestedRedirect === '/dashboard')
            ? inviteRedirect
            : requestedRedirect;
        const redirectTo = await resolvePostLoginRedirect(redirectCandidate);
        if (!mounted) return;
        if (typeof window !== 'undefined' && inviteRedirect === redirectTo) {
          window.sessionStorage.removeItem(POST_LOGIN_INVITE_PATH_KEY);
        }
        window.location.assign(redirectTo);
      }
    };

    void syncSessionAndRedirect();

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

  const handleEmailSignIn = async () => {
    setError('');
    setNotice('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setEmailLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setEmailLoading(false);
      return;
    }

    // Session is now active — resolve redirect
    const redirectTo = searchParams.get('redirectTo') || '/dashboard';
    const resolved = await resolvePostLoginRedirect(redirectTo);
    window.location.assign(resolved);
  };

  const handleEmailSignUp = async () => {
    setError('');
    setNotice('');
    if (!email.trim() || !password || !displayName.trim()) {
      setError('Please fill in all fields.');
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
    setEmailLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: displayName.trim(),
          display_name: displayName.trim(),
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setEmailLoading(false);
      return;
    }

    setNotice('Check your email for a confirmation link to activate your account.');
    setEmailLoading(false);
    setMode('idle');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
  };

  const handleForgotPassword = async () => {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setEmailLoading(true);

    const redirectUrl = new URL('/auth/reset-password', window.location.origin);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl.toString(),
    });

    setEmailLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setNotice("If that email is registered, you'll receive a reset link shortly.");
    setMode('idle');
    setEmail('');
  };

  const resetForm = () => {
    setError('');
    setNotice('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
  };

  const switchMode = (next: AuthMode) => {
    resetForm();
    setMode(next);
  };

  return (
    <div className={styles.container}>
      <div className={styles.gradientBg}></div>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>🎵 Song Review</h1>
            <p className={styles.subtitle}>Musings of The Ramble Brothers</p>
          </div>

          {/* Google sign-in — always visible */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || emailLoading}
            className={styles.submitButton}
          >
            {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className={styles.divider}>
            <span className={styles.dividerText}>or</span>
          </div>

          {/* Idle state — show email/password toggle links */}
          {mode === 'idle' && (
            <div className={styles.authToggle}>
              <button type="button" className={styles.toggleButton} onClick={() => switchMode('signin')}>
                Sign in with email
              </button>
              <span className={styles.toggleSep}>·</span>
              <button type="button" className={styles.toggleButton} onClick={() => switchMode('signup')}>
                Create account
              </button>
            </div>
          )}

          {/* Email sign-in form */}
          {mode === 'signin' && (
            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="signin-email">Email</label>
                <input
                  id="signin-email"
                  type="email"
                  className={styles.input}
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={emailLoading}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="signin-password">Password</label>
                <input
                  id="signin-password"
                  type="password"
                  className={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={emailLoading}
                  onKeyDown={e => { if (e.key === 'Enter') void handleEmailSignIn(); }}
                />
              </div>
              <button
                type="button"
                onClick={handleEmailSignIn}
                disabled={emailLoading}
                className={styles.submitButton}
              >
                {emailLoading ? 'Signing in...' : 'Sign in'}
              </button>
              <div className={styles.formFooter}>
                <button type="button" className={styles.toggleButton} onClick={() => switchMode('forgot')}>
                  Forgot password?
                </button>
                <span className={styles.toggleSep}>·</span>
                <button type="button" className={styles.toggleButton} onClick={() => switchMode('signup')}>
                  Create account
                </button>
                <span className={styles.toggleSep}>·</span>
                <button type="button" className={styles.toggleButton} onClick={() => switchMode('idle')}>
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Email sign-up form */}
          {mode === 'signup' && (
            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="signup-name">Display name</label>
                <input
                  id="signup-name"
                  type="text"
                  className={styles.input}
                  placeholder="Your name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  autoComplete="name"
                  disabled={emailLoading}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="signup-email">Email</label>
                <input
                  id="signup-email"
                  type="email"
                  className={styles.input}
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={emailLoading}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  type="password"
                  className={styles.input}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={emailLoading}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="signup-confirm">Confirm password</label>
                <input
                  id="signup-confirm"
                  type="password"
                  className={styles.input}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={emailLoading}
                  onKeyDown={e => { if (e.key === 'Enter') void handleEmailSignUp(); }}
                />
              </div>
              <button
                type="button"
                onClick={handleEmailSignUp}
                disabled={emailLoading}
                className={styles.submitButton}
              >
                {emailLoading ? 'Creating account...' : 'Create account'}
              </button>
              <div className={styles.formFooter}>
                <button type="button" className={styles.toggleButton} onClick={() => switchMode('signin')}>
                  Already have an account?
                </button>
                <span className={styles.toggleSep}>·</span>
                <button type="button" className={styles.toggleButton} onClick={() => switchMode('idle')}>
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Forgot password form */}
          {mode === 'forgot' && (
            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="forgot-email">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  className={styles.input}
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={emailLoading}
                  onKeyDown={e => { if (e.key === 'Enter') void handleForgotPassword(); }}
                />
              </div>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={emailLoading}
                className={styles.submitButton}
              >
                {emailLoading ? 'Sending...' : 'Send reset link'}
              </button>
              <div className={styles.formFooter}>
                <button type="button" className={styles.toggleButton} onClick={() => switchMode('signin')}>
                  Back to sign in
                </button>
              </div>
            </div>
          )}

          {/* Notices and errors */}
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

          {googleStatus === 'error' && !error && (
            <div className={styles.error} style={{ marginTop: '16px' }}>
              {googleMessage || 'Sign-in could not be completed. Please try again.'}
            </div>
          )}
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
