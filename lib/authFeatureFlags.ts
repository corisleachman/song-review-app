import 'server-only';

export function isEmailPasswordAuthEnabled() {
  return process.env.EMAIL_PASSWORD_AUTH_ENABLED?.trim().toLowerCase() === 'true';
}
