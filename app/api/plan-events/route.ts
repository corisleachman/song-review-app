import { NextRequest, NextResponse } from 'next/server';
import { logPlanEvent } from '@/lib/planEvents';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const event = payload?.event;
    const type = payload?.type;

    if (
      (event !== 'plan_limit_hit' && event !== 'upgrade_clicked')
      || (type !== 'collaborators' && type !== 'songs')
    ) {
      return NextResponse.json({ error: 'Invalid event payload.' }, { status: 400 });
    }

    logPlanEvent({ event, type });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Error logging plan event:', error);
    return NextResponse.json({ error: 'Could not log event.' }, { status: 500 });
  }
}
