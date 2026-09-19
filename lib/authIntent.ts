import 'server-only';

import { normalizeAuthDestination, resolveAuthDestination } from '@/lib/authDestination';
import {
  authIntentEmailMatches,
  hashAuthIntentEmail,
  sealAuthIntent as sealAuthIntentCore,
  unsealAuthIntent as unsealAuthIntentCore,
  type AuthIntentPayload,
  type AuthIntentPurpose,
} from '@/lib/authIntentCore';

export const AUTH_INTENT_COOKIE = 'song_room_auth_intent';

export const AUTH_INTENT_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60,
};

function getSecret() {
  const secret = process.env.AUTH_INTENT_SECRET?.trim();
  if (!secret) {
    throw new Error('AUTH_INTENT_SECRET is required to create or read an auth intent.');
  }
  return secret;
}

function hasMatchingDestination(payload: AuthIntentPayload) {
  const destination = resolveAuthDestination(payload.destination.path);
  return destination.kind === payload.destination.kind && destination.path === payload.destination.path;
}

export function createAuthIntent(input: {
  purpose: AuthIntentPurpose;
  destination?: string | null;
  referralCode?: string | null;
  email?: string | null;
}) {
  const destination = resolveAuthDestination(input.destination);
  return sealAuthIntentCore({
    purpose: input.purpose,
    destination,
    ...(input.referralCode ? { referralCode: input.referralCode } : {}),
    ...(input.email ? { emailHash: hashAuthIntentEmail(input.email) } : {}),
  }, getSecret());
}

export function readAuthIntent(token: string | null | undefined) {
  if (!token) return null;
  const payload = unsealAuthIntentCore(token, getSecret());
  if (!payload || !hasMatchingDestination(payload)) return null;
  return payload;
}

export function getAuthIntentDestination(payload: AuthIntentPayload) {
  return normalizeAuthDestination(payload.destination.path);
}

export { authIntentEmailMatches };
export type { AuthIntentPayload };
