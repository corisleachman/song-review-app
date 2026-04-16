import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { normalizeActionStatus } from '@/lib/actionWorkflow';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';
import { getVersionDisplayLabel } from '@/lib/versionDisplay';
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

export async function GET(
  req: NextRequest,
  { params }: { params: { songId: string } }
) {
  try {
    noStore();
    const songId = params.songId;
    const versionId = req.nextUrl.searchParams.get('versionId');
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { data: song, error: songError } = await supabaseServer
      .from('songs')
      .select('id, account_id')
      .eq('id', songId)
      .single();

    if (songError) throw songError;

    if (!song?.account_id || song.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this song.' }, { status: 403 });
    }

    const [{ data: actions, error: actionsError }, members] = await Promise.all([
      supabaseServer
      .from('actions')
      .select('id, song_id, comment_id, description, suggested_by, status, created_at, updated_at, assigned_to_user_id, resolved_in_version_id')
      .eq('song_id', songId)
      .order('created_at', { ascending: false }),
      listWorkspaceMembers(song.account_id),
    ]);

    if (actionsError) throw actionsError;

    const commentIds = Array.from(new Set((actions || []).map(action => action.comment_id).filter(Boolean)));

    const { data: comments, error: commentsError } = commentIds.length
      ? await supabaseServer
          .from('comments')
          .select('id, body, author, thread_id')
          .in('id', commentIds)
      : { data: [], error: null };

    if (commentsError) throw commentsError;

    const threadIds = Array.from(new Set((comments || []).map(comment => comment.thread_id).filter(Boolean)));

    const { data: threads, error: threadsError } = threadIds.length
      ? await supabaseServer
          .from('comment_threads')
          .select('id, timestamp_seconds, song_version_id')
          .in('id', threadIds)
      : { data: [], error: null };

    if (threadsError) throw threadsError;

    const commentsById = new Map((comments || []).map(comment => [comment.id, comment]));
    const threadsById = new Map((threads || []).map(thread => [thread.id, thread]));
    const membersByUserId = new Map(members.map(member => [member.userId, member]));
    const songVersionIds = Array.from(new Set((threads || []).map(thread => thread.song_version_id).filter(Boolean)));
    const resolvedVersionIds = Array.from(new Set((actions || []).map(action => action.resolved_in_version_id).filter(Boolean)));
    const versionLookupIds = Array.from(new Set([...songVersionIds, ...resolvedVersionIds]));

    const { data: versions, error: versionsError } = versionLookupIds.length
      ? await supabaseServer
          .from('song_versions')
          .select('id, version_number, label')
          .in('id', versionLookupIds)
      : { data: [], error: null };

    if (versionsError) throw versionsError;

    const versionsById = new Map((versions || []).map(version => [version.id, version]));

    const enriched = (actions || []).map((action: any) => {
      const comment = action.comment_id ? commentsById.get(action.comment_id) : null;
      const thread = comment?.thread_id ? threadsById.get(comment.thread_id) : null;
      const sourceVersion = thread?.song_version_id ? versionsById.get(thread.song_version_id) : null;
      const resolvedVersion = action.resolved_in_version_id ? versionsById.get(action.resolved_in_version_id) : null;

      return {
        ...action,
        status: normalizeActionStatus(action.status),
        comments: comment
          ? {
              id: comment.id,
              body: comment.body,
              author: comment.author,
              thread_id: comment.thread_id,
            }
          : null,
        timestamp_seconds: thread?.timestamp_seconds ?? null,
        song_version_id: thread?.song_version_id ?? null,
        song_version_label: sourceVersion ? getVersionDisplayLabel(sourceVersion) : null,
        assigned_to_name: action.assigned_to_user_id
          ? membersByUserId.get(action.assigned_to_user_id)?.displayName ?? null
          : null,
        resolved_in_version_label: action.resolved_in_version_id
          ? resolvedVersion ? getVersionDisplayLabel(resolvedVersion) : null
          : null,
      };
    });

    const filtered = versionId
      ? enriched.filter((action: any) => action.song_version_id === versionId)
      : enriched;

    return NextResponse.json(
      { actions: filtered },
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
