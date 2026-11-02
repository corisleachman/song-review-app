import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';
import { enforceMutationRateLimit } from '@/lib/mutationRateLimit';
import { scheduleThreadNotification } from '@/lib/threadNotifications';

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

  return 'Failed to create thread';
}

export async function POST(req: NextRequest) {
  try {
    const resolved = await resolveCanonicalIdentity();
    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to comment.' }, { status: 401 });
    }

    const payload: unknown = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json({ error: 'Invalid comment details.' }, { status: 400 });
    }
    const { versionId, songId, timestamp, commentText } = payload as Record<string, unknown>;
    const trimmedComment = typeof commentText === 'string' ? commentText.trim() : '';
    if (typeof versionId !== 'string' || !versionId.trim()
      || typeof songId !== 'string' || !songId.trim() || !trimmedComment || timestamp == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // timestamp_seconds is a Postgres integer; reject coercion and overflow before writes.
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)
      || timestamp < 0 || Math.round(timestamp) > 2147483647) {
      return NextResponse.json({ error: 'Choose a valid position in the track.' }, { status: 400 });
    }

    const { data: version, error: versionError } = await supabaseServer
      .from('song_versions')
      .select('id, song_id')
      .eq('id', versionId)
      .maybeSingle();

    if (versionError) throw versionError;

    if (!version) {
      return NextResponse.json({ error: 'Version not found.' }, { status: 404 });
    }

    if (version.song_id !== songId) {
      return NextResponse.json({ error: 'Version does not belong to this song.' }, { status: 400 });
    }

    const { data: song, error: songError } = await supabaseServer
      .from('songs')
      .select('id, account_id')
      .eq('id', songId)
      .maybeSingle();

    if (songError) throw songError;

    if (!song) {
      return NextResponse.json({ error: 'Song not found.' }, { status: 404 });
    }

    if (!song.account_id || song.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this song.' }, { status: 403 });
    }

    const limitError = await enforceMutationRateLimit('workspace_comment', resolved.identity.userId);
    if (limitError) return limitError;

    const author = resolved.identity.authorName;

    // Create thread
    const { data: threadData, error: threadError } = await supabaseServer
      .from('comment_threads')
      .insert([
        {
          song_version_id: versionId,
          timestamp_seconds: Math.round(timestamp),
          created_by: author,
        },
      ])
      .select('id, timestamp_seconds, created_by, created_at')
      .single();

    if (threadError) throw threadError;

    // Create first comment
    const { data: commentData, error: commentError } = await supabaseServer
      .from('comments')
      .insert([
        {
          thread_id: threadData.id,
          author,
          author_user_id: resolved.identity.userId,
          body: trimmedComment,
        },
      ])
      .select('id, author, body, created_at, author_user_id')
      .single();

    if (commentError) throw commentError;

    scheduleThreadNotification({
      threadId: threadData.id,
      commentId: commentData.id,
      songId,
      versionId,
      actorUserId: resolved.identity.userId,
    }, req.nextUrl.origin);

    const { data: canonicalThread, error: canonicalThreadError } = await supabaseServer
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
      .eq('id', threadData.id)
      .single();

    if (canonicalThreadError) throw canonicalThreadError;

    // Attach the current user's avatar to their comments (others fill in via GET)
    const enrichedThread = canonicalThread
      ? {
          ...canonicalThread,
          comments: (((canonicalThread as { comments?: unknown }).comments as Array<Record<string, unknown>> | null) ?? []).map((cm) => ({
            ...cm,
            author_avatar_url:
              cm.author_user_id === resolved.identity.userId ? resolved.identity.avatarUrl : null,
          })),
        }
      : canonicalThread;

    return NextResponse.json({
      threadId: threadData.id,
      commentId: commentData.id,
      thread: enrichedThread,
    });
  } catch (error) {
    console.error('Error creating thread:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
