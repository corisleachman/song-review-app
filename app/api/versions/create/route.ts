import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import {
  normalizeAccountPlan,
  isStorageLimitReached,
  createPlanLimitPayload,
  isMissingPlanColumnError,
} from '@/lib/plans';
import { supabaseServer } from '@/lib/supabaseServer';

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;

  if (error && typeof error === 'object') {
    const maybeMessage =
      'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : null;
    if (maybeMessage) return maybeMessage;
  }

  return 'Could not upload a version.';
}

export async function POST(req: NextRequest) {
  try {
    const { songId, fileName, fileSize, label, notes } = await req.json();
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json(
        { error: 'You must be signed in to upload a version.' },
        { status: 401 }
      );
    }

    if (!songId || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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
    const incomingBytes = typeof fileSize === 'number' && fileSize > 0 ? fileSize : 0;

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

      if (incomingBytes > 0 && isStorageLimitReached(plan, usedBytes, incomingBytes)) {
        return NextResponse.json(createPlanLimitPayload('storage', plan), { status: 400 });
      }
    }

    // ---------------------------------------------------------------
    // Create version record + signed upload URL
    // ---------------------------------------------------------------
    const { count } = await supabaseServer
      .from('song_versions')
      .select('id', { count: 'exact', head: true })
      .eq('song_id', songId);

    const versionNumber = (count ?? 0) + 1;
    const filePath      = `songs/${songId}/v${versionNumber}/${fileName}`;

    const { data: urlData, error: urlError } = await supabaseServer.storage
      .from('song-files')
      .createSignedUploadUrl(filePath);

    if (urlError) throw urlError;

    const { data, error } = await supabaseServer
      .from('song_versions')
      .insert([{
        song_id:         songId,
        version_number:  versionNumber,
        label:           label ?? null,
        notes:           notes?.trim() ? notes.trim() : null,
        file_path:       filePath,
        file_name:       fileName,
        file_size_bytes: incomingBytes > 0 ? incomingBytes : null,
        created_by:      resolved.identity.authorName,
      }])
      .select('id')
      .single();

    if (error) throw error;

    // ---------------------------------------------------------------
    // Increment workspace storage counter (best-effort — non-blocking)
    // ---------------------------------------------------------------
    if (incomingBytes > 0 && accountResult.data) {
      const currentUsed = accountResult.data.storage_bytes_used ?? 0;
      void supabaseServer
        .from('accounts')
        .update({ storage_bytes_used: currentUsed + incomingBytes })
        .eq('id', resolved.identity.workspaceId)
        .then(({ error: storageUpdateError }) => {
          if (storageUpdateError) {
            console.error('Failed to increment storage_bytes_used:', storageUpdateError);
          }
        });
    }

    return NextResponse.json(
      { versionId: data.id, uploadUrl: urlData.signedUrl, filePath },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
