export type SongStatus = 'writing' | 'in_progress' | 'mixing' | 'mastering' | 'finished';

export const SONG_STATUS_VALUES = ['writing', 'in_progress', 'mixing', 'mastering', 'finished'] as const;
export const DEFAULT_SONG_STATUS: SongStatus = 'in_progress';

export function isSongStatus(value: unknown): value is SongStatus {
  return typeof value === 'string' && SONG_STATUS_VALUES.includes(value as SongStatus);
}

export function normalizeSongStatus(value: unknown): SongStatus {
  return isSongStatus(value) ? value : DEFAULT_SONG_STATUS;
}

export function getSongStatusLabel(status: SongStatus) {
  if (status === 'in_progress') return 'In progress';
  return status.charAt(0).toUpperCase() + status.slice(1);
}
