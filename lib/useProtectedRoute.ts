import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuth, getIdentity } from '@/lib/auth';

export function useProtectedRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = getAuth();
  const identity = getIdentity();

  useEffect(() => {
    if (!auth || !identity) {
      const redirectTo = searchParams.get('redirectTo') || '/dashboard';
      router.push(`/?redirectTo=${encodeURIComponent(redirectTo)}`);
    }
  }, [router, auth, identity, searchParams]);

  return { auth, identity, isLoading: auth === undefined };
}
