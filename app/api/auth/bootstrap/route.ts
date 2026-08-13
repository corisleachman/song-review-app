import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { RequestTiming } from '@/lib/requestTiming';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildReturnUrl(request: NextRequest, next: string | null) {
  const url = new URL('/login', request.url);
  url.searchParams.set('google', 'success');

  if (next && next !== '/') {
    url.searchParams.set('redirectTo', next);
  }

  return url;
}

export async function GET(req: NextRequest) {
  const timing = new RequestTiming();

  function respond(body: unknown, status: number) {
    const response = timing.attach(NextResponse.json(body, { status }));
    timing.logPreview('/api/auth/bootstrap', req, status);
    return response;
  }

  try {
    noStore();
    const next = req.nextUrl.searchParams.get('next');
    const shouldRedirect = req.nextUrl.searchParams.get('redirect') === '1';
    const resolved = await timing.measure(
      'identity',
      () => resolveCanonicalIdentity(timing)
    );

    if (!resolved) {
      if (shouldRedirect) {
        const url = new URL('/login', req.url);
        url.searchParams.set('google', 'error');
        url.searchParams.set('message', 'No authenticated user found during bootstrap.');
        if (next && next !== '/') {
          url.searchParams.set('redirectTo', next);
        }
        return NextResponse.redirect(url);
      }

      return respond({ error: 'Unauthenticated' }, 401);
    }

    if (shouldRedirect) {
      return NextResponse.redirect(buildReturnUrl(req, next));
    }

    return respond({
      ...resolved.bootstrap,
      identity: resolved.identity,
    }, 200);
  } catch (error) {
    console.error('Auth bootstrap error:', error);

    if (req.nextUrl.searchParams.get('redirect') === '1') {
      const url = new URL('/login', req.url);
      url.searchParams.set('google', 'error');
      url.searchParams.set('message', 'Could not finish signing you in.');
      const next = req.nextUrl.searchParams.get('next');
      if (next && next !== '/') {
        url.searchParams.set('redirectTo', next);
      }
      return NextResponse.redirect(url);
    }

    return respond({ error: 'Could not load the authenticated session.' }, 500);
  }
}
