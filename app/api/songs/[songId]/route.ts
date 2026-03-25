import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { songId: string } }
) {
  try {
    const { songId } = params;
    const { title } = await req.json();

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('songs')
      .update({ title: title.trim() })
      .eq('id', songId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ song: data }, { status: 200 });
  } catch (error) {
    console.error('Error updating song:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
