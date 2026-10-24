const RETURN_PATH_BASE = 'https://song-room.invalid';
const MAX_RETURN_PATH_LENGTH = 2048;

function parsePendingLoginPath(value: string | null | undefined) {
  if (!value || value.length > MAX_RETURN_PATH_LENGTH) return null;

  try {
    const url = new URL(value, RETURN_PATH_BASE);
    if (url.origin !== RETURN_PATH_BASE || url.pathname !== '/login' || url.hash) return null;
    return url;
  } catch {
    return null;
  }
}

export function getSignupReturnPath(value: string | null | undefined) {
  const url = parsePendingLoginPath(value);
  return url ? `${url.pathname}${url.search}` : '/signup/free';
}

export function getExistingAccountReturnPath(value: string | null | undefined) {
  const url = parsePendingLoginPath(value) ?? new URL('/login', RETURN_PATH_BASE);
  url.searchParams.delete('signupPlan');
  url.searchParams.delete('billing');
  url.searchParams.set('email', '1');
  return `${url.pathname}${url.search}`;
}
