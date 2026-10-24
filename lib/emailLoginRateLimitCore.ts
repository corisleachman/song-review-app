import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

export const EMAIL_LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 15;
export const EMAIL_LOGIN_RATE_LIMIT_WINDOW_SECONDS = 300;
export const EMAIL_LOGIN_RATE_LIMIT_SECRET_MIN_BYTES = 32;

export type EmailLoginRateLimitDecision = {
  allowed: boolean;
  attemptCount: number;
  retryAfterSeconds: number;
};

export function readVercelVisitorIp(headers: Pick<Headers, 'get'>) {
  const candidate = headers.get('x-vercel-forwarded-for')?.trim() ?? '';
  return isIP(candidate) === 0 ? null : candidate;
}

export function hashEmailLoginVisitorIp(visitorIp: string, secret: string) {
  const normalizedSecret = secret.trim();
  if (Buffer.byteLength(normalizedSecret, 'utf8') < EMAIL_LOGIN_RATE_LIMIT_SECRET_MIN_BYTES) {
    throw new Error('Email login rate-limit secret must be at least 32 bytes.');
  }
  if (isIP(visitorIp) === 0) {
    throw new Error('Email login rate-limit visitor address is invalid.');
  }

  return createHmac('sha256', normalizedSecret).update(visitorIp).digest('hex');
}

export function parseEmailLoginRateLimitDecision(value: unknown): EmailLoginRateLimitDecision | null {
  if (!Array.isArray(value) || value.length !== 1) return null;
  const row = value[0];
  if (!row || typeof row !== 'object') return null;

  const allowed = Reflect.get(row, 'allowed');
  const attemptCount = Reflect.get(row, 'attempt_count');
  const retryAfterSeconds = Reflect.get(row, 'retry_after_seconds');

  if (typeof allowed !== 'boolean') return null;
  if (!Number.isInteger(attemptCount) || attemptCount < 1) return null;
  if (
    !Number.isInteger(retryAfterSeconds)
    || retryAfterSeconds < 1
    || retryAfterSeconds > EMAIL_LOGIN_RATE_LIMIT_WINDOW_SECONDS
  ) return null;

  return { allowed, attemptCount, retryAfterSeconds };
}
