import { type NextRequest, NextResponse } from 'next/server';
import { getReferralCodeByCode, REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE } from '@/lib/referrals';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const { code } = params;

  // Validate the code exists and is active
  const referralCode = await getReferralCodeByCode(code).catch(() => null);

  const destination = new URL('/', request.nextUrl.origin);
  if (referralCode) {
    destination.searchParams.set('ref', code);
  }

  const response = NextResponse.redirect(destination, { status: 302 });

  if (referralCode) {
    response.cookies.set(REFERRAL_COOKIE_NAME, code, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   REFERRAL_COOKIE_MAX_AGE,
      path:     '/',
    });
  }

  return response;
}
