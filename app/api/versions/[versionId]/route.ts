import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { withVersionDisplayName } from '@/lib/versionDisplay';

export const dynamic = 'force-dynamic';

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

  return 'Version request failed.';
}

export async function GET(
  req: NextRequest,
  { params }: { params: { versionId: string } }
) {
  try {
    const { versionId } = params;

    if (!versionId) {
      return NextResponse.json({ error: 'Version ID is required' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('song_versions')
      .select('*')
      .eq('id', versionId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    return NextResponse.json(
      { version: withVersionDisplayName(data) },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching version:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { versionId: string } }
) {
  try {
    const { label, notes } = await req.json();
    const updates: { label: string | null; notes?: string | null } = {
      label: label ?? null,
    };

    if (notes !== undefined) {
      updates.notes = notes?.trim() ? notes.trim() : null;
    }

    const { data, error } = await supabaseServer
      .from('song_versions')
      .update(updates)
      .eq('id', params.versionId)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ version: withVersionDisplayName(data) });
  } catch (error) {
    console.error('Error updating version:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
