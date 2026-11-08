import { after } from 'next/server';
import { Resend } from 'resend';
import { listWorkspaceMembers } from '@/lib/workspaceMembers';

interface VersionUploadNotification {
  workspaceId: string;
  songId: string;
  versionId: string;
}

export function scheduleVersionUploadNotification({ workspaceId, songId, versionId }: VersionUploadNotification) {
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

      const members = await listWorkspaceMembers(workspaceId);
      const emails = new Map<string, string>();
      for (const member of members) {
        const email = member.email?.trim();
        if (!email) continue;
        const key = email.toLowerCase();
        if (!preview || previewRecipients.has(key)) emails.set(key, email);
      }

      const recipients = Array.from(emails.values());
      const origin = preview ? `https://${previewHost}` : 'https://www.song-room.live';
      const link = new URL(`/songs/${encodeURIComponent(songId)}/versions/${encodeURIComponent(versionId)}`, origin);
      const resend = new Resend(apiKey);
      let accepted = 0;
      for (let offset = 0; offset < recipients.length; offset += 100) {
        const batch = recipients.slice(offset, offset + 100);
        const result = await resend.batch.send(batch.map(to => ({
          from: 'Song Room <noreply@song-room.live>',
          to,
          subject: 'A new song version is ready',
          text: `A new version has been uploaded to your workspace.\n\nOpen the version in Song Room: ${link}`,
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
