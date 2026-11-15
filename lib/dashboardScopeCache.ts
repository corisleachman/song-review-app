// Remembers which workspace (and its header details) a signed-in user last saw
// on the dashboard, so a returning visit can paint that workspace's cached
// songs before the canonical /api/dashboard response arrives. Entries are
// keyed by the Supabase user id from the local session, so one user never
// reads another user's entry. The canonical response always replaces what is
// painted from here.

const DASHBOARD_SCOPE_KEY_PREFIX = 'song_review_dashboard_scope:';

export interface DashboardScopeIdentity {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  authorName: string;
  workspaceId: string;
  workspaceName: string;
  workspaceImageUrl: string | null;
  membershipRole: 'owner' | 'member';
}

export interface CachedDashboardScope<Plan extends string = string> {
  version: 1;
  workspaceId: string;
  identity: DashboardScopeIdentity;
  plan: Plan;
}

function getDashboardScopeKey(userId: string) {
  return `${DASHBOARD_SCOPE_KEY_PREFIX}${userId}`;
}

export function readDashboardScope<Plan extends string>(userId: string): CachedDashboardScope<Plan> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getDashboardScopeKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedDashboardScope<Plan>;
    if (
      parsed?.version !== 1
      || !parsed.workspaceId
      || parsed.identity?.userId !== userId
      || parsed.identity.workspaceId !== parsed.workspaceId
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeDashboardScope<Plan extends string>(payload: {
  identity: DashboardScopeIdentity;
  workspace: { plan: Plan };
}) {
  if (typeof window === 'undefined') return;
  try {
    const { identity } = payload;
    const scope: CachedDashboardScope<Plan> = {
      version: 1,
      workspaceId: identity.workspaceId,
      identity: {
        userId: identity.userId,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
        authorName: identity.authorName,
        workspaceId: identity.workspaceId,
        workspaceName: identity.workspaceName,
        workspaceImageUrl: identity.workspaceImageUrl,
        membershipRole: identity.membershipRole,
      },
      plan: payload.workspace.plan,
    };
    window.localStorage.setItem(getDashboardScopeKey(identity.userId), JSON.stringify(scope));
  } catch {
    // localStorage full or unavailable: the next visit just waits for the network.
  }
}

// Called on sign-out and before a workspace switch reloads the page, so the
// next dashboard paint never shows the previous workspace's songs.
export function clearDashboardScopes() {
  if (typeof window === 'undefined') return;
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(DASHBOARD_SCOPE_KEY_PREFIX)) window.localStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable: nothing cached to clear.
  }
}

// Signed artwork links (/api/media/artwork?access=...) expire after ten
// minutes. Fetching an expired one makes the server re-check the viewer's
// session and workspace before redirecting, so painting a page of cached cards
// with expired links sends one full session check per card at once. After a
// long idle tab that burst stalled the session check and the dashboard
// refresh themselves. Returns null for an expired (or unreadable) signed link
// so the card shows its placeholder until the fresh response brings new links.
// The expiry is only a hint; the server still checks every link.
const ARTWORK_ROUTE_PREFIX = '/api/media/artwork?access=';
const ARTWORK_EXPIRY_MARGIN_SECONDS = 60;

export function liveArtworkUrl(url: string | null | undefined, nowMs = Date.now()): string | null {
  if (!url) return null;
  if (!url.startsWith(ARTWORK_ROUTE_PREFIX)) return url;
  try {
    const token = decodeURIComponent(url.slice(ARTWORK_ROUTE_PREFIX.length));
    const payload = token.split('.')[0] ?? '';
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const { expiresAt } = JSON.parse(atob(padded)) as { expiresAt?: unknown };
    if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) return null;
    return expiresAt - ARTWORK_EXPIRY_MARGIN_SECONDS > nowMs / 1000 ? url : null;
  } catch {
    return null;
  }
}
