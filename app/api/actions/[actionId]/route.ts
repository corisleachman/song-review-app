import { NextRequest, NextResponse } from 'next/server';
import { isActionStatusInput, normalizeActionStatus } from '@/lib/actionWorkflow';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';
import { listWorkspaceMembers } from '@/lib/workspaceMembers';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { actionId: string } }
) {
  try {
    const actionId = params.actionId;
    const body = await req.json();
    const { status, description } = body;
    const hasAssignedToUserId = Object.prototype.hasOwnProperty.call(body, 'assignedToUserId');
    const hasResolvedInVersionId = Object.prototype.hasOwnProperty.call(body, 'resolvedInVersionId');
    const assignedToUserId = hasAssignedToUserId
      ? (typeof body.assignedToUserId === 'string' && body.assignedToUserId.trim()
        ? body.assignedToUserId.trim()
        : null)
      : undefined;
    const resolvedInVersionId = hasResolvedInVersionId
      ? (typeof body.resolvedInVersionId === 'string' && body.resolvedInVersionId.trim()
        ? body.resolvedInVersionId.trim()
        : null)
      : undefined;
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to update an action.' }, { status: 401 });
    }

    if (status == null && !description?.trim() && !hasAssignedToUserId && !hasResolvedInVersionId) {
      return NextResponse.json(
        { error: 'Nothing to update' },
        { status: 400 }
      );
    }

    if (status != null && !isActionStatusInput(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const { data: action, error: actionError } = await supabaseServer
      .from('actions')
      .select('id, song_id, account_id')
      .eq('id', actionId)
      .single();

    if (actionError) throw actionError;

    let workspaceId = action?.account_id ?? null;

    if (!workspaceId && action?.song_id) {
      const { data: song, error: songError } = await supabaseServer
        .from('songs')
        .select('account_id')
        .eq('id', action.song_id)
        .single();

      if (songError) throw songError;
      workspaceId = song?.account_id ?? null;
    }

    if (!workspaceId || workspaceId !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this action.' }, { status: 403 });
    }

    if (assignedToUserId) {
      const members = await listWorkspaceMembers(workspaceId);
      const isValidAssignee = members.some(member => member.userId === assignedToUserId);

      if (!isValidAssignee) {
        return NextResponse.json({ error: 'Assignee must be a member of this workspace.' }, { status: 400 });
      }
    }

    if (resolvedInVersionId) {
      const { data: version, error: versionError } = await supabaseServer
        .from('song_versions')
        .select('id, song_id')
        .eq('id', resolvedInVersionId)
        .single();

      if (versionError) throw versionError;

      if (!version || version.song_id !== action.song_id) {
        return NextResponse.json(
          { error: 'Resolved version must belong to the same song.' },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    };

    const normalizedStatus = status != null ? normalizeActionStatus(status) : null;

    if (normalizedStatus) {
      updates.status = normalizedStatus;
      if (normalizedStatus !== 'done' && !hasResolvedInVersionId) {
        updates.resolved_in_version_id = null;
      }
    }
    if (description?.trim()) updates.description = description.trim();
    if (hasAssignedToUserId) updates.assigned_to_user_id = assignedToUserId;
    if (hasResolvedInVersionId) {
      updates.resolved_in_version_id = resolvedInVersionId ?? null;
      if (resolvedInVersionId) {
        updates.status = 'done';
      }
    }

    const { data, error } = await supabaseServer
      .from('actions')
      .update(updates)
      .eq('id', actionId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ action: data }, { status: 200 });
  } catch (error) {
    console.error('Error updating action:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
