import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';
import { withVersionDisplayName } from '@/lib/versionDisplay';

export const dynamic = 'force-dynamic';

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

  return 'Version request failed.';
}

async function loadVersionWithWorkspace(versionId: string) {
  const { data: version, error: versionError } = await supabaseServer
    .from('song_versions')
    .select('*')
    .eq('id', versionId)
    .maybeSingle();

  if (versionError) throw versionError;

  if (!version) {
    return { version: null, workspaceId: null };
  }

  const { data: song, error: songError } = await supabaseServer
    .from('songs')
    .select('id, account_id')
    .eq('id', version.song_id)
    .maybeSingle();

  if (songError) throw songError;

  return { version, workspaceId: song?.account_id ?? null };
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

export async function GET(
  req: NextRequest,
  { params }: { params: { versionId: string } }
) {
  try {
    const { versionId } = params;
    const resolved = await resolveCanonicalIdentity();

    if (!versionId) {
      return NextResponse.json({ error: 'Version ID is required' }, { status: 400 });
    }

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to view this version.' }, { status: 401 });
    }

    const { version, workspaceId } = await loadVersionWithWorkspace(versionId);

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    if (!workspaceId || workspaceId !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this version.' }, { status: 403 });
    }

    let audioUrl: string | null = null;
    let audioMissing = false;

    if (version.file_path) {
      const normalizedFilePath = normalizeStoragePath(version.file_path);
      const hasAudioObject = await storageObjectExists(normalizedFilePath);

      if (hasAudioObject) {
        // Public URL — no expiry risk. Safe because song-files bucket is public
        // and each version has a unique file path, eliminating cache collision.
        const { data: publicAudio } = supabaseServer.storage
          .from('song-files')
          .getPublicUrl(normalizedFilePath);

        audioUrl = publicAudio?.publicUrl ?? null;
      } else {
        audioMissing = true;
      }
    }

    return NextResponse.json(
      { version: { ...withVersionDisplayName(version), audioUrl, audioMissing } },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching version:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { versionId: string } }
) {
  try {
    const { label, notes } = await req.json();
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to update a version.' }, { status: 401 });
    }

    const { version, workspaceId } = await loadVersionWithWorkspace(params.versionId);

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    if (!workspaceId || workspaceId !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this version.' }, { status: 403 });
    }

    const updates: { label: string | null; notes?: string | null } = {
      label: label ?? null,
    };

    if (notes !== undefined) {
      updates.notes = notes?.trim() ? notes.trim() : null;
    }

    const { data, error } = await supabaseServer
      .from('song_versions')
      .update(updates)
      .eq('id', params.versionId)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ version: withVersionDisplayName(data) });
  } catch (error) {
    console.error('Error updating version:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
