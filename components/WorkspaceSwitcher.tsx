'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import styles from './WorkspaceSwitcher.module.css';

type WorkspaceRole = 'owner' | 'member';
type WorkspacePlan = 'free' | 'paid';

interface WorkspaceSummary {
  id: string;
  name: string;
  imageUrl: string | null;
  slug: string | null;
  role: WorkspaceRole;
  plan: WorkspacePlan;
  songCount: number;
  isActive: boolean;
  joinedAt: string;
  createdAt: string;
}

interface WorkspaceSwitcherProps {
  userLabel?: string | null;
  workspaceName: string;
  workspaceImageUrl?: string | null;
  membershipRole: WorkspaceRole | null;
  variant: 'rail' | 'mobile';
  forceOpen?: boolean;
  onForceClose?: () => void;
}

interface WorkspacesPayload {
  currentWorkspaceId: string;
  workspaces: WorkspaceSummary[];
}

function getPayloadError(value: unknown) {
  if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string') {
    return value.error;
  }

  return null;
}

function getWorkspaceInitial(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 'W';

  return trimmed[0]?.toUpperCase() ?? 'W';
}

function formatRole(value: WorkspaceRole | null) {
  if (!value) return '';
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function formatSongCount(count: number) {
  return count === 1 ? '1 song' : `${count} songs`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not load workspaces.';
}

export default function WorkspaceSwitcher({
  userLabel = null,
  workspaceName,
  workspaceImageUrl = null,
  membershipRole,
  variant,
  forceOpen,
  onForceClose,
}: WorkspaceSwitcherProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(forceOpen ?? false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [error, setError] = useState('');
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState(() => getDefaultWorkspaceName(userLabel));
  const roleLabel = formatRole(membershipRole);
  const hasOwnedWorkspace = workspaces.some(workspace => workspace.role === 'owner');

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || loaded) return;

    let cancelled = false;

    async function loadWorkspaces() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/workspaces', { cache: 'no-store' });
        const payload = await response.json().catch(() => null) as WorkspacesPayload | null;

        if (!response.ok || !Array.isArray(payload?.workspaces)) {
          throw new Error(
            getPayloadError(payload) ?? 'Could not load workspaces.'
          );
        }

        if (cancelled) return;
        setWorkspaces(payload.workspaces);
        setLoaded(true);
      } catch (loadError) {
        if (cancelled) return;
        setError(getErrorMessage(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadWorkspaces();

    return () => {
      cancelled = true;
    };
  }, [loaded, open]);

  async function switchWorkspace(workspaceId: string) {
    try {
      setSwitchingId(workspaceId);
      setError('');

      const response = await fetch('/api/workspaces/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workspaceId }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getPayloadError(payload) ?? 'Could not switch workspace.'
        );
      }

      window.location.reload();
    } catch (switchError) {
      setError(getErrorMessage(switchError));
      setSwitchingId(null);
    }
  }

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setCreating(true);
      setError('');

      const response = await fetch('/api/workspaces/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newWorkspaceName }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getPayloadError(payload) ?? 'Could not create workspace.'
        );
      }

      window.location.reload();
    } catch (createError) {
      setError(getErrorMessage(createError));
      setCreating(false);
    }
  }

  if (variant === 'mobile') {
    if (forceOpen) {
      // Render panel directly — no trigger button needed
      return (
        <div className={`${styles.root} ${styles.mobileRoot}`} ref={rootRef}>
          {renderPanel()}
        </div>
      );
    }
    return (
      <div className={`${styles.root} ${styles.mobileRoot}`} ref={rootRef}>
        <button
          type="button"
          className={styles.mobileButton}
          onClick={() => setOpen(value => !value)}
          aria-expanded={open}
          aria-label={`Current workspace: ${workspaceName}`}
        >
          <span className={styles.mobileEyebrow}>Workspace</span>
          <span className={styles.mobileName}>{workspaceName}</span>
          {roleLabel && <span className={styles.mobileRole}>{roleLabel}</span>}
        </button>
        {open && renderPanel()}
      </div>
    );
  }

  return (
    <div className={`${styles.root} ${styles.railRoot}`} ref={rootRef}>
      <button
        type="button"
        className={styles.railButton}
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-label={`Current workspace: ${workspaceName}${roleLabel ? `, ${roleLabel}` : ''}`}
        title={`Current workspace: ${workspaceName}${roleLabel ? ` (${roleLabel})` : ''}`}
      >
        <span className={styles.railMark} aria-hidden="true">
          {workspaceImageUrl ? (
            <img src={workspaceImageUrl} alt="" />
          ) : (
            getWorkspaceInitial(workspaceName)
          )}
        </span>
        {roleLabel && <span className={styles.railRole}>{roleLabel}</span>}
      </button>
      {open && renderPanel()}
    </div>
  );

  function renderPanel() {
    return (
      <div className={`${styles.panel} ${variant === 'mobile' ? styles.mobilePanel : styles.railPanel}`}>
        <div className={styles.panelHeader}>
          <span className={styles.panelEyebrow}>Switch workspace</span>
          <strong>{workspaceName}</strong>
        </div>

        {loading && (
          <div className={styles.stateText}>Loading workspaces...</div>
        )}

        {error && (
          <div className={styles.errorText}>{error}</div>
        )}

        {!loading && !error && (
          <div className={styles.workspaceList}>
            {workspaces.map(workspace => {
              const switching = switchingId === workspace.id;
              const disabled = workspace.isActive || Boolean(switchingId);

              return (
                <button
                  key={workspace.id}
                  type="button"
                  className={`${styles.workspaceOption} ${workspace.isActive ? styles.activeOption : ''}`}
                  disabled={disabled}
                  onClick={() => void switchWorkspace(workspace.id)}
                >
                  <span className={styles.optionMark} aria-hidden="true">
                    {workspace.imageUrl ? (
                      <>
                        <img src={workspace.imageUrl} alt="" />
                        {workspace.isActive && <span className={styles.optionCheck}>✓</span>}
                      </>
                    ) : (
                      workspace.isActive ? '✓' : getWorkspaceInitial(workspace.name)
                    )}
                  </span>
                  <span className={styles.optionText}>
                    <span className={styles.optionName}>{workspace.name}</span>
                    <span className={styles.optionMeta}>
                      {formatRole(workspace.role)} · {formatSongCount(workspace.songCount)}
                      {workspace.plan === 'paid' ? ' · Pro' : ''}
                    </span>
                  </span>
                  <span className={styles.optionState}>
                    {switching ? 'Switching' : workspace.isActive ? 'Current' : 'Switch'}
                  </span>
                </button>
              );
            })}

            {loaded && workspaces.length === 0 && (
              <div className={styles.stateText}>No workspaces found.</div>
            )}

            {loaded && !hasOwnedWorkspace && (
              <div className={styles.createSection}>
                {!showCreateForm ? (
                  <button
                    type="button"
                    className={styles.createPrompt}
                    onClick={() => setShowCreateForm(true)}
                  >
                    <span className={styles.createPlus}>+</span>
                    <span>
                      <strong>Create your own workspace</strong>
                      <small>Keep your own songs separate from band workspaces.</small>
                    </span>
                  </button>
                ) : (
                  <form className={styles.createForm} onSubmit={createWorkspace}>
                    <label className={styles.createLabel} htmlFor={`workspace-name-${variant}`}>
                      Workspace name
                    </label>
                    <input
                      id={`workspace-name-${variant}`}
                      className={styles.createInput}
                      value={newWorkspaceName}
                      onChange={event => setNewWorkspaceName(event.target.value)}
                      maxLength={80}
                      disabled={creating}
                    />
                    <div className={styles.createActions}>
                      <button
                        type="button"
                        className={styles.createSecondary}
                        onClick={() => setShowCreateForm(false)}
                        disabled={creating}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={styles.createPrimary}
                        disabled={creating || !newWorkspaceName.trim()}
                      >
                        {creating ? 'Creating...' : 'Create workspace'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

function getDefaultWorkspaceName(userLabel: string | null | undefined) {
  const trimmed = userLabel?.trim() ?? '';
  if (!trimmed || trimmed === 'User' || trimmed === 'Account') {
    return 'My Workspace';
  }

  return `${trimmed}'s Workspace`;
}
