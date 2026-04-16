import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { isSongStatus } from '@/lib/songWorkflow';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  return 'Song request failed.';
}

export async function GET(
  req: NextRequest,
  { params }: { params: { songId: string } }
) {
  try {
    const { songId } = params;

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('songs')
      .select('id, title, image_url, status')
      .eq('id', songId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    return NextResponse.json(
      { song: data },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching song:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { songId: string } }
) {
  try {
    const { songId } = params;
    const { title, status } = await req.json();
    const resolved = await resolveCanonicalIdentity();

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }
    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to update a song.' }, { status: 401 });
    }

    if (!title?.trim() && !status) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    if (status && !isSongStatus(status)) {
      return NextResponse.json({ error: 'Invalid song status' }, { status: 400 });
    }

    const { data: song, error: songLookupError } = await supabaseServer
      .from('songs')
      .select('id, account_id')
      .eq('id', songId)
      .single();

    if (songLookupError) throw songLookupError;

    if (!song?.account_id || song.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this song.' }, { status: 403 });
    }

    const updates: Record<string, string> = {};
    if (title?.trim()) updates.title = title.trim();
    if (status) updates.status = status;

    const { data, error } = await supabaseServer
      .from('songs')
      .update(updates)
      .eq('id', songId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ song: data }, { status: 200 });
  } catch (error) {
    console.error('Error updating song:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { songId: string } }
) {
  try {
    const { songId } = params;

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    // Delete actions
    await supabaseServer.from('actions').delete().eq('song_id', songId);

    // Get version IDs to delete threads
    const { data: versions } = await supabaseServer
      .from('song_versions')
      .select('id')
      .eq('song_id', songId);

    if (versions && versions.length > 0) {
      const versionIds = versions.map((v: { id: string }) => v.id);
      // Get thread IDs
      const { data: threads } = await supabaseServer
        .from('comment_threads')
        .select('id')
        .in('song_version_id', versionIds);
      if (threads && threads.length > 0) {
        const threadIds = threads.map((t: { id: string }) => t.id);
        await supabaseServer.from('comments').delete().in('thread_id', threadIds);
      }
      await supabaseServer.from('comment_threads').delete().in('song_version_id', versionIds);
      await supabaseServer.from('song_versions').delete().eq('song_id', songId);
    }

    // Delete song
    const { error } = await supabaseServer.from('songs').delete().eq('id', songId);
    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting song:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
