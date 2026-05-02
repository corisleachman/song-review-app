import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

export async function PATCH(req: NextRequest) {
  try {
    const { orderedIds } = await req.json(); // array of task IDs in new order
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to reorder tasks.' }, { status: 401 });
    }

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds must be an array' }, { status: 400 });
    }

    const uniqueOrderedIds = Array.from(new Set(orderedIds.filter((id): id is string => typeof id === 'string' && Boolean(id))));

    if (uniqueOrderedIds.length !== orderedIds.length) {
      return NextResponse.json({ error: 'orderedIds must contain unique task IDs' }, { status: 400 });
    }

    if (uniqueOrderedIds.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { data: tasks, error: tasksError } = await supabaseServer
      .from('song_tasks')
      .select('id, song_id')
      .in('id', uniqueOrderedIds);

    if (tasksError) throw tasksError;

    if ((tasks ?? []).length !== uniqueOrderedIds.length) {
      return NextResponse.json({ error: 'One or more tasks were not found.' }, { status: 404 });
    }

    const songIds = Array.from(new Set((tasks ?? []).map(task => task.song_id).filter(Boolean)));

    const { data: songs, error: songsError } = await supabaseServer
      .from('songs')
      .select('id, account_id')
      .in('id', songIds);

    if (songsError) throw songsError;

    const songsById = new Map((songs ?? []).map(song => [song.id, song]));
    const hasCrossWorkspaceTask = (tasks ?? []).some(task => {
      const song = songsById.get(task.song_id);
      return !song?.account_id || song.account_id !== resolved.identity.workspaceId;
    });

    if (hasCrossWorkspaceTask) {
      return NextResponse.json({ error: 'You do not have access to one or more tasks.' }, { status: 403 });
    }

    await Promise.all(
      uniqueOrderedIds.map((id: string, index: number) =>
        supabaseServer.from('song_tasks').update({ sort_order: index }).eq('id', id)
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error reordering tasks:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
