import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isEmailPasswordAuthReady } from '@/lib/authFeatureFlags';
import { AUTH_INTENT_COOKIE, authIntentEmailMatches, readAuthIntent } from '@/lib/authIntent';
import { getCurrentAuthenticatedUser } from '@/lib/currentUser';
import ResetPasswordForm from './ResetPasswordForm';

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage() {
  if (!isEmailPasswordAuthReady()) redirect('/login?auth=email_unavailable');

  const cookieStore = await cookies();
  let intent = null;
  try {
    intent = readAuthIntent(cookieStore.get(AUTH_INTENT_COOKIE)?.value);
  } catch {
    intent = null;
  }
  const user = intent?.purpose === 'recovery_verified'
    ? await getCurrentAuthenticatedUser()
    : null;
  const verified = Boolean(
    intent?.purpose === 'recovery_verified'
    && intent.destination.kind === 'recovery'
    && intent.destination.path === '/auth/reset-password'
    && intent.emailHash
    && user?.email
    && authIntentEmailMatches(intent, user.email)
  );

  return <ResetPasswordForm verified={verified} />;
}
