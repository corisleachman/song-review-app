import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

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

  const response = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res: response });
  const { data } = await supabase.auth.getSession();
  
  if (data.session) {
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
