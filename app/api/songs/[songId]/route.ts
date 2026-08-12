import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { isSongStatus } from '@/lib/songWorkflow';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STORAGE_DELETE_BATCH_SIZE = 100;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const maybeMessage = 'message' in error && typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : null;
    if (maybeMessage) return maybeMessage;
  }

  return 'Song request failed.';
}

function normalizeStorageObjectPath(value: string | null | undefined, bucket: string) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;

  const marker = `/storage/v1/object/public/${bucket}/`;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const pathname = new URL(trimmed).pathname;
      const markerIndex = pathname.indexOf(marker);
      if (markerIndex < 0) return null;
      return decodeURIComponent(pathname.slice(markerIndex + marker.length)) || null;
    }
  } catch {
    return null;
  }

  const bucketPrefix = `${bucket}/`;
  return trimmed.startsWith(bucketPrefix) ? trimmed.slice(bucketPrefix.length) : trimmed;
}

async function removeStorageObjects(bucket: string, paths: string[]) {
  let cleanupPending = false;

  for (let index = 0; index < paths.length; index += STORAGE_DELETE_BATCH_SIZE) {
    const batch = paths.slice(index, index + STORAGE_DELETE_BATCH_SIZE);
    const { error } = await supabaseServer.storage.from(bucket).remove(batch);
    if (error) {
      cleanupPending = true;
      console.warn(`[songs/delete] ${bucket} cleanup will need retry:`, error.message);
    }
  }

  return cleanupPending;
}

export async function GET(req: NextRequest, props: { params: Promise<{ songId: string }> }) {
  const params = await props.params;
  try {
    const { songId } = params;
    const resolved = await resolveCanonicalIdentity();

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to view this song.' }, { status: 401 });
    }

    const { data, error } = await supabaseServer
      .from('songs')
      .select('id, title, image_url, status, account_id, is_public, public_comments_enabled')
      .eq('id', songId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    if (!data.account_id || data.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this song.' }, { status: 403 });
    }

    const { account_id: _accountId, ...song } = data;

    return NextResponse.json(
      { song },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching song:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ songId: string }> }) {
  const params = await props.params;
  try {
    const { songId } = params;
    const { title, status } = await req.json();
    const resolved = await resolveCanonicalIdentity();

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }
    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to update a song.' }, { status: 401 });
    }

    if (!title?.trim() && !status) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    if (status && !isSongStatus(status)) {
      return NextResponse.json({ error: 'Invalid song status' }, { status: 400 });
    }

    const { data: song, error: songLookupError } = await supabaseServer
      .from('songs')
      .select('id, account_id')
      .eq('id', songId)
      .single();

    if (songLookupError) throw songLookupError;

    if (!song?.account_id || song.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this song.' }, { status: 403 });
    }

    const updates: Record<string, string> = {};
    if (title?.trim()) updates.title = title.trim();
    if (status) updates.status = status;

    const { data, error } = await supabaseServer
      .from('songs')
      .update(updates)
      .eq('id', songId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ song: data }, { status: 200 });
  } catch (error) {
    console.error('Error updating song:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ songId: string }> }) {
  const params = await props.params;
  try {
    const { songId } = params;
    const resolved = await resolveCanonicalIdentity();

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to delete a song.' }, { status: 401 });
    }

    const { data: song, error: songLookupError } = await supabaseServer
      .from('songs')
      .select('id, account_id, image_url')
      .eq('id', songId)
      .maybeSingle();

    if (songLookupError) throw songLookupError;

    if (!song) {
      return NextResponse.json({ error: 'Song not found.' }, { status: 404 });
    }

    if (!song.account_id || song.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this song.' }, { status: 403 });
    }

    if (resolved.identity.membershipRole !== 'owner') {
      return NextResponse.json(
        { error: 'Only the workspace owner can delete songs.' },
        { status: 403 }
      );
    }

    const deleteResult = await supabaseServer.rpc('delete_song_and_release_storage', {
      p_song_id: songId,
      p_account_id: resolved.identity.workspaceId,
    });

    if (deleteResult.error) throw deleteResult.error;

    const deleteRows = Array.isArray(deleteResult.data)
      ? deleteResult.data as Array<{ file_paths?: unknown; released_bytes?: unknown }>
      : [];
    const rawFilePaths = deleteRows[0]?.file_paths;
    const audioPaths = Array.isArray(rawFilePaths)
      ? Array.from(new Set(
          rawFilePaths
            .filter((path): path is string => typeof path === 'string')
            .map(path => normalizeStorageObjectPath(path, 'song-files'))
            .filter((path): path is string => Boolean(path))
        ))
      : [];
    const coverPath = normalizeStorageObjectPath(song.image_url, 'song-images');

    const [audioCleanupPending, imageCleanupPending] = await Promise.all([
      removeStorageObjects('song-files', audioPaths),
      removeStorageObjects('song-images', coverPath ? [coverPath] : []),
    ]);

    return NextResponse.json(
      {
        success: true,
        storageCleanupPending: audioCleanupPending || imageCleanupPending,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting song:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
