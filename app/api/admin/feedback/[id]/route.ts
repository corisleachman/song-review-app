import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getCurrentAuthenticatedUser } from '@/lib/currentUser';
import { isAdminEmail } from '@/lib/isAdmin';

export const dynamic = 'force-dynamic';

const FOUNDING_TESTER_CAP = 100;
const ACTIONS = ['approve', 'reject', 'spam'] as const;
type Action = (typeof ACTIONS)[number];

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const user = await getCurrentAuthenticatedUser();
    if (!isAdminEmail(user?.email)) {
      return NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as { action?: string } | null;
    const action = body?.action as Action | undefined;
    if (!action || !ACTIONS.includes(action)) {
      return NextResponse.json({ ok: false, error: 'Invalid action.' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const reviewedBy = user?.email ?? 'admin';

    if (action === 'reject' || action === 'spam') {
      const { error } = await supabaseServer
        .from('beta_feedback')
        .update({ status: action === 'spam' ? 'spam' : 'rejected', reviewed_at: nowIso, reviewed_by: reviewedBy })
        .eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true, status: action === 'spam' ? 'spam' : 'rejected' });
    }

    // approve — grant reward eligibility only while under the cap
    const { count: eligibleCount } = await supabaseServer
      .from('beta_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('reward_eligible', true);

    const { data: existing } = await supabaseServer
      .from('beta_feedback')
      .select('reward_eligible')
      .eq('id', id)
      .single();

    const alreadyEligible = existing?.reward_eligible === true;
    const underCap = (eligibleCount ?? 0) < FOUNDING_TESTER_CAP;
    const grantEligible = alreadyEligible || underCap;

    const { error } = await supabaseServer
      .from('beta_feedback')
      .update({ status: 'approved', reviewed_at: nowIso, reviewed_by: reviewedBy, reward_eligible: grantEligible })
      .eq('id', id);
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      status: 'approved',
      reward_eligible: grantEligible,
      capReached: !grantEligible,
    });
  } catch (err) {
    console.error('[admin/feedback/:id] Error:', err);
    return NextResponse.json({ ok: false, error: 'Something went wrong.' }, { status: 500 });
  }
}
