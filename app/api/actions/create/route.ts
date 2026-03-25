import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { commentId, songId, description, suggestedBy, timestampSeconds } = await req.json();

    if (!commentId || !songId || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create action
    const { data, error } = await supabaseServer
      .from('actions')
      .insert([
        {
          comment_id: commentId,
          song_id: songId,
          description,
          suggested_by: suggestedBy,
          status: 'pending',
          ...(timestampSeconds != null && { timestamp_seconds: Math.round(timestampSeconds) }),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ action: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating action:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
