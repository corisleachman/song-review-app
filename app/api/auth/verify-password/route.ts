import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (password === process.env.SHARED_PASSWORD) {
      const res = NextResponse.json({ success: true });
      res.cookies.set('song_review_auth', 'true', {
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false, // keep false so client can still read it
      });
      return res;
    }

    return NextResponse.json({ success: false }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
