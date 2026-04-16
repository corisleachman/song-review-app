import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

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
    const { versionId, songId, timestamp, commentText } = await req.json();
    const trimmedComment = typeof commentText === 'string' ? commentText.trim() : '';
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to comment.' }, { status: 401 });
    }

    if (!versionId || timestamp === null || !trimmedComment) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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
          body: trimmedComment,
        },
      ])
      .select('id, author, body, created_at')
      .single();

    if (commentError) throw commentError;

    // Send email notification (fire and forget, but with error handling)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/notify-thread`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId: threadData.id,
        songId,
        versionId,
        timestamp,
        author,
        commentText: trimmedComment,
        isReply: false,
        actorUserId: resolved.identity.userId,
        workspaceId: resolved.identity.workspaceId,
      }),
    }).catch(err => console.error('Error sending email notification:', err));

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
          created_at
        )
      `)
      .eq('id', threadData.id)
      .single();

    if (canonicalThreadError) throw canonicalThreadError;

    return NextResponse.json({
      threadId: threadData.id,
      commentId: commentData.id,
      thread: canonicalThread,
    });
  } catch (error) {
    console.error('Error creating thread:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
