import { NextRequest, NextResponse } from 'next/server';
import {
  INTERNAL_REQUEST_SIGNATURE_HEADER,
  verifyInternalRequestSignature,
} from '@/lib/internalRequestAuth';
import { sendThreadNotification } from '@/lib/threadNotifications';

interface NotifyThreadRequest {
  threadId?: unknown;
  commentId?: unknown;
  songId?: unknown;
  versionId?: unknown;
  actorUserId?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 16 * 1024) {
      return NextResponse.json({ error: 'Notification request is too large.' }, { status: 413 });
    }

    const rawPayload = await req.text();
    if (Buffer.byteLength(rawPayload, 'utf8') > 16 * 1024) {
      return NextResponse.json({ error: 'Notification request is too large.' }, { status: 413 });
    }

    const isTrustedRequest = verifyInternalRequestSignature(
      rawPayload,
      req.headers.get(INTERNAL_REQUEST_SIGNATURE_HEADER)
    );

    if (!isTrustedRequest) {
      return NextResponse.json({ error: 'Unauthorised notification request.' }, { status: 401 });
    }

    const payload = JSON.parse(rawPayload) as NotifyThreadRequest;
    const threadId = typeof payload.threadId === 'string' ? payload.threadId.trim() : '';
    const commentId = typeof payload.commentId === 'string' ? payload.commentId.trim() : '';
    const songId = typeof payload.songId === 'string' ? payload.songId.trim() : '';
    const versionId = typeof payload.versionId === 'string' ? payload.versionId.trim() : '';
    const actorUserId = typeof payload.actorUserId === 'string' ? payload.actorUserId.trim() : '';

    if (!threadId || !commentId || !songId || !versionId || !actorUserId) {
      return NextResponse.json({ error: 'Missing required notification identifiers.' }, { status: 400 });
    }

    const result = await sendThreadNotification(
      { threadId, commentId, songId, versionId, actorUserId },
      req.nextUrl.origin
    );

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ sent: false, error: 'Could not send notification.' }, { status: 500 });
  }
}
