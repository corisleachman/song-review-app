import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Public routes (no auth required)
  const publicRoutes = ['/', '/identify'];
  
  // Check if path is public
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }
  
  // Check for auth cookie
  const authCookie = request.cookies.get('song_review_auth');
  const identityCookie = request.cookies.get('song_review_identity');
  
  // If no auth or identity, redirect to password gate
  if (!authCookie || !identityCookie) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
