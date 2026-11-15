import { safeErrorDetails } from '@/lib/safeErrorDetails';
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { listFinalizedVersionsForWorkspace } from '@/lib/versionPageReads';

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
      return NextResponse.json({ error: 'You must be signed in to view versions.' }, { status: 401 });
    }

    const result = await listFinalizedVersionsForWorkspace(songId, resolved.identity.workspaceId);

    return NextResponse.json(result.body, {
      status: result.status,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error fetching song versions:', safeErrorDetails(error));
    return NextResponse.json({ error: 'Could not load versions.' }, { status: 500 });
  }
}
