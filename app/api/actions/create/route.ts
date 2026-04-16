import { NextRequest, NextResponse } from 'next/server';
import { isActionStatusInput, normalizeActionStatus } from '@/lib/actionWorkflow';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';
import { listWorkspaceMembers } from '@/lib/workspaceMembers';

export async function POST(req: NextRequest) {
  try {
    const { commentId, songId, description, timestampSeconds, status, assignedToUserId } = await req.json();
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to create an action.' }, { status: 401 });
    }

    if (!commentId || !songId || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (status != null && !isActionStatusInput(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const nextStatus = normalizeActionStatus(status);
    const nextAssignedToUserId = typeof assignedToUserId === 'string' && assignedToUserId.trim()
      ? assignedToUserId.trim()
      : null;

    const { data: song, error: songError } = await supabaseServer
      .from('songs')
      .select('id, account_id')
      .eq('id', songId)
      .single();

    if (songError) throw songError;

    if (!song?.account_id || song.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this song.' }, { status: 403 });
    }

    if (nextAssignedToUserId) {
      const members = await listWorkspaceMembers(song.account_id);
      const isValidAssignee = members.some(member => member.userId === nextAssignedToUserId);

      if (!isValidAssignee) {
        return NextResponse.json({ error: 'Assignee must be a member of this workspace.' }, { status: 400 });
      }
    }

    // Create action
    const { data, error } = await supabaseServer
      .from('actions')
      .insert([
        {
          comment_id: commentId,
          song_id: songId,
          description,
          suggested_by: resolved.identity.authorName,
          status: nextStatus,
          account_id: song.account_id,
          created_by_user_id: resolved.identity.userId,
          assigned_to_user_id: nextAssignedToUserId,
          resolved_in_version_id: null,
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
