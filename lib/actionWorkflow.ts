export type ActionStatus = 'open' | 'in_progress' | 'done';

const ACTION_STATUS_INPUTS = ['open', 'in_progress', 'done', 'pending', 'approved', 'completed'] as const;

export function isActionStatusInput(value: unknown): value is (typeof ACTION_STATUS_INPUTS)[number] {
  return typeof value === 'string' && ACTION_STATUS_INPUTS.includes(value as (typeof ACTION_STATUS_INPUTS)[number]);
}

export function normalizeActionStatus(value: unknown): ActionStatus {
  if (value === 'done' || value === 'completed') return 'done';
  if (value === 'in_progress' || value === 'approved') return 'in_progress';
  return 'open';
}

export function getNextActionStatus(status: ActionStatus): ActionStatus {
  if (status === 'open') return 'in_progress';
  if (status === 'in_progress') return 'done';
  return 'open';
}

export function getActionStatusLabel(status: ActionStatus) {
  if (status === 'in_progress') return 'In progress';
  if (status === 'done') return 'Done';
  return 'Open';
}

export function getActionStatusToast(status: ActionStatus) {
  if (status === 'in_progress') return 'Action moved to in progress';
  if (status === 'done') return 'Action marked done';
  return 'Action reopened';
}

export function isOpenAction(status: ActionStatus) {
  return status !== 'done';
}
