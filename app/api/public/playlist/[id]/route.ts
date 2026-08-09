import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

function normalizeStoragePath(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  const prefix = 'song-files/';
  return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
}
function audioUrlFor(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  const { data } = supabaseServer.storage.from('song-files').getPublicUrl(normalizeStoragePath(filePath));
  return data?.publicUrl ?? null;
}
function pick<T>(rel: unknown, key: string): T | null {
  const o = Array.isArray(rel) ? rel[0] : rel;
  if (o && typeof o === 'object' && key in o) return (o as Record<string, T>)[key];
  return null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Service role bypasses RLS, so we check is_public ourselves.
    const { data: playlist } = await supabaseServer
      .from('playlists')
      .select('id, title, is_public, account_id')
      .eq('id', id)
      .maybeSingle();

    // 404 (not 403) so we don't confirm a private playlist exists.
    if (!playlist || !playlist.is_public) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let workspaceName: string | null = null;
    if (playlist.account_id) {
      const { data: account } = await supabaseServer.from('accounts').select('name').eq('id', playlist.account_id).maybeSingle();
      workspaceName = account?.name ?? null;
    }

    const { data: rows } = await supabaseServer
      .from('playlist_songs')
      .select('song_id, position, songs(id, title, image_url)')
      .eq('playlist_id', playlist.id)
      .order('position', { ascending: true });

    const ordered = rows ?? [];
    const songIds = ordered.map((r) => r.song_id);

    // Latest version per song — one small query each (reliable; not subject to a
    // combined row limit the way a single .in(...) over all versions would be).
    const latestBySong = new Map<string, string | null>();
    await Promise.all(
      songIds.map(async (sid) => {
        const { data: v } = await supabaseServer
          .from('song_versions')
          .select('file_path')
          .eq('song_id', sid)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle();
        latestBySong.set(sid, v?.file_path ?? null);
      }),
    );

    if (new URL(_req.url).searchParams.get('debug') === '1') {
      return NextResponse.json({
        orderedCount: ordered.length,
        ordered: ordered.map((r) => ({ song_id: r.song_id, position: r.position, title: pick<string>(r.songs, 'title') })),
        latest: Array.from(latestBySong.entries()).map(([sid, fp]) => ({ sid, hasFile: Boolean(fp), fp })),
      });
    }

    const tracks = ordered
      .map((r) => ({
        id: r.song_id,
        title: pick<string>(r.songs, 'title') ?? 'Untitled',
        image_url: pick<string>(r.songs, 'image_url') ?? null,
        audioUrl: audioUrlFor(latestBySong.get(r.song_id) ?? null),
      }))
      .filter((t) => t.audioUrl);

    return NextResponse.json(
      { playlist: { id: playlist.id, title: playlist.title, workspace_name: workspaceName }, tracks },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (err) {
    console.error('[public/playlist] error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
