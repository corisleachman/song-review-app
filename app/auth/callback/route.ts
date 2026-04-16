import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
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
  }

  const bootstrapUrl = new URL('/api/auth/bootstrap', requestUrl.origin);
  bootstrapUrl.searchParams.set('redirect', '1');
  if (next && next !== '/') {
    bootstrapUrl.searchParams.set('next', next);
  }

  return NextResponse.redirect(bootstrapUrl);
}
