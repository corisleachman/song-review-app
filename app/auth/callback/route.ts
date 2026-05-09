import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const cookieStore = cookies();

    const bootstrapUrl = new URL('/api/auth/bootstrap', requestUrl.origin);
    bootstrapUrl.searchParams.set('redirect', '1');
    if (next && next !== '/') {
      bootstrapUrl.searchParams.set('next', next);
    }

    const redirectResponse = NextResponse.redirect(bootstrapUrl);

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

  const bootstrapUrl = new URL('/api/auth/bootstrap', requestUrl.origin);
  bootstrapUrl.searchParams.set('redirect', '1');
  if (next && next !== '/') {
    bootstrapUrl.searchParams.set('next', next);
  }

  return NextResponse.redirect(bootstrapUrl);
}
