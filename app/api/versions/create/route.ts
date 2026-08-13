import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import {
  normalizeAccountPlan,
  isStorageLimitReached,
  createPlanLimitPayload,
  isMissingPlanColumnError,
} from '@/lib/plans';
import { supabaseServer } from '@/lib/supabaseServer';

const MAX_AUDIO_SIZE_BYTES = 200 * 1024 * 1024;
const MAX_FILE_NAME_LENGTH = 160;
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'aif', 'aiff']);

function normalizeAudioFileName(value: unknown) {
  if (typeof value !== 'string') return null;

  const baseName = value.replace(/\\/g, '/').split('/').pop()?.trim() ?? '';
  const extension = baseName.split('.').pop()?.toLowerCase() ?? '';
  if (!baseName || !AUDIO_EXTENSIONS.has(extension)) return null;

  const safeDisplayName = baseName
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, MAX_FILE_NAME_LENGTH)
    .trim();

  if (!safeDisplayName) return null;

  return { displayName: safeDisplayName, extension };
}

function isMissingUploadIntegrityRpc(error: unknown, functionName: string) {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = 'message' in error && typeof error.message === 'string'
    ? error.message.toLowerCase()
    : '';

  return code === 'PGRST202'
    || code === '42883'
    || (message.includes(functionName.toLowerCase()) && message.includes('schema cache'));
}

export async function POST(req: NextRequest) {
  try {
    const {
      songId: rawSongId,
      fileName,
      fileSize,
      label,
      notes,
    } = await req.json();
    const songId = typeof rawSongId === 'string' ? rawSongId.trim() : '';
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json(
        { error: 'You must be signed in to upload a version.' },
        { status: 401 }
      );
    }

    const normalizedFile = normalizeAudioFileName(fileName);
    const incomingBytes = typeof fileSize === 'number' && Number.isSafeInteger(fileSize)
      ? fileSize
      : 0;

    if (!songId || !normalizedFile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (incomingBytes <= 0 || incomingBytes > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Audio files must be larger than 0 bytes and no more than 200MB.' },
        { status: 400 }
      );
    }

    const normalizedLabel = typeof label === 'string' && label.trim()
      ? label.trim().slice(0, 120)
      : null;
    const normalizedNotes = typeof notes === 'string' && notes.trim()
      ? notes.trim().slice(0, 5000)
      : null;

    // Verify the song belongs to this workspace
    const { data: song, error: songLookupError } = await supabaseServer
      .from('songs')
      .select('id, account_id')
      .eq('id', songId)
      .maybeSingle();

    if (songLookupError) throw songLookupError;

    if (!song) {
      return NextResponse.json({ error: 'Song not found.' }, { status: 404 });
    }

    if (!song.account_id || song.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json(
        { error: 'You do not have access to this song.' },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------------
    // Storage enforcement
    // ---------------------------------------------------------------
    const accountResult = await supabaseServer
      .from('accounts')
      .select('plan, storage_bytes_used')
      .eq('id', resolved.identity.workspaceId)
      .single();

    if (accountResult.error) {
      if (isMissingPlanColumnError(accountResult.error)) {
        // Migration not yet applied — allow upload, skip enforcement
      } else {
        throw accountResult.error;
      }
    }

    if (!isMissingPlanColumnError(accountResult.error) && accountResult.data) {
      const plan        = normalizeAccountPlan(accountResult.data.plan);
      const usedBytes   = accountResult.data.storage_bytes_used ?? 0;

      if (isStorageLimitReached(plan, usedBytes, incomingBytes)) {
        return NextResponse.json(createPlanLimitPayload('storage', plan), { status: 400 });
      }
    }

    // ---------------------------------------------------------------
    // Create version record + signed upload URL
    // ---------------------------------------------------------------
    const filePath = `songs/${songId}/uploads/${randomUUID()}.${normalizedFile.extension}`;

    const { data: urlData, error: urlError } = await supabaseServer.storage
      .from('song-files')
      .createSignedUploadUrl(filePath);

    if (urlError) throw urlError;

    const allocationResult = await supabaseServer.rpc('create_song_version_upload', {
      p_song_id: songId,
      p_account_id: resolved.identity.workspaceId,
      p_label: normalizedLabel,
      p_notes: normalizedNotes,
      p_file_path: filePath,
      p_file_name: normalizedFile.displayName,
      p_file_size_bytes: incomingBytes,
      p_created_by: resolved.identity.authorName,
    });

    let versionId: string;
    let usedAtomicUploadFlow = true;

    if (allocationResult.error) {
      if (!isMissingUploadIntegrityRpc(allocationResult.error, 'create_song_version_upload')) {
        throw allocationResult.error;
      }

      usedAtomicUploadFlow = false;
      console.warn('[versions/create] Upload integrity migration is not applied; using legacy allocation.');

      const { count, error: countError } = await supabaseServer
        .from('song_versions')
        .select('id', { count: 'exact', head: true })
        .eq('song_id', songId);

      if (countError) throw countError;

      const { data: legacyVersion, error: legacyInsertError } = await supabaseServer
        .from('song_versions')
        .insert([{
          song_id: songId,
          version_number: (count ?? 0) + 1,
          label: normalizedLabel,
          notes: normalizedNotes,
          file_path: filePath,
          file_name: normalizedFile.displayName,
          file_size_bytes: incomingBytes,
          created_by: resolved.identity.authorName,
        }])
        .select('id')
        .single();

      if (legacyInsertError) throw legacyInsertError;
      versionId = legacyVersion.id;
    } else {
      const allocated = Array.isArray(allocationResult.data)
        ? allocationResult.data[0]
        : allocationResult.data;

      if (!allocated || typeof allocated.version_id !== 'string') {
        throw new Error('Version allocation returned no version id.');
      }

      versionId = allocated.version_id;
    }

    // ---------------------------------------------------------------
    // Legacy-only accounting while the integrity migration is unavailable.
    // ---------------------------------------------------------------
    if (!usedAtomicUploadFlow && accountResult.data) {
      const currentUsed = accountResult.data.storage_bytes_used ?? 0;
      const { error: storageUpdateError } = await supabaseServer
        .from('accounts')
        .update({ storage_bytes_used: currentUsed + incomingBytes })
        .eq('id', resolved.identity.workspaceId);

      if (storageUpdateError) {
        await supabaseServer.from('song_versions').delete().eq('id', versionId);
        throw storageUpdateError;
      }
    }

    return NextResponse.json(
      { versionId, uploadUrl: urlData.signedUrl, filePath },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json({ error: 'Could not prepare the version upload.' }, { status: 500 });
  }
}
