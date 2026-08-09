import { getCurrentAuthenticatedUser } from '@/lib/currentUser';
import { isAdminEmail } from '@/lib/isAdmin';
import FeedbackTriage from './FeedbackTriage';

export const dynamic = 'force-dynamic';

export default async function AdminFeedbackPage() {
  const user = await getCurrentAuthenticatedUser();

  if (!isAdminEmail(user?.email)) {
    // TEMP diagnostic — remove once ADMIN_EMAILS is confirmed working.
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: '48px 24px',
          background: '#0E0A0A',
          color: '#F4EDE4',
          fontFamily: 'monospace',
          fontSize: 14,
          lineHeight: 1.7,
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'sans-serif' }}>Admin access check</h2>
          <p>
            Signed in as:{' '}
            <strong style={{ color: '#F0E48C' }}>{user?.email ?? '(no session detected)'}</strong>
          </p>
          <p>
            ADMIN_EMAILS configured in this deployment:{' '}
            <strong style={{ color: '#F0E48C' }}>
              {process.env.ADMIN_EMAILS ? 'yes' : 'no — the variable is empty'}
            </strong>
          </p>
          <p style={{ color: 'rgba(244,237,228,0.65)' }}>
            To grant access, set ADMIN_EMAILS in Vercel to exactly the address shown above (comma-separated
            for multiple admins), then redeploy. This screen is temporary and will be replaced with a normal
            404 once access is confirmed.
          </p>
        </div>
      </div>
    );
  }

  return <FeedbackTriage />;
}
