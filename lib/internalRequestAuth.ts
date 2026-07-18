import { createHmac, timingSafeEqual } from 'crypto';

export const INTERNAL_REQUEST_SIGNATURE_HEADER = 'x-song-room-internal-signature';

const SIGNATURE_CONTEXT = 'song-room-internal-request-v1';
const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

function getSigningSecret() {
  const secret = process.env.INTERNAL_API_SECRET?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!secret) {
    throw new Error('Internal request signing secret is not configured.');
  }

  return secret;
}

function createDigest(body: string, timestamp: string) {
  return createHmac('sha256', getSigningSecret())
    .update(`${SIGNATURE_CONTEXT}.${timestamp}.${body}`)
    .digest('hex');
}

export function signInternalRequest(body: string, timestamp = Date.now()) {
  const timestampValue = String(timestamp);
  return `${timestampValue}.${createDigest(body, timestampValue)}`;
}

export function verifyInternalRequestSignature(body: string, signature: string | null) {
  if (!signature) return false;

  const separatorIndex = signature.indexOf('.');
  if (separatorIndex <= 0) return false;

  const timestamp = signature.slice(0, separatorIndex);
  const suppliedDigest = signature.slice(separatorIndex + 1);
  const timestampNumber = Number(timestamp);

  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() - timestampNumber) > SIGNATURE_MAX_AGE_MS) {
    return false;
  }

  const expectedDigest = createDigest(body, timestamp);
  const suppliedBuffer = Buffer.from(suppliedDigest, 'utf8');
  const expectedBuffer = Buffer.from(expectedDigest, 'utf8');

  return suppliedBuffer.length === expectedBuffer.length
    && timingSafeEqual(suppliedBuffer, expectedBuffer);
}
