import { safeErrorDetails } from '@/lib/safeErrorDetails';
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { readTasksForWorkspace } from '@/lib/versionPageExtras';

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

    const result = await readTasksForWorkspace(songId, resolved.identity.workspaceId);
    return NextResponse.json(
      result.body,
      {
        status: result.status,
        headers: result.status === 200 ? {
          'Cache-Control': 'no-store, max-age=0',
        } : undefined,
      }
    );
  } catch (error) {
    console.error('Error fetching song tasks:', safeErrorDetails(error));
    return NextResponse.json({ error: 'Could not load tasks.' }, { status: 500 });
  }
}
