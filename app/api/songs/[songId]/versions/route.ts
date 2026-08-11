import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';
import { withVersionDisplayName } from '@/lib/versionDisplay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  return 'Could not load versions.';
}

export async function GET(req: NextRequest, props: { params: Promise<{ songId: string }> }) {
  const params = await props.params;
  try {
    noStore();
    const { songId } = params;
    const resolved = await resolveCanonicalIdentity();

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to view versions.' }, { status: 401 });
    }

    const { data: song, error: songError } = await supabaseServer
      .from('songs')
      .select('id, account_id')
      .eq('id', songId)
      .maybeSingle();

    if (songError) throw songError;

    if (!song) {
      return NextResponse.json({ error: 'Song not found.' }, { status: 404 });
    }

    if (!song.account_id || song.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this song.' }, { status: 403 });
    }

    const { data, error } = await supabaseServer
      .from('song_versions')
      .select('id, song_id, version_number, label, notes, file_path, file_name, created_by, created_at')
      .eq('song_id', songId)
      .not('upload_finalized_at', 'is', null)
      .order('version_number', { ascending: false });

    if (error) throw error;

    return NextResponse.json(
      { versions: (data || []).map(withVersionDisplayName) },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching song versions:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
