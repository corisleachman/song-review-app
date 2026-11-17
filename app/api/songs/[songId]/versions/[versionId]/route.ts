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
import {
  readActionsForWorkspace,
  readTasksForWorkspace,
  readThreadsForWorkspace,
  readVisualizerEnabled,
} from '@/lib/versionPageExtras';
import { listWorkspaceMembers } from '@/lib/workspaceMembers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// The version page's core data in one request: the song, the selected version
// and the finalized version list. Identity is resolved once instead of once
// per resource; each read keeps the exact access checks and responses of its
// individual route (GET /api/songs/:songId, /api/versions/:versionId and
// /api/songs/:songId/versions).
// The response also carries what the page used to fetch separately on load:
// the caller's identity (as /api/auth/bootstrap returns it), comments,
// actions, tasks, workspace members and the visualizer preference. Each of
// those requests checked the session again, so a page load cost about seven
// session checks; now it costs one. Each extra is optional: settledBody never
// throws, so a failed extra is left out and the page fetches it from its own
// route instead of failing.
// Once the core reads are done, extras get this much longer. Anything still
// running is left out (the page fetches it from its own route), so a stalled
// extra can never hold back the song and player.
const EXTRAS_GRACE_MS = 1500;

async function settledBody(read: () => Promise<{ status: number; body: Record<string, unknown> }>, key: string) {
  try {
    const result = await read();
    return result.status === 200 ? result.body[key] : undefined;
  } catch (error) {
    console.warn(`Version page extra "${key}" failed:`, safeErrorDetails(error));
    return undefined;
  }
}

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
    const extraValues: unknown[] = [];
    const extraReads = [
      settledBody(() => readThreadsForWorkspace(versionId, workspaceId), 'threads'),
      settledBody(() => readActionsForWorkspace(songId, workspaceId), 'actions'),
      settledBody(() => readTasksForWorkspace(songId, workspaceId), 'tasks'),
      settledBody(async () => ({ status: 200, body: { members: await listWorkspaceMembers(workspaceId) } }), 'members'),
      settledBody(async () => ({ status: 200, body: { visualizerEnabled: await readVisualizerEnabled(resolved.identity.userId) } }), 'visualizerEnabled'),
    ].map((read, index) => read.then(value => { extraValues[index] = value; }));
    const extrasPromise = Promise.all(extraReads);

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

    let graceTimer: ReturnType<typeof setTimeout> | undefined;
    await timing.measure('extras', () => Promise.race([
      extrasPromise,
      new Promise<void>(resolve => { graceTimer = setTimeout(resolve, EXTRAS_GRACE_MS); }),
    ]));
    clearTimeout(graceTimer);
    const [threads, actions, tasks, members, visualizerEnabled] = extraValues;

    return respond({
      song: songResult.body.song,
      version: versionResult.body.version,
      versions: versionsResult.body.versions,
      identity: resolved.identity,
      extras: { threads, actions, tasks, members, visualizerEnabled },
    }, 200);
  } catch (error) {
    console.error('Error fetching version page data:', safeErrorDetails(error));
    return respond({ error: 'Version request failed.' }, 500);
  }
}
