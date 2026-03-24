import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { songId: string } }
) {
  try {
    const songId = params.songId;

    if (!songId) {
      return NextResponse.json(
        { error: 'Song ID is required' },
        { status: 400 }
      );
    }

    // Delete all versions for this song
    const { error: versionsError } = await supabaseServer
      .from('song_versions')
      .delete()
      .eq('song_id', songId);

    if (versionsError) {
      console.error('Error deleting song versions:', versionsError);
      throw versionsError;
    }

    // Delete all comment threads for this song's versions
    const { data: versions } = await supabaseServer
      .from('song_versions')
      .select('id')
      .eq('song_id', songId);

    if (versions && versions.length > 0) {
      const versionIds = versions.map(v => v.id);
      const { error: threadsError } = await supabaseServer
        .from('comment_threads')
        .delete()
        .in('song_version_id', versionIds);

      if (threadsError) {
        console.error('Error deleting comment threads:', threadsError);
        throw threadsError;
      }
    }

    // Delete all actions for this song
    const { error: actionsError } = await supabaseServer
      .from('actions')
      .delete()
      .eq('song_id', songId);

    if (actionsError) {
      console.error('Error deleting actions:', actionsError);
      throw actionsError;
    }

    // Delete the song itself
    const { error: songError } = await supabaseServer
      .from('songs')
      .delete()
      .eq('id', songId);

    if (songError) {
      console.error('Error deleting song:', songError);
      throw songError;
    }

    console.log('Song deleted successfully:', songId);
    return NextResponse.json(
      { message: 'Song deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting song:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: errorMessage || 'Failed to delete song' },
      { status: 500 }
    );
  }
}
