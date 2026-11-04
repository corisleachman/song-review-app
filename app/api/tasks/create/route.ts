import { readCollaborationInput } from '@/lib/collaborationInput';
import { safeErrorDetails } from '@/lib/safeErrorDetails';
import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to create a task.' }, { status: 401 });
    }

    const payload = await readCollaborationInput(req);
    if (!payload) return NextResponse.json({ error: 'Invalid task details.' }, { status: 400 });
    const { songId, description } = payload;
    if (typeof songId !== 'string' || !songId.trim() || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Missing songId or description' }, { status: 400 });
    }

    const { data: song, error: songError } = await supabaseServer
      .from('songs')
      .select('id, account_id')
      .eq('id', songId)
      .maybeSingle();

    if (songError) throw songError;

    if (!song) {
      return NextResponse.json({ error: 'Song not found.' }, { status: 404 });
    }

    if (!song.account_id || song.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this song.' }, { status: 403 });
    }

    // Get current max sort_order for this song
    const { data: existing } = await supabaseServer
      .from('song_tasks')
      .select('sort_order')
      .eq('song_id', songId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { data, error } = await supabaseServer
      .from('song_tasks')
      .insert({ song_id: songId, description: description.trim(), status: 'pending', sort_order: nextOrder })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ task: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', safeErrorDetails(error));
    return NextResponse.json({ error: "Could not create task." }, { status: 500 });
  }
}
