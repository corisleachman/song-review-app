import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { withVersionDisplayName } from '@/lib/versionDisplay';

export const dynamic = 'force-dynamic';

function normalizeStoragePath(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  const prefix = 'song-files/';
  return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { songId: string } }
) {
  try {
    const { songId } = params;

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    // Fetch song — service role bypasses RLS, so we check is_public ourselves
    const { data: song, error: songError } = await supabaseServer
      .from('songs')
      .select('id, title, image_url, is_public, account_id')
      .eq('id', songId)
      .maybeSingle();

    if (songError) throw songError;

    if (!song) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!song.is_public) {
      // Return 404 rather than 403 — don't confirm the song exists
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fetch workspace name for display
    let workspaceName: string | null = null;
    if (song.account_id) {
      const { data: account } = await supabaseServer
        .from('accounts')
        .select('name')
        .eq('id', song.account_id)
        .maybeSingle();
      workspaceName = account?.name ?? null;
    }

    // Fetch latest version
    const { data: version, error: versionError } = await supabaseServer
      .from('song_versions')
      .select('*')
      .eq('song_id', songId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) throw versionError;

    if (!version) {
      return NextResponse.json({ error: 'No versions available' }, { status: 404 });
    }

    // Resolve audio URL
    let audioUrl: string | null = null;
    if (version.file_path) {
      const normalized = normalizeStoragePath(version.file_path);
      const { data: publicAudio } = supabaseServer.storage
        .from('song-files')
        .getPublicUrl(normalized);
      audioUrl = publicAudio?.publicUrl ?? null;
    }

    return NextResponse.json(
      {
        song: {
          id: song.id,
          title: song.title,
          image_url: song.image_url,
          workspace_name: workspaceName,
        },
        version: {
          ...withVersionDisplayName(version),
          audioUrl,
        },
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    );
  } catch (error) {
    console.error('[public/song] error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
