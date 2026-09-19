import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export const AUTH_REQUEST_MAX_BYTES = 16 * 1024;

export function emailAuthJson(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
export function isSameOriginAuthRequest(request: NextRequest) {
  const origin = request.headers.get('origin');
  return Boolean(origin) && origin === request.nextUrl.origin;
}

export async function readEmailAuthJson(request: NextRequest) {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > AUTH_REQUEST_MAX_BYTES) return null;
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return null;

  const rawBody = await request.text();
  if (!rawBody || Buffer.byteLength(rawBody, 'utf8') > AUTH_REQUEST_MAX_BYTES) return null;

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return null;
  }
}

export function createEmailAuthClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
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
}

export function buildAuthConfirmationRedirect(request: NextRequest, intentToken: string) {
  const redirect = new URL('/auth/confirm', request.nextUrl.origin);
  redirect.searchParams.set('intent', intentToken);
  return redirect.toString();
}
