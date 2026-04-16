export type AwaitingResponseState = 'me' | 'theirs' | null;

export type SongActivityType =
  | 'version_uploaded'
  | 'comment_added'
  | 'reply_added'
  | 'action_created'
  | 'action_status_changed';

export interface SongActivityItem {
  id: string;
  type: SongActivityType;
  createdAt: string;
  summary: string;
  detail: string | null;
}

export function getAwaitingResponseLabel(state: AwaitingResponseState) {
  if (state === 'me') return 'Awaiting me';
  if (state === 'theirs') return 'Awaiting them';
  return null;
}

