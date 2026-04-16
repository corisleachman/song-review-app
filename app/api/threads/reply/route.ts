import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { threadId, text, songId, versionId } = await req.json();
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to reply.' }, { status: 401 });
    }

    if (!threadId || !text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const author = resolved.identity.authorName;

    // Add comment to thread
    const { data: commentData, error: commentError } = await supabaseServer
      .from('comments')
      .insert([
        {
          thread_id: threadId,
          author,
          body: text,
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

    // Get thread details for email
    const { data: threadData } = await supabaseServer
      .from('comment_threads')
      .select('timestamp_seconds')
      .eq('id', threadId)
      .single();

    // Send email notification
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/notify-thread`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId,
        songId,
        versionId,
        timestamp: threadData?.timestamp_seconds,
        author,
        commentText: text,
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
