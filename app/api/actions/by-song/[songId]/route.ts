import { safeErrorDetails } from '@/lib/safeErrorDetails';
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { readActionsForWorkspace } from '@/lib/versionPageExtras';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, props: { params: Promise<{ songId: string }> }) {
  const params = await props.params;
  try {
    noStore();
    const songId = params.songId;
    const versionId = req.nextUrl.searchParams.get('versionId');
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const result = await readActionsForWorkspace(songId, resolved.identity.workspaceId, versionId);
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
    console.error('Error fetching actions:', safeErrorDetails(error));
    return NextResponse.json({ error: 'Could not load actions.' }, { status: 500 });
  }
}
