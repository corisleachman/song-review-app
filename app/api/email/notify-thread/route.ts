import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseServer } from '@/lib/supabaseServer';

const resend = new Resend(process.env.RESEND_API_KEY);

interface NotifyThreadRequest {
  threadId?: string | null;
  songId?: string | null;
  versionId?: string | null;
  timestamp?: number | null;
  author?: string | null;
  commentText?: string | null;
  isReply?: boolean;
  actorUserId?: string | null;
  workspaceId?: string | null;
}

interface WorkspaceRecipient {
  userId: string;
  email: string;
  displayName: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function normalizeNotificationActor(author: string | null | undefined) {
  const trimmed = author?.trim();
  return trimmed || 'Someone';
}

function getSongTitle(title: string | null | undefined) {
  const trimmed = title?.trim();
  return trimmed || 'Untitled song';
}

function getVersionLabel(versionData: { version_number?: number | null; label?: string | null } | null) {
  if (!versionData?.version_number) {
    return 'this version';
  }

  const label = versionData.label?.trim();
  return label
    ? `Version ${versionData.version_number} (${label})`
    : `Version ${versionData.version_number}`;
}

function getCommentBody(commentText: string | null | undefined) {
  const trimmed = commentText?.trim();
  return trimmed || 'No message was included.';
}

function getEmailSubject(params: {
  actorName: string;
  songTitle: string;
  versionLabel: string;
  timestampLabel: string;
  isReply: boolean;
}) {
  const { actorName, songTitle, versionLabel, timestampLabel, isReply } = params;

  return isReply
    ? `${actorName} replied on ${songTitle} (${versionLabel}) at ${timestampLabel}`
    : `${actorName} left a comment on ${songTitle} (${versionLabel}) at ${timestampLabel}`;
}

function getPlainTextEmail(params: {
  actorName: string;
  songTitle: string;
  versionLabel: string;
  timestampLabel: string;
  commentBody: string;
  deepLink: string;
  isReply: boolean;
}) {
  const { actorName, songTitle, versionLabel, timestampLabel, commentBody, deepLink, isReply } = params;
  const intro = isReply
    ? `${actorName} replied in a thread on ${songTitle}.`
    : `${actorName} left a new comment on ${songTitle}.`;

  return [
    intro,
    '',
    `Track: ${songTitle}`,
    `Version: ${versionLabel}`,
    `Time: ${timestampLabel}`,
    '',
    'Message:',
    commentBody,
    '',
    `${isReply ? 'Open the thread' : 'Open the comment'}: ${deepLink}`,
  ].join('\n');
}

function getHtmlEmail(params: {
  actorName: string;
  songTitle: string;
  versionLabel: string;
  timestampLabel: string;
  commentBody: string;
  deepLink: string;
  isReply: boolean;
}) {
  const { actorName, songTitle, versionLabel, timestampLabel, commentBody, deepLink, isReply } = params;
  const intro = isReply
    ? `<strong>${escapeHtml(actorName)}</strong> replied in a thread on <strong>${escapeHtml(songTitle)}</strong>.`
    : `<strong>${escapeHtml(actorName)}</strong> left a new comment on <strong>${escapeHtml(songTitle)}</strong>.`;
  const ctaLabel = isReply ? 'Open thread' : 'Open comment';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; line-height: 1.5;">
      <p style="margin: 0 0 16px;">${intro}</p>
      <p style="margin: 0 0 16px;">
        <strong>Version:</strong> ${escapeHtml(versionLabel)}<br />
        <strong>Time:</strong> ${escapeHtml(timestampLabel)}
      </p>
      <blockquote style="margin: 0 0 20px; padding: 14px 16px; border-left: 3px solid #111; background: #f6f6f6;">
        <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(commentBody)}</p>
      </blockquote>
      <p style="margin: 0 0 20px;">
        <a href="${deepLink}" style="display: inline-block; padding: 10px 16px; background-color: #111; color: #fff; text-decoration: none; border-radius: 6px;">
          ${ctaLabel}
        </a>
      </p>
      <p style="margin: 0; color: #555;">Open the track to read the thread and respond.</p>
    </div>
  `.trim();
}

function normalizeBooleanEnv(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
}

function parseEmailList(value: string | undefined) {
  return Array.from(
    new Set(
      (value ?? '')
        .split(',')
        .map(email => email.trim())
        .filter(Boolean)
    )
  );
}

function notificationsEnabled() {
  const explicit = normalizeBooleanEnv(process.env.EMAIL_NOTIFICATIONS_ENABLED);

  if (explicit !== null) return explicit;

  // Keep local and test environments safe by default unless explicitly enabled.
  return process.env.NODE_ENV === 'production';
}

async function resolveWorkspaceRecipients(workspaceId: string, actorUserId: string) {
  const { data: members, error: membersError } = await supabaseServer
    .from('account_members')
    .select('user_id')
    .eq('account_id', workspaceId);

  if (membersError) throw membersError;

  const recipientUserIds = Array.from(
    new Set(
      (members ?? [])
        .map(member => member.user_id)
        .filter(userId => userId && userId !== actorUserId)
    )
  );

  if (recipientUserIds.length === 0) {
    return [] as WorkspaceRecipient[];
  }

  const { data: profiles, error: profilesError } = await supabaseServer
    .from('profiles')
    .select('id, email, display_name')
    .in('id', recipientUserIds);

  if (profilesError) throw profilesError;

  const profileById = new Map(
    (profiles ?? []).map(profile => [
      profile.id,
      {
        email: profile.email?.trim() ?? '',
        displayName: profile.display_name?.trim()
          || profile.email?.split('@')[0]?.trim()
          || 'Collaborator',
      },
    ])
  );

  return recipientUserIds
    .map(userId => {
      const profile = profileById.get(userId);

      if (!profile?.email) return null;

      return {
        userId,
        email: profile.email,
        displayName: profile.displayName,
      } satisfies WorkspaceRecipient;
    })
    .filter((recipient): recipient is WorkspaceRecipient => Boolean(recipient));
}

export async function POST(req: NextRequest) {
  try {
    const {
      threadId,
      songId,
      versionId,
      timestamp,
      author,
      commentText,
      isReply,
      actorUserId,
      workspaceId,
    } = await req.json() as NotifyThreadRequest;

    if (!songId || !author || typeof timestamp !== 'number' || !commentText) {
      return NextResponse.json(
        { sent: false, skipped: 'missing-required-fields' },
        { status: 400 }
      );
    }

    if (!actorUserId) {
      console.warn('[notify-thread] Missing canonical actor user id; skipping notification send.');
      return NextResponse.json({ sent: false, skipped: 'missing-actor-user-id' });
    }

    let resolvedVersionId = versionId;

    if (!resolvedVersionId && threadId) {
      const { data: threadVersionData } = await supabaseServer
        .from('comment_threads')
        .select('song_version_id')
        .eq('id', threadId)
        .single();

      resolvedVersionId = threadVersionData?.song_version_id ?? null;
    }

    const { data: songData } = await supabaseServer
      .from('songs')
      .select('title, account_id')
      .eq('id', songId)
      .single();

    const { data: versionData } = resolvedVersionId
      ? await supabaseServer
          .from('song_versions')
          .select('version_number, label')
          .eq('id', resolvedVersionId)
          .single()
      : { data: null };

    const resolvedWorkspaceId = songData?.account_id ?? workspaceId ?? null;

    if (!resolvedWorkspaceId) {
      console.warn('[notify-thread] Could not resolve workspace for notification; skipping send.', {
        songId,
        threadId,
      });
      return NextResponse.json({ sent: false, skipped: 'missing-workspace' });
    }

    // Resolve recipients from canonical workspace membership, never from
    // collaborator display-name flips like "Coris" -> "Al".
    const workspaceRecipients = await resolveWorkspaceRecipients(resolvedWorkspaceId, actorUserId);
    const forcedRecipients = parseEmailList(process.env.EMAIL_NOTIFICATIONS_FORCE_TO);
    const notificationsAreEnabled = notificationsEnabled();
    const recipientEmails = forcedRecipients.length > 0
      ? forcedRecipients
      : workspaceRecipients.map(recipient => recipient.email);

    if (!notificationsAreEnabled) {
      console.info('[notify-thread] Notifications disabled by configuration; skipping send.', {
        songId,
        threadId,
        actorUserId,
        workspaceId: resolvedWorkspaceId,
        intendedRecipients: recipientEmails,
      });
      return NextResponse.json({
        sent: false,
        skipped: 'notifications-disabled',
        recipients: recipientEmails,
      });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('[notify-thread] RESEND_API_KEY is not configured; skipping notification send.');
      return NextResponse.json({ sent: false, skipped: 'missing-resend-api-key' });
    }

    if (recipientEmails.length === 0) {
      console.warn('[notify-thread] No canonical workspace recipients found; skipping send.', {
        songId,
        threadId,
        actorUserId,
        workspaceId: resolvedWorkspaceId,
      });
      return NextResponse.json({ sent: false, skipped: 'no-recipients' });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const deepLink = resolvedVersionId
      ? `${baseUrl}/songs/${songId}/versions/${resolvedVersionId}?thread=${threadId}`
      : `${baseUrl}/songs/${songId}`;
    const actorName = normalizeNotificationActor(author);
    const songTitle = getSongTitle(songData?.title);
    const versionLabel = getVersionLabel(versionData);
    const timestampLabel = formatTimestamp(timestamp);
    const commentBody = getCommentBody(commentText);
    const subject = getEmailSubject({
      actorName,
      songTitle,
      versionLabel,
      timestampLabel,
      isReply: Boolean(isReply),
    });
    const emailText = getPlainTextEmail({
      actorName,
      songTitle,
      versionLabel,
      timestampLabel,
      commentBody,
      deepLink,
      isReply: Boolean(isReply),
    });
    const emailHtml = getHtmlEmail({
      actorName,
      songTitle,
      versionLabel,
      timestampLabel,
      commentBody,
      deepLink,
      isReply: Boolean(isReply),
    });

    const result = await resend.emails.send({
      from: 'Song Review <onboarding@resend.dev>',
      to: recipientEmails,
      subject,
      text: emailText,
      html: emailHtml,
    });

    console.log('[notify-thread] Email sent:', {
      result,
      actorUserId,
      workspaceId: resolvedWorkspaceId,
      recipients: recipientEmails,
      recipientMode: forcedRecipients.length > 0 ? 'forced' : 'workspace-members',
    });
    return NextResponse.json({
      sent: true,
      recipients: recipientEmails,
      recipientMode: forcedRecipients.length > 0 ? 'forced' : 'workspace-members',
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ sent: false, error: String(error) }, { status: 500 });
  }
}
