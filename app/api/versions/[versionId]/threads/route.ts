import { safeErrorDetails } from '@/lib/safeErrorDetails';
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { readThreadsForWorkspace } from '@/lib/versionPageExtras';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const result = await readThreadsForWorkspace(versionId, resolved.identity.workspaceId);
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
    console.error('Error fetching threads:', safeErrorDetails(error));
    return NextResponse.json({ error: 'Could not load comments.' }, { status: 500 });
  }
}
