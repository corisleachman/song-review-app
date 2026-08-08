import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getCurrentAuthenticatedUser } from '@/lib/currentUser';
import { isAdminEmail } from '@/lib/isAdmin';

export const dynamic = 'force-dynamic';

const FOUNDING_TESTER_CAP = 100;
const VALID_STATUSES = ['new', 'approved', 'rejected', 'spam'];

export async function GET(req: Request) {
  try {
    const user = await getCurrentAuthenticatedUser();
    if (!isAdminEmail(user?.email)) {
      return NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = supabaseServer
      .from('beta_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (status && VALID_STATUSES.includes(status)) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[admin/feedback] list error:', error);
      return NextResponse.json({ ok: false, error: 'Could not load feedback.' }, { status: 500 });
    }

    const { count: eligibleCount } = await supabaseServer
      .from('beta_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('reward_eligible', true);

    return NextResponse.json({
      ok: true,
      items: data ?? [],
      eligibleCount: eligibleCount ?? 0,
      cap: FOUNDING_TESTER_CAP,
    });
  } catch (err) {
    console.error('[admin/feedback] Error:', err);
    return NextResponse.json({ ok: false, error: 'Something went wrong.' }, { status: 500 });
  }
}
