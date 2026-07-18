import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const cookieStore = await cookies();

    // Redirect to login page with google=success so the client-side
    // session sync can pick up the session and redirect appropriately.
    // We avoid a server-side redirect chain to bootstrap because browsers
    // (especially in incognito) may not persist Set-Cookie headers across
    // multiple 307 redirect hops before the cookies are stored.
    const loginUrl = new URL('/', requestUrl.origin);
    loginUrl.searchParams.set('google', 'success');
    if (next && next !== '/') {
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
      const errorUrl = new URL('/', requestUrl.origin);
      errorUrl.searchParams.set('google', 'error');
      errorUrl.searchParams.set('message', error.message);
      if (next && next !== '/') {
        errorUrl.searchParams.set('redirectTo', next);
      }
      return NextResponse.redirect(errorUrl);
    }

    return redirectResponse;
  }

  // No code — redirect to login
  const loginUrl = new URL('/', requestUrl.origin);
  loginUrl.searchParams.set('google', 'error');
  loginUrl.searchParams.set('message', 'No auth code received.');
  if (next && next !== '/') {
    loginUrl.searchParams.set('redirectTo', next);
  }
  return NextResponse.redirect(loginUrl);
}
