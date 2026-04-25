import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import {
  deleteWorkspaceMembershipByUserId,
  findWorkspaceMembershipByUserId,
} from '@/lib/workspaceMembers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function requireOwner(identity: Awaited<ReturnType<typeof resolveCanonicalIdentity>>) {
  if (!identity) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  if (identity.identity.membershipRole !== 'owner') {
    return NextResponse.json(
      { error: 'Only the workspace owner can remove members.' },
      { status: 403 }
    );
  }

  return null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not remove workspace member.';
}

export async function DELETE(
  _request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    noStore();

    const resolved = await resolveCanonicalIdentity();
    const ownerError = requireOwner(resolved);
    if (ownerError) return ownerError;

    const userId = params.userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    if (userId === resolved.identity.userId) {
      return NextResponse.json(
        { error: 'The workspace owner cannot remove themselves.' },
        { status: 400 }
      );
    }

    const membership = await findWorkspaceMembershipByUserId(
      resolved.identity.workspaceId,
      userId
    );

    if (!membership) {
      return NextResponse.json(
        { error: 'Workspace member not found.' },
        { status: 404 }
      );
    }

    if (membership.role === 'owner') {
      return NextResponse.json(
        { error: 'The workspace owner cannot be removed.' },
        { status: 400 }
      );
    }

    await deleteWorkspaceMembershipByUserId(resolved.identity.workspaceId, userId);

    return NextResponse.json(
      {
        removed: true,
        userId,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error removing workspace member:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
