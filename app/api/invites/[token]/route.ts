import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { getPublicInviteByToken } from '@/lib/accountInvites';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not load invite.';
}

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    noStore();

    const token = params.token;

    if (!token) {
      return NextResponse.json({ error: 'Invite not found.', state: 'invalid' }, { status: 404 });
    }

    const result = await getPublicInviteByToken(token);

    if (result.state === 'invalid' || !result.invite) {
      return NextResponse.json(
        { error: 'Invite not found.', state: 'invalid' },
        { status: 404, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    return NextResponse.json(
      {
        invite: result.invite,
        state: result.state,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error loading invite:', error);
    return NextResponse.json(
      { error: getErrorMessage(error), state: 'invalid' },
      { status: 500 }
    );
  }
}
