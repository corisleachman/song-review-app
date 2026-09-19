import 'server-only';

export function isEmailPasswordAuthEnabled() {
  return process.env.EMAIL_PASSWORD_AUTH_ENABLED?.trim().toLowerCase() === 'true';
}

export function isEmailPasswordAuthReady() {
  return isEmailPasswordAuthEnabled()
    && (process.env.AUTH_INTENT_SECRET?.trim().length ?? 0) >= 32;
}
