import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { songId, description } = await req.json();
    if (!songId || !description?.trim()) {
      return NextResponse.json({ error: 'Missing songId or description' }, { status: 400 });
    }

    // Get current max sort_order for this song
    const { data: existing } = await supabaseServer
      .from('song_tasks')
      .select('sort_order')
      .eq('song_id', songId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { data, error } = await supabaseServer
      .from('song_tasks')
      .insert({ song_id: songId, description: description.trim(), status: 'pending', sort_order: nextOrder })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ task: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
