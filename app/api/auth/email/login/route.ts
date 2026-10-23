import { NextRequest } from 'next/server';
import { normalizeAuthDestination } from '@/lib/authDestination';
import { isEmailPasswordAuthReady } from '@/lib/authFeatureFlags';
import {
  AUTH_INTENT_COOKIE,
  AUTH_INTENT_COOKIE_OPTIONS,
  createAuthIntent,
} from '@/lib/authIntent';
import { parseEmailLoginInput } from '@/lib/emailPasswordAuthCore';
import { consumeEmailLoginAttempt } from '@/lib/emailLoginRateLimit';
import {
  createEmailAuthClient,
  emailAuthJson,
  isSameOriginAuthRequest,
  readEmailAuthJson,
} from '@/lib/emailPasswordAuthServer';

export async function POST(request: NextRequest) {
  if (!isEmailPasswordAuthReady()) return emailAuthJson({ error: 'Email login is not available.' }, 404);
  if (!isSameOriginAuthRequest(request)) return emailAuthJson({ error: 'Invalid request.' }, 403);

  const parsed = parseEmailLoginInput(await readEmailAuthJson(request));
  if (parsed.ok === false) return emailAuthJson({ error: parsed.error, field: parsed.field }, 400);

  const rateLimit = await consumeEmailLoginAttempt(request);
  if (rateLimit.ok === false) {
    console.error(`[email-login-rate-limit] ${rateLimit.reason}`);
    return emailAuthJson(
      { error: 'Email login is temporarily unavailable. Please try again shortly.' },
      503,
    );
  }
  if (!rateLimit.decision.allowed) {
    const response = emailAuthJson(
      { error: 'Too many login attempts. Please wait a few minutes and try again.' },
      429,
    );
    response.headers.set('Retry-After', String(rateLimit.decision.retryAfterSeconds));
    return response;
  }

  const destination = normalizeAuthDestination(parsed.value.destination);
  const intentToken = createAuthIntent({
    purpose: 'login',
    destination,
    email: parsed.value.email,
  });
  const response = emailAuthJson({ ok: true, continueTo: '/auth/continue' });
  const supabase = createEmailAuthClient(request, response);
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.value.email,
    password: parsed.value.password,
    options: { captchaToken: parsed.value.captchaToken },
  });

  if (error) {
    return emailAuthJson({ error: "Email or password wasn't recognised." }, 401);
  }

  response.cookies.set(AUTH_INTENT_COOKIE, intentToken, AUTH_INTENT_COOKIE_OPTIONS);
  return response;
}
