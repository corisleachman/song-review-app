// app/api/feedback/route.ts
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { getCurrentAuthenticatedUser } from '@/lib/currentUser';

export const dynamic = 'force-dynamic';

const VALID_TYPES = ['bug', 'idea', 'other'] as const;
const MIN_LEN = 10;
const MAX_LEN = 2000;
const RATE_LIMIT = 5; // max submissions per identity...
const WINDOW_MINUTES = 60; // ...within this rolling window

function isEmail(v: unknown): v is string {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
    }

    const { type, message, email, page_url, user_agent, viewport, website } = body;

    // 1. Honeypot — bots fill the hidden 'website' field. Fake success, store nothing.
    if (typeof website === 'string' && website.trim() !== '') {
      return NextResponse.json({ ok: true });
    }

    // 2. Validate type + message length
    if (typeof type !== 'string' || !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return NextResponse.json({ ok: false, error: 'Please choose a feedback type.' }, { status: 400 });
    }
    const msg = typeof message === 'string' ? message.trim() : '';
    if (msg.length < MIN_LEN || msg.length > MAX_LEN) {
      return NextResponse.json(
        { ok: false, error: `Message must be between ${MIN_LEN} and ${MAX_LEN} characters.` },
        { status: 400 },
      );
    }

    // 3. Resolve submitter. Logged-in = session; logged-out must supply an email.
    const user = await getCurrentAuthenticatedUser();
    const submitterEmail = user?.email ?? (isEmail(email) ? email.trim() : null);
    if (!user && !submitterEmail) {
      return NextResponse.json(
        { ok: false, error: 'Please add an email so we can follow up.' },
        { status: 400 },
      );
    }

    // 4. Hash IP for rate-limiting (raw IP never stored)
    const rawIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip')?.trim() ||
      '';
    const ipHash = rawIp
      ? createHash('sha256').update(rawIp + (process.env.FEEDBACK_IP_SALT ?? '')).digest('hex')
      : null;

    // 5. Rate-limit: count this identity's rows in the window (by user, else by IP hash)
    const sinceIso = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    let q = supabaseServer
      .from('beta_feedback')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sinceIso);
    if (user) q = q.eq('user_id', user.id);
    else if (ipHash) q = q.eq('ip_hash', ipHash);

    const { count, error: countError } = await q;
    if (countError) {
      console.error('[feedback] rate-limit count error:', countError);
    } else if ((count ?? 0) >= RATE_LIMIT) {
      return NextResponse.json(
        { ok: false, error: "You've sent a lot of feedback recently — please try again shortly." },
        { status: 429 },
      );
    }

    // 6. Insert. No admin email is sent — the beta_feedback table IS the triage queue.
    const { error: insertError } = await supabaseServer.from('beta_feedback').insert({
      type,
      message: msg,
      user_id: user?.id ?? null,
      email: submitterEmail,
      page_url: typeof page_url === 'string' ? page_url.slice(0, 2000) : null,
      user_agent: typeof user_agent === 'string' ? user_agent.slice(0, 1000) : null,
      viewport: typeof viewport === 'string' ? viewport.slice(0, 20) : null,
      app_version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      ip_hash: ipHash,
    });

    if (insertError) {
      console.error('[feedback] insert error:', insertError);
      return NextResponse.json({ ok: false, error: 'Could not save feedback.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[feedback] Error:', err);
    return NextResponse.json({ ok: false, error: 'Something went wrong.' }, { status: 500 });
  }
}
