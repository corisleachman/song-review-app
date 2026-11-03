import { safeErrorDetails } from '@/lib/safeErrorDetails';
import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { listUserWorkspaces } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    noStore();

    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const workspaces = await listUserWorkspaces(
      resolved.identity.userId,
      resolved.identity.workspaceId
    );

    return NextResponse.json(
      {
        currentWorkspaceId: resolved.identity.workspaceId,
        workspaces,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error loading workspaces:', safeErrorDetails(error));
    return NextResponse.json({ error: 'Could not load workspaces.' }, { status: 500 });
  }
}
