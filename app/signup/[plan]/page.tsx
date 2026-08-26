import { notFound, redirect } from 'next/navigation';
import { getSignupIntent } from '@/lib/signupIntent';

type SignupPageProps = {
  params: Promise<{ plan: string }>;
  searchParams: Promise<{ billing?: string | string[] }>;
};

export default async function SignupPage({ params, searchParams }: SignupPageProps) {
  const [{ plan }, query] = await Promise.all([params, searchParams]);
  const billing = typeof query.billing === 'string' ? query.billing : null;
  const intent = getSignupIntent(plan, billing);

  if (!intent) notFound();

  const loginParams = new URLSearchParams({ signupPlan: intent.plan });
  if (intent.billing) loginParams.set('billing', intent.billing);

  redirect(`/login?${loginParams.toString()}`);
}
