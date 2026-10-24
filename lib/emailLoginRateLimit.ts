import 'server-only';

import { NextRequest } from 'next/server';
import { isEmailLoginRateLimitEnabled } from '@/lib/authFeatureFlags';
import {
  hashEmailLoginVisitorIp,
  parseEmailLoginRateLimitDecision,
  readVercelVisitorIp,
  type EmailLoginRateLimitDecision,
} from '@/lib/emailLoginRateLimitCore';
import { supabaseServer } from '@/lib/supabaseServer';

type EmailLoginRateLimitResult =
  | { ok: true; decision: EmailLoginRateLimitDecision }
  | {
    ok: false;
    reason: 'disabled' | 'missing_ip' | 'missing_secret' | 'rpc_failed' | 'invalid_result';
  };

export async function consumeEmailLoginAttempt(
  request: NextRequest,
): Promise<EmailLoginRateLimitResult> {
  if (!isEmailLoginRateLimitEnabled()) return { ok: false, reason: 'disabled' };

  const visitorIp = readVercelVisitorIp(request.headers);
  if (!visitorIp) return { ok: false, reason: 'missing_ip' };

  const secret = process.env.EMAIL_LOGIN_RATE_LIMIT_SECRET?.trim() ?? '';
  if (!secret) return { ok: false, reason: 'missing_secret' };

  let clientHash: string;
  try {
    clientHash = hashEmailLoginVisitorIp(visitorIp, secret);
  } catch {
    return { ok: false, reason: 'missing_secret' };
  }

  const { data, error } = await supabaseServer.rpc('consume_email_login_attempt', {
    p_client_hash: clientHash,
  });
  if (error) return { ok: false, reason: 'rpc_failed' };

  const decision = parseEmailLoginRateLimitDecision(data);
  if (!decision) return { ok: false, reason: 'invalid_result' };

  return { ok: true, decision };
}
