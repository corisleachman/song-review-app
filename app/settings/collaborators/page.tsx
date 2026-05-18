'use client';

import { useState } from 'react';
import { useSettingsData, useSettingsActions } from '@/lib/settingsContext';
import styles from '../settings.module.css';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}
function formatRole(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function CollaboratorsPage() {
  const { isOwner, members, invites, loading } = useSettingsData();
  const { setMembers, setInvites, setUpgradeModalType } = useSettingsActions();

  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingInviteId, setActingInviteId] = useState<string | null>(null);
  const [actingMemberId, setActingMemberId] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  if (loading) return <div className={styles.sectionLoading}>Loading…</div>;

  if (!isOwner) {
    return (
      <div className={styles.sectionContainer}>
        <div className={styles.sectionHeading}>
          <h2>Collaborators</h2>
          <p>You are a member of this workspace. The owner manages invites and access.</p>
        </div>
        <div className={styles.settingsBlock}>
          <div className={styles.blockLabel}>
            <h3>Your access</h3>
          </div>
          <div className={styles.blockReadOnly}>
            Add songs, upload versions, leave comments, create actions, and manage tasks. Song deletion is owner-only.
          </div>
        </div>
        <div className={styles.settingsBlock}>
          <div className={styles.blockLabel}><h3>Current members</h3></div>
          <div className={styles.blockControl}>
            <div className={styles.memberList}>
              {members.map(m => (
                <div key={m.userId} className={styles.memberRow}>
                  <div className={styles.memberMeta}>
                    <strong>{m.displayName}</strong>
                    <span>{m.email || ''}</span>
                  </div>
                  <span className={styles.roleBadge}>{formatRole(m.role)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSendInvite = async () => {
    setError(null);
    setNotice(null);
    setSendingInvite(true);
    try {
      const res = await fetch('/api/workspace/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        if (payload?.error === 'PLAN_LIMIT_REACHED' && payload?.limitType === 'collaborators') {
          setUpgradeModalType('collaborators');
          return;
        }
        throw new Error(payload?.error || 'Could not send invite.');
      }
      if (payload?.invite) {
        setInvites(prev => {
          const next = prev.filter(i => i.id !== payload.invite.id);
          return [payload.invite, ...next];
        });
      }
      setNotice(payload?.duplicate
        ? (payload?.emailSent ? 'Already invited — email resent.' : 'Already invited. Copy the link to share manually.')
        : (payload?.emailWarning || 'Invite sent.'));
      if (!payload?.duplicate) setInviteEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send invite.');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCopyLink = async (token: string, id: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInviteId(id);
      setNotice('Invite link copied.');
      setTimeout(() => setCopiedInviteId(c => c === id ? null : c), 2000);
    } catch {
      setError('Could not copy link.');
    }
  };

  const handleRevoke = async (id: string) => {
    setError(null);
    setNotice(null);
    setActingInviteId(id);
    try {
      const res = await fetch(`/api/workspace/invites/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Could not revoke invite.');
      if (payload?.invite) {
        setInvites(prev => prev.map(i => i.id === id ? payload.invite : i));
        setNotice('Invite revoked.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke invite.');
    } finally {
      setActingInviteId(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setError(null);
    setNotice(null);
    setActingMemberId(userId);
    try {
      const res = await fetch(`/api/workspace/members/${userId}`, { method: 'DELETE' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Could not remove member.');
      setMembers(prev => prev.filter(m => m.userId !== userId));
      setNotice('Member removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove member.');
    } finally {
      setActingMemberId(null);
    }
  };

  const pendingInvites = invites.filter(i => i.status === 'pending');
  const pastInvites = invites.filter(i => i.status !== 'pending');

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeading}>
        <h2>Collaborators</h2>
        <p>Manage who has access to this workspace.</p>
      </div>

      {notice && <div className={styles.blockNotice}>{notice}</div>}
      {error && <div className={styles.blockError}>{error}</div>}

      {/* ── Invite ── */}
      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Invite by email</h3>
          <p>Send a workspace invite to a new band member or collaborator.</p>
        </div>
        <div className={styles.blockControl}>
          <div className={styles.inlineForm}>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="bandmate@example.com"
              className={styles.textInput}
              disabled={sendingInvite}
            />
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void handleSendInvite()}
              disabled={sendingInvite || !inviteEmail.trim()}
            >
              {sendingInvite ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Members ── */}
      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Current members</h3>
          <p>{members.length} {members.length === 1 ? 'person' : 'people'} in this workspace.</p>
        </div>
        <div className={styles.blockControl}>
          <div className={styles.memberList}>
            {members.map(m => (
              <div key={m.userId} className={styles.memberRow}>
                <div className={styles.memberMeta}>
                  <strong>{m.displayName}</strong>
                  <span>{m.email || ''}</span>
                </div>
                <div className={styles.memberActions}>
                  <span className={styles.roleBadge}>{formatRole(m.role)}</span>
                  {m.role !== 'owner' && (
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={() => void handleRemoveMember(m.userId)}
                      disabled={actingMemberId === m.userId}
                    >
                      {actingMemberId === m.userId ? 'Removing…' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pending invites ── */}
      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Pending invites</h3>
          <p>{pendingInvites.length === 0 ? 'No pending invites.' : `${pendingInvites.length} awaiting acceptance.`}</p>
        </div>
        <div className={styles.blockControl}>
          {pendingInvites.length === 0 ? (
            <p className={styles.emptyState}>Invites you send will appear here.</p>
          ) : (
            <div className={styles.memberList}>
              {pendingInvites.map(invite => (
                <div key={invite.id} className={styles.memberRow}>
                  <div className={styles.memberMeta}>
                    <strong>{invite.email}</strong>
                    <span>Sent {formatDate(invite.created_at)} · Expires {formatDate(invite.expires_at)}</span>
                  </div>
                  <div className={styles.memberActions}>
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={() => void handleCopyLink(invite.invite_token, invite.id)}
                    >
                      {copiedInviteId === invite.id ? 'Copied' : 'Copy link'}
                    </button>
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={() => void handleRevoke(invite.id)}
                      disabled={actingInviteId === invite.id}
                    >
                      {actingInviteId === invite.id ? 'Revoking…' : 'Revoke'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Past invites ── */}
      {pastInvites.length > 0 && (
        <div className={styles.settingsBlock}>
          <div className={styles.blockLabel}>
            <h3>Past invites</h3>
          </div>
          <div className={styles.blockControl}>
            <div className={styles.memberList}>
              {pastInvites.map(invite => (
                <div key={invite.id} className={styles.memberRow}>
                  <div className={styles.memberMeta}>
                    <strong>{invite.email}</strong>
                    <span>{formatRole(invite.status)} · {formatDate(invite.created_at)}</span>
                  </div>
                  <span className={`${styles.roleBadge} ${invite.status === 'accepted' ? styles.roleBadgeAccepted : styles.roleBadgeMuted}`}>
                    {formatRole(invite.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
