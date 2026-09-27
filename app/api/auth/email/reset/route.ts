import { NextRequest } from 'next/server';
import { isEmailPasswordAuthReady } from '@/lib/authFeatureFlags';
import {
  AUTH_INTENT_COOKIE,
  AUTH_INTENT_COOKIE_OPTIONS,
  authIntentEmailMatches,
  readAuthIntent,
} from '@/lib/authIntent';
import { parsePasswordResetInput } from '@/lib/emailPasswordAuthCore';
import {
  createEmailAuthClient,
  emailAuthJson,
  isSameOriginAuthRequest,
  readEmailAuthJson,
} from '@/lib/emailPasswordAuthServer';

export async function POST(request: NextRequest) {
  if (!isEmailPasswordAuthReady()) return emailAuthJson({ error: 'Password recovery is not available.' }, 404);
  if (!isSameOriginAuthRequest(request)) return emailAuthJson({ error: 'Invalid request.' }, 403);

  const parsed = parsePasswordResetInput(await readEmailAuthJson(request));
  if (parsed.ok === false) return emailAuthJson({ error: parsed.error, field: parsed.field }, 400);

  let intent = null;
  try {
    intent = readAuthIntent(request.cookies.get(AUTH_INTENT_COOKIE)?.value);
  } catch {
    return emailAuthJson({ error: 'This reset link is no longer valid. Request another link.' }, 401);
  }
  if (
    intent?.purpose !== 'recovery_verified'
    || intent.destination.kind !== 'recovery'
    || intent.destination.path !== '/auth/reset-password'
    || !intent.emailHash
  ) {
    return emailAuthJson({ error: 'This reset link is no longer valid. Request another link.' }, 401);
  }

  const response = emailAuthJson({ ok: true });
  const supabase = createEmailAuthClient(request, response);
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user?.email || !authIntentEmailMatches(intent, data.user.email)) {
    return emailAuthJson({ error: 'This reset link is no longer valid. Request another link.' }, 401);
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.value.password });
  if (updateError) {
    console.warn('[email-auth] Password reset was not accepted.', { code: updateError.code ?? 'unknown' });
    return emailAuthJson({ error: 'Your password could not be updated. Please try again.' }, 400);
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });
  if (signOutError) {
    console.warn('[email-auth] Other sessions could not be signed out after password reset.', {
      code: signOutError.code ?? 'unknown',
    });
  }
  response.cookies.set(AUTH_INTENT_COOKIE, '', { ...AUTH_INTENT_COOKIE_OPTIONS, maxAge: 0 });
  response.headers.set('X-Other-Sessions-Signed-Out', signOutError ? 'false' : 'true');
  return response;
}
