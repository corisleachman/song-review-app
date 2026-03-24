export type Identity = 'Coris' | 'Al';

const IDENTITY_COOKIE = 'song_review_identity';
const AUTH_COOKIE = 'song_review_auth';

export const setIdentity = (identity: Identity) => {
  if (typeof document !== 'undefined') {
    document.cookie = `${IDENTITY_COOKIE}=${identity}; path=/; max-age=${7 * 24 * 60 * 60}`;
  }
};

export const getIdentity = (): Identity | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`${IDENTITY_COOKIE}=([^;]+)`));
  return match ? (match[1] as Identity) : null;
};

export const clearIdentity = () => {
  if (typeof document !== 'undefined') {
    document.cookie = `${IDENTITY_COOKIE}=; path=/; max-age=0`;
  }
};

export const setAuth = () => {
  if (typeof document !== 'undefined') {
    document.cookie = `${AUTH_COOKIE}=true; path=/; max-age=${7 * 24 * 60 * 60}`;
  }
};

export const getAuth = (): boolean => {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes(`${AUTH_COOKIE}=true`);
};

export const clearAuth = () => {
  if (typeof document !== 'undefined') {
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
  }
};

export const formatTimestamp = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};
