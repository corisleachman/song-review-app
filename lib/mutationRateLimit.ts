import 'server-only';

import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { readVercelVisitorIp } from '@/lib/emailLoginRateLimitCore';
import { supabaseServer } from '@/lib/supabaseServer';

export type MutationRateLimitScope = 'public_comment' | 'workspace_comment' | 'workspace_invite';

// Separate domain from login counters. Uses an existing server-only key; no new
// deployment secret, raw IP address or recipient address is stored in Postgres.
function hashSubject(scope: string, subject: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  if (Buffer.byteLength(secret, 'utf8') < 32 || !subject) throw new Error('Limiter unavailable');
  return createHmac('sha256', secret)
    .update(JSON.stringify(['song-room-mutation-rate-limit-v1', scope, subject])).digest('hex');
}

export async function enforceMutationRateLimit(
  scope: MutationRateLimitScope,
  subject: string,
  recipient?: string,
): Promise<NextResponse | null> {
  try {
    const { data, error } = await supabaseServer.rpc('consume_mutation_attempt', {
      p_scope: scope,
      p_subject_hash: hashSubject(scope, subject),
      p_recipient_hash: recipient === undefined ? null
        : hashSubject('workspace_invite_recipient', JSON.stringify([subject, recipient])),
    });
    if (error) throw new Error('Limiter RPC failed');
    const row = Array.isArray(data) && data.length === 1 ? data[0] : null;
    if (!row || typeof row.allowed !== 'boolean'
      || !Number.isInteger(row.retry_after_seconds)
      || row.retry_after_seconds < (row.allowed ? 0 : 1)
      || row.retry_after_seconds > 3600) throw new Error('Invalid limiter response');
    if (row.allowed) return null;
    return NextResponse.json(
      { error: scope === 'workspace_invite'
        ? 'Please wait before sending another invitation.'
        : 'You\'re commenting too fast. Please wait a moment.',
      retryAfterSeconds: row.retry_after_seconds },
      { status: 429, headers: { 'Retry-After': String(row.retry_after_seconds), 'Cache-Control': 'no-store' } },
    );
  } catch {
    // Don't log hashes, identities, keys or raw provider responses.
    console.error('[mutation-rate-limit] unavailable', { scope });
    return unavailableResponse();
  }
}

function unavailableResponse() {
  return NextResponse.json(
    { error: 'We couldn\'t check this request. Please try again shortly.' },
    { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } },
  );
}

export async function enforcePublicCommentRateLimit(request: NextRequest) {
  // Vercel overwrites this header. Never trust a client-supplied X-Forwarded-For.
  const ip = readVercelVisitorIp(request.headers);
  if (!ip) return unavailableResponse();
  return enforceMutationRateLimit('public_comment', ip);
}
