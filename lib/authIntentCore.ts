import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export const AUTH_INTENT_VERSION = 1;
export const AUTH_INTENT_TTL_SECONDS = 60 * 60;

export type AuthIntentPurpose = 'invite' | 'login' | 'recovery' | 'signup';
export type AuthIntentDestinationKind = 'dashboard' | 'invite' | 'paid_plan' | 'protected_route' | 'recovery';

export interface AuthIntentPayload {
  version: typeof AUTH_INTENT_VERSION;
  purpose: AuthIntentPurpose;
  destination: {
    kind: AuthIntentDestinationKind;
    path: string;
  };
  referralCode?: string;
  emailHash?: string;
  issuedAt: number;
  expiresAt: number;
}

export interface NewAuthIntent {
  purpose: AuthIntentPurpose;
  destination: AuthIntentPayload['destination'];
  referralCode?: string;
  emailHash?: string;
}

function getKey(secret: string) {
  if (secret.length < 32) {
    throw new Error('AUTH_INTENT_SECRET must contain at least 32 characters.');
  }

  return createHash('sha256').update(secret, 'utf8').digest();
}

function encode(value: Buffer) {
  return value.toString('base64url');
}

function decode(value: string) {
  return Buffer.from(value, 'base64url');
}

function isPurpose(value: unknown): value is AuthIntentPurpose {
  return value === 'invite' || value === 'login' || value === 'recovery' || value === 'signup';
}

function isDestinationKind(value: unknown): value is AuthIntentDestinationKind {
  return value === 'dashboard'
    || value === 'invite'
    || value === 'paid_plan'
    || value === 'protected_route'
    || value === 'recovery';
}

function isSha256Hash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function parsePayload(value: unknown, nowSeconds: number): AuthIntentPayload | null {
  if (!value || typeof value !== 'object') return null;

  const payload = value as Partial<AuthIntentPayload>;
  if (payload.version !== AUTH_INTENT_VERSION || !isPurpose(payload.purpose)) return null;
  if (!payload.destination || typeof payload.destination !== 'object') return null;
  if (!isDestinationKind(payload.destination.kind)) return null;
  if (typeof payload.destination.path !== 'string' || payload.destination.path.length > 1024) return null;
  if (!Number.isInteger(payload.issuedAt) || !Number.isInteger(payload.expiresAt)) return null;
  if ((payload.issuedAt as number) > nowSeconds + 60) return null;
  if ((payload.expiresAt as number) <= nowSeconds) return null;
  if ((payload.expiresAt as number) - (payload.issuedAt as number) > AUTH_INTENT_TTL_SECONDS) return null;
  if (payload.referralCode !== undefined) {
    if (typeof payload.referralCode !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(payload.referralCode)) return null;
  }
  if (payload.emailHash !== undefined && !isSha256Hash(payload.emailHash)) return null;

  return payload as AuthIntentPayload;
}

export function hashAuthIntentEmail(email: string) {
  return createHash('sha256').update(email.trim().toLowerCase(), 'utf8').digest('hex');
}

export function authIntentEmailMatches(payload: AuthIntentPayload, email: string | null | undefined) {
  if (!payload.emailHash) return true;
  if (!email) return false;

  const expected = Buffer.from(payload.emailHash, 'hex');
  const actual = Buffer.from(hashAuthIntentEmail(email), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function sealAuthIntent(
  input: NewAuthIntent,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  const payload: AuthIntentPayload = {
    version: AUTH_INTENT_VERSION,
    purpose: input.purpose,
    destination: input.destination,
    issuedAt: nowSeconds,
    expiresAt: nowSeconds + AUTH_INTENT_TTL_SECONDS,
    ...(input.referralCode ? { referralCode: input.referralCode } : {}),
    ...(input.emailHash ? { emailHash: input.emailHash } : {}),
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(secret), iv);
  cipher.setAAD(Buffer.from(`song-room-auth-intent:${AUTH_INTENT_VERSION}`, 'utf8'));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `v${AUTH_INTENT_VERSION}.${encode(iv)}.${encode(ciphertext)}.${encode(tag)}`;
}

export function unsealAuthIntent(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): AuthIntentPayload | null {
  try {
    if (token.length > 4096) return null;
    const [version, encodedIv, encodedCiphertext, encodedTag, extra] = token.split('.');
    if (version !== `v${AUTH_INTENT_VERSION}` || !encodedIv || !encodedCiphertext || !encodedTag || extra) {
      return null;
    }

    const iv = decode(encodedIv);
    const ciphertext = decode(encodedCiphertext);
    const tag = decode(encodedTag);
    if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) return null;

    const decipher = createDecipheriv('aes-256-gcm', getKey(secret), iv);
    decipher.setAAD(Buffer.from(`song-room-auth-intent:${AUTH_INTENT_VERSION}`, 'utf8'));
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');

    return parsePayload(JSON.parse(plaintext), nowSeconds);
  } catch {
    return null;
  }
}
