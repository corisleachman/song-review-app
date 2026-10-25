import 'server-only';

export function isEmailPasswordAuthEnabled() {
  return process.env.EMAIL_PASSWORD_AUTH_ENABLED?.trim().toLowerCase() === 'true';
}

function hasReadyEmailLoginRateLimitSecret() {
  const secret = process.env.EMAIL_LOGIN_RATE_LIMIT_SECRET?.trim() ?? '';
  return Buffer.byteLength(secret, 'utf8') >= 32;
}

export function getTurnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';
}

export function isEmailPasswordAuthReady() {
  return isEmailPasswordAuthEnabled()
    && (process.env.AUTH_INTENT_SECRET?.trim().length ?? 0) >= 32
    && getTurnstileSiteKey().length > 0
    && isEmailLoginRateLimitReady();
}

export function isEmailLoginRateLimitEnabled() {
  return process.env.EMAIL_LOGIN_RATE_LIMIT_ENABLED?.trim().toLowerCase() === 'true';
}

export function isEmailLoginRateLimitReady() {
  return isEmailLoginRateLimitEnabled() && hasReadyEmailLoginRateLimitSecret();
}

export function isSignedInPasswordManagementReady() {
  return isEmailPasswordAuthReady()
    && process.env.SIGNED_IN_PASSWORD_MANAGEMENT_ENABLED?.trim().toLowerCase() === 'true';
}
