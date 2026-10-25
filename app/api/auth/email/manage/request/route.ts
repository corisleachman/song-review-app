import { NextRequest } from 'next/server';
import { isSignedInPasswordManagementReady } from '@/lib/authFeatureFlags';
import {
  createEmailAuthClient,
  emailAuthJson,
  isSameOriginAuthRequest,
} from '@/lib/emailPasswordAuthServer';

export async function POST(request: NextRequest) {
  if (!isSignedInPasswordManagementReady()) return emailAuthJson({ error: 'Password settings are not available.' }, 404);
  if (!isSameOriginAuthRequest(request)) return emailAuthJson({ error: 'Invalid request.' }, 403);

  const response = emailAuthJson({ ok: true });
  const supabase = createEmailAuthClient(request, response);
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user?.email) return emailAuthJson({ error: 'Please sign in again.' }, 401);

  const { error } = await supabase.auth.reauthenticate();
  if (error) {
    console.warn('[email-auth] Password reauthentication email was not accepted.', { code: error.code ?? 'unknown' });
    return emailAuthJson({ error: 'We could not send a verification code. Please try again later.' }, 429);
  }
  return response;
}
