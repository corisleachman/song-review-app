import { redirect } from 'next/navigation';
import { isEmailPasswordAuthReady } from '@/lib/authFeatureFlags';

export const dynamic = 'force-dynamic';

export default function CheckEmailLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!isEmailPasswordAuthReady()) {
    redirect('/login?auth=email_unavailable');
  }

  return children;
}
