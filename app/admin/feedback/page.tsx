import { notFound } from 'next/navigation';
import { getCurrentAuthenticatedUser } from '@/lib/currentUser';
import { isAdminEmail } from '@/lib/isAdmin';
import FeedbackTriage from './FeedbackTriage';

export const dynamic = 'force-dynamic';

export default async function AdminFeedbackPage() {
  const user = await getCurrentAuthenticatedUser();
  if (!isAdminEmail(user?.email)) {
    notFound();
  }
  return <FeedbackTriage />;
}
