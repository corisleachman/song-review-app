import { safeErrorDetails } from '@/lib/safeErrorDetails';
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      return NextResponse.json({ error: 'You must be signed in to view tasks.' }, { status: 401 });
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
      .from('song_tasks')
      .select('*')
      .eq('song_id', songId)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      { tasks: data || [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching song tasks:', safeErrorDetails(error));
    return NextResponse.json({ error: 'Could not load tasks.' }, { status: 500 });
  }
}
