import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

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

  return 'Could not load comments.';
}

export async function GET(req: NextRequest, props: { params: Promise<{ versionId: string }> }) {
  const params = await props.params;
  try {
    noStore();
    const { versionId } = params;
    const resolved = await resolveCanonicalIdentity();

    if (!versionId) {
      return NextResponse.json({ error: 'Version ID is required' }, { status: 400 });
    }

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to view comments.' }, { status: 401 });
    }

    const { data: version, error: versionError } = await supabaseServer
      .from('song_versions')
      .select('id, song_id')
      .eq('id', versionId)
      .maybeSingle();

    if (versionError) throw versionError;

    if (!version) {
      return NextResponse.json({ error: 'Version not found.' }, { status: 404 });
    }

    const { data: song, error: songError } = await supabaseServer
      .from('songs')
      .select('id, account_id')
      .eq('id', version.song_id)
      .maybeSingle();

    if (songError) throw songError;

    if (!song?.account_id || song.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this version.' }, { status: 403 });
    }

    const { data, error } = await supabaseServer
      .from('comment_threads')
      .select(`
        id,
        timestamp_seconds,
        created_by,
        created_at,
        comments (
          id,
          author,
          body,
          created_at,
          author_user_id
        )
      `)
      .eq('song_version_id', versionId)
      .order('timestamp_seconds', { ascending: true });

    if (error) throw error;

    // Enrich each comment with its author's stored avatar (Google photo).
    const threads = (data ?? []) as Array<Record<string, unknown>>;
    const authorIds = new Set<string>();
    for (const t of threads) {
      for (const c of ((t.comments as Array<Record<string, unknown>> | null) ?? [])) {
        if (typeof c.author_user_id === 'string') authorIds.add(c.author_user_id);
      }
    }

    const avatarById = new Map<string, string | null>();
    if (authorIds.size > 0) {
      const { data: profs, error: profErr } = await supabaseServer
        .from('profiles')
        .select('id, avatar_url')
        .in('id', Array.from(authorIds));
      if (profErr) throw profErr;
      for (const p of ((profs ?? []) as Array<{ id: string; avatar_url: string | null }>)) {
        avatarById.set(p.id, p.avatar_url ?? null);
      }
    }

    const enriched = threads.map((t) => ({
      ...t,
      comments: (((t.comments as Array<Record<string, unknown>> | null) ?? []).map((c) => ({
        ...c,
        author_avatar_url:
          typeof c.author_user_id === 'string' ? (avatarById.get(c.author_user_id) ?? null) : null,
      }))),
    }));

    return NextResponse.json(
      { threads: enriched },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching threads:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
