import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  displayName: string | null;
}

function getDisplayNameFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const metadata = user.user_metadata ?? {};
  const fullName = typeof metadata.full_name === 'string' ? metadata.full_name.trim() : '';
  const name = typeof metadata.name === 'string' ? metadata.name.trim() : '';
  const fallbackEmail = typeof user.email === 'string' ? user.email : '';

  if (fullName) return fullName;
  if (name) return name;
  if (fallbackEmail.includes('@')) return fallbackEmail.split('@')[0];
  return fallbackEmail || null;
}

export async function getCurrentAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = createRouteHandlerClient({ cookies });
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    displayName: getDisplayNameFromUser(data.user),
  };
}
