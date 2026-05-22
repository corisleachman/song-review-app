import { NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { getOrCreateReferralCode } from '@/lib/referrals';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const resolved = await resolveCanonicalIdentity();
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { identity } = resolved;
    const code = await getOrCreateReferralCode(
      identity.userId,
      identity.workspaceId ?? null,
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const referralUrl = `${baseUrl}/r/${code.code}`;

    return NextResponse.json({ code: code.code, url: referralUrl });
  } catch (err) {
    console.error('[referrals/code] Error:', err);
    return NextResponse.json({ error: 'Could not load referral code.' }, { status: 500 });
  }
}
