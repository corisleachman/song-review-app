import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isEmailPasswordAuthEnabled } from '@/lib/authFeatureFlags';
import {
  AUTH_INTENT_COOKIE,
  AUTH_INTENT_COOKIE_OPTIONS,
  authIntentEmailMatches,
  createAuthIntent,
  readAuthIntent,
} from '@/lib/authIntent';
import {
  consumeEmailAuthFlow,
  readEmailAuthFlow,
} from '@/lib/emailAuthFlows';

const ALLOWED_EMAIL_OTP_TYPES = new Set<EmailOtpType>(['email', 'recovery', 'signup']);

function buildFailureResponse(request: NextRequest, reason: string, recovery = false) {
  const url = new URL(recovery ? '/forgot-password' : '/login', request.url);
  url.searchParams.set(recovery ? 'status' : 'auth', recovery ? 'invalid_link' : reason);
  const response = NextResponse.redirect(url, 303);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export async function GET(request: NextRequest) {
  if (!isEmailPasswordAuthEnabled()) {
    return buildFailureResponse(request, 'email_unavailable');
  }

  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type') as EmailOtpType | null;
  const flowId = request.nextUrl.searchParams.get('flow');
  const recovery = type === 'recovery';

  if (
    !tokenHash
    || tokenHash.length > 512
    || !type
    || !ALLOWED_EMAIL_OTP_TYPES.has(type)
    || !flowId
  ) {
    return buildFailureResponse(request, 'invalid_confirmation', recovery);
  }

  let flow;
  try {
    flow = await readEmailAuthFlow(flowId);
  } catch {
    console.error('[email-auth] Confirmation flow could not be read.');
    return buildFailureResponse(request, 'invalid_confirmation', recovery);
  }

  if (!flow) {
    return buildFailureResponse(request, 'invalid_confirmation', recovery);
  }

  let intent;
  try {
    intent = readAuthIntent(flow.sealedIntent);
  } catch {
    intent = null;
  }

  const validSignup = flow.purpose === 'signup'
    && intent?.purpose === 'signup'
    && (type === 'signup' || type === 'email');
  const validRecovery = flow.purpose === 'recovery'
    && intent?.purpose === 'recovery'
    && type === 'recovery';
  if (
    (!validSignup && !validRecovery)
    || !intent?.emailHash
    || intent.emailHash !== flow.emailHash
  ) {
    return buildFailureResponse(request, 'invalid_confirmation', recovery);
  }

  const continueUrl = new URL('/auth/continue', request.url);
  const response = NextResponse.redirect(continueUrl, 303);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: cookiesToSet => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (
    error
    || !data.session
    || !data.user?.email
    || !authIntentEmailMatches(intent, data.user.email)
  ) {
    return buildFailureResponse(request, 'confirmation_failed', recovery);
  }

  try {
    await consumeEmailAuthFlow(flow.id);
  } catch {
    console.error('[email-auth] Verified confirmation flow could not be consumed.');
    return buildFailureResponse(request, 'confirmation_failed', recovery);
  }

  const verifiedIntentToken = recovery
    ? createAuthIntent({
      purpose: 'recovery_verified',
      destination: '/auth/reset-password',
      email: data.user!.email,
    })
    : flow.sealedIntent;
  response.cookies.set(AUTH_INTENT_COOKIE, verifiedIntentToken, AUTH_INTENT_COOKIE_OPTIONS);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
