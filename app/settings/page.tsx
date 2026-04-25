'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getIdentity } from '@/lib/auth';
import AppShell from '@/components/AppShell';
import UpgradeModal from '@/components/UpgradeModal';
import { type AccountPlan, FREE_COLLABORATOR_LIMIT, FREE_SONG_LIMIT, getCollaboratorLimitLabel, getSongLimitLabel, type PlanLimitType } from '@/lib/plans';
import styles from './settings.module.css';

interface Theme {
  primary_color: string;
  accent_color: string;
  background_color: string;
}

interface BootstrapPayload {
  identity: {
    displayName: string;
    authorName: string;
    membershipRole: 'owner' | 'member';
  };
  workspace: {
    plan: AccountPlan;
  };
}

interface WorkspaceMember {
  userId: string;
  email: string | null;
  displayName: string;
  role: 'owner' | 'member' | 'admin';
}

interface WorkspaceInvite {
  id: string;
  email: string;
  invite_token: string;
  role: 'member';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  created_at: string;
  expires_at: string;
}

interface DashboardSongsPayload {
  songs?: Array<{ id: string }>;
}

const PRESETS: { [key: string]: Theme } = {
  Pulse: {
    primary_color: '#ff1493',
    accent_color: '#a855f7',
    background_color: '#0d0914',
  },
  Ocean: {
    primary_color: '#0ea5e9',
    accent_color: '#06b6d4',
    background_color: '#0f172a',
  },
  Sunset: {
    primary_color: '#f97316',
    accent_color: '#ec4899',
    background_color: '#1c1917',
  },
  Forest: {
    primary_color: '#10b981',
    accent_color: '#14b8a6',
    background_color: '#0f766e',
  },
  Purple: {
    primary_color: '#a855f7',
    accent_color: '#7c3aed',
    background_color: '#2e1065',
  },
  Rose: {
    primary_color: '#f43f5e',
    accent_color: '#e11d48',
    background_color: '#500724',
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatRoleLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function SettingsPage() {
  const router = useRouter();
  const canTogglePlanForTesting = process.env.NODE_ENV !== 'production';
  const [identityLabel, setIdentityLabel] = useState<string>('');
  const [isLegacyFallback, setIsLegacyFallback] = useState(false);
  const [theme, setTheme] = useState<Theme>({
    primary_color: '#ff1493',
    accent_color: '#a855f7',
    background_color: '#0d0914',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [collaboratorLoading, setCollaboratorLoading] = useState(true);
  const [collaboratorError, setCollaboratorError] = useState<string | null>(null);
  const [collaboratorNotice, setCollaboratorNotice] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [actingInviteId, setActingInviteId] = useState<string | null>(null);
  const [actingMemberId, setActingMemberId] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [workspacePlan, setWorkspacePlan] = useState<AccountPlan | null>(null);
  const [songCount, setSongCount] = useState<number | null>(null);
  const [upgradeModalType, setUpgradeModalType] = useState<PlanLimitType | null>(null);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [switchingPlan, setSwitchingPlan] = useState<AccountPlan | null>(null);

  const applyTheme = (newTheme: Theme) => {
    document.documentElement.style.setProperty('--color-primary', newTheme.primary_color);
    document.documentElement.style.setProperty('--color-accent', newTheme.accent_color);
    document.documentElement.style.setProperty('--color-bg-darkest', newTheme.background_color);
  };

  const loadCollaborators = async (usingLegacyFallback: boolean, ownerAccess: boolean) => {
    if (usingLegacyFallback) {
      setIsOwner(false);
      setMembers([]);
      setInvites([]);
      setCollaboratorError('Collaborator management currently requires the new Google sign-in path.');
      setCollaboratorLoading(false);
      return;
    }

    try {
      setCollaboratorLoading(true);
      setCollaboratorError(null);

      const membersResponse = await fetch('/api/workspace/members', { cache: 'no-store' });
      const dashboardResponse = await fetch('/api/dashboard', { cache: 'no-store' });
      const invitesResponse = ownerAccess
        ? await fetch('/api/workspace/invites', { cache: 'no-store' })
        : null;

      const membersPayload = await membersResponse.json().catch(() => ({ members: [] }));
      const dashboardPayload = await dashboardResponse.json().catch(() => ({ songs: [] })) as DashboardSongsPayload;
      const invitesPayload = invitesResponse
        ? await invitesResponse.json().catch(() => ({ invites: [] }))
        : { invites: [] };

      if (!membersResponse.ok) {
        throw new Error(membersPayload.error || 'Could not load collaborators.');
      }

      if (!dashboardResponse.ok) {
        throw new Error('Could not load workspace song usage.');
      }

      setMembers(Array.isArray(membersPayload.members) ? membersPayload.members : []);
      setSongCount(Array.isArray(dashboardPayload.songs) ? dashboardPayload.songs.length : 0);
      setIsOwner(ownerAccess);
      setInvites([]);

      if (!ownerAccess || !invitesResponse) {
        return;
      }

      if (!invitesResponse.ok) {
        throw new Error(invitesPayload.error || 'Could not load invites.');
      }

      setInvites(Array.isArray(invitesPayload.invites) ? invitesPayload.invites : []);
    } catch (collaboratorLoadError) {
      const message =
        collaboratorLoadError instanceof Error
          ? collaboratorLoadError.message
          : 'Could not load collaborators.';
      console.error('Error loading collaborators:', collaboratorLoadError);
      setCollaboratorError(message);
    } finally {
      setCollaboratorLoading(false);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const bootstrapResponse = await fetch('/api/auth/bootstrap', { cache: 'no-store' });
        let usingLegacyFallback = false;
        let ownerAccess = false;

        if (bootstrapResponse.ok) {
          const bootstrapPayload = await bootstrapResponse.json() as BootstrapPayload;
          setIdentityLabel(bootstrapPayload.identity.authorName || bootstrapPayload.identity.displayName || '');
          setIsLegacyFallback(false);
          setWorkspacePlan(bootstrapPayload.workspace.plan);
          ownerAccess = bootstrapPayload.identity.membershipRole === 'owner';
          setIsOwner(ownerAccess);
        } else {
          const legacyIdentity = getIdentity();
          if (legacyIdentity) {
            setIdentityLabel(legacyIdentity);
            setIsLegacyFallback(true);
            setWorkspacePlan(null);
            setIsOwner(false);
            usingLegacyFallback = true;
          } else {
            router.push('/?redirectTo=%2Fsettings');
            return;
          }
        }

        const response = await fetch('/api/settings');
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401 && usingLegacyFallback) {
            setError('Settings are only available for the new Google sign-in path right now. Your legacy session can still view this page, but it cannot load or save theme settings yet.');
            applyTheme(theme);
            await loadCollaborators(true, false);
            return;
          }
          throw new Error(data.error || 'Failed to load settings');
        }

        setTheme(data);
        applyTheme(data);
        await loadCollaborators(usingLegacyFallback, ownerAccess);
      } catch (err) {
        console.error('Error loading settings:', err);
        setError('Failed to load settings');
        setCollaboratorLoading(false);
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') !== 'cancelled') return;

    setBillingNotice('Checkout was cancelled. Your workspace is still on the current plan.');
    params.delete('billing');
    const nextQuery = params.toString();
    const nextUrl = nextQuery
      ? `${window.location.pathname}?${nextQuery}`
      : window.location.pathname;
    window.history.replaceState({}, '', nextUrl);
  }, []);

  const handleColorChange = (key: keyof Theme, value: string) => {
    const updated = { ...theme, [key]: value };
    setTheme(updated);
    applyTheme(updated);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(theme),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 401 && isLegacyFallback) {
          throw new Error('Saving settings currently requires the new Google sign-in path. Your legacy session can still use the app, but settings changes cannot be saved yet.');
        }
        throw new Error(data.error || 'Failed to save settings');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      console.error('Error saving settings:', err);
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handlePreset = (presetTheme: Theme) => {
    setTheme(presetTheme);
    applyTheme(presetTheme);
    setSaved(false);
  };

  const handleReset = () => {
    handlePreset(PRESETS.Pulse);
  };

  const handleSendInvite = async () => {
    setCollaboratorError(null);
    setCollaboratorNotice(null);
    setSendingInvite(true);

    try {
      const response = await fetch('/api/workspace/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (payload?.error === 'PLAN_LIMIT_REACHED' && payload?.limitType === 'collaborators') {
          setUpgradeModalType('collaborators');
          setCollaboratorError(null);
          return;
        }
        throw new Error(
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'Could not send invite.'
        );
      }

      if (payload?.invite) {
        setInvites(currentInvites => {
          const nextInvites = currentInvites.filter(invite => invite.id !== payload.invite.id);
          return [payload.invite as WorkspaceInvite, ...nextInvites];
        });
      }

      if (payload?.duplicate) {
        setCollaboratorNotice('That collaborator already has a pending invite.');
      } else {
        setCollaboratorNotice(payload?.emailWarning || 'Invite created successfully.');
        setInviteEmail('');
      }
    } catch (inviteError) {
      const message = inviteError instanceof Error ? inviteError.message : 'Could not send invite.';
      console.error('Error creating invite:', inviteError);
      setCollaboratorError(message);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCopyInviteLink = async (inviteToken: string, inviteId: string) => {
    const inviteUrl = `${window.location.origin}/invite/${inviteToken}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedInviteId(inviteId);
      setCollaboratorNotice('Invite link copied.');
      window.setTimeout(() => {
        setCopiedInviteId(current => (current === inviteId ? null : current));
      }, 2000);
    } catch (copyError) {
      console.error('Error copying invite link:', copyError);
      setCollaboratorError('Could not copy invite link. You can still open it manually from the pending invite list.');
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setCollaboratorError(null);
    setCollaboratorNotice(null);
    setActingInviteId(inviteId);

    try {
      const response = await fetch(`/api/workspace/invites/${inviteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'Could not revoke invite.'
        );
      }

      if (payload?.invite) {
        setInvites(currentInvites =>
          currentInvites.map(invite =>
            invite.id === inviteId ? (payload.invite as WorkspaceInvite) : invite
          )
        );
        setCollaboratorNotice('Invite revoked.');
      }
    } catch (revokeError) {
      const message = revokeError instanceof Error ? revokeError.message : 'Could not revoke invite.';
      console.error('Error revoking invite:', revokeError);
      setCollaboratorError(message);
    } finally {
      setActingInviteId(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setCollaboratorError(null);
    setCollaboratorNotice(null);
    setActingMemberId(userId);

    try {
      const response = await fetch(`/api/workspace/members/${userId}`, {
        method: 'DELETE',
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'Could not remove member.'
        );
      }

      setMembers(currentMembers => currentMembers.filter(member => member.userId !== userId));
      setCollaboratorNotice('Member removed from workspace.');
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : 'Could not remove member.';
      console.error('Error removing member:', removeError);
      setCollaboratorError(message);
    } finally {
      setActingMemberId(null);
    }
  };

  const handleUpgradeCheckout = async () => {
    setBillingNotice(null);
    setBillingError(null);
    setStartingCheckout(true);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'Could not start checkout.'
        );
      }

      if (!payload?.url || typeof payload.url !== 'string') {
        throw new Error('Checkout URL was missing.');
      }

      window.location.assign(payload.url);
    } catch (checkoutError) {
      const message =
        checkoutError instanceof Error
          ? checkoutError.message
          : 'Could not start checkout.';
      console.error('Checkout start error:', checkoutError);
      setBillingError(message);
      setStartingCheckout(false);
    }
  };

  const handleManageBilling = async () => {
    setBillingNotice(null);
    setBillingError(null);
    setOpeningPortal(true);

    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'Could not open billing portal.'
        );
      }

      if (!payload?.url || typeof payload.url !== 'string') {
        throw new Error('Billing portal URL was missing.');
      }

      window.location.assign(payload.url);
    } catch (portalError) {
      const message =
        portalError instanceof Error
          ? portalError.message
          : 'Could not open billing portal.';
      console.error('Billing portal error:', portalError);
      setBillingError(message);
      setOpeningPortal(false);
    }
  };

  const handlePlanTestingToggle = async (nextPlan: AccountPlan) => {
    if (workspacePlan === nextPlan) return;

    setBillingNotice(null);
    setBillingError(null);
    setSwitchingPlan(nextPlan);

    try {
      const response = await fetch('/api/workspace/plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: nextPlan }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'Could not switch workspace plan.'
        );
      }

      setWorkspacePlan(nextPlan);
      setBillingNotice(
        payload?.message || `Workspace plan switched to ${nextPlan} for local testing.`
      );
    } catch (planError) {
      const message =
        planError instanceof Error
          ? planError.message
          : 'Could not switch workspace plan.';
      console.error('Plan testing toggle error:', planError);
      setBillingError(message);
    } finally {
      setSwitchingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <AppShell label={identityLabel || 'User'} plan={workspacePlan}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/dashboard" className={styles.backButton}>
              ← Back
            </Link>
            <h1 className={styles.title}>⚙️ Settings</h1>
          </div>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <span>❌ {error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className={styles.content}>
          <div className={styles.brandExplorer}>
          <div className={styles.explorerHeader}>
            <h2>Color Theme</h2>
            <p>Customize your colors. Changes apply live across the app.</p>
          </div>

          <div className={styles.colorPicker}>
            <div className={styles.pickerRow}>
              <div className={styles.colorControl}>
                <label className={styles.label}>Primary Color</label>
                <div className={styles.colorInputWrapper}>
                  <input
                    type="color"
                    value={theme.primary_color}
                    onChange={e => handleColorChange('primary_color', e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={theme.primary_color}
                    onChange={e => handleColorChange('primary_color', e.target.value)}
                    className={styles.textInput}
                    placeholder="#ff1493"
                  />
                </div>
              </div>

              <div className={styles.colorControl}>
                <label className={styles.label}>Accent Color</label>
                <div className={styles.colorInputWrapper}>
                  <input
                    type="color"
                    value={theme.accent_color}
                    onChange={e => handleColorChange('accent_color', e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={theme.accent_color}
                    onChange={e => handleColorChange('accent_color', e.target.value)}
                    className={styles.textInput}
                    placeholder="#a855f7"
                  />
                </div>
              </div>

              <div className={styles.colorControl}>
                <label className={styles.label}>Background</label>
                <div className={styles.colorInputWrapper}>
                  <input
                    type="color"
                    value={theme.background_color}
                    onChange={e => handleColorChange('background_color', e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={theme.background_color}
                    onChange={e => handleColorChange('background_color', e.target.value)}
                    className={styles.textInput}
                    placeholder="#0d0914"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.presetsSection}>
            <h3>Quick Presets</h3>
            <div className={styles.presetGrid}>
              {Object.entries(PRESETS).map(([name, preset]) => (
                <button
                  key={name}
                  onClick={() => handlePreset(preset)}
                  className={styles.presetButton}
                  style={{
                    background: `linear-gradient(135deg, ${preset.primary_color}, ${preset.accent_color})`,
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button
              onClick={handleSave}
              className={styles.saveButton}
              disabled={saving}
            >
              {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Theme'}
            </button>
            <button
              onClick={handleReset}
              className={styles.resetButtonLarge}
            >
              Reset to Default
            </button>
          </div>
        </div>

          <div className={styles.infoPanel}>
          <h3>ℹ️ How It Works</h3>
          <ul className={styles.tipsList}>
            <li>Colors update <strong>live</strong> as you change them</li>
            <li>See changes immediately on the page</li>
            <li>Click presets to try different themes</li>
            <li>Use hex colors or the color picker</li>
            <li>Click Save to store your theme</li>
            <li>Your colors persist when you log out</li>
            <li>Coris and Al each have separate color preferences</li>
          </ul>

          <div style={{ marginTop: 'var(--space-2xl)' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.3)' }}>
              Logged in as: <strong>{identityLabel || 'Unknown'}</strong>
            </p>
          </div>
        </div>
        </div>

        <div className={styles.collaboratorSection}>
        <div className={styles.planSection}>
          <div className={styles.planHeader}>
            <div>
              <h2>Plan</h2>
              <p>Current workspace access and collaborator allowance.</p>
            </div>
            {workspacePlan === 'free' && isOwner && (
              <button
                type="button"
                className={styles.resetButtonLarge}
                onClick={() => void handleUpgradeCheckout()}
                disabled={startingCheckout}
              >
                {startingCheckout ? 'Redirecting...' : 'Upgrade'}
              </button>
            )}
            {workspacePlan === 'paid' && isOwner && (
              <button
                type="button"
                className={styles.resetButtonLarge}
                onClick={() => void handleManageBilling()}
                disabled={openingPortal}
              >
                {openingPortal ? 'Opening...' : 'Manage billing'}
              </button>
            )}
          </div>
          {billingNotice && (
            <div className={styles.collaboratorSuccess}>
              {billingNotice}
            </div>
          )}
          {billingError && (
            <div className={styles.collaboratorMessage}>
              {billingError}
            </div>
          )}
          {workspacePlan ? (
            <div className={styles.planDetails}>
              <div className={styles.planStat}>
                <span>Current plan</span>
                <strong>{workspacePlan === 'paid' ? 'Paid' : 'Free'}</strong>
              </div>
              <div className={styles.planStat}>
                <span>Collaborator limit</span>
                <strong>{getCollaboratorLimitLabel(workspacePlan)}</strong>
              </div>
              {workspacePlan === 'free' && (
                <>
                  <div className={styles.planStat}>
                    <span>Collaborators used</span>
                    <strong>{`${members.filter(member => member.role !== 'owner').length + invites.filter(invite => invite.status === 'pending').length} of ${FREE_COLLABORATOR_LIMIT} collaborators used`}</strong>
                  </div>
                  <div className={styles.planStat}>
                    <span>Songs used</span>
                    <strong>{`${songCount ?? 0} of ${FREE_SONG_LIMIT} songs used`}</strong>
                  </div>
                </>
              )}
              {workspacePlan === 'paid' && (
                <div className={styles.planStat}>
                  <span>Song limit</span>
                  <strong>{getSongLimitLabel(workspacePlan)}</strong>
                </div>
              )}
              {workspacePlan === 'paid' && (
                <div className={styles.planStat}>
                  <span>Status</span>
                  <strong>You are on the paid plan</strong>
                </div>
              )}
            </div>
          ) : (
            <p className={styles.collaboratorMuted}>
              Plan visibility currently requires the new Google sign-in path.
            </p>
          )}
          {canTogglePlanForTesting && isOwner && workspacePlan && (
            <div className={styles.planTesting}>
              <div className={styles.planTestingCopy}>
                <strong>Local testing</strong>
                <span>Switch between free and paid views without changing the real Stripe subscription.</span>
              </div>
              <div className={styles.planTestingActions}>
                <button
                  type="button"
                  className={styles.inlineAction}
                  onClick={() => void handlePlanTestingToggle('free')}
                  disabled={switchingPlan !== null || workspacePlan === 'free'}
                >
                  {switchingPlan === 'free' ? 'Switching...' : 'Switch to Free'}
                </button>
                <button
                  type="button"
                  className={styles.inlineAction}
                  onClick={() => void handlePlanTestingToggle('paid')}
                  disabled={switchingPlan !== null || workspacePlan === 'paid'}
                >
                  {switchingPlan === 'paid' ? 'Switching...' : 'Switch to Paid'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.collaboratorHeader}>
          <div>
            <h2>Collaborators</h2>
            <p>Invite band members, review pending invites, and manage workspace access.</p>
          </div>
        </div>

        {collaboratorError && (
          <div className={styles.collaboratorMessage}>
            {collaboratorError}
          </div>
        )}

        {collaboratorNotice && (
          <div className={styles.collaboratorSuccess}>
            {collaboratorNotice}
          </div>
        )}

        {collaboratorLoading ? (
          <p className={styles.collaboratorMuted}>Loading collaborators...</p>
        ) : (
          <div className={styles.collaboratorGrid}>
            {isOwner && (
              <section className={styles.collaboratorCard}>
                <h3>Invite by email</h3>
                <p className={styles.collaboratorMuted}>
                  Send a workspace invite to a new band member.
                </p>
                <div className={styles.inviteForm}>
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
                    onClick={handleSendInvite}
                    className={styles.saveButton}
                    disabled={sendingInvite || !inviteEmail.trim()}
                  >
                    {sendingInvite ? 'Sending...' : 'Send invite'}
                  </button>
                </div>
              </section>
            )}

            <section className={styles.collaboratorCard}>
              <h3>Current members</h3>
              <div className={styles.collaboratorList}>
                {members.length === 0 ? (
                  <p className={styles.collaboratorMuted}>No workspace members found.</p>
                ) : (
                  members.map(member => (
                    <div key={member.userId} className={styles.collaboratorRow}>
                      <div className={styles.collaboratorMeta}>
                        <strong>{member.displayName}</strong>
                        <span>{member.email || 'No email available'}</span>
                      </div>
                      <div className={styles.collaboratorActions}>
                        <span className={styles.roleBadge}>{formatRoleLabel(member.role)}</span>
                        {isOwner && member.role !== 'owner' && (
                          <button
                            type="button"
                            className={styles.inlineAction}
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={actingMemberId === member.userId}
                          >
                            {actingMemberId === member.userId ? 'Removing...' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {isOwner && (
              <section className={styles.collaboratorCard}>
                <h3>Pending invites</h3>
                <div className={styles.collaboratorList}>
                  {invites.length === 0 ? (
                    <p className={styles.collaboratorMuted}>No invites yet.</p>
                  ) : (
                    invites.map(invite => (
                      <div key={invite.id} className={styles.collaboratorRow}>
                        <div className={styles.collaboratorMeta}>
                          <strong>{invite.email}</strong>
                          <span>
                            {formatRoleLabel(invite.status)} · Created {formatDate(invite.created_at)} · Expires{' '}
                            {formatDate(invite.expires_at)}
                          </span>
                        </div>
                        <div className={styles.collaboratorActions}>
                          <span className={styles.roleBadge}>{formatRoleLabel(invite.status)}</span>
                          {invite.status === 'pending' && (
                            <button
                              type="button"
                              className={styles.inlineAction}
                              onClick={() => handleCopyInviteLink(invite.invite_token, invite.id)}
                            >
                              {copiedInviteId === invite.id ? 'Copied' : 'Copy invite link'}
                            </button>
                          )}
                          {invite.status === 'pending' && (
                            <button
                              type="button"
                              className={styles.inlineAction}
                              onClick={() => handleRevokeInvite(invite.id)}
                              disabled={actingInviteId === invite.id}
                            >
                              {actingInviteId === invite.id ? 'Revoking...' : 'Revoke'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>
        )}
        </div>
      </div>
      <UpgradeModal
        isOpen={upgradeModalType !== null}
        type={upgradeModalType ?? 'collaborators'}
        onClose={() => setUpgradeModalType(null)}
      />
    </AppShell>
  );
}
