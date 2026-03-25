import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function PATCH(req: NextRequest) {
  try {
    const { orderedIds } = await req.json(); // array of task IDs in new order
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds must be an array' }, { status: 400 });
    }

    await Promise.all(
      orderedIds.map((id: string, index: number) =>
        supabaseServer.from('song_tasks').update({ sort_order: index }).eq('id', id)
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error reordering tasks:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
