export type AccountPlan = 'free' | 'pro' | 'studio';

// ---------------------------------------------------------------------------
// Storage limits (bytes)
// ---------------------------------------------------------------------------
export const FREE_STORAGE_LIMIT_BYTES  = 500  * 1024 * 1024;  // 500 MB
export const PRO_STORAGE_LIMIT_BYTES   = 10   * 1024 * 1024 * 1024;  // 10 GB
export const STUDIO_STORAGE_LIMIT_BYTES = 50  * 1024 * 1024 * 1024;  // 50 GB

// ---------------------------------------------------------------------------
// Collaborator limits (null = unlimited)
// ---------------------------------------------------------------------------
export const FREE_COLLABORATOR_LIMIT   = 5;
export const PRO_COLLABORATOR_LIMIT    = null;
export const STUDIO_COLLABORATOR_LIMIT = null;

// ---------------------------------------------------------------------------
// Limit types
// ---------------------------------------------------------------------------
export type PlanLimitType = 'collaborators' | 'storage';

export interface PlanLimitPayload {
  error: 'PLAN_LIMIT_REACHED';
  limitType: PlanLimitType;
  limit: number | null;
  cta: 'upgrade';
  message: string;
}

// ---------------------------------------------------------------------------
// Plan display
// ---------------------------------------------------------------------------
export function getPlanDisplayName(plan: AccountPlan): string {
  if (plan === 'pro')    return 'Pro';
  if (plan === 'studio') return 'Studio';
  return 'Free';
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------
export function getStorageLimit(plan: AccountPlan): number {
  if (plan === 'studio') return STUDIO_STORAGE_LIMIT_BYTES;
  if (plan === 'pro')    return PRO_STORAGE_LIMIT_BYTES;
  return FREE_STORAGE_LIMIT_BYTES;
}

export function getStorageLimitLabel(plan: AccountPlan): string {
  if (plan === 'studio') return '50 GB';
  if (plan === 'pro')    return '10 GB';
  return '500 MB';
}

export function formatStorageBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${bytes} B`;
}

export function isStorageLimitReached(
  plan: AccountPlan,
  usedBytes: number,
  incomingBytes: number,
): boolean {
  return usedBytes + incomingBytes > getStorageLimit(plan);
}

// ---------------------------------------------------------------------------
// Collaborator helpers
// ---------------------------------------------------------------------------
export function getCollaboratorLimit(plan: AccountPlan): number | null {
  if (plan === 'studio') return STUDIO_COLLABORATOR_LIMIT;
  if (plan === 'pro')    return PRO_COLLABORATOR_LIMIT;
  return FREE_COLLABORATOR_LIMIT;
}

export function getCollaboratorLimitLabel(plan: AccountPlan): string {
  const limit = getCollaboratorLimit(plan);
  return limit === null ? 'Unlimited' : `${limit} collaborators`;
}

// ---------------------------------------------------------------------------
// Plan limit payloads
// ---------------------------------------------------------------------------
export function createPlanLimitPayload(
  limitType: PlanLimitType,
  plan: AccountPlan = 'free',
): PlanLimitPayload {
  if (limitType === 'collaborators') {
    const limit = getCollaboratorLimit(plan);
    return {
      error: 'PLAN_LIMIT_REACHED',
      limitType,
      limit,
      cta: 'upgrade',
      message: `Free plan supports up to ${FREE_COLLABORATOR_LIMIT} collaborators. Upgrade to Pro to invite more people.`,
    };
  }

  // storage
  return {
    error: 'PLAN_LIMIT_REACHED',
    limitType,
    limit: getStorageLimit(plan),
    cta: 'upgrade',
    message:
      plan === 'free'
        ? `You've used your 500 MB free storage. Upgrade to Pro for 10 GB.`
        : `You've used your 10 GB Pro storage. Upgrade to Studio for 50 GB.`,
  };
}

// ---------------------------------------------------------------------------
// Normalise plan value from DB (guards against unexpected values)
// ---------------------------------------------------------------------------
export function normalizeAccountPlan(value: string | null | undefined): AccountPlan {
  if (value === 'pro')    return 'pro';
  if (value === 'studio') return 'studio';
  return 'free';
}

// ---------------------------------------------------------------------------
// Plan rank — useful for "is this plan at least X?" checks
// ---------------------------------------------------------------------------
export function planRank(plan: AccountPlan): number {
  if (plan === 'studio') return 2;
  if (plan === 'pro')    return 1;
  return 0;
}

export function isPlanAtLeast(plan: AccountPlan, minimum: AccountPlan): boolean {
  return planRank(plan) >= planRank(minimum);
}

// ---------------------------------------------------------------------------
// Schema cache error guard (retained from original)
// ---------------------------------------------------------------------------
export function isMissingPlanColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const message =
    'message' in error && typeof error.message === 'string'
      ? error.message.toLowerCase()
      : '';

  const details =
    'details' in error && typeof error.details === 'string'
      ? error.details.toLowerCase()
      : '';

  return (
    message.includes('plan') &&
    (message.includes('column') ||
      details.includes('column') ||
      message.includes('schema cache'))
  );
}
