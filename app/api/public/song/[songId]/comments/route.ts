import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const MAX_NAME_LENGTH = 50;
const MAX_BODY_LENGTH = 500;
const MIN_BODY_LENGTH = 1;

// In-memory rate limit (per serverless instance — best-effort, not bulletproof).
// Keyed by IP. Allows a short burst then throttles.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const rateBuckets = new Map<string, number[]>();

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateBuckets.get(ip) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(ip, hits);
    return true;
  }
  hits.push(now);
  rateBuckets.set(ip, hits);
  return false;
}

async function songAllowsComments(songId: string): Promise<boolean> {
  const { data: song } = await supabaseServer
    .from('songs')
    .select('id, is_public, public_comments_enabled')
    .eq('id', songId)
    .maybeSingle();
  return Boolean(song && song.is_public && song.public_comments_enabled);
}

// ── GET — list visible comments ─────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { songId: string } }
) {
  try {
    const { songId } = params;

    if (!(await songAllowsComments(songId))) {
      // Don't reveal whether the song exists — just return empty
      return NextResponse.json({ comments: [], enabled: false }, { status: 200 });
    }

    const { data: comments, error } = await supabaseServer
      .from('public_comments')
      .select('id, author_name, body, created_at')
      .eq('song_id', songId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    return NextResponse.json(
      { comments: comments ?? [], enabled: true },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[public/comments GET] error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

// ── POST — add a comment ────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: { songId: string } }
) {
  try {
    const { songId } = params;
    const body = await req.json() as {
      author_name?: string;
      body?: string;
      website?: string; // honeypot — real users never fill this
    };

    // Honeypot — bots fill hidden fields. Pretend success, write nothing.
    if (body.website && body.website.trim() !== '') {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!(await songAllowsComments(songId))) {
      return NextResponse.json({ error: 'Comments are not available for this track.' }, { status: 403 });
    }

    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'You are commenting too fast. Please wait a moment.' },
        { status: 429 }
      );
    }

    const authorName = (body.author_name ?? '').trim();
    const commentBody = (body.body ?? '').trim();

    if (!authorName) {
      return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
    }
    if (commentBody.length < MIN_BODY_LENGTH) {
      return NextResponse.json({ error: 'Please enter a comment.' }, { status: 400 });
    }
    if (authorName.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` }, { status: 400 });
    }
    if (commentBody.length > MAX_BODY_LENGTH) {
      return NextResponse.json({ error: `Comment must be ${MAX_BODY_LENGTH} characters or fewer.` }, { status: 400 });
    }

    const { data: inserted, error } = await supabaseServer
      .from('public_comments')
      .insert({
        song_id: songId,
        author_name: authorName,
        body: commentBody,
      })
      .select('id, author_name, body, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ comment: inserted }, { status: 201 });
  } catch (error) {
    console.error('[public/comments POST] error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
