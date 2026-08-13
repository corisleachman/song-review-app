import { after } from 'next/server';
import { Resend } from 'resend';
import { supabaseServer } from '@/lib/supabaseServer';

export interface ThreadNotificationPayload {
  threadId: string;
  commentId: string;
  songId: string;
  versionId: string;
  actorUserId: string;
}

interface WorkspaceRecipient {
  userId: string;
  email: string;
  displayName: string;
}

export interface ThreadNotificationResult {
  status: number;
  body: Record<string, unknown>;
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
  const normalizedSeconds = Math.max(0, Math.round(seconds));
  const mins = Math.floor(normalizedSeconds / 60);
  const secs = normalizedSeconds % 60;
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
        <a href="${escapeHtml(deepLink)}" style="display: inline-block; padding: 10px 16px; background-color: #111; color: #fff; text-decoration: none; border-radius: 6px;">
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

type NotificationMode = 'all_members' | 'owner_only';

async function resolveNotificationMode(workspaceId: string): Promise<NotificationMode> {
  const { data } = await supabaseServer
    .from('accounts')
    .select('notification_mode')
    .eq('id', workspaceId)
    .single();

  const mode = data?.notification_mode;
  if (mode === 'owner_only') return 'owner_only';
  return 'all_members';
}

async function resolveWorkspaceRecipients(workspaceId: string, actorUserId: string) {
  const notificationMode = await resolveNotificationMode(workspaceId);

  if (notificationMode === 'owner_only') {
    const { data: ownerMember } = await supabaseServer
      .from('account_members')
      .select('user_id')
      .eq('account_id', workspaceId)
      .eq('role', 'owner')
      .single();

    const ownerUserId = ownerMember?.user_id;
    const actorIsOwner = ownerUserId && ownerUserId === actorUserId;

    if (actorIsOwner) {
      const { data: allMembers } = await supabaseServer
        .from('account_members')
        .select('user_id')
        .eq('account_id', workspaceId)
        .neq('role', 'owner');

      const memberUserIds = (allMembers ?? [])
        .map(member => member.user_id)
        .filter((id): id is string => Boolean(id));

      if (memberUserIds.length === 0) return [] as WorkspaceRecipient[];

      const { data: memberProfiles } = await supabaseServer
        .from('profiles')
        .select('id, email, display_name')
        .in('id', memberUserIds);

      return (memberProfiles ?? [])
        .filter(profile => profile.email?.trim())
        .map(profile => ({
          userId: profile.id,
          email: profile.email!.trim(),
          displayName: profile.display_name?.trim()
            || profile.email!.split('@')[0]?.trim()
            || 'Member',
        })) satisfies WorkspaceRecipient[];
    }

    if (!ownerUserId) return [] as WorkspaceRecipient[];

    const { data: ownerProfile } = await supabaseServer
      .from('profiles')
      .select('id, email, display_name')
      .eq('id', ownerUserId)
      .single();

    if (!ownerProfile?.email) return [] as WorkspaceRecipient[];

    return [{
      userId: ownerUserId,
      email: ownerProfile.email.trim(),
      displayName: ownerProfile.display_name?.trim()
        || ownerProfile.email.split('@')[0]?.trim()
        || 'Owner',
    }] satisfies WorkspaceRecipient[];
  }

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

  if (recipientUserIds.length === 0) return [] as WorkspaceRecipient[];

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

export async function sendThreadNotification(
  payload: ThreadNotificationPayload,
  requestOrigin: string
): Promise<ThreadNotificationResult> {
  const { threadId, commentId, songId, versionId, actorUserId } = payload;

  const { data: threadData, error: threadError } = await supabaseServer
    .from('comment_threads')
    .select('id, song_version_id, timestamp_seconds')
    .eq('id', threadId)
    .maybeSingle();

  if (threadError) throw threadError;
  if (!threadData || threadData.song_version_id !== versionId) {
    return { status: 404, body: { error: 'Thread not found.' } };
  }

  const { data: versionData, error: versionError } = await supabaseServer
    .from('song_versions')
    .select('id, song_id, version_number, label')
    .eq('id', versionId)
    .maybeSingle();

  if (versionError) throw versionError;
  if (!versionData || versionData.song_id !== songId) {
    return { status: 404, body: { error: 'Version not found.' } };
  }

  const { data: songData, error: songError } = await supabaseServer
    .from('songs')
    .select('title, account_id')
    .eq('id', songId)
    .maybeSingle();

  if (songError) throw songError;
  if (!songData?.account_id) {
    return { status: 404, body: { error: 'Song not found.' } };
  }

  const { data: actorMembership, error: membershipError } = await supabaseServer
    .from('account_members')
    .select('user_id')
    .eq('account_id', songData.account_id)
    .eq('user_id', actorUserId)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!actorMembership) {
    return { status: 403, body: { error: 'Notification actor is not a workspace member.' } };
  }

  const { data: commentData, error: commentError } = await supabaseServer
    .from('comments')
    .select('id, thread_id, author, body')
    .eq('id', commentId)
    .maybeSingle();

  if (commentError) throw commentError;
  if (!commentData || commentData.thread_id !== threadId) {
    return { status: 404, body: { error: 'Comment not found.' } };
  }

  const actorName = normalizeNotificationActor(commentData.author);
  const { count: threadCommentCount, error: commentCountError } = await supabaseServer
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('thread_id', threadId);

  if (commentCountError) throw commentCountError;

  const workspaceId = songData.account_id;
  const workspaceRecipients = await resolveWorkspaceRecipients(workspaceId, actorUserId);
  const forcedRecipients = parseEmailList(process.env.EMAIL_NOTIFICATIONS_FORCE_TO);
  const recipientEmails = forcedRecipients.length > 0
    ? forcedRecipients
    : workspaceRecipients.map(recipient => recipient.email);

  if (!notificationsEnabled()) {
    console.info('[notify-thread] Notifications disabled by configuration; skipping send.', {
      songId,
      threadId,
      actorUserId,
      workspaceId,
      intendedRecipientCount: recipientEmails.length,
    });
    return {
      status: 200,
      body: { sent: false, skipped: 'notifications-disabled', recipientCount: recipientEmails.length },
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    console.warn('[notify-thread] RESEND_API_KEY is not configured; skipping notification send.');
    return { status: 200, body: { sent: false, skipped: 'missing-resend-api-key' } };
  }

  if (recipientEmails.length === 0) {
    console.warn('[notify-thread] No canonical workspace recipients found; skipping send.', {
      songId,
      threadId,
      actorUserId,
      workspaceId,
    });
    return { status: 200, body: { sent: false, skipped: 'no-recipients' } };
  }

  const deepLinkUrl = new URL(
    `/songs/${encodeURIComponent(songId)}/versions/${encodeURIComponent(versionId)}`,
    requestOrigin
  );
  deepLinkUrl.searchParams.set('thread', threadId);
  const songTitle = getSongTitle(songData.title);
  const versionLabel = getVersionLabel(versionData);
  const timestampLabel = formatTimestamp(Number(threadData.timestamp_seconds) || 0);
  const commentBody = getCommentBody(commentData.body);
  const isReply = (threadCommentCount ?? 0) > 1;
  const emailParams = {
    actorName,
    songTitle,
    versionLabel,
    timestampLabel,
    commentBody,
    deepLink: deepLinkUrl.toString(),
    isReply,
  };

  const resend = new Resend(resendApiKey);
  const result = await resend.emails.send({
    from: 'Song Room <noreply@song-room.live>',
    to: recipientEmails,
    subject: getEmailSubject(emailParams),
    text: getPlainTextEmail(emailParams),
    html: getHtmlEmail(emailParams),
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  console.log('[notify-thread] Email sent:', {
    messageId: result.data?.id ?? null,
    actorUserId,
    workspaceId,
    recipientCount: recipientEmails.length,
    recipientMode: forcedRecipients.length > 0 ? 'forced' : 'workspace-members',
  });

  return {
    status: 200,
    body: {
      sent: true,
      recipientCount: recipientEmails.length,
      recipientMode: forcedRecipients.length > 0 ? 'forced' : 'workspace-members',
    },
  };
}

export function scheduleThreadNotification(payload: ThreadNotificationPayload, requestOrigin: string) {
  after(async () => {
    try {
      const result = await sendThreadNotification(payload, requestOrigin);
      if (result.status >= 400) {
        console.error('[notify-thread] Notification rejected:', {
          status: result.status,
          error: result.body.error,
          threadId: payload.threadId,
          commentId: payload.commentId,
        });
      }
    } catch (error) {
      console.error('[notify-thread] Background send failed:', error);
    }
  });
}
