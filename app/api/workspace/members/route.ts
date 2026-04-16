import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { listWorkspaceMembers } from '@/lib/workspaceMembers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    noStore();

    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const members = await listWorkspaceMembers(resolved.identity.workspaceId);

    return NextResponse.json(
      { members },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error loading workspace members:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load workspace members.' },
      { status: 500 }
    );
  }
}
