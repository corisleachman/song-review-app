import { readCollaborationInput } from '@/lib/collaborationInput';
import { safeErrorDetails } from '@/lib/safeErrorDetails';
import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';
import { DEFAULT_SONG_STATUS } from '@/lib/songWorkflow';

export async function POST(req: NextRequest) {
  try {
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to create a song.' }, { status: 401 });
    }

    const body = await readCollaborationInput(req);
    if (!body) return NextResponse.json({ error: 'Invalid song details.' }, { status: 400 });
    const { title } = body;
    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
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
    console.error('Error creating song:', safeErrorDetails(error));
    return NextResponse.json({ error: 'Could not create song.' }, { status: 500 });
  }
}
