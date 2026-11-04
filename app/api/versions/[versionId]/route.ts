import { readCollaborationInput } from '@/lib/collaborationInput';
import { safeErrorDetails } from '@/lib/safeErrorDetails';
import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';
import { withVersionDisplayName } from '@/lib/versionDisplay';
import { audioDeliveryUrl } from '@/lib/mediaDelivery';

export const dynamic = 'force-dynamic';

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

export async function GET(req: NextRequest, props: { params: Promise<{ versionId: string }> }) {
  const params = await props.params;
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
    console.error('Error fetching version:', safeErrorDetails(error));
    return NextResponse.json({ error: 'Version request failed.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ versionId: string }> }) {
  const params = await props.params;
  try {
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to update a version.' }, { status: 401 });
    }

    const body = await readCollaborationInput(req);
    if (!body) return NextResponse.json({ error: 'Invalid version details.' }, { status: 400 });
    const { label, notes } = body;
    if ((label != null && typeof label !== 'string') || (notes != null && typeof notes !== 'string')) {
      return NextResponse.json({ error: 'Invalid version details.' }, { status: 400 });
    }

    const { version, workspaceId } = await loadVersionWithWorkspace(params.versionId);

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    if (!workspaceId || workspaceId !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this version.' }, { status: 403 });
    }

    const updates: { label: string | null; notes?: string | null } = {
      label: typeof label === 'string' ? label : null,
    };

    if (notes !== undefined) {
      updates.notes = typeof notes === 'string' && notes.trim() ? notes.trim() : null;
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
    console.error('Error updating version:', safeErrorDetails(error));
    return NextResponse.json({ error: 'Version request failed.' }, { status: 500 });
  }
}
