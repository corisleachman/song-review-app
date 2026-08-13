'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface InviteActionsProps {
  token: string;
  inviteEmail: string;
}

type InviteActionState = 'checking' | 'signed_out' | 'matched' | 'mismatched';
type SignInMode = 'idle' | 'email';

const POST_LOGIN_INVITE_PATH_KEY = 'song_review_post_login_invite_path';

function lowerEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not complete invite action.';
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  color: '#ffffff',
  fontSize: '15px',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
};

export default function InviteActions({ token, inviteEmail }: InviteActionsProps) {
  const [supabase] = useState(() => createClient());
  const [actionState, setActionState] = useState<InviteActionState>('checking');
  const [signedInEmail, setSignedInEmail] = useState('');
  const [signInMode, setSignInMode] = useState<SignInMode>('idle');

  // Email sign-in fields
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailSignInLoading, setEmailSignInLoading] = useState(false);
  const [emailSignInError, setEmailSignInError] = useState('');

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const currentInvitePath = `/invite/${token}`;

    if (typeof window !== 'undefined') {
      const storedInvitePath = window.sessionStorage.getItem(POST_LOGIN_INVITE_PATH_KEY);
      if (storedInvitePath === currentInvitePath) {
        window.sessionStorage.removeItem(POST_LOGIN_INVITE_PATH_KEY);
      }
    }

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;

      if (sessionError) {
        setError(sessionError.message);
        setActionState('signed_out');
        return;
      }

      const userEmail = data.session?.user?.email?.trim() ?? '';
      setSignedInEmail(userEmail);

      if (!userEmail) {
        setActionState('signed_out');
        return;
      }

      setActionState(lowerEmail(userEmail) === lowerEmail(inviteEmail) ? 'matched' : 'mismatched');
    });

    return () => {
      mounted = false;
    };
  }, [inviteEmail, supabase, token]);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSigningIn(true);

    try {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('next', `/invite/${token}`);
      window.sessionStorage.setItem(POST_LOGIN_INVITE_PATH_KEY, `/invite/${token}`);

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (signInError) {
        window.sessionStorage.removeItem(POST_LOGIN_INVITE_PATH_KEY);
        setError(signInError.message);
        setIsSigningIn(false);
      }
    } catch (signInError) {
      window.sessionStorage.removeItem(POST_LOGIN_INVITE_PATH_KEY);
      setError(getErrorMessage(signInError));
      setIsSigningIn(false);
    }
  };

  const handleEmailSignIn = async () => {
    setEmailSignInError('');
    if (!emailInput.trim() || !passwordInput) {
      setEmailSignInError('Please enter your email and password.');
      return;
    }
    setEmailSignInLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: emailInput.trim(),
      password: passwordInput,
    });

    if (signInError) {
      setEmailSignInError(signInError.message);
      setEmailSignInLoading(false);
      return;
    }

    const userEmail = data.session?.user?.email?.trim() ?? '';
    setSignedInEmail(userEmail);
    setEmailSignInLoading(false);
    setSignInMode('idle');

    if (!userEmail) {
      setActionState('signed_out');
      return;
    }

    setActionState(lowerEmail(userEmail) === lowerEmail(inviteEmail) ? 'matched' : 'mismatched');
  };

  const handleAcceptInvite = async () => {
    setError('');
    setIsAccepting(true);

    try {
      const response = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'Could not accept invite.';
        setError(message);
        setIsAccepting(false);
        return;
      }

      const workspaceName =
        payload?.workspace && typeof payload.workspace.name === 'string'
          ? payload.workspace.name
          : 'this workspace';
      window.location.assign(`/dashboard?inviteAccepted=${encodeURIComponent(workspaceName)}`);
    } catch (acceptError) {
      setError(getErrorMessage(acceptError));
      setIsAccepting(false);
    }
  };

  const buttonBase: React.CSSProperties = {
    border: 'none',
    borderRadius: '10px',
    padding: '13px 16px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    width: '100%',
  };

  return (
    <div style={{ marginTop: '24px', display: 'grid', gap: '14px' }}>

      {actionState === 'checking' && (
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.68)', fontSize: '14px' }}>
          Checking your sign-in status…
        </p>
      )}

      {actionState === 'signed_out' && (
        <>
          {signInMode === 'idle' && (
            <>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.76)', lineHeight: 1.6 }}>
                Sign in to continue.
              </p>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                style={{ ...buttonBase, background: '#ffffff', color: '#111111', cursor: isSigningIn ? 'default' : 'pointer' }}
              >
                {isSigningIn ? 'Connecting…' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              </div>

              {/* Email toggle */}
              <button
                type="button"
                onClick={() => setSignInMode('email')}
                style={{ ...buttonBase, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                Sign in with email
              </button>
            </>
          )}

          {signInMode === 'email' && (
            <>
              <div>
                <label style={labelStyle} htmlFor="invite-email">Email</label>
                <input
                  id="invite-email"
                  type="email"
                  style={inputStyle}
                  placeholder="you@example.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  autoComplete="email"
                  disabled={emailSignInLoading}
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="invite-password">Password</label>
                <input
                  id="invite-password"
                  type="password"
                  style={inputStyle}
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  autoComplete="current-password"
                  disabled={emailSignInLoading}
                  onKeyDown={e => { if (e.key === 'Enter') void handleEmailSignIn(); }}
                />
              </div>

              {emailSignInError && (
                <p style={{ margin: 0, color: '#fca5a5', fontSize: '13px' }}>{emailSignInError}</p>
              )}

              <button
                type="button"
                onClick={handleEmailSignIn}
                disabled={emailSignInLoading}
                style={{ ...buttonBase, background: '#ffffff', color: '#111111', cursor: emailSignInLoading ? 'default' : 'pointer' }}
              >
                {emailSignInLoading ? 'Signing in…' : 'Sign in'}
              </button>

              <button
                type="button"
                onClick={() => { setSignInMode('idle'); setEmailSignInError(''); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px', padding: 0 }}
              >
                Back
              </button>
            </>
          )}
        </>
      )}

      {actionState === 'matched' && (
        <>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.76)', lineHeight: 1.6 }}>
            You&apos;re signed in as <strong>{signedInEmail}</strong>. You can join this workspace now.
          </p>
          <button
            type="button"
            onClick={handleAcceptInvite}
            disabled={isAccepting}
            style={{ ...buttonBase, background: '#34d399', color: '#052e16', cursor: isAccepting ? 'default' : 'pointer' }}
          >
            {isAccepting ? 'Accepting invite…' : 'Accept invite'}
          </button>
        </>
      )}

      {actionState === 'mismatched' && (
        <p style={{ margin: 0, color: '#fca5a5', lineHeight: 1.6 }}>
          This invite was sent to <strong>{inviteEmail}</strong>, but you are signed in as{' '}
          <strong>{signedInEmail || 'a different account'}</strong>. Please sign in with the invited account to accept it.
        </p>
      )}

      {error && (
        <p
          style={{
            margin: 0,
            color: '#fca5a5',
            background: 'rgba(127, 29, 29, 0.28)',
            border: '1px solid rgba(248, 113, 113, 0.32)',
            borderRadius: '10px',
            padding: '12px 14px',
            lineHeight: 1.5,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
