import { NextRequest, NextResponse } from 'next/server';
import { request as requestHttps } from 'node:https';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import {
  createPlanLimitPayload,
  getStorageLimit,
  isMissingPlanColumnError,
  isStorageLimitReached,
  normalizeAccountPlan,
} from '@/lib/plans';
import {
  AUDIO_SIGNATURE_BYTES,
  getAudioUploadContentType,
  MAX_AUDIO_SIZE_BYTES,
  matchesAudioFileSignature,
  normalizeAudioFileName,
} from '@/lib/audioUploadPolicy.mjs';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

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

async function readBoundedResponseBody(response: Response, maxBytes: number) {
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (totalBytes < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;

      const remaining = maxBytes - totalBytes;
      const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value;
      chunks.push(chunk);
      totalBytes += chunk.byteLength;

      if (value.byteLength > remaining) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function readStoredAudioSignature(
  filePath: string,
  actualSize: number,
  trace: (stage: string) => void = () => undefined,
  compareTransport = false,
) {
  trace('signature_url_started');
  const { data, error } = await supabaseServer.storage
    .from('song-files')
    .createSignedUrl(filePath, 60);

  if (error || !data?.signedUrl) throw error ?? new Error('Could not inspect uploaded audio.');

  const finalByte = Math.max(0, Math.min(actualSize, AUDIO_SIGNATURE_BYTES) - 1);
  // Temporary Preview-only comparison. The signed URL stays entirely server-side
  // and this probe cannot finalize an upload or replace signature validation.
  const nativeProbe = compareTransport
    ? await probeSignedAudioTransport(data.signedUrl, finalByte + 1)
    : null;
  trace(nativeProbe ? `signature_fetch_started_native_${nativeProbe}` : 'signature_fetch_started');
  const response = await fetch(data.signedUrl, {
    cache: 'no-store',
    headers: { Range: `bytes=0-${finalByte}` },
  });
  trace('signature_headers_received');

  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Audio inspection returned status ${response.status}.`);
  }

  trace('signature_body_started');
  const signature = await readBoundedResponseBody(response, AUDIO_SIGNATURE_BYTES);
  trace('signature_body_finished');
  return signature;
}

async function probeSignedAudioTransport(signedUrl: string, maxBytes: number) {
  return new Promise<string>(resolve => {
    let settled = false;
    let receivedBytes = 0;
    const finish = (result: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      probe.destroy();
      resolve(result);
    };
    const probe = requestHttps(signedUrl, {
      method: 'GET',
      headers: { Range: `bytes=0-${maxBytes - 1}` },
    }, response => {
      const status = response.statusCode ?? 0;
      response.on('error', () => finish('response_error'));
      if (status < 200 || status >= 300) {
        response.destroy();
        finish(`status_${status}`);
        return;
      }
      response.on('data', (chunk: Buffer) => {
        receivedBytes += Math.min(chunk.byteLength, maxBytes - receivedBytes);
        if (receivedBytes >= maxBytes) {
          response.destroy();
          finish(`status_${status}_bytes_${receivedBytes}`);
        }
      });
      response.on('end', () => finish(`status_${status}_bytes_${receivedBytes}`));
    });
    const timer = setTimeout(() => finish('timeout'), 10_000);
    probe.on('error', () => finish('request_error'));
    probe.end();
  });
}

export async function POST(req: NextRequest, props: { params: Promise<{ versionId: string }> }) {
  const startedAt = Date.now();
  const debugEnabled = process.env.VERCEL_ENV === 'preview'
    && req.headers.get('X-Song-Room-Upload-Debug') === '1';
  const trace = (stage: string) => {
    if (debugEnabled) {
      console.info('[audio-finalize]', JSON.stringify({ stage, elapsedMs: Date.now() - startedAt }));
    }
  };
  trace('request_received');
  const params = await props.params;
  try {
    const resolved = await resolveCanonicalIdentity();
    trace('identity_finished');
    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to finish an upload.' }, { status: 401 });
    }

    const { data: version, error: versionError } = await supabaseServer
      .from('song_versions')
      .select('*')
      .eq('id', params.versionId)
      .maybeSingle();

    trace('version_read_finished');
    if (versionError) throw versionError;
    if (!version) {
      return NextResponse.json({ error: 'Version not found.' }, { status: 404 });
    }

    const { data: song, error: songError } = await supabaseServer
      .from('songs')
      .select('id, account_id')
      .eq('id', version.song_id)
      .maybeSingle();

    trace('song_read_finished');
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
    trace('storage_info_finished');

    if (fileInfoError || !fileInfo) {
      return NextResponse.json(
        { error: 'The uploaded audio file was not found. Please retry the upload.' },
        { status: 409 }
      );
    }

    const actualSize = typeof fileInfo.size === 'number' ? fileInfo.size : 0;
    const contentType = fileInfo.contentType?.toLowerCase() ?? '';
    const normalizedFile = normalizeAudioFileName(filePath);
    const storedContentType = normalizedFile
      ? getAudioUploadContentType(normalizedFile.extension, contentType)
      : null;

    if (actualSize <= 0 || actualSize > MAX_AUDIO_SIZE_BYTES || !normalizedFile || !storedContentType) {
      await removePendingUpload(params.versionId, filePath);
      return NextResponse.json(
        { error: 'The uploaded object is not a supported audio file under 200MB.' },
        { status: 400 }
      );
    }

    let signatureBytes: Uint8Array;
    try {
      signatureBytes = await readStoredAudioSignature(filePath, actualSize, trace, debugEnabled);
    } catch (error) {
      console.warn('[versions/finalize] Could not inspect uploaded audio yet:', error);
      return NextResponse.json(
        { error: 'The uploaded audio could not be inspected yet. Please retry.' },
        { status: 409 }
      );
    }

    if (!matchesAudioFileSignature(normalizedFile.extension, signatureBytes)) {
      await removePendingUpload(params.versionId, filePath);
      return NextResponse.json(
        { error: 'The uploaded object does not match its audio file type.' },
        { status: 400 }
      );
    }

    const accountResult = await supabaseServer
      .from('accounts')
      .select('plan, storage_bytes_used')
      .eq('id', song.account_id)
      .single();

    trace('account_read_finished');
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
    trace('finalize_rpc_finished');

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
