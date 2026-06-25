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

    const body = await req.json() as {
      is_public?: boolean;
      public_comments_enabled?: boolean;
    };

    const hasIsPublic = typeof body.is_public === 'boolean';
    const hasComments = typeof body.public_comments_enabled === 'boolean';

    if (!hasIsPublic && !hasComments) {
      return NextResponse.json(
        { error: 'Provide is_public and/or public_comments_enabled as a boolean.' },
        { status: 400 }
      );
    }

    // Verify the song belongs to the user's workspace
    const { data: song, error: songError } = await supabaseServer
      .from('songs')
      .select('id, account_id, is_public, public_comments_enabled')
      .eq('id', songId)
      .maybeSingle();

    if (songError) throw songError;
    if (!song) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (song.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const update: { is_public?: boolean; public_comments_enabled?: boolean } = {};
    if (hasIsPublic) update.is_public = body.is_public;
    if (hasComments) update.public_comments_enabled = body.public_comments_enabled;

    // Comments require a public link — if sharing is off, force comments off too
    const resultingIsPublic = hasIsPublic ? body.is_public! : song.is_public;
    if (!resultingIsPublic) {
      update.public_comments_enabled = false;
    }

    const { data: updated, error: updateError } = await supabaseServer
      .from('songs')
      .update(update)
      .eq('id', songId)
      .select('is_public, public_comments_enabled')
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(
      {
        is_public: updated.is_public,
        public_comments_enabled: updated.public_comments_enabled,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[songs/visibility] error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
