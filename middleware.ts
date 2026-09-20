import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { normalizeAuthDestination } from '@/lib/authDestination';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Public routes (no auth required)
  const publicRoutes = [
    '/',
    '/login',
    '/marketing.html',
    '/identify',
    '/auth/callback',
    '/auth/check-email',
    '/auth/confirm',
    '/auth/continue',
    '/auth/reset-password',
    '/privacy',
    '/terms',
    '/trust',
    '/cookie-consent.js',
    '/cookie-consent.css',
    '/song-room-preview.jpg',
  ];
  const isInviteRoute = pathname.startsWith('/invite/');
  const isSignupRoute = pathname.startsWith('/signup/');
  const isReferralRoute = pathname.startsWith('/r/');
  const isListenRoute = pathname.startsWith('/listen/');
  const isEmbedRoute = pathname.startsWith('/embed/');
  const isBlogRoute = pathname.startsWith('/blog');
  
  // Check if path is public
  if (publicRoutes.includes(pathname) || isInviteRoute || isSignupRoute || isReferralRoute || isListenRoute || isEmbedRoute || isBlogRoute) {
    return NextResponse.next();
  }
  
  // Browser fixtures can opt into the old cookies locally. Production never
  // trusts them as proof of authentication.
  const allowLegacyBrowserFixture =
    process.env.NODE_ENV !== 'production'
    && process.env.PLAYWRIGHT_ALLOW_LEGACY_AUTH === 'true';
  if (
    allowLegacyBrowserFixture
    && request.cookies.has('song_review_auth')
    && request.cookies.has('song_review_identity')
  ) {
    return NextResponse.next();
  }

  // Check Supabase session using @supabase/ssr which does not access
  // nextUrl.searchParams and therefore does not trigger BAILOUT_TO_CLIENT_SIDE_RENDERING.
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getClaims();

  if (!error && data?.claims?.sub) {
    return response;
  }

  const loginUrl = new URL('/login', request.url);
  const redirectTarget = normalizeAuthDestination(`${pathname}${request.nextUrl.search}`);
  loginUrl.searchParams.set('redirectTo', redirectTarget);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)',
  ],
};
