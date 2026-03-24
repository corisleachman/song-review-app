import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(
  req: NextRequest,
  { params }: { params: { songId: string } }
) {
  try {
    const songId = params.songId;

    const { data, error } = await supabaseServer
      .from('actions')
      .select(
        `
        id,
        song_id,
        comment_id,
        description,
        suggested_by,
        status,
        created_at,
        comments(id, body, author),
        comment_threads(id, timestamp_seconds)
      `
      )
      .eq('song_id', songId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ actions: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching actions:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
