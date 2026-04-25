export type AccountPlan = 'free' | 'paid';

export const FREE_COLLABORATOR_LIMIT = 2;
export const FREE_SONG_LIMIT = 5;
export type PlanLimitType = 'collaborators' | 'songs';

export interface PlanLimitPayload {
  error: 'PLAN_LIMIT_REACHED';
  limitType: PlanLimitType;
  limit: number;
  cta: 'upgrade';
  message: string;
}

export function getCollaboratorLimit(plan: AccountPlan): number | null {
  if (plan === 'paid') return null;
  return FREE_COLLABORATOR_LIMIT;
}

export function getCollaboratorLimitLabel(plan: AccountPlan): string {
  const limit = getCollaboratorLimit(plan);
  return limit === null ? 'Unlimited' : `${limit} collaborators`;
}

export function getSongLimit(plan: AccountPlan): number | null {
  if (plan === 'paid') return null;
  return FREE_SONG_LIMIT;
}

export function getSongLimitLabel(plan: AccountPlan): string {
  const limit = getSongLimit(plan);
  return limit === null ? 'Unlimited' : `${limit} songs`;
}

export function createPlanLimitPayload(limitType: PlanLimitType): PlanLimitPayload {
  if (limitType === 'collaborators') {
    return {
      error: 'PLAN_LIMIT_REACHED',
      limitType,
      limit: FREE_COLLABORATOR_LIMIT,
      cta: 'upgrade',
      message: 'Free plan supports up to 2 collaborators. Upgrade to invite your full band.',
    };
  }

  return {
    error: 'PLAN_LIMIT_REACHED',
    limitType,
    limit: FREE_SONG_LIMIT,
    cta: 'upgrade',
    message: 'Free plan includes up to 5 songs. Upgrade to keep uploading and managing more tracks.',
  };
}

export function normalizeAccountPlan(value: string | null | undefined): AccountPlan {
  return value === 'paid' ? 'paid' : 'free';
}

export function isMissingPlanColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const message = 'message' in error && typeof error.message === 'string'
    ? error.message.toLowerCase()
    : '';

  const details = 'details' in error && typeof error.details === 'string'
    ? error.details.toLowerCase()
    : '';

  return (
    message.includes('plan')
    && (
      message.includes('column')
      || details.includes('column')
      || message.includes('schema cache')
    )
  );
}
