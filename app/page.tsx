'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase';
import styles from './page.module.css';

const POST_LOGIN_INVITE_PATH_KEY = 'song_review_post_login_invite_path';

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleSessionActive, setGoogleSessionActive] = useState(false);
  const googleStatus = searchParams.get('google');
  const googleMessage = searchParams.get('message');

  useEffect(() => {
    let mounted = true;

    const syncSessionAndRedirect = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setGoogleSessionActive(Boolean(data.session));

      const arrivedFromGoogleFlow = searchParams.get('google') === 'success';

      if (arrivedFromGoogleFlow) {
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
              Sign in with Google to continue.
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
              Google session detected. Continuing to your dashboard.
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
