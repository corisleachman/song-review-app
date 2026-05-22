import { type NextRequest, NextResponse } from 'next/server';
import { getReferralCodeByCode, REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE } from '@/lib/referrals';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } },
) {
  const { code } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  // Validate the code exists and is active
  const referralCode = await getReferralCodeByCode(code).catch(() => null);

  const destination = referralCode
    ? `${appUrl}/?ref=${code}`   // Valid — go to signup with ref in URL too (belt + braces)
    : `${appUrl}/`;              // Invalid — redirect silently, no error shown

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
