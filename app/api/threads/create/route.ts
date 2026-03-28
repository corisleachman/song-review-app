import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { versionId, songId, timestamp, author, commentText } = await req.json();

    if (!versionId || timestamp === null || !author || !commentText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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
      .select('id')
      .single();

    if (threadError) throw threadError;

    // Create first comment
    const { data: commentData, error: commentError } = await supabaseServer
      .from('comments')
      .insert([
        {
          thread_id: threadData.id,
          author,
          body: commentText,
        },
      ])
      .select('id')
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
        commentText,
        isReply: false,
      }),
    }).catch(err => console.error('Error sending email notification:', err));

    return NextResponse.json({ threadId: threadData.id, commentId: commentData.id });
  } catch (error) {
    console.error('Error creating thread:', error);
    return NextResponse.json(
      { error: 'Failed to create thread' },
      { status: 500 }
    );
  }
}
