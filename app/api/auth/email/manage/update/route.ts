import { NextRequest } from 'next/server';
import { isSignedInPasswordManagementReady } from '@/lib/authFeatureFlags';
import { parseManagedPasswordInput } from '@/lib/emailPasswordAuthCore';
import {
  createEmailAuthClient,
  emailAuthJson,
  isSameOriginAuthRequest,
  readEmailAuthJson,
} from '@/lib/emailPasswordAuthServer';

export async function POST(request: NextRequest) {
  if (!isSignedInPasswordManagementReady()) return emailAuthJson({ error: 'Password settings are not available.' }, 404);
  if (!isSameOriginAuthRequest(request)) return emailAuthJson({ error: 'Invalid request.' }, 403);

  const parsed = parseManagedPasswordInput(await readEmailAuthJson(request));
  if (parsed.ok === false) return emailAuthJson({ error: parsed.error, field: parsed.field }, 400);

  const response = emailAuthJson({ ok: true });
  const supabase = createEmailAuthClient(request, response);
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user?.email) return emailAuthJson({ error: 'Please sign in again.' }, 401);

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.value.password,
    nonce: parsed.value.nonce,
  });
  if (updateError) {
    if (updateError.code === 'reauthentication_needed') {
      return emailAuthJson({ error: 'Email verification is required before changing your password.', reauthenticationRequired: true }, 428);
    }
    console.warn('[email-auth] Signed-in password update was not accepted.', { code: updateError.code ?? 'unknown' });
    return emailAuthJson({ error: 'The code or password was not accepted. Check both and try again.' }, 400);
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });
  if (signOutError) {
    console.warn('[email-auth] Other sessions could not be signed out after password update.', {
      code: signOutError.code ?? 'unknown',
    });
  }
  response.headers.set('X-Other-Sessions-Signed-Out', signOutError ? 'false' : 'true');
  return response;
}
