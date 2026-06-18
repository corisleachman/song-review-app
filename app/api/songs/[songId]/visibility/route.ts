import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { songId: string } }
) {
  try {
    const { songId } = params;
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const body = await req.json() as { is_public: boolean };
    if (typeof body.is_public !== 'boolean') {
      return NextResponse.json({ error: 'is_public must be a boolean' }, { status: 400 });
    }

    // Verify the song belongs to the user's workspace
    const { data: song, error: songError } = await supabaseServer
      .from('songs')
      .select('id, account_id')
      .eq('id', songId)
      .maybeSingle();

    if (songError) throw songError;
    if (!song) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (song.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: updateError } = await supabaseServer
      .from('songs')
      .update({ is_public: body.is_public })
      .eq('id', songId);

    if (updateError) throw updateError;

    return NextResponse.json({ is_public: body.is_public }, { status: 200 });
  } catch (error) {
    console.error('[songs/visibility] error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
