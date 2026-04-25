import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';
import { type AccountPlan } from '@/lib/plans';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function requireOwner(identity: Awaited<ReturnType<typeof resolveCanonicalIdentity>>) {
  if (!identity) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  if (identity.identity.membershipRole !== 'owner') {
    return NextResponse.json(
      { error: 'Only the workspace owner can change the workspace plan.' },
      { status: 403 }
    );
  }

  return null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not update workspace plan.';
}

export async function PATCH(request: NextRequest) {
  try {
    noStore();

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Plan testing is not available in production.' },
        { status: 403 }
      );
    }

    const resolved = await resolveCanonicalIdentity();
    const ownerError = requireOwner(resolved);
    if (ownerError) return ownerError;

    const body = await request.json().catch(() => null);
    const plan = body?.plan;

    if (plan !== 'free' && plan !== 'paid') {
      return NextResponse.json(
        { error: 'A valid plan is required.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from('accounts')
      .update({ plan: plan as AccountPlan })
      .eq('id', resolved.identity.workspaceId);

    if (error) throw error;

    return NextResponse.json(
      {
        plan,
        testingOnly: true,
        message: `Workspace plan switched to ${plan} for local testing.`,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error updating workspace plan:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
