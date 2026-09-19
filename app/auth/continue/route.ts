import { NextRequest, NextResponse } from 'next/server';
import { bootstrapAccountForUser } from '@/lib/bootstrapAccount';
import { normalizeAuthDestination } from '@/lib/authDestination';
import {
  AUTH_INTENT_COOKIE,
  AUTH_INTENT_COOKIE_OPTIONS,
  authIntentEmailMatches,
  getAuthIntentDestination,
  readAuthIntent,
} from '@/lib/authIntent';
import { getCurrentAuthenticatedUser } from '@/lib/currentUser';

function redirectWithNoStore(url: URL) {
  const response = NextResponse.redirect(url, 303);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

function redirectToLogin(request: NextRequest, reason: string, destination = '/dashboard') {
  const url = new URL('/login', request.url);
  url.searchParams.set('auth', reason);
  if (destination !== '/dashboard') url.searchParams.set('redirectTo', destination);
  return redirectWithNoStore(url);
}

export async function GET(request: NextRequest) {
  const queryIntent = request.nextUrl.searchParams.get('intent');
  const cookieIntent = request.cookies.get(AUTH_INTENT_COOKIE)?.value ?? null;
  const intentToken = queryIntent || cookieIntent;
  const fallbackDestination = normalizeAuthDestination(request.nextUrl.searchParams.get('next'));

  let intent = null;
  if (intentToken) {
    try {
      intent = readAuthIntent(intentToken);
    } catch {
      return redirectToLogin(request, 'invalid_intent');
    }
    if (!intent) return redirectToLogin(request, 'invalid_intent');
  }

  const destination = intent ? getAuthIntentDestination(intent) : fallbackDestination;
  const user = await getCurrentAuthenticatedUser();
  if (!user) {
    return redirectToLogin(request, 'session_missing', destination);
  }

  if (intent && !authIntentEmailMatches(intent, user.email)) {
    return redirectToLogin(request, 'account_mismatch');
  }

  const destinationKind = intent?.destination.kind;
  if (destinationKind !== 'invite' && destinationKind !== 'recovery') {
    try {
      await bootstrapAccountForUser(user);
    } catch (error) {
      console.error('[auth-continue] Account bootstrap failed:', error);
      return redirectToLogin(request, 'bootstrap_failed', destination);
    }
  }

  const response = redirectWithNoStore(new URL(destination, request.url));
  response.cookies.set(AUTH_INTENT_COOKIE, '', {
    ...AUTH_INTENT_COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}
