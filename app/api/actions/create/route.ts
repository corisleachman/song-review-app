import { readCollaborationInput } from '@/lib/collaborationInput';
import { safeErrorDetails } from '@/lib/safeErrorDetails';
import { NextRequest, NextResponse } from 'next/server';
import { isActionStatusInput, normalizeActionStatus } from '@/lib/actionWorkflow';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';
import { listWorkspaceMembers } from '@/lib/workspaceMembers';

export async function POST(req: NextRequest) {
  try {
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to create an action.' }, { status: 401 });
    }

    const payload = await readCollaborationInput(req);
    if (!payload) return NextResponse.json({ error: 'Invalid action details.' }, { status: 400 });
    const { commentId, songId, description, timestampSeconds, status, assignedToUserId } = payload;
    if (typeof commentId !== 'string' || !commentId.trim()
      || typeof songId !== 'string' || !songId.trim()
      || typeof description !== 'string' || !description.trim()) {
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

    if (timestampSeconds != null && (typeof timestampSeconds !== 'number' || !Number.isFinite(timestampSeconds)
      || timestampSeconds < 0 || Math.round(timestampSeconds) > 2147483647)) {
      return NextResponse.json({ error: 'Choose a valid position in the track.' }, { status: 400 });
    }
    if (assignedToUserId != null && typeof assignedToUserId !== 'string') {
      return NextResponse.json({ error: 'Invalid assignee.' }, { status: 400 });
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

    const { data: comment, error: commentError } = await supabaseServer
      .from('comments')
      .select('id, thread_id')
      .eq('id', commentId)
      .maybeSingle();

    if (commentError) throw commentError;

    const { data: thread, error: threadError } = comment?.thread_id
      ? await supabaseServer
          .from('comment_threads')
          .select('id, song_version_id')
          .eq('id', comment.thread_id)
          .maybeSingle()
      : { data: null, error: null };

    if (threadError) throw threadError;

    const { data: sourceVersion, error: versionError } = thread?.song_version_id
      ? await supabaseServer
          .from('song_versions')
          .select('id, song_id')
          .eq('id', thread.song_version_id)
          .maybeSingle()
      : { data: null, error: null };

    if (versionError) throw versionError;

    if (!comment || !thread || !sourceVersion || sourceVersion.song_id !== songId) {
      return NextResponse.json(
        { error: 'The selected comment does not belong to this song.' },
        { status: 400 }
      );
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
          description: description.trim(),
          suggested_by: resolved.identity.authorName,
          status: nextStatus,
          account_id: song.account_id,
          created_by_user_id: resolved.identity.userId,
          assigned_to_user_id: nextAssignedToUserId,
          resolved_in_version_id: null,
          ...(timestampSeconds != null && { timestamp_seconds: Math.round(timestampSeconds as number) }),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ action: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating action:', safeErrorDetails(error));
    return NextResponse.json(
      { error: 'Could not create the action.' },
      { status: 500 }
    );
  }
}
