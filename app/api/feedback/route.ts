// app/api/feedback/route.ts
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { readVercelVisitorIp } from '@/lib/emailLoginRateLimitCore';
import { getCurrentAuthenticatedUser } from '@/lib/currentUser';

export const dynamic = 'force-dynamic';

const VALID_TYPES = ['bug', 'idea', 'other'] as const;
const MIN_LEN = 10;
const MAX_LEN = 2000;

function isEmail(v: unknown): v is string {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export async function POST(req: Request) {
  try {
    const payload: unknown = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
    }

    const { type, message, email, page_url, user_agent, viewport, website } = payload as Record<string, unknown>;

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

    // Preserve the existing stored hash format and history. Trust only the
    // visitor header Vercel overwrites, never a supplied X-Forwarded-For.
    const rawIp = readVercelVisitorIp(req.headers);
    if (!user && !rawIp) {
      return NextResponse.json(
        { ok: false, error: "We couldn't check this request. Please try again shortly." },
        { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } },
      );
    }
    const ipHash = rawIp
      ? createHash('sha256').update(rawIp + (process.env.FEEDBACK_IP_SALT ?? '')).digest('hex')
      : null;

    // The database trigger checks the rolling quota and inserts under the same
    // transaction lock. A failed check cannot leave a saved submission.
    // No admin email is sent; beta_feedback is the triage queue.
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
      if (insertError.code === 'P0001' && insertError.message === 'feedback_rate_limited') {
        const retry = Number(insertError.details);
        if (Number.isInteger(retry) && retry >= 1 && retry <= 3600) {
          return NextResponse.json(
            { ok: false, error: "You've sent a lot of feedback recently. Please try again shortly.", retryAfterSeconds: retry },
            { status: 429, headers: { 'Retry-After': String(retry), 'Cache-Control': 'no-store' } },
          );
        }
      }
      console.error('[feedback] submission failed');
      return NextResponse.json({ ok: false, error: 'Could not save feedback.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    console.error('[feedback] submission failed');
    return NextResponse.json({ ok: false, error: 'Something went wrong.' }, { status: 500 });
  }
}
