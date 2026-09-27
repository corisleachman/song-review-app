import { NextRequest } from 'next/server';
import { isEmailPasswordAuthReady } from '@/lib/authFeatureFlags';
import { createAuthIntent } from '@/lib/authIntent';
import { parseEmailResendInput } from '@/lib/emailPasswordAuthCore';
import {
  buildAuthConfirmationRedirect,
  createEmailAuthClient,
  emailAuthJson,
  isSameOriginAuthRequest,
  readEmailAuthJson,
} from '@/lib/emailPasswordAuthServer';

export async function POST(request: NextRequest) {
  if (!isEmailPasswordAuthReady()) return emailAuthJson({ error: 'Password recovery is not available.' }, 404);
  if (!isSameOriginAuthRequest(request)) return emailAuthJson({ error: 'Invalid request.' }, 403);

  const parsed = parseEmailResendInput(await readEmailAuthJson(request));
  if (parsed.ok === false) return emailAuthJson({ error: parsed.error, field: parsed.field }, 400);

  const intentToken = createAuthIntent({
    purpose: 'recovery',
    destination: '/auth/reset-password',
    email: parsed.value.email,
  });
  const response = emailAuthJson({ ok: true });
  const supabase = createEmailAuthClient(request, response);
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.value.email, {
    redirectTo: buildAuthConfirmationRedirect(request, intentToken),
    captchaToken: parsed.value.captchaToken,
  });

  if (error) {
    console.warn('[email-auth] Password recovery request was not accepted.', { code: error.code ?? 'unknown' });
  }
  return response;
}
