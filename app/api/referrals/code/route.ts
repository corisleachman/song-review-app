import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { getOrCreateReferralCode } from '@/lib/referrals';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

    const referralUrl = new URL(
      `/r/${encodeURIComponent(code.code)}`,
      req.nextUrl.origin,
    ).toString();

    return NextResponse.json({ code: code.code, url: referralUrl });
  } catch (err) {
    console.error('[referrals/code] Error:', err);
    return NextResponse.json({ error: 'Could not load referral code.' }, { status: 500 });
  }
}
