import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import {
  createWorkspaceMembership,
  findInviteByToken,
  findWorkspaceMembership,
  getInviteState,
  getInviteWorkspace,
  markInviteAccepted,
} from '@/lib/accountInvites';
import { getCurrentAuthenticatedUser } from '@/lib/currentUser';
import { writeActiveWorkspaceCookie } from '@/lib/activeWorkspace';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function lowerEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not accept invite.';
}

export async function POST(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    noStore();

    const user = await getCurrentAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to accept this invite.' },
        { status: 401 }
      );
    }

    const token = params.token;

    if (!token) {
      return NextResponse.json({ error: 'Invite not found.' }, { status: 404 });
    }

    const invite = await findInviteByToken(token);

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found.' }, { status: 404 });
    }

    const currentUserEmail = lowerEmail(user.email);

    if (!currentUserEmail || currentUserEmail !== invite.normalized_email) {
      return NextResponse.json(
        {
          error: `This invite was sent to ${invite.email}, but you are signed in as ${user.email ?? 'an unknown email'}.`,
        },
        { status: 400 }
      );
    }

    const workspace = await getInviteWorkspace(invite.account_id);
    const existingMembership = await findWorkspaceMembership(invite.account_id, user.id);
    const state = getInviteState(invite);

    if (state === 'revoked') {
      return NextResponse.json({ error: 'This invite has been revoked.' }, { status: 400 });
    }

    if (state === 'expired') {
      return NextResponse.json({ error: 'This invite has expired.' }, { status: 400 });
    }

    if (state === 'accepted') {
      if (invite.accepted_by_user_id === user.id || existingMembership) {
        const response = NextResponse.json(
          {
            accepted: true,
            alreadyMember: true,
            workspace,
          },
          { status: 200 }
        );

        writeActiveWorkspaceCookie(response, invite.account_id);
        return response;
      }

      return NextResponse.json({ error: 'This invite has already been accepted.' }, { status: 400 });
    }

    if (!existingMembership) {
      await createWorkspaceMembership(invite.account_id, user.id);
    }

    await markInviteAccepted(invite.id, user.id);

    const response = NextResponse.json(
      {
        accepted: true,
        alreadyMember: Boolean(existingMembership),
        workspace,
      },
      { status: 200 }
    );

    writeActiveWorkspaceCookie(response, invite.account_id);
    return response;
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
