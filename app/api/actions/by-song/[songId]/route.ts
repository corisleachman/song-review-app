import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(
  req: NextRequest,
  { params }: { params: { songId: string } }
) {
  try {
    const songId = params.songId;
    const versionId = req.nextUrl.searchParams.get('versionId');

    // Fetch actions with the full join path:
    // actions → comments → comment_threads (to get song_version_id + timestamp)
    const { data, error } = await supabaseServer
      .from('actions')
      .select(`
        id,
        song_id,
        comment_id,
        description,
        suggested_by,
        status,
        created_at,
        comments(
          id,
          body,
          author,
          thread_id,
          comment_threads(id, timestamp_seconds, song_version_id)
        )
      `)
      .eq('song_id', songId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Flatten timestamp and version info, filter by version in JS
    const enriched = (data || []).map((a: any) => ({
      ...a,
      timestamp_seconds: a.comments?.comment_threads?.timestamp_seconds ?? null,
      song_version_id: a.comments?.comment_threads?.song_version_id ?? null,
    }));

    const filtered = versionId
      ? enriched.filter((a: any) => a.song_version_id === versionId)
      : enriched;

    return NextResponse.json({ actions: filtered }, { status: 200 });
  } catch (error) {
    console.error('Error fetching actions:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
