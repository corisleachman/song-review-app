import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function PATCH(req: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const body = await req.json();
    const allowed: any = {};
    if ('status' in body) allowed.status = body.status;
    if ('description' in body) allowed.description = body.description;

    const { data, error } = await supabaseServer
      .from('song_tasks')
      .update(allowed)
      .eq('id', params.taskId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ task: data });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const { error } = await supabaseServer
      .from('song_tasks')
      .delete()
      .eq('id', params.taskId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
