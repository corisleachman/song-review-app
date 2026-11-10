import { after } from 'next/server';
import { Resend } from 'resend';
import { listWorkspaceMembers, type WorkspaceMember } from '@/lib/workspaceMembers';
import { supabaseServer } from '@/lib/supabaseServer';
import { emailArtworkUrl } from '@/lib/emailArtworkUrl';
import { buildVersionUploadEmail, EMAIL_FROM } from '@/lib/emailTemplates';
import { selectVersionUploadRecipients } from '@/lib/versionUploadRecipients';

interface VersionUploadNotification {
  workspaceId: string;
  songId: string;
  versionId: string;
  // The authenticated finalizer. Versions created by the current upload flow
  // do not record created_by_user_id, so the route passes it explicitly.
  uploaderUserId?: string | null;
}

async function loadEmailContext(workspaceId: string, songId: string, versionId: string) {
  const [songResult, versionResult, accountResult] = await Promise.all([
    supabaseServer.from('songs').select('id, title, image_url, status, account_id').eq('id', songId).maybeSingle(),
    supabaseServer.from('song_versions')
      .select('id, song_id, version_number, label, notes, created_by, created_by_user_id, created_at')
      .eq('id', versionId).maybeSingle(),
    supabaseServer.from('accounts').select('name, notification_mode').eq('id', workspaceId).maybeSingle(),
  ]);
  if (songResult.error) throw songResult.error;
  if (versionResult.error) throw versionResult.error;
  if (accountResult.error) throw accountResult.error;
  const song = songResult.data;
  const version = versionResult.data;
  if (!song || !version || song.account_id !== workspaceId || version.song_id !== songId) return null;

  if (version.version_number === 1) {
    return { song, version, account: accountResult.data, previous: null };
  }

  const { data: previous, error: previousError } = await supabaseServer.from('song_versions')
    .select('version_number, created_at')
    .eq('song_id', songId)
    .eq('version_number', version.version_number - 1)
    .maybeSingle();
  if (previousError) throw previousError;

  return { song, version, account: accountResult.data, previous };
}

export function scheduleVersionUploadNotification({ workspaceId, songId, versionId, uploaderUserId: finalizerUserId }: VersionUploadNotification) {
  if (process.env.VERSION_UPLOAD_EMAILS_ENABLED !== 'true' || process.env.EMAIL_NOTIFICATIONS_ENABLED === 'false') return;

  const environment = process.env.VERCEL_ENV;
  const preview = environment === 'preview';
  const previewHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
  const previewRecipients = new Set((process.env.VERSION_UPLOAD_EMAIL_TEST_TO ?? '')
    .split(',').map(email => email.trim().toLowerCase()).filter(Boolean));

  if (preview ? !previewHost || previewRecipients.size === 0 : environment !== 'production') return;

  after(async () => {
    try {
      const apiKey = process.env.RESEND_API_KEY?.trim();
      if (!apiKey) {
        console.warn('[version-upload-email] Missing email provider configuration.');
        return;
      }

      const context = await loadEmailContext(workspaceId, songId, versionId);
      if (!context) {
        console.warn('[version-upload-email] Version context was not found; skipping.');
        return;
      }
      const { song, version, account, previous } = context;

      const members: WorkspaceMember[] = await listWorkspaceMembers(workspaceId);
      const uploaderUserId = finalizerUserId ?? version.created_by_user_id ?? null;
      const uploader = members.find(member => member.userId === uploaderUserId);
      const selected = version.version_number === 1
        ? members
        : selectVersionUploadRecipients(members, uploaderUserId, account?.notification_mode);

      const emails = new Map<string, string>();
      for (const member of selected) {
        const email = member.email?.trim();
        if (!email) continue;
        const key = email.toLowerCase();
        if (!preview || previewRecipients.has(key)) emails.set(key, email);
      }
      const recipients = Array.from(emails.values());
      if (recipients.length === 0) {
        console.info('[version-upload-email] No recipients after filtering; skipping.');
        return;
      }

      const origin = preview ? `https://${previewHost}` : 'https://www.song-room.live';
      const link = new URL(`/songs/${encodeURIComponent(songId)}/versions/${encodeURIComponent(versionId)}`, origin).toString();
      const message = buildVersionUploadEmail({
        origin,
        link,
        songTitle: song.title ?? '',
        artworkUrl: emailArtworkUrl(song.id, song.image_url, origin),
        versionNumber: version.version_number,
        versionLabel: version.label,
        notes: version.notes,
        uploaderName: uploader?.displayName || version.created_by || '',
        uploadedAt: new Date(version.created_at),
        status: song.status,
        previous: previous ? { versionNumber: previous.version_number, uploadedAt: new Date(previous.created_at) } : null,
        workspaceName: account?.name ?? '',
      });

      const resend = new Resend(apiKey);
      let accepted = 0;
      for (let offset = 0; offset < recipients.length; offset += 100) {
        const batch = recipients.slice(offset, offset + 100);
        const result = await resend.batch.send(batch.map(to => ({
          from: EMAIL_FROM,
          to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        })), { idempotencyKey: `version-upload/${versionId}/${offset}` });

        if (result.error) {
          console.warn('[version-upload-email] Provider rejected a batch.', { accepted, attempted: batch.length });
          return;
        }
        accepted += result.data.data.length;
      }
      console.info('[version-upload-email] Batch submission finished.', { accepted, recipients: recipients.length });
    } catch {
      // Provider and database errors can contain recipient or workspace data.
      console.warn('[version-upload-email] Could not submit notifications.');
    }
  });
}
