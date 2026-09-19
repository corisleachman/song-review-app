import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isEmailPasswordAuthEnabled } from '@/lib/authFeatureFlags';
import {
  AUTH_INTENT_COOKIE,
  AUTH_INTENT_COOKIE_OPTIONS,
  readAuthIntent,
} from '@/lib/authIntent';

const ALLOWED_EMAIL_OTP_TYPES = new Set<EmailOtpType>(['email', 'recovery', 'signup']);

function buildFailureResponse(request: NextRequest, reason: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('auth', reason);
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
  const intentToken = request.nextUrl.searchParams.get('intent');

  if (
    !tokenHash
    || tokenHash.length > 512
    || !type
    || !ALLOWED_EMAIL_OTP_TYPES.has(type)
    || !intentToken
    || intentToken.length > 4096
  ) {
    return buildFailureResponse(request, 'invalid_confirmation');
  }

  let intent;
  try {
    intent = readAuthIntent(intentToken);
  } catch {
    return buildFailureResponse(request, 'invalid_confirmation');
  }

  if (!intent) {
    return buildFailureResponse(request, 'invalid_confirmation');
  }

  const validTypeForPurpose = intent.purpose === 'recovery'
    ? type === 'recovery'
    : (intent.purpose === 'signup' || intent.purpose === 'invite')
      && (type === 'signup' || type === 'email');
  if (!validTypeForPurpose) {
    return buildFailureResponse(request, 'invalid_confirmation');
  }

  const continueUrl = new URL('/auth/continue', request.url);
  continueUrl.searchParams.set('intent', intentToken);
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

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    return buildFailureResponse(request, 'confirmation_failed');
  }

  response.cookies.set(AUTH_INTENT_COOKIE, intentToken, AUTH_INTENT_COOKIE_OPTIONS);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
