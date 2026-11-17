// Workspace-scoped reads for the song version page's secondary data
// (comments, actions, tasks and the visualizer preference). Each read takes
// the caller's canonical workspace (already resolved once by the route) and
// returns the exact status and body its individual GET route has always
// returned, so the combined version-page route and the individual routes
// share one set of access checks.
import { normalizeActionStatus } from '@/lib/actionWorkflow';
import { supabaseServer } from '@/lib/supabaseServer';
import { getVersionDisplayLabel } from '@/lib/versionDisplay';
import { listWorkspaceMembers } from '@/lib/workspaceMembers';
import type { ReadResult } from '@/lib/versionPageReads';

export async function readThreadsForWorkspace(versionId: string, workspaceId: string): Promise<ReadResult> {
  const { data: version, error: versionError } = await supabaseServer
    .from('song_versions')
    .select('id, song_id')
    .eq('id', versionId)
    .maybeSingle();

  if (versionError) throw versionError;

  if (!version) {
    return { status: 404, body: { error: 'Version not found.' } };
  }

  const { data: song, error: songError } = await supabaseServer
    .from('songs')
    .select('id, account_id')
    .eq('id', version.song_id)
    .maybeSingle();

  if (songError) throw songError;

  if (!song?.account_id || song.account_id !== workspaceId) {
    return { status: 403, body: { error: 'You do not have access to this version.' } };
  }

  const { data, error } = await supabaseServer
    .from('comment_threads')
    .select(`
      id,
      timestamp_seconds,
      created_by,
      created_at,
      comments (
        id,
        author,
        body,
        created_at,
        author_user_id
      )
    `)
    .eq('song_version_id', versionId)
    .order('timestamp_seconds', { ascending: true });

  if (error) throw error;

  // Enrich each comment with its author's stored avatar (Google photo).
  const threads = (data ?? []) as Array<Record<string, unknown>>;
  const authorIds = new Set<string>();
  for (const t of threads) {
    for (const c of ((t.comments as Array<Record<string, unknown>> | null) ?? [])) {
      if (typeof c.author_user_id === 'string') authorIds.add(c.author_user_id);
    }
  }

  const avatarById = new Map<string, string | null>();
  if (authorIds.size > 0) {
    const { data: profs, error: profErr } = await supabaseServer
      .from('profiles')
      .select('id, avatar_url')
      .in('id', Array.from(authorIds));
    if (profErr) throw profErr;
    for (const p of ((profs ?? []) as Array<{ id: string; avatar_url: string | null }>)) {
      avatarById.set(p.id, p.avatar_url ?? null);
    }
  }

  const enriched = threads.map((t) => ({
    ...t,
    comments: (((t.comments as Array<Record<string, unknown>> | null) ?? []).map((c) => ({
      ...c,
      author_avatar_url:
        typeof c.author_user_id === 'string' ? (avatarById.get(c.author_user_id) ?? null) : null,
    }))),
  }));

  return { status: 200, body: { threads: enriched } };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function readActionsForWorkspace(
  songId: string,
  workspaceId: string,
  versionId: string | null = null,
): Promise<ReadResult> {
  const { data: song, error: songError } = await supabaseServer
    .from('songs')
    .select('id, account_id')
    .eq('id', songId)
    .single();

  if (songError) throw songError;

  if (!song?.account_id || song.account_id !== workspaceId) {
    return { status: 403, body: { error: 'You do not have access to this song.' } };
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

  return { status: 200, body: { actions: filtered } };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function readTasksForWorkspace(songId: string, workspaceId: string): Promise<ReadResult> {
  const { data: song, error: songError } = await supabaseServer
    .from('songs')
    .select('id, account_id')
    .eq('id', songId)
    .maybeSingle();

  if (songError) throw songError;

  if (!song) {
    return { status: 404, body: { error: 'Song not found.' } };
  }

  if (!song.account_id || song.account_id !== workspaceId) {
    return { status: 403, body: { error: 'You do not have access to this song.' } };
  }

  const { data, error } = await supabaseServer
    .from('song_tasks')
    .select('*')
    .eq('song_id', songId)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return { status: 200, body: { tasks: data || [] } };
}

// Same default as GET /api/profile/visualizer: on.
export async function readVisualizerEnabled(userId: string): Promise<boolean> {
  const { data, error } = await supabaseServer
    .from('profile_settings')
    .select('visualizer_enabled')
    .eq('user_id', userId)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.visualizer_enabled ?? true;
}
