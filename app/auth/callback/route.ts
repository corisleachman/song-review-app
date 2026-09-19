import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { normalizeAuthDestination } from '@/lib/authDestination';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = normalizeAuthDestination(requestUrl.searchParams.get('next'));

  if (code) {
    const cookieStore = await cookies();

    // Redirect to login page with google=success so the client-side
    // session sync can pick up the session and redirect appropriately.
    // We avoid a server-side redirect chain to bootstrap because browsers
    // (especially in incognito) may not persist Set-Cookie headers across
    // multiple 307 redirect hops before the cookies are stored.
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('google', 'success');
    if (next !== '/dashboard') {
      loginUrl.searchParams.set('redirectTo', next);
    }

    const redirectResponse = NextResponse.redirect(loginUrl);

    // Write session cookies directly onto the redirect response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              redirectResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const errorUrl = new URL('/login', requestUrl.origin);
      errorUrl.searchParams.set('google', 'error');
      if (next !== '/dashboard') {
        errorUrl.searchParams.set('redirectTo', next);
      }
      return NextResponse.redirect(errorUrl);
    }

    return redirectResponse;
  }

  // No code — redirect to login
  const loginUrl = new URL('/login', requestUrl.origin);
  loginUrl.searchParams.set('google', 'error');
  if (next !== '/dashboard') {
    loginUrl.searchParams.set('redirectTo', next);
  }
  return NextResponse.redirect(loginUrl);
}
