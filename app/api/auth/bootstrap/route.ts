import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildReturnUrl(request: NextRequest, next: string | null) {
  const url = new URL('/', request.url);
  url.searchParams.set('google', 'success');

  if (next && next !== '/') {
    url.searchParams.set('redirectTo', next);
  }

  return url;
}

export async function GET(req: NextRequest) {
  try {
    noStore();
    const next = req.nextUrl.searchParams.get('next');
    const shouldRedirect = req.nextUrl.searchParams.get('redirect') === '1';
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      if (shouldRedirect) {
        const url = new URL('/', req.url);
        url.searchParams.set('google', 'error');
        url.searchParams.set('message', 'No authenticated user found during bootstrap.');
        if (next && next !== '/') {
          url.searchParams.set('redirectTo', next);
        }
        return NextResponse.redirect(url);
      }

      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    if (shouldRedirect) {
      return NextResponse.redirect(buildReturnUrl(req, next));
    }

    return NextResponse.json({
      ...resolved.bootstrap,
      identity: resolved.identity,
    });
  } catch (error) {
    console.error('Auth bootstrap error:', error);

    if (req.nextUrl.searchParams.get('redirect') === '1') {
      const url = new URL('/', req.url);
      url.searchParams.set('google', 'error');
      url.searchParams.set('message', 'Could not finish signing you in.');
      const next = req.nextUrl.searchParams.get('next');
      if (next && next !== '/') {
        url.searchParams.set('redirectTo', next);
      }
      return NextResponse.redirect(url);
    }

    return NextResponse.json(
      { error: 'Could not load the authenticated session.' },
      { status: 500 }
    );
  }
}
