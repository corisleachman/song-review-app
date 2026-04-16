import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { normalizeActionStatus, isOpenAction } from '@/lib/actionWorkflow';
import { type AwaitingResponseState, type SongActivityItem } from '@/lib/collaborationSignals';
import { formatTimestamp } from '@/lib/auth';
import { normalizeSongStatus } from '@/lib/songWorkflow';
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

  return 'Could not load dashboard data.';
}

function truncateDetail(value: string | null | undefined, maxLength = 84) {
  const trimmed = value?.trim() ?? '';

  if (!trimmed) return null;
  if (trimmed.length <= maxLength) return trimmed;

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

function getIsoTimeValue(value: string | null | undefined) {
  if (!value) return 0;

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortNewestFirst<T extends { createdAt: string | null }>(items: T[]) {
  return [...items].sort((left, right) => getIsoTimeValue(right.createdAt) - getIsoTimeValue(left.createdAt));
}

function matchesActorName(author: string | null | undefined, actorNames: Set<string>) {
  const normalized = author?.trim().toLowerCase() ?? '';
  return normalized ? actorNames.has(normalized) : false;
}

export async function GET() {
  try {
    noStore();

    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { data: songs, error: songsError } = await supabaseServer
      .from('songs')
      .select('id, title, image_url, created_at, status')
      .eq('account_id', resolved.identity.workspaceId)
      .order('created_at', { ascending: false });

    if (songsError) throw songsError;

    const songIds = (songs ?? []).map(song => song.id);

    if (songIds.length === 0) {
      return NextResponse.json(
        { songs: [] },
        { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const [{ data: versions, error: versionsError }, { data: actions, error: actionsError }, members] = await Promise.all([
      supabaseServer
        .from('song_versions')
        .select('id, song_id, version_number, label, created_at, created_by')
        .in('song_id', songIds)
        .order('version_number', { ascending: false }),
      supabaseServer
        .from('actions')
        .select('id, song_id, comment_id, description, suggested_by, status, created_at, updated_at, assigned_to_user_id')
        .in('song_id', songIds),
      listWorkspaceMembers(resolved.identity.workspaceId),
    ]);

    if (versionsError) throw versionsError;
    if (actionsError) throw actionsError;

    const versionIds = Array.from(new Set((versions ?? []).map(version => version.id)));
    const { data: threads, error: threadsError } = versionIds.length
      ? await supabaseServer
          .from('comment_threads')
          .select('id, song_version_id, timestamp_seconds, created_at, updated_at, created_by')
          .in('song_version_id', versionIds)
      : { data: [], error: null };

    if (threadsError) throw threadsError;

    const threadIds = Array.from(new Set((threads ?? []).map(thread => thread.id)));
    const { data: comments, error: commentsError } = threadIds.length
      ? await supabaseServer
          .from('comments')
          .select('id, thread_id, author, body, created_at')
          .in('thread_id', threadIds)
      : { data: [], error: null };

    if (commentsError) throw commentsError;

    const versionsBySongId = new Map<string, Array<{
      id: string;
      song_id: string;
      version_number: number | null;
      label: string | null;
      created_at: string | null;
      created_by: string | null;
    }>>();

    for (const version of versions ?? []) {
      const existing = versionsBySongId.get(version.song_id) ?? [];
      existing.push(version);
      versionsBySongId.set(version.song_id, existing);
    }

    const threadsByVersionId = new Map<string, Array<{
      id: string;
      song_version_id: string;
      timestamp_seconds: number | null;
      created_at: string | null;
      updated_at: string | null;
      created_by: string | null;
    }>>();
    for (const thread of threads ?? []) {
      const existing = threadsByVersionId.get(thread.song_version_id) ?? [];
      existing.push(thread);
      threadsByVersionId.set(thread.song_version_id, existing);
    }

    const commentsByThreadId = new Map<string, Array<{
      id: string;
      thread_id: string;
      author: string | null;
      body: string | null;
      created_at: string | null;
    }>>();
    for (const comment of comments ?? []) {
      const existing = commentsByThreadId.get(comment.thread_id) ?? [];
      existing.push(comment);
      commentsByThreadId.set(comment.thread_id, existing);
    }
    const commentsById = new Map((comments ?? []).map(comment => [comment.id, comment]));
    const threadsById = new Map((threads ?? []).map(thread => [thread.id, thread]));

    const actionsBySongId = new Map<string, Array<{
      id: string;
      song_id: string;
      comment_id: string | null;
      description: string | null;
      suggested_by: string | null;
      status: string | null;
      created_at: string | null;
      updated_at: string | null;
      assigned_to_user_id: string | null;
    }>>();
    for (const action of actions ?? []) {
      const existing = actionsBySongId.get(action.song_id) ?? [];
      existing.push(action);
      actionsBySongId.set(action.song_id, existing);
    }

    const actionsByCommentId = new Map<string, Array<{
      id: string;
      song_id: string;
      comment_id: string | null;
      description: string | null;
      suggested_by: string | null;
      status: string | null;
      created_at: string | null;
      updated_at: string | null;
      assigned_to_user_id: string | null;
    }>>();
    for (const action of actions ?? []) {
      if (!action.comment_id) continue;
      const existing = actionsByCommentId.get(action.comment_id) ?? [];
      existing.push(action);
      actionsByCommentId.set(action.comment_id, existing);
    }

    const currentMember = members.find(member => member.userId === resolved.identity.userId);
    const actorNames = new Set([
      resolved.identity.authorName,
      resolved.identity.displayName,
      currentMember?.displayName ?? '',
      currentMember?.email?.split('@')[0] ?? '',
    ].map(value => value.trim().toLowerCase()).filter(Boolean));

    const dashboardSongs = (songs ?? []).map(song => {
      const songVersions = versionsBySongId.get(song.id) ?? [];
      const latest = songVersions[0] ?? null;
      const songThreads = songVersions.flatMap(version => threadsByVersionId.get(version.id) ?? []);
      const commentCount = songThreads.reduce((total, thread) => total + (commentsByThreadId.get(thread.id)?.length ?? 0), 0);
      const songActionItems = actionsBySongId.get(song.id) ?? [];
      const unresolvedActionItems = songActionItems
        .filter(action => isOpenAction(normalizeActionStatus(action.status)))
        .map(action => {
          const comment = action.comment_id ? commentsById.get(action.comment_id) ?? null : null;
          const thread = comment?.thread_id
            ? threadsById.get(comment.thread_id) ?? null
            : null;

          return {
            ...action,
            song_version_id: thread?.song_version_id ?? null,
            sortAt: action.updated_at ?? action.created_at,
          };
        });
      const unresolvedActionCount = unresolvedActionItems.length;
      const assignedToMeItems = unresolvedActionItems.filter(action => action.assigned_to_user_id === resolved.identity.userId);
      const assignedToMeCount = assignedToMeItems.length;
      const latestOpenAction = sortNewestFirst(
        unresolvedActionItems.map(action => ({ ...action, createdAt: action.sortAt }))
      )[0] ?? null;
      const latestAssignedAction = sortNewestFirst(
        assignedToMeItems.map(action => ({ ...action, createdAt: action.sortAt }))
      )[0] ?? null;
      const activityFeed: SongActivityItem[] = [];

      for (const version of songVersions) {
        if (!version.created_at) continue;

        activityFeed.push({
          id: `version:${version.id}`,
          type: 'version_uploaded',
          createdAt: version.created_at,
          summary: `${version.created_by?.trim() || 'Someone'} uploaded ${getVersionDisplayLabel(version)}`,
          detail: null,
        });
      }

      for (const thread of songThreads) {
        const threadComments = sortNewestFirst(
          (commentsByThreadId.get(thread.id) ?? []).map(comment => ({ ...comment, createdAt: comment.created_at }))
        )
          .map(comment => ({
            id: comment.id,
            thread_id: comment.thread_id,
            author: comment.author,
            body: comment.body,
            created_at: comment.createdAt,
          }))
          .sort((left, right) => getIsoTimeValue(left.created_at) - getIsoTimeValue(right.created_at));

        if (threadComments.length === 0) continue;

        const [firstComment, ...replies] = threadComments;
        activityFeed.push({
          id: `comment:${firstComment.id}`,
          type: 'comment_added',
          createdAt: firstComment.created_at ?? thread.created_at ?? new Date(0).toISOString(),
          summary: `${firstComment.author?.trim() || thread.created_by?.trim() || 'Someone'} commented at ${thread.timestamp_seconds != null ? formatTimestamp(thread.timestamp_seconds) : 'a note'}`,
          detail: truncateDetail(firstComment.body),
        });

        for (const reply of replies) {
          activityFeed.push({
            id: `reply:${reply.id}`,
            type: 'reply_added',
            createdAt: reply.created_at ?? thread.updated_at ?? thread.created_at ?? new Date(0).toISOString(),
            summary: `${reply.author?.trim() || 'Someone'} replied at ${thread.timestamp_seconds != null ? formatTimestamp(thread.timestamp_seconds) : 'a note'}`,
            detail: truncateDetail(reply.body),
          });
        }
      }

      for (const action of songActionItems) {
        if (action.created_at) {
          activityFeed.push({
            id: `action-created:${action.id}`,
            type: 'action_created',
            createdAt: action.created_at,
            summary: `${action.suggested_by?.trim() || 'Someone'} added an action`,
            detail: truncateDetail(action.description, 72),
          });
        }

        if (action.updated_at && action.created_at && getIsoTimeValue(action.updated_at) > getIsoTimeValue(action.created_at)) {
          activityFeed.push({
            id: `action-updated:${action.id}`,
            type: 'action_status_changed',
            createdAt: action.updated_at,
            summary: `Action marked ${normalizeActionStatus(action.status).replace('_', ' ')}`,
            detail: truncateDetail(action.description, 72),
          });
        }
      }

      const unresolvedThreads = songThreads
        .map(thread => {
          const threadComments = (commentsByThreadId.get(thread.id) ?? [])
            .sort((left, right) => getIsoTimeValue(left.created_at) - getIsoTimeValue(right.created_at));
          const threadActions = threadComments.flatMap(comment => actionsByCommentId.get(comment.id) ?? []);
          const isResolved = threadActions.length > 0
            ? threadActions.every(action => normalizeActionStatus(action.status) === 'done')
            : false;
          const latestComment = threadComments.at(-1) ?? null;

          return {
            thread,
            latestComment,
            isResolved,
            lastTouchedAt: latestComment?.created_at ?? thread.updated_at ?? thread.created_at,
          };
        })
        .filter(thread => !thread.isResolved && thread.lastTouchedAt);

      const latestUnresolvedThread = sortNewestFirst(
        unresolvedThreads.map(thread => ({ ...thread, createdAt: thread.lastTouchedAt }))
      )[0] ?? null;

      let awaitingResponse: AwaitingResponseState = null;
      if (latestUnresolvedThread) {
        const latestAuthor = latestUnresolvedThread.latestComment?.author ?? latestUnresolvedThread.thread.created_by;
        awaitingResponse = matchesActorName(latestAuthor, actorNames) ? 'theirs' : 'me';
      }

      const latestActivityAt = [
        song.created_at,
        ...activityFeed.map(item => item.createdAt),
      ]
        .filter(Boolean)
        .sort()
        .at(-1) ?? null;

      return {
        id: song.id,
        title: song.title,
        image_url: song.image_url ?? null,
        created_at: song.created_at ?? null,
        status: normalizeSongStatus(song.status),
        latestVersionId: latest?.id ?? null,
        latestVersionNumber: latest?.version_number ?? null,
        latestVersionLabel: latest ? getVersionDisplayLabel(latest) : null,
        latestVersionCreatedAt: latest?.created_at ?? null,
        commentCount,
        unresolvedActionCount,
        assignedToMeCount,
        activeContextVersionId: latestOpenAction?.song_version_id ?? latest?.id ?? null,
        assignedContextVersionId: latestAssignedAction?.song_version_id ?? latestOpenAction?.song_version_id ?? latest?.id ?? null,
        needsAttention: unresolvedActionCount > 0,
        awaitingResponse,
        awaitingThreadId: latestUnresolvedThread?.thread.id ?? null,
        awaitingVersionId: latestUnresolvedThread?.thread.song_version_id ?? latest?.id ?? null,
        activityFeed: sortNewestFirst(activityFeed).slice(0, 3),
        latestActivityAt,
      };
    });

    return NextResponse.json(
      { songs: dashboardSongs },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
