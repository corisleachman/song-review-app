import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { normalizeActionStatus } from '@/lib/actionWorkflow';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';
import { listWorkspaceMembers } from '@/lib/workspaceMembers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const maybeMessage = 'message' in error && typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : null;
    if (maybeMessage) return maybeMessage;
  }

  return 'Could not load actions.';
}

export async function GET(req: NextRequest) {
  try {
    noStore();
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { data: songs, error: songsError } = await supabaseServer
      .from('songs')
      .select('id, title')
      .eq('account_id', resolved.identity.workspaceId);

    if (songsError) throw songsError;

    const songIds = (songs || []).map(song => song.id);

    if (songIds.length === 0) {
      return NextResponse.json(
        { actions: [] },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        }
      );
    }

    const [actionsResult, members] = await Promise.all([
      supabaseServer
        .from('actions')
        .select('id, description, status, suggested_by, timestamp_seconds, song_id, comment_id, created_at, updated_at, assigned_to_user_id, resolved_in_version_id')
        .in('song_id', songIds)
        .order('created_at', { ascending: false }),
      listWorkspaceMembers(resolved.identity.workspaceId),
    ]);

    if (actionsResult.error) throw actionsResult.error;

    const songsById = new Map((songs || []).map(song => [song.id, song.title]));
    const membersByUserId = new Map(members.map(member => [member.userId, member]));
    const versionIds = Array.from(new Set((actionsResult.data || []).map(action => action.resolved_in_version_id).filter(Boolean)));
    const { data: versions, error: versionsError } = versionIds.length
      ? await supabaseServer
          .from('song_versions')
          .select('id, version_number, label')
          .in('id', versionIds)
      : { data: [], error: null };

    if (versionsError) throw versionsError;

    const versionsById = new Map((versions || []).map(version => [
      version.id,
      version.label?.trim()
        ? `Version ${version.version_number} (${version.label})`
        : `Version ${version.version_number}`,
    ]));

    const enriched = (actionsResult.data || []).map(action => ({
      ...action,
      status: normalizeActionStatus(action.status),
      songTitle: songsById.get(action.song_id) ?? 'Unknown',
      assigned_to_name: action.assigned_to_user_id
        ? membersByUserId.get(action.assigned_to_user_id)?.displayName ?? null
        : null,
      resolved_in_version_label: action.resolved_in_version_id
        ? versionsById.get(action.resolved_in_version_id) ?? null
        : null,
    }));

    return NextResponse.json(
      { actions: enriched },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching actions:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
