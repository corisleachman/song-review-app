'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface InviteActionsProps {
  token: string;
  inviteEmail: string;
}

type InviteActionState = 'checking' | 'signed_out' | 'matched' | 'mismatched';

const POST_LOGIN_INVITE_PATH_KEY = 'song_review_post_login_invite_path';

function lowerEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not complete invite action.';
}

export default function InviteActions({ token, inviteEmail }: InviteActionsProps) {
  const [supabase] = useState(() => createClient());
  const [actionState, setActionState] = useState<InviteActionState>('checking');
  const [signedInEmail, setSignedInEmail] = useState('');

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
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.76)', lineHeight: 1.6 }}>
            Continue with the Google account for <strong>{inviteEmail}</strong>. If you&apos;re new to Song Room, we&apos;ll create your account automatically.
          </p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            style={{ ...buttonBase, background: '#ffffff', color: '#111111', cursor: isSigningIn ? 'default' : 'pointer' }}
          >
            {isSigningIn ? 'Connecting…' : 'Continue with Google'}
          </button>
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
