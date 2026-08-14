import { redirect } from 'next/navigation';
import { getPublicInviteByToken, type PublicInviteState } from '@/lib/accountInvites';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import InviteActions from './InviteActions';

interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getStateTitle(state: PublicInviteState) {
  switch (state) {
    case 'pending':
      return 'You have been invited';
    case 'revoked':
      return 'This invite has been revoked';
    case 'expired':
      return 'This invite has expired';
    case 'accepted':
      return 'This invite has already been used';
    case 'invalid':
    default:
      return 'Invite not found';
  }
}

function getStateMessage(state: PublicInviteState) {
  switch (state) {
    case 'pending':
      return 'This invite is ready to use. Continue with Google using the invited email address, then accept the workspace invite.';
    case 'revoked':
      return 'The workspace owner revoked this invite. Ask them to send a new one if you still need access.';
    case 'expired':
      return 'This invite is no longer valid. Ask the workspace owner to send a fresh invite.';
    case 'accepted':
      return 'This invite has already been accepted and can no longer be reused.';
    case 'invalid':
    default:
      return 'The invite link is invalid or no longer exists.';
  }
}

export default async function InvitePage(props: InvitePageProps) {
  const params = await props.params;
  const result = await getPublicInviteByToken(params.token);

  const state = result.state;
  const invite = result.invite;

  // If the invite is accepted and the current user is already authenticated,
  // they're already a member — redirect to dashboard instead of a dead-end page.
  if (state === 'accepted' && invite) {
    try {
      const resolved = await resolveCanonicalIdentity();
      if (resolved) {
        redirect(`/dashboard?inviteAccepted=${encodeURIComponent(invite.workspace.name)}`);
      }
    } catch {
      // Not authenticated or bootstrap failed — fall through to normal page render
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#0d0914',
        color: 'white',
        padding: '24px',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '520px',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '20px',
          padding: '28px',
          background: 'rgba(255,255,255,0.04)',
          boxShadow: '0 18px 48px rgba(0,0,0,0.28)',
        }}
      >
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Workspace invite
        </p>
        <h1 style={{ margin: '10px 0 12px', fontSize: '32px', lineHeight: 1.1 }}>
          {getStateTitle(state)}
        </h1>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.76)', lineHeight: 1.6 }}>
          {getStateMessage(state)}
        </p>

        {invite && (
          <div
            style={{
              marginTop: '24px',
              padding: '18px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'grid',
              gap: '10px',
            }}
          >
            <div>
              <strong>Workspace:</strong> {invite.workspace.name}
            </div>
            <div>
              <strong>Invited email:</strong> {invite.email}
            </div>
            <div>
              <strong>Role:</strong> {invite.role}
            </div>
            <div>
              <strong>Invited by:</strong> {invite.invitedBy.displayName}
            </div>
            <div>
              <strong>Created:</strong> {formatDate(invite.createdAt)}
            </div>
            <div>
              <strong>Expires:</strong> {formatDate(invite.expiresAt)}
            </div>
          </div>
        )}

        {state === 'pending' && invite ? (
          <InviteActions token={params.token} inviteEmail={invite.email} />
        ) : (
          <p style={{ marginTop: '24px', color: 'rgba(255,255,255,0.56)', fontSize: '14px' }}>
            This invite page stays read-only when the invite is unavailable or already used.
          </p>
        )}
      </section>
    </main>
  );
}
