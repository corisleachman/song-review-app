import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const sharedPassword = process.env.SHARED_PASSWORD;

    if (
      typeof password === 'string'
      && password.length > 0
      && typeof sharedPassword === 'string'
      && sharedPassword.length > 0
      && password === sharedPassword
    ) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
