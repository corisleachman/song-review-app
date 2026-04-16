import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const maybeMessage = 'message' in error && typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : null;
    if (maybeMessage) return maybeMessage;
  }

  return 'Could not load comments.';
}

export async function GET(
  req: NextRequest,
  { params }: { params: { versionId: string } }
) {
  try {
    noStore();
    const { versionId } = params;

    if (!versionId) {
      return NextResponse.json({ error: 'Version ID is required' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('comment_threads')
      .select(`
        id,
        timestamp_seconds,
        created_by,
        created_at,
        comments (
          id,
          author,
          body,
          created_at
        )
      `)
      .eq('song_version_id', versionId)
      .order('timestamp_seconds', { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      { threads: data || [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching threads:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
