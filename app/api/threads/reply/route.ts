import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { threadId, text, songId, versionId } = await req.json();
    const trimmedText = typeof text === 'string' ? text.trim() : '';
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to reply.' }, { status: 401 });
    }

    if (!threadId || !trimmedText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data: thread, error: threadError } = await supabaseServer
      .from('comment_threads')
      .select('id, song_version_id, timestamp_seconds')
      .eq('id', threadId)
      .maybeSingle();

    if (threadError) throw threadError;

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
    }

    if (versionId && thread.song_version_id !== versionId) {
      return NextResponse.json({ error: 'Thread does not belong to this version.' }, { status: 400 });
    }

    const { data: version, error: versionError } = await supabaseServer
      .from('song_versions')
      .select('id, song_id')
      .eq('id', thread.song_version_id)
      .maybeSingle();

    if (versionError) throw versionError;

    if (!version) {
      return NextResponse.json({ error: 'Version not found.' }, { status: 404 });
    }

    if (songId && version.song_id !== songId) {
      return NextResponse.json({ error: 'Version does not belong to this song.' }, { status: 400 });
    }

    const { data: song, error: songError } = await supabaseServer
      .from('songs')
      .select('id, account_id')
      .eq('id', version.song_id)
      .maybeSingle();

    if (songError) throw songError;

    if (!song) {
      return NextResponse.json({ error: 'Song not found.' }, { status: 404 });
    }

    if (!song.account_id || song.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this thread.' }, { status: 403 });
    }

    const author = resolved.identity.authorName;

    // Add comment to thread
    const { data: commentData, error: commentError } = await supabaseServer
      .from('comments')
      .insert([
        {
          thread_id: threadId,
          author,
          author_user_id: resolved.identity.userId,
          body: trimmedText,
        },
      ])
      .select('id')
      .single();

    if (commentError) throw commentError;

    // Update thread updated_at
    await supabaseServer
      .from('comment_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);

    // Send email notification
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/notify-thread`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId,
        songId: version.song_id,
        versionId: thread.song_version_id,
        timestamp: thread.timestamp_seconds,
        author,
        commentText: trimmedText,
        isReply: true,
        actorUserId: resolved.identity.userId,
        workspaceId: resolved.identity.workspaceId,
      }),
    }).catch(err => console.error('Error sending email:', err));

    return NextResponse.json({ commentId: commentData.id });
  } catch (error) {
    console.error('Error replying to thread:', error);
    return NextResponse.json(
      { error: 'Failed to post reply' },
      { status: 500 }
    );
  }
}
