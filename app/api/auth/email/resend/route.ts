import { NextRequest } from 'next/server';
import { isEmailPasswordAuthReady } from '@/lib/authFeatureFlags';
import {
  AUTH_INTENT_COOKIE,
  AUTH_INTENT_COOKIE_OPTIONS,
  authIntentEmailMatches,
  createAuthIntent,
  readAuthIntent,
} from '@/lib/authIntent';
import { parseEmailResendInput } from '@/lib/emailPasswordAuthCore';
import { consumeEmailAuthFlow, createEmailAuthFlow } from '@/lib/emailAuthFlows';
import {
  buildAuthConfirmationRedirect,
  createEmailAuthClient,
  emailAuthJson,
  isSameOriginAuthRequest,
  readEmailAuthJson,
} from '@/lib/emailPasswordAuthServer';

export async function POST(request: NextRequest) {
  if (!isEmailPasswordAuthReady()) return emailAuthJson({ error: 'Email verification is not available.' }, 404);
  if (!isSameOriginAuthRequest(request)) return emailAuthJson({ error: 'Invalid request.' }, 403);

  const parsed = parseEmailResendInput(await readEmailAuthJson(request));
  if (parsed.ok === false) return emailAuthJson({ error: parsed.error, field: parsed.field }, 400);

  const previousToken = request.cookies.get(AUTH_INTENT_COOKIE)?.value ?? null;
  let previousIntent = null;
  try {
    previousIntent = readAuthIntent(previousToken);
  } catch {
    previousIntent = null;
  }
  if (
    !previousIntent
    || previousIntent.purpose !== 'signup'
    || !authIntentEmailMatches(previousIntent, parsed.value.email)
  ) {
    return emailAuthJson({ ok: true });
  }

  const intentToken = createAuthIntent({
    purpose: 'signup',
    destination: previousIntent.destination.path,
    referralCode: previousIntent.referralCode,
    email: parsed.value.email,
  });
  let flowId: string;
  try {
    flowId = await createEmailAuthFlow({
      email: parsed.value.email,
      purpose: 'signup',
      sealedIntent: intentToken,
    });
  } catch {
    console.error('[email-auth] Resend confirmation flow could not be created.');
    return emailAuthJson({ error: 'Email verification is temporarily unavailable.' }, 503);
  }
  const response = emailAuthJson({ ok: true });
  const supabase = createEmailAuthClient(request, response);
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: parsed.value.email,
    options: {
      emailRedirectTo: buildAuthConfirmationRedirect(request, flowId),
      captchaToken: parsed.value.captchaToken,
    },
  });

  if (error) {
    console.warn('[email-auth] Verification resend was not accepted.', { code: error.code ?? 'unknown' });
    await consumeEmailAuthFlow(flowId).catch(() => {
      console.warn('[email-auth] Unused resend confirmation flow could not be removed.');
    });
  }

  response.cookies.set(AUTH_INTENT_COOKIE, intentToken, AUTH_INTENT_COOKIE_OPTIONS);
  return response;
}
