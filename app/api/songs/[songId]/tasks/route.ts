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

  return 'Could not load tasks.';
}

export async function GET(
  req: NextRequest,
  { params }: { params: { songId: string } }
) {
  try {
    noStore();
    const { songId } = params;

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('song_tasks')
      .select('*')
      .eq('song_id', songId)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      { tasks: data || [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching song tasks:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
