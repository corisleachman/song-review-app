import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(
  req: NextRequest,
  { params }: { params: { songId: string } }
) {
  try {
    const songId = params.songId;
    const versionId = req.nextUrl.searchParams.get('versionId');

    let query = supabaseServer
      .from('actions')
      .select(`
        id,
        song_id,
        comment_id,
        description,
        suggested_by,
        status,
        created_at,
        comments(id, body, author, thread_id),
        comment_threads(id, timestamp_seconds, song_version_id)
      `)
      .eq('song_id', songId)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // Filter by version in JS — Supabase JS client can't filter on joined columns
    const filtered = versionId
      ? (data || []).filter((a: any) =>
          a.comment_threads?.song_version_id === versionId
        )
      : (data || []);

    return NextResponse.json({ actions: filtered }, { status: 200 });
  } catch (error) {
    console.error('Error fetching actions:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
