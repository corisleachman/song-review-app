const SAFE_SEGMENT = '[A-Za-z0-9_-]{1,128}';
const SAFE_INVITE_TOKEN = '[A-Za-z0-9_-]{16,256}';

export type AuthDestinationKind = 'dashboard' | 'invite' | 'paid_plan' | 'protected_route' | 'recovery';

export interface AuthDestination {
  kind: AuthDestinationKind;
  path: string;
}

function normalizeUpgradePath(url: URL): string | null {
  if (url.pathname !== '/upgrade') return null;

  const allowedKeys = new Set(['plan', 'billing', 'source', 'billingStatus']);
  if (Array.from(url.searchParams.keys()).some(key => !allowedKeys.has(key))) return null;

  const plan = url.searchParams.get('plan');
  if (plan !== 'pro' && plan !== 'studio') return null;

  const billing = url.searchParams.get('billing') === 'month' ? 'month' : 'year';
  const source = url.searchParams.get('source');
  const billingStatus = url.searchParams.get('billingStatus');

  if (source !== 'pricing' && source !== 'checkout') return null;
  if (source === 'pricing' && billingStatus !== null) return null;
  if (source === 'checkout' && billingStatus !== 'cancelled') return null;

  const params = new URLSearchParams({ plan, billing, source });
  if (billingStatus) params.set('billingStatus', billingStatus);

  return `/upgrade?${params.toString()}`;
}

export function resolveAuthDestination(value: string | null | undefined): AuthDestination {
  const candidate = value?.trim() ?? '';
  if (!candidate || candidate.length > 1024 || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return { kind: 'dashboard', path: '/dashboard' };
  }

  if (candidate.includes('\\') || candidate.includes('#') || /[\u0000-\u001f\u007f]/.test(candidate)) {
    return { kind: 'dashboard', path: '/dashboard' };
  }

  let url: URL;
  try {
    url = new URL(candidate, 'https://song-room.local');
  } catch {
    return { kind: 'dashboard', path: '/dashboard' };
  }

  if (url.origin !== 'https://song-room.local') {
    return { kind: 'dashboard', path: '/dashboard' };
  }

  if (url.pathname === '/' || url.pathname === '/dashboard') {
    return { kind: 'dashboard', path: '/dashboard' };
  }

  if (url.pathname === '/auth/reset-password' && url.search === '') {
    return { kind: 'recovery', path: '/auth/reset-password' };
  }

  const upgradePath = normalizeUpgradePath(url);
  if (upgradePath) {
    return { kind: 'paid_plan', path: upgradePath };
  }

  const invitePattern = new RegExp(`^/invite/${SAFE_INVITE_TOKEN}$`);
  if (invitePattern.test(url.pathname) && url.search === '') {
    return { kind: 'invite', path: url.pathname };
  }

  const protectedPatterns = [
    /^\/settings(?:\/(?:workspace|collaborators|plan|appearance|privacy|referrals))?$/,
    /^\/playlists$/,
    new RegExp(`^/playlists/${SAFE_SEGMENT}$`),
    new RegExp(`^/songs/${SAFE_SEGMENT}$`),
    new RegExp(`^/songs/${SAFE_SEGMENT}/upload$`),
    new RegExp(`^/songs/${SAFE_SEGMENT}/versions/${SAFE_SEGMENT}$`),
  ];

  if (url.search === '' && protectedPatterns.some(pattern => pattern.test(url.pathname))) {
    return { kind: 'protected_route', path: url.pathname };
  }

  return { kind: 'dashboard', path: '/dashboard' };
}

export function normalizeAuthDestination(value: string | null | undefined): string {
  return resolveAuthDestination(value).path;
}

export function normalizePostLoginUpgradePath(value: string | null | undefined): string | null {
  const destination = resolveAuthDestination(value);
  return destination.kind === 'paid_plan' ? destination.path : null;
}
