import { NextRequest } from 'next/server';
import { normalizeAuthDestination } from '@/lib/authDestination';
import { isEmailPasswordAuthReady } from '@/lib/authFeatureFlags';
import {
  AUTH_INTENT_COOKIE,
  AUTH_INTENT_COOKIE_OPTIONS,
  createAuthIntent,
} from '@/lib/authIntent';
import { parseEmailSignupInput } from '@/lib/emailPasswordAuthCore';
import {
  buildAuthConfirmationRedirect,
  createEmailAuthClient,
  emailAuthJson,
  isSameOriginAuthRequest,
  readEmailAuthJson,
} from '@/lib/emailPasswordAuthServer';
import { REFERRAL_COOKIE_NAME } from '@/lib/referrals';

export async function POST(request: NextRequest) {
  if (!isEmailPasswordAuthReady()) return emailAuthJson({ error: 'Email signup is not available.' }, 404);
  if (!isSameOriginAuthRequest(request)) return emailAuthJson({ error: 'Invalid request.' }, 403);

  const parsed = parseEmailSignupInput(await readEmailAuthJson(request));
  if (parsed.ok === false) return emailAuthJson({ error: parsed.error, field: parsed.field }, 400);

  const destination = normalizeAuthDestination(parsed.value.destination);
  const referralCode = request.cookies.get(REFERRAL_COOKIE_NAME)?.value ?? null;
  const intentToken = createAuthIntent({
    purpose: 'signup',
    destination,
    referralCode,
    email: parsed.value.email,
  });
  const response = emailAuthJson({ ok: true, email: parsed.value.email });
  const supabase = createEmailAuthClient(request, response);
  const { data, error } = await supabase.auth.signUp({
    email: parsed.value.email,
    password: parsed.value.password,
    options: {
      data: { name: parsed.value.name, full_name: parsed.value.name },
      emailRedirectTo: buildAuthConfirmationRedirect(request, intentToken),
      ...(parsed.value.captchaToken ? { captchaToken: parsed.value.captchaToken } : {}),
    },
  });

  if (error) {
    console.warn('[email-auth] Signup request was not accepted.', { code: error.code ?? 'unknown' });
  }
  if (data.session) {
    console.error('[email-auth] Email confirmation is disabled; signup session was not returned.');
    return emailAuthJson({ error: 'Email verification is not configured.' }, 503);
  }

  response.cookies.set(AUTH_INTENT_COOKIE, intentToken, AUTH_INTENT_COOKIE_OPTIONS);
  return response;
}
