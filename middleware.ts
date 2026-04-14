import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Fully public — no cookies needed
  if (pathname === '/') {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('song_review_auth');

  // /identify only needs the auth cookie (identity not chosen yet)
  if (pathname === '/identify') {
    if (!authCookie) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // All other routes need both auth + identity
  const identityCookie = request.cookies.get('song_review_identity');
  if (!authCookie || !identityCookie) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.png|icon.svg|apple-icon.png|manifest.json|robots.txt|sitemap.xml).*)',
  ],
};
