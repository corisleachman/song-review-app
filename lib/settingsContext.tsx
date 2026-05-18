'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getIdentity } from '@/lib/auth';
import type { AccountPlan, PlanLimitType } from '@/lib/plans';

// ── Types ────────────────────────────────────────────────────────

export interface Theme {
  primary_color: string;
  accent_color: string;
  background_color: string;
}

export interface WorkspaceMember {
  userId: string;
  email: string | null;
  displayName: string;
  role: 'owner' | 'member' | 'admin';
}

export interface WorkspaceInvite {
  id: string;
  email: string;
  invite_token: string;
  role: 'member';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  created_at: string;
  expires_at: string;
}

export interface SettingsData {
  identityLabel: string;
  isLegacyFallback: boolean;
  membershipRole: 'owner' | 'member' | null;
  isOwner: boolean;
  workspaceName: string | null;
  workspaceImageUrl: string | null;
  workspacePlan: AccountPlan | null;
  notificationMode: 'all_members' | 'owner_only';
  storageBytesUsed: number;
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
  theme: Theme;
  loading: boolean;
  error: string | null;
}

export interface SettingsActions {
  setWorkspaceName: (name: string) => void;
  setWorkspaceImageUrl: (url: string | null) => void;
  setWorkspacePlan: (plan: AccountPlan) => void;
  setNotificationMode: (mode: 'all_members' | 'owner_only') => void;
  setMembers: React.Dispatch<React.SetStateAction<WorkspaceMember[]>>;
  setInvites: React.Dispatch<React.SetStateAction<WorkspaceInvite[]>>;
  setTheme: (theme: Theme) => void;
  applyTheme: (theme: Theme) => void;
  setError: (error: string | null) => void;
  setUpgradeModalType: (type: PlanLimitType | null) => void;
  upgradeModalType: PlanLimitType | null;
}

const DEFAULT_THEME: Theme = {
  primary_color: '#ff1493',
  accent_color: '#a855f7',
  background_color: '#0d0914',
};

// ── Context ──────────────────────────────────────────────────────

const SettingsDataContext = createContext<SettingsData | null>(null);
const SettingsActionsContext = createContext<SettingsActions | null>(null);

export function useSettingsData() {
  const ctx = useContext(SettingsDataContext);
  if (!ctx) throw new Error('useSettingsData must be used within SettingsProvider');
  return ctx;
}

export function useSettingsActions() {
  const ctx = useContext(SettingsActionsContext);
  if (!ctx) throw new Error('useSettingsActions must be used within SettingsProvider');
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────

interface SettingsProviderProps {
  children: ReactNode;
}

function getPayloadError(value: unknown): string | null {
  if (value && typeof value === 'object' && 'error' in value && typeof (value as { error: unknown }).error === 'string') {
    return (value as { error: string }).error;
  }
  return null;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const router = useRouter();
  const bootstrapped = useRef(false);

  const [identityLabel, setIdentityLabel] = useState('');
  const [isLegacyFallback, setIsLegacyFallback] = useState(false);
  const [membershipRole, setMembershipRole] = useState<'owner' | 'member' | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [workspaceImageUrl, setWorkspaceImageUrl] = useState<string | null>(null);
  const [workspacePlan, setWorkspacePlan] = useState<AccountPlan | null>(null);
  const [notificationMode, setNotificationMode] = useState<'all_members' | 'owner_only'>('all_members');
  const [storageBytesUsed, setStorageBytesUsed] = useState(0);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeModalType, setUpgradeModalType] = useState<PlanLimitType | null>(null);

  const applyTheme = useCallback((t: Theme) => {
    document.documentElement.style.setProperty('--color-primary', t.primary_color);
    document.documentElement.style.setProperty('--color-accent', t.accent_color);
    document.documentElement.style.setProperty('--color-bg-darkest', t.background_color);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
  }, [applyTheme]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const load = async () => {
      try {
        const res = await fetch('/api/settings/summary', { cache: 'no-store' });
        const payload = await res.json().catch(() => null);

        if (!res.ok) {
          const legacyIdentity = getIdentity();
          if (res.status === 401 && legacyIdentity) {
            setIdentityLabel(legacyIdentity);
            setIsLegacyFallback(true);
            setError('Settings require the new Google sign-in path.');
            applyTheme(DEFAULT_THEME);
            return;
          }
          if (res.status === 401) {
            router.push('/?redirectTo=%2Fsettings%2Fworkspace');
            return;
          }
          throw new Error(getPayloadError(payload) || 'Failed to load settings');
        }

        const s = payload as {
          identity: {
            authorName: string;
            displayName: string;
            membershipRole: 'owner' | 'member';
            workspaceName: string;
            workspaceImageUrl: string | null;
          };
          workspace: {
            plan: AccountPlan;
            notification_mode?: 'all_members' | 'owner_only';
            storage_bytes_used?: number;
          };
          theme: Theme;
          members: WorkspaceMember[];
          invites: WorkspaceInvite[];
        };

        const ownerAccess = s.identity.membershipRole === 'owner';
        setIdentityLabel(s.identity.authorName || s.identity.displayName || '');
        setIsLegacyFallback(false);
        setMembershipRole(s.identity.membershipRole);
        setIsOwner(ownerAccess);
        setWorkspaceName(s.identity.workspaceName);
        setWorkspaceImageUrl(s.identity.workspaceImageUrl ?? null);
        setWorkspacePlan(s.workspace.plan);
        setNotificationMode(s.workspace.notification_mode ?? 'all_members');
        setStorageBytesUsed(s.workspace.storage_bytes_used ?? 0);
        setMembers(Array.isArray(s.members) ? s.members : []);
        setInvites(ownerAccess && Array.isArray(s.invites) ? s.invites : []);
        setThemeState(s.theme);
        applyTheme(s.theme);
      } catch (err) {
        console.error('Settings load error:', err);
        setError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router, applyTheme]);

  const data: SettingsData = {
    identityLabel,
    isLegacyFallback,
    membershipRole,
    isOwner,
    workspaceName,
    workspaceImageUrl,
    workspacePlan,
    notificationMode,
    storageBytesUsed,
    members,
    invites,
    theme,
    loading,
    error,
  };

  const actions: SettingsActions = {
    setWorkspaceName,
    setWorkspaceImageUrl,
    setWorkspacePlan,
    setNotificationMode,
    setMembers,
    setInvites,
    setTheme,
    applyTheme,
    setError,
    setUpgradeModalType,
    upgradeModalType,
  };

  return (
    <SettingsDataContext.Provider value={data}>
      <SettingsActionsContext.Provider value={actions}>
        {children}
      </SettingsActionsContext.Provider>
    </SettingsDataContext.Provider>
  );
}
