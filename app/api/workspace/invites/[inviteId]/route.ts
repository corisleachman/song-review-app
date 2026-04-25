import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { findWorkspaceInviteById, revokeWorkspaceInvite } from '@/lib/accountInvites';

function requireOwner(identity: Awaited<ReturnType<typeof resolveCanonicalIdentity>>) {
  if (!identity) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  if (identity.identity.membershipRole !== 'owner') {
    return NextResponse.json({ error: 'Only the workspace owner can manage invites.' }, { status: 403 });
  }

  return null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not update workspace invite.';
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { inviteId: string } }
) {
  try {
    const resolved = await resolveCanonicalIdentity();
    const ownerError = requireOwner(resolved);
    if (ownerError) return ownerError;

    const inviteId = params.inviteId;
    const { action } = await req.json();

    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID is required.' }, { status: 400 });
    }

    if (action !== 'revoke') {
      return NextResponse.json({ error: 'Unsupported invite action.' }, { status: 400 });
    }

    const invite = await findWorkspaceInviteById(resolved.identity.workspaceId, inviteId);

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found.' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending invites can be revoked.' }, { status: 400 });
    }

    const updatedInvite = await revokeWorkspaceInvite(invite.id);

    return NextResponse.json({ invite: updatedInvite }, { status: 200 });
  } catch (error) {
    console.error('Error revoking workspace invite:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
