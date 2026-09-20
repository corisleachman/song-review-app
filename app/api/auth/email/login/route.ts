import { NextRequest } from 'next/server';
import { normalizeAuthDestination } from '@/lib/authDestination';
import { isEmailPasswordAuthReady } from '@/lib/authFeatureFlags';
import {
  AUTH_INTENT_COOKIE,
  AUTH_INTENT_COOKIE_OPTIONS,
  createAuthIntent,
} from '@/lib/authIntent';
import { parseEmailLoginInput } from '@/lib/emailPasswordAuthCore';
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

  const destination = normalizeAuthDestination(parsed.value.destination);
  const intentToken = createAuthIntent({
    purpose: 'login',
    destination,
    email: parsed.value.email,
  });
  const response = emailAuthJson({ ok: true, continueTo: `/auth/continue?intent=${encodeURIComponent(intentToken)}` });
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
