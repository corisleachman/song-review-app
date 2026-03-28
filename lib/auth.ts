export type Identity = 'Coris' | 'Al';

const IDENTITY_COOKIE = 'song_review_identity';
const AUTH_COOKIE = 'song_review_auth';
const IDENTITY_STORAGE_KEY = 'song_review_identity';
const AUTH_STORAGE_KEY = 'song_review_auth';

function buildCookie(name: string, value: string, maxAgeSeconds: number) {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; secure' : '';
  return `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export const setIdentity = (identity: Identity) => {
  if (typeof document !== 'undefined') {
    document.cookie = buildCookie(IDENTITY_COOKIE, identity, 7 * 24 * 60 * 60);
    window.localStorage.setItem(IDENTITY_STORAGE_KEY, identity);
  }
};

export const getIdentity = (): Identity | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`${IDENTITY_COOKIE}=([^;]+)`));
  if (match) {
    return decodeURIComponent(match[1]) as Identity;
  }

  const stored = window.localStorage.getItem(IDENTITY_STORAGE_KEY);
  return stored === 'Coris' || stored === 'Al' ? stored : null;
};

export const clearIdentity = () => {
  if (typeof document !== 'undefined') {
    document.cookie = buildCookie(IDENTITY_COOKIE, '', 0);
    window.localStorage.removeItem(IDENTITY_STORAGE_KEY);
  }
};

export const setAuth = () => {
  if (typeof document !== 'undefined') {
    document.cookie = buildCookie(AUTH_COOKIE, 'true', 7 * 24 * 60 * 60);
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
  }
};

export const getAuth = (): boolean => {
  if (typeof document === 'undefined') return false;
  if (document.cookie.includes(`${AUTH_COOKIE}=true`)) {
    return true;
  }

  return window.localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
};

export const clearAuth = () => {
  if (typeof document !== 'undefined') {
    document.cookie = buildCookie(AUTH_COOKIE, '', 0);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

export const formatTimestamp = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};
