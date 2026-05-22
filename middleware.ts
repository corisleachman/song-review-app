import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Public routes (no auth required)
  const publicRoutes = ['/', '/identify', '/auth/callback', '/auth/reset-password'];
  const isInviteRoute = pathname.startsWith('/invite/');
  const isReferralRoute = pathname.startsWith('/r/');
  
  // Check if path is public
  if (publicRoutes.includes(pathname) || isInviteRoute || isReferralRoute) {
    return NextResponse.next();
  }
  
  // Check for auth cookie
  const authCookie = request.cookies.get('song_review_auth');
  const identityCookie = request.cookies.get('song_review_identity');

  if (authCookie && identityCookie) {
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

  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    return response;
  }

  const loginUrl = new URL('/', request.url);
  loginUrl.searchParams.set('redirectTo', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
