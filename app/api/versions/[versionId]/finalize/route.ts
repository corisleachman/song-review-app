import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import {
  createPlanLimitPayload,
  getStorageLimit,
  isMissingPlanColumnError,
  isStorageLimitReached,
  normalizeAccountPlan,
} from '@/lib/plans';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const MAX_AUDIO_SIZE_BYTES = 200 * 1024 * 1024;

function normalizeStoragePath(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  const prefix = 'song-files/';
  return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
}

function getErrorDetails(error: unknown) {
  if (!error || typeof error !== 'object') return { code: '', message: '' };

  return {
    code: 'code' in error && typeof error.code === 'string' ? error.code : '',
    message: 'message' in error && typeof error.message === 'string'
      ? error.message.toLowerCase()
      : '',
  };
}

function isMissingFinalizeRpc(error: unknown) {
  const { code, message } = getErrorDetails(error);
  return code === 'PGRST202'
    || code === '42883'
    || (message.includes('finalize_song_version_upload') && message.includes('schema cache'));
}

function isStorageLimitError(error: unknown) {
  const { message } = getErrorDetails(error);
  return message.includes('storage_limit_reached');
}

async function removePendingUpload(versionId: string, filePath: string) {
  const storageResult = await supabaseServer.storage.from('song-files').remove([filePath]);

  if (storageResult.error) {
    throw storageResult.error;
  }

  const versionResult = await supabaseServer.from('song_versions').delete().eq('id', versionId);
  if (versionResult.error) {
    throw versionResult.error;
  }
}

export async function POST(_req: NextRequest, props: { params: Promise<{ versionId: string }> }) {
  const params = await props.params;
  try {
    const resolved = await resolveCanonicalIdentity();
    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to finish an upload.' }, { status: 401 });
    }

    const { data: version, error: versionError } = await supabaseServer
      .from('song_versions')
      .select('*')
      .eq('id', params.versionId)
      .maybeSingle();

    if (versionError) throw versionError;
    if (!version) {
      return NextResponse.json({ error: 'Version not found.' }, { status: 404 });
    }

    const { data: song, error: songError } = await supabaseServer
      .from('songs')
      .select('id, account_id')
      .eq('id', version.song_id)
      .maybeSingle();

    if (songError) throw songError;
    if (!song?.account_id || song.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this version.' }, { status: 403 });
    }

    const hasFinalizedColumn = Object.prototype.hasOwnProperty.call(version, 'upload_finalized_at');
    if (hasFinalizedColumn && version.upload_finalized_at) {
      return NextResponse.json({ finalized: true, alreadyFinalized: true });
    }

    const filePath = normalizeStoragePath(version.file_path);
    if (!filePath) {
      return NextResponse.json({ error: 'Version has no storage path.' }, { status: 409 });
    }

    const { data: fileInfo, error: fileInfoError } = await supabaseServer.storage
      .from('song-files')
      .info(filePath);

    if (fileInfoError || !fileInfo) {
      return NextResponse.json(
        { error: 'The uploaded audio file was not found. Please retry the upload.' },
        { status: 409 }
      );
    }

    const actualSize = typeof fileInfo.size === 'number' ? fileInfo.size : 0;
    const contentType = fileInfo.contentType?.toLowerCase() ?? '';
    const validAudioObject = actualSize > 0
      && actualSize <= MAX_AUDIO_SIZE_BYTES
      && contentType.startsWith('audio/');

    if (!validAudioObject) {
      await removePendingUpload(params.versionId, filePath);
      return NextResponse.json(
        { error: 'The uploaded object is not a supported audio file under 200MB.' },
        { status: 400 }
      );
    }

    const accountResult = await supabaseServer
      .from('accounts')
      .select('plan, storage_bytes_used')
      .eq('id', song.account_id)
      .single();

    if (accountResult.error && !isMissingPlanColumnError(accountResult.error)) {
      throw accountResult.error;
    }

    const plan = normalizeAccountPlan(accountResult.data?.plan);
    const storageLimit = accountResult.data ? getStorageLimit(plan) : Number.MAX_SAFE_INTEGER;
    const usedBytes = accountResult.data?.storage_bytes_used ?? 0;
    const claimedSize = typeof version.file_size_bytes === 'number' ? version.file_size_bytes : 0;
    const usedBytesBeforePendingUpload = hasFinalizedColumn
      ? usedBytes
      : Math.max(0, usedBytes - claimedSize);

    if (accountResult.data && isStorageLimitReached(plan, usedBytesBeforePendingUpload, actualSize)) {
      await removePendingUpload(params.versionId, filePath);
      return NextResponse.json(createPlanLimitPayload('storage', plan), { status: 400 });
    }

    const finalizeResult = await supabaseServer.rpc('finalize_song_version_upload', {
      p_version_id: params.versionId,
      p_account_id: song.account_id,
      p_file_size_bytes: actualSize,
      p_storage_limit_bytes: storageLimit,
    });

    if (finalizeResult.error) {
      if (isStorageLimitError(finalizeResult.error)) {
        await removePendingUpload(params.versionId, filePath);
        return NextResponse.json(createPlanLimitPayload('storage', plan), { status: 400 });
      }

      if (!isMissingFinalizeRpc(finalizeResult.error)) {
        throw finalizeResult.error;
      }

      console.warn('[versions/finalize] Upload integrity migration is not applied; using legacy accounting.');

      if (hasFinalizedColumn) {
        throw new Error('Upload integrity migration is still refreshing its schema cache.');
      }

      const { error: versionUpdateError } = await supabaseServer
        .from('song_versions')
        .update({ file_size_bytes: actualSize })
        .eq('id', params.versionId);

      if (versionUpdateError) throw versionUpdateError;
    }

    return NextResponse.json({ finalized: true, fileSizeBytes: actualSize });
  } catch (error) {
    console.error('[versions/finalize] Error finalizing upload:', error);
    return NextResponse.json({ error: 'Could not finish the version upload.' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ versionId: string }> }) {
  const params = await props.params;
  try {
    const resolved = await resolveCanonicalIdentity();
    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to cancel an upload.' }, { status: 401 });
    }

    const { data: version, error: versionError } = await supabaseServer
      .from('song_versions')
      .select('*')
      .eq('id', params.versionId)
      .maybeSingle();

    if (versionError) throw versionError;
    if (!version) return NextResponse.json({ cancelled: true });

    const { data: song, error: songError } = await supabaseServer
      .from('songs')
      .select('account_id')
      .eq('id', version.song_id)
      .maybeSingle();

    if (songError) throw songError;
    if (!song?.account_id || song.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this version.' }, { status: 403 });
    }

    const hasFinalizedColumn = Object.prototype.hasOwnProperty.call(version, 'upload_finalized_at');
    if (!hasFinalizedColumn || version.upload_finalized_at) {
      return NextResponse.json({ error: 'A completed upload cannot be cancelled.' }, { status: 409 });
    }

    const filePath = normalizeStoragePath(version.file_path);
    if (filePath) {
      await removePendingUpload(params.versionId, filePath);
    } else {
      const { error: deleteError } = await supabaseServer
        .from('song_versions')
        .delete()
        .eq('id', params.versionId);
      if (deleteError) throw deleteError;
    }

    return NextResponse.json({ cancelled: true });
  } catch (error) {
    console.error('[versions/finalize] Error cancelling upload:', error);
    return NextResponse.json({ error: 'Could not cancel the pending upload.' }, { status: 500 });
  }
}
