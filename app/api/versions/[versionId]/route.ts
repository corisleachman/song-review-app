import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

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
    return NextResponse.json({ version: data });
  } catch (error) {
    console.error('Error updating version:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
