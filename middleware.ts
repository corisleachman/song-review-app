import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Public routes (no auth required)
  const publicRoutes = ['/', '/identify', '/auth/callback'];
  const isInviteRoute = pathname.startsWith('/invite/');
  
  // Check if path is public
  if (publicRoutes.includes(pathname) || isInviteRoute) {
    return NextResponse.next();
  }
  
  // Check for auth cookie
  const authCookie = request.cookies.get('song_review_auth');
  const identityCookie = request.cookies.get('song_review_identity');

  if (authCookie && identityCookie) {
    return NextResponse.next();
  }

  // No auth cookies present — redirect to login.
  // We do not call supabase.auth.getSession() here because it accesses
  // nextUrl.searchParams, which triggers BAILOUT_TO_CLIENT_SIDE_RENDERING
  // and prevents route-specific CSS chunks from being injected on every page.
  const loginUrl = new URL('/', request.url);
  loginUrl.searchParams.set('redirectTo', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
