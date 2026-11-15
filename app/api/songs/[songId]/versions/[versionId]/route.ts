import { safeErrorDetails } from '@/lib/safeErrorDetails';
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { RequestTiming } from '@/lib/requestTiming';
import {
  listFinalizedVersionsForWorkspace,
  readSongForWorkspace,
  readVersionForWorkspace,
} from '@/lib/versionPageReads';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// The version page's core data in one request: the song, the selected version
// and the finalized version list. Identity is resolved once instead of once
// per resource; each read keeps the exact access checks and responses of its
// individual route (GET /api/songs/:songId, /api/versions/:versionId and
// /api/songs/:songId/versions).
export async function GET(req: NextRequest, props: { params: Promise<{ songId: string; versionId: string }> }) {
  const timing = new RequestTiming();
  const { songId, versionId } = await props.params;

  function respond(body: unknown, status: number) {
    const response = timing.attach(NextResponse.json(body, {
      status,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }));
    timing.logPreview('/api/songs/[songId]/versions/[versionId]', req, status);
    return response;
  }

  try {
    noStore();

    if (!songId || !versionId) {
      return respond({ error: 'Song ID and version ID are required' }, 400);
    }

    const resolved = await timing.measure('identity', () => resolveCanonicalIdentity(timing));

    if (!resolved) {
      return respond({ error: 'You must be signed in to view this version.' }, 401);
    }

    const workspaceId = resolved.identity.workspaceId;
    const [songResult, versionResult, versionsResult] = await timing.measure('reads', () => Promise.all([
      readSongForWorkspace(songId, workspaceId),
      readVersionForWorkspace(versionId, workspaceId),
      listFinalizedVersionsForWorkspace(songId, workspaceId),
    ]));

    // Report the first failure in the order the page has always checked.
    for (const result of [songResult, versionResult, versionsResult]) {
      if (result.status !== 200) {
        return respond(result.body, result.status);
      }
    }

    return respond({
      song: songResult.body.song,
      version: versionResult.body.version,
      versions: versionsResult.body.versions,
    }, 200);
  } catch (error) {
    console.error('Error fetching version page data:', safeErrorDetails(error));
    return respond({ error: 'Version request failed.' }, 500);
  }
}
