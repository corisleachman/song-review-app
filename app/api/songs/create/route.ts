import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { createPlanLimitPayload, getSongLimit, isMissingPlanColumnError, normalizeAccountPlan } from '@/lib/plans';
import { logPlanEvent } from '@/lib/planEvents';
import { DEFAULT_SONG_STATUS } from '@/lib/songWorkflow';
import { supabaseServer } from '@/lib/supabaseServer';

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const maybeMessage = 'message' in error && typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : null;
    if (maybeMessage) return maybeMessage;
  }

  return 'Could not create song.';
}

export async function POST(req: NextRequest) {
  try {
    const { title } = await req.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to create a song.' }, { status: 401 });
    }

    const planResult = await supabaseServer
      .from('accounts')
      .select('plan')
      .eq('id', resolved.identity.workspaceId)
      .single();

    const workspacePlan = !planResult.error
      ? normalizeAccountPlan(planResult.data?.plan)
      : isMissingPlanColumnError(planResult.error)
        ? 'free'
        : (() => { throw planResult.error; })();

    const songLimit = getSongLimit(workspacePlan);

    if (songLimit !== null) {
      const songsCountResult = await supabaseServer
        .from('songs')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', resolved.identity.workspaceId);

      if (songsCountResult.error) throw songsCountResult.error;

      const currentSongCount = songsCountResult.count ?? 0;

      if (currentSongCount >= songLimit) {
        logPlanEvent({
          event: 'plan_limit_hit',
          type: 'songs',
          workspaceId: resolved.identity.workspaceId,
          userId: resolved.identity.userId,
        });

        return NextResponse.json(createPlanLimitPayload('songs'), { status: 400 });
      }
    }

    const { data, error } = await supabaseServer
      .from('songs')
      .insert([{
        title: title.trim(),
        account_id: resolved.identity.workspaceId,
        status: DEFAULT_SONG_STATUS,
      }])
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ songId: data.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating song:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
