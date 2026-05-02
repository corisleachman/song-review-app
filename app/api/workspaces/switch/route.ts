import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { findValidActiveWorkspaceMembership, writeActiveWorkspaceCookie } from '@/lib/activeWorkspace';
import { listUserWorkspaces } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not switch workspace.';
}

export async function POST(req: NextRequest) {
  try {
    noStore();

    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const payload = await req.json().catch(() => null);
    const workspaceId = typeof payload?.workspaceId === 'string'
      ? payload.workspaceId.trim()
      : '';

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace id is required.' }, { status: 400 });
    }

    const membership = await findValidActiveWorkspaceMembership(
      resolved.identity.userId,
      workspaceId
    );

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this workspace.' },
        { status: 403 }
      );
    }

    const workspaces = await listUserWorkspaces(resolved.identity.userId, workspaceId);
    const workspace = workspaces.find(item => item.id === workspaceId) ?? null;

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
    }

    const response = NextResponse.json(
      {
        switched: true,
        currentWorkspaceId: workspaceId,
        workspace,
        workspaces,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );

    writeActiveWorkspaceCookie(response, workspaceId);
    return response;
  } catch (error) {
    console.error('Error switching workspace:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
