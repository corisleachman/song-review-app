import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    let { data: songs, error: songsError } = await supabaseServer
      .from('songs')
      .select('id, title, image_url, created_at')
      .order('created_at', { ascending: false });

    const isMissingImageUrlColumn =
      songsError?.code === '42703' ||
      songsError?.message?.toLowerCase().includes('image_url');

    if (songsError && isMissingImageUrlColumn) {
      const fallback = await supabaseServer
        .from('songs')
        .select('id, title, created_at')
        .order('created_at', { ascending: false });

      songs = (fallback.data ?? []).map(song => ({ ...song, image_url: null }));
      songsError = fallback.error;
    }

    if (songsError) {
      console.error('Dashboard API songs query failed:', songsError);
      return NextResponse.json({ error: 'Failed to load songs' }, { status: 500 });
    }

    const { data: versions, error: versionsError } = await supabaseServer
      .from('song_versions')
      .select('id, song_id, version_number, label, created_at')
      .order('version_number', { ascending: false });

    if (versionsError) {
      console.error('Dashboard API versions query failed:', versionsError);
    }

    const { data: threads, error: threadsError } = await supabaseServer
      .from('comment_threads')
      .select('id, song_version_id, created_at, updated_at');

    if (threadsError) {
      console.error('Dashboard API threads query failed:', threadsError);
    }

    const { data: comments, error: commentsError } = await supabaseServer
      .from('comments')
      .select('id, thread_id');

    if (commentsError) {
      console.error('Dashboard API comments query failed:', commentsError);
    }

    const { data: actionsActivity, error: actionsError } = await supabaseServer
      .from('actions')
      .select('song_id, created_at, updated_at');

    if (actionsError) {
      console.error('Dashboard API actions query failed:', actionsError);
    }

    return NextResponse.json({
      songs: songs ?? [],
      versions: versions ?? [],
      threads: threads ?? [],
      comments: comments ?? [],
      actionsActivity: actionsActivity ?? [],
    });
  } catch (error) {
    console.error('Dashboard API unexpected error:', error);
    return NextResponse.json({ error: 'Unexpected dashboard data error' }, { status: 500 });
  }
}

