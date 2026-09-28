import { notFound } from 'next/navigation';
import { isSignedInPasswordManagementReady } from '@/lib/authFeatureFlags';
import PasswordManagementForm from './PasswordManagementForm';

export const dynamic = 'force-dynamic';

export default function AccountSecurityPage() {
  if (!isSignedInPasswordManagementReady()) notFound();
  return <PasswordManagementForm />;
}
