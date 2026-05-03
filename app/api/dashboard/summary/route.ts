import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { normalizeSongStatus } from '@/lib/songWorkflow';
import { supabaseServer } from '@/lib/supabaseServer';
import { getVersionDisplayLabel } from '@/lib/versionDisplay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not load dashboard summary.';
}

export async function GET() {
  try {
    noStore();

    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { data: songs, error: songsError } = await supabaseServer
      .from('songs')
      .select('id, title, image_url, created_at, status')
      .eq('account_id', resolved.identity.workspaceId)
      .order('created_at', { ascending: false });

    if (songsError) throw songsError;

    const songIds = (songs ?? []).map(song => song.id);
    const { data: versions, error: versionsError } = songIds.length
      ? await supabaseServer
          .from('song_versions')
          .select('id, song_id, version_number, label, created_at, file_path')
          .in('song_id', songIds)
          .order('version_number', { ascending: false })
      : { data: [], error: null };

    if (versionsError) throw versionsError;

    const latestVersionBySongId = new Map<string, {
      id: string;
      song_id: string;
      version_number: number | null;
      label: string | null;
      created_at: string | null;
      file_path: string | null;
    }>();

    for (const version of versions ?? []) {
      if (!latestVersionBySongId.has(version.song_id)) {
        latestVersionBySongId.set(version.song_id, version);
      }
    }

    const dashboardSongs = (songs ?? []).map(song => {
      const latest = latestVersionBySongId.get(song.id) ?? null;
      const latestActivityAt = latest?.created_at ?? song.created_at ?? null;

      return {
        id: song.id,
        title: song.title,
        image_url: song.image_url ?? null,
        created_at: song.created_at ?? null,
        status: normalizeSongStatus(song.status),
        latestVersionId: latest?.id ?? null,
        latestVersionNumber: latest?.version_number ?? null,
        latestVersionLabel: latest ? getVersionDisplayLabel(latest) : null,
        latestVersionCreatedAt: latest?.created_at ?? null,
        latestVersionFilePath: latest?.file_path ?? null,
        commentCount: 0,
        unresolvedActionCount: 0,
        assignedToMeCount: 0,
        activeContextVersionId: latest?.id ?? null,
        assignedContextVersionId: latest?.id ?? null,
        needsAttention: false,
        awaitingResponse: null,
        awaitingThreadId: null,
        awaitingVersionId: latest?.id ?? null,
        activityFeed: latest && latestActivityAt
          ? [
              {
                id: `version:${latest.id}`,
                type: 'version_uploaded',
                createdAt: latestActivityAt,
                summary: `Latest version: ${getVersionDisplayLabel(latest)}`,
                detail: null,
              },
            ]
          : [],
        latestActivityAt,
      };
    });

    return NextResponse.json(
      { songs: dashboardSongs },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Error loading dashboard summary:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
