import { readCollaborationInput } from '@/lib/collaborationInput';
import { safeErrorDetails } from '@/lib/safeErrorDetails';
import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

async function loadTaskWorkspace(taskId: string) {
  const { data: task, error: taskError } = await supabaseServer
    .from('song_tasks')
    .select('id, song_id')
    .eq('id', taskId)
    .maybeSingle();

  if (taskError) throw taskError;

  if (!task) {
    return { task: null, workspaceId: null };
  }

  const { data: song, error: songError } = await supabaseServer
    .from('songs')
    .select('id, account_id')
    .eq('id', task.song_id)
    .maybeSingle();

  if (songError) throw songError;

  return { task, workspaceId: song?.account_id ?? null };
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ taskId: string }> }) {
  const params = await props.params;
  try {
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to update a task.' }, { status: 401 });
    }

    const body = await readCollaborationInput(req);
    if (!body) return NextResponse.json({ error: 'Invalid task details.' }, { status: 400 });
    if (('status' in body && body.status !== 'pending' && body.status !== 'completed')
      || ('description' in body && (typeof body.description !== 'string' || !body.description.trim()))) {
      return NextResponse.json({ error: 'Invalid task details.' }, { status: 400 });
    }

    const { task, workspaceId } = await loadTaskWorkspace(params.taskId);

    if (!task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    if (!workspaceId || workspaceId !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this task.' }, { status: 403 });
    }

    const allowed: Record<string, string> = {};
    if (body.status === 'pending' || body.status === 'completed') allowed.status = body.status;
    if (typeof body.description === 'string') allowed.description = body.description.trim();

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('song_tasks')
      .update(allowed)
      .eq('id', params.taskId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ task: data });
  } catch (error) {
    console.error('Error updating task:', safeErrorDetails(error));
    return NextResponse.json({ error: "Could not update task." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ taskId: string }> }) {
  const params = await props.params;
  try {
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to delete a task.' }, { status: 401 });
    }

    const { task, workspaceId } = await loadTaskWorkspace(params.taskId);

    if (!task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    if (!workspaceId || workspaceId !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this task.' }, { status: 403 });
    }

    const { error } = await supabaseServer
      .from('song_tasks')
      .delete()
      .eq('id', params.taskId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting task:', safeErrorDetails(error));
    return NextResponse.json({ error: "Could not delete task." }, { status: 500 });
  }
}
