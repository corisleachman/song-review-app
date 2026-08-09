import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const resolved = await resolveCanonicalIdentity();
    if (!resolved) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const accountId = resolved.identity.workspaceId;

    const { data, error } = await supabaseServer
      .from('playlists')
      .select('id, title, is_public, updated_at, playlist_songs(count)')
      .eq('account_id', accountId)
      .order('updated_at', { ascending: false });
    if (error) throw error;

    const items = (data ?? []).map((p) => {
      const rel = p.playlist_songs as unknown;
      const count = Array.isArray(rel) && rel.length > 0 && typeof (rel[0] as { count?: number }).count === 'number'
        ? (rel[0] as { count: number }).count
        : 0;
      return { id: p.id, title: p.title, is_public: p.is_public, updated_at: p.updated_at, song_count: count };
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error('[playlists] list error:', err);
    return NextResponse.json({ error: 'Could not load playlists.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const resolved = await resolveCanonicalIdentity();
    if (!resolved) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as { title?: unknown };
    const title = typeof body?.title === 'string' && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : 'Untitled playlist';

    const { data, error } = await supabaseServer
      .from('playlists')
      .insert({ account_id: resolved.identity.workspaceId, created_by: resolved.identity.userId, title })
      .select('id')
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (err) {
    console.error('[playlists] create error:', err);
    return NextResponse.json({ error: 'Could not create playlist.' }, { status: 500 });
  }
}
