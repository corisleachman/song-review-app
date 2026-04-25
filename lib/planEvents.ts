import type { PlanLimitType } from '@/lib/plans';

export type PlanEventName = 'plan_limit_hit' | 'upgrade_clicked';

export function logPlanEvent(params: {
  event: PlanEventName;
  type: PlanLimitType;
  workspaceId?: string;
  userId?: string;
}) {
  console.info('[plan-event]', JSON.stringify(params));
}
