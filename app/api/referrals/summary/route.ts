import { NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { getOrCreateReferralCode, REFERRAL_REWARD_CAP } from '@/lib/referrals';
import { supabaseServer } from '@/lib/supabaseServer';

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

    // Fetch all referrals for this user
    const { data: referrals } = await supabaseServer
      .from('referrals')
      .select(
        'id, referred_user_id, status, credit_amount_pence, converted_at, rewarded_at, created_at'
      )
      .eq('referred_by_user_id', identity.userId)
      .order('created_at', { ascending: false });

    const rows = referrals ?? [];

    // Aggregate stats
    const totalCreditPence = rows
      .filter(r => r.status === 'rewarded')
      .reduce((sum: number, r) => sum + (r.credit_amount_pence ?? 0), 0);

    const counts = {
      pending:    rows.filter(r => r.status === 'pending').length,
      converted:  rows.filter(r => r.status === 'converted').length,
      rewarded:   rows.filter(r => r.status === 'rewarded').length,
      ineligible: rows.filter(r => r.status === 'ineligible').length,
    };

    // Fetch masked referred user emails for display
    // We join to profiles to get display names — emails are not stored on referrals
    const referredUserIds = rows.map(r => r.referred_user_id as string);
    let profileMap: Record<string, string> = {};

    if (referredUserIds.length > 0) {
      const { data: profiles } = await supabaseServer
        .from('profiles')
        .select('id, display_name, email')
        .in('id', referredUserIds);

      for (const p of profiles ?? []) {
        const email = (p.email as string | null) ?? '';
        const name  = (p.display_name as string | null) ?? '';
        // Mask: show first 2 chars + *** + @domain
        const masked = email.includes('@')
          ? email.slice(0, 2) + '***@' + email.split('@')[1]
          : name.slice(0, 2) + '***';
        profileMap[p.id as string] = masked;
      }
    }

    const referralList = rows.map(r => ({
      id:            r.id,
      maskedEmail:   profileMap[r.referred_user_id as string] ?? '***',
      status:        r.status,
      convertedAt:   r.converted_at,
      rewardedAt:    r.rewarded_at,
      creditPence:   r.credit_amount_pence,
      createdAt:     r.created_at,
    }));

    return NextResponse.json({
      code:             code.code,
      url:              referralUrl,
      rewardCap:        REFERRAL_REWARD_CAP,
      rewardsEarned:    counts.rewarded,
      rewardsRemaining: Math.max(0, REFERRAL_REWARD_CAP - counts.rewarded),
      totalCreditPence,
      counts,
      referrals:        referralList,
    });
  } catch (err) {
    console.error('[referrals/summary] Error:', err);
    return NextResponse.json({ error: 'Could not load referral summary.' }, { status: 500 });
  }
}
