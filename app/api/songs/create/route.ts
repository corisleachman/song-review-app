import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
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
