import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import {
  acceptWorkspaceInviteAtomically,
  getInviteWorkspace,
  isValidInviteToken,
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

export async function POST(_request: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
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

    if (!token || !isValidInviteToken(token)) {
      return NextResponse.json({ error: 'Invite not found.' }, { status: 404 });
    }

    const currentUserEmail = lowerEmail(user.email);

    if (!currentUserEmail) {
      return NextResponse.json(
        { error: 'Sign in with the email address that received this invite.' },
        { status: 400 }
      );
    }

    const acceptance = await acceptWorkspaceInviteAtomically({
      inviteToken: token,
      userId: user.id,
      userEmail: currentUserEmail,
    });

    if (acceptance.result === 'not_found') {
      return NextResponse.json({ error: 'Invite not found.' }, { status: 404 });
    }
    if (acceptance.result === 'email_mismatch') {
      return NextResponse.json(
        { error: 'Sign in with the email address that received this invite.' },
        { status: 400 }
      );
    }
    if (acceptance.result === 'revoked') {
      return NextResponse.json({ error: 'This invite has been revoked.' }, { status: 400 });
    }
    if (acceptance.result === 'expired') {
      return NextResponse.json({ error: 'This invite has expired.' }, { status: 400 });
    }
    if (acceptance.result === 'already_used') {
      return NextResponse.json({ error: 'This invite has already been accepted.' }, { status: 400 });
    }
    if (!acceptance.accountId) {
      throw new Error('Accepted invite did not return a workspace.');
    }

    const workspace = await getInviteWorkspace(acceptance.accountId);

    const response = NextResponse.json(
      {
        accepted: true,
        alreadyMember: acceptance.alreadyMember,
        workspace,
      },
      { status: 200 }
    );

    writeActiveWorkspaceCookie(response, acceptance.accountId);
    return response;
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
