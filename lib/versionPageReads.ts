// Workspace-scoped reads shared by the song, version and version-list GET
// routes and by the combined version-page route. Each read takes the caller's
// canonical workspace id (already resolved once by the route) and returns the
// exact status and body the individual route has always returned, so access
// rules live in one place.
import { artworkDeliveryUrl } from '@/lib/artworkAccess';
import { audioDeliveryUrl } from '@/lib/mediaDelivery';
import { supabaseServer } from '@/lib/supabaseServer';
import { withVersionDisplayName } from '@/lib/versionDisplay';

export interface ReadResult {
  status: number;
  body: Record<string, unknown>;
}

export async function loadVersionWithWorkspace(versionId: string) {
  const { data, error } = await supabaseServer
    .from('song_versions')
    .select('*, workspace_song:songs!song_versions_song_id_fkey(account_id)')
    .eq('id', versionId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return { version: null, workspaceId: null };
  }

  // Keep the parent workspace check server-side without another round trip.
  const { workspace_song, ...version } = data;
  return { version, workspaceId: workspace_song?.account_id ?? null };
}

function normalizeStoragePath(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  const prefix = 'song-files/';

  return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
}

function splitStoragePath(path: string) {
  const parts = path.split('/').filter(Boolean);
  const fileName = parts.pop() ?? '';

  return {
    folder: parts.join('/'),
    fileName,
  };
}

async function storageObjectExists(path: string) {
  const { folder, fileName } = splitStoragePath(path);

  if (!folder || !fileName) {
    return false;
  }

  const { data, error } = await supabaseServer.storage
    .from('song-files')
    .list(folder, { limit: 100, search: fileName });

  if (error) throw error;

  return (data ?? []).some(item => item.name === fileName);
}

export async function readSongForWorkspace(songId: string, workspaceId: string): Promise<ReadResult> {
  const { data, error } = await supabaseServer
    .from('songs')
    .select('id, title, image_url, status, account_id, is_public, public_comments_enabled')
    .eq('id', songId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return { status: 404, body: { error: 'Song not found' } };
  }

  if (!data.account_id || data.account_id !== workspaceId) {
    return { status: 403, body: { error: 'You do not have access to this song.' } };
  }

  const { account_id: _accountId, ...song } = data;

  return {
    status: 200,
    body: { song: { ...song, image_url: artworkDeliveryUrl('song', song.id, song.image_url) } },
  };
}

export async function readVersionForWorkspace(versionId: string, workspaceId: string): Promise<ReadResult> {
  const { version, workspaceId: versionWorkspaceId } = await loadVersionWithWorkspace(versionId);

  if (!version) {
    return { status: 404, body: { error: 'Version not found' } };
  }

  if (!versionWorkspaceId || versionWorkspaceId !== workspaceId) {
    return { status: 403, body: { error: 'You do not have access to this version.' } };
  }

  let audioUrl: string | null = null;
  let audioMissing = false;
  const uploadIsPending = Object.prototype.hasOwnProperty.call(version, 'upload_finalized_at')
    && !version.upload_finalized_at;

  if (version.file_path && !uploadIsPending) {
    const normalizedFilePath = normalizeStoragePath(version.file_path);
    const hasAudioObject = await storageObjectExists(normalizedFilePath);

    if (hasAudioObject) {
      audioUrl = audioDeliveryUrl(version.id);
    } else {
      audioMissing = true;
    }
  } else if (uploadIsPending) {
    audioMissing = true;
  }

  return {
    status: 200,
    body: { version: { ...withVersionDisplayName(version), audioUrl, audioMissing } },
  };
}

export async function listFinalizedVersionsForWorkspace(songId: string, workspaceId: string): Promise<ReadResult> {
  const { data: song, error: songError } = await supabaseServer
    .from('songs')
    .select('id, account_id')
    .eq('id', songId)
    .maybeSingle();

  if (songError) throw songError;

  if (!song) {
    return { status: 404, body: { error: 'Song not found.' } };
  }

  if (!song.account_id || song.account_id !== workspaceId) {
    return { status: 403, body: { error: 'You do not have access to this song.' } };
  }

  const { data, error } = await supabaseServer
    .from('song_versions')
    .select('id, song_id, version_number, label, notes, file_path, file_name, created_by, created_at')
    .eq('song_id', songId)
    .not('upload_finalized_at', 'is', null)
    .order('version_number', { ascending: false });

  if (error) throw error;

  return { status: 200, body: { versions: (data || []).map(withVersionDisplayName) } };
}
