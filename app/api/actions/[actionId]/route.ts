import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { actionId: string } }
) {
  try {
    const actionId = params.actionId;
    const { status, description } = await req.json();

    if (!status && !description?.trim()) {
      return NextResponse.json(
        { error: 'Nothing to update' },
        { status: 400 }
      );
    }

    if (status && !['pending', 'approved', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const updates: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updates.status = status;
    if (description?.trim()) updates.description = description.trim();

    const { data, error } = await supabaseServer
      .from('actions')
      .update(updates)
      .eq('id', actionId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ action: data }, { status: 200 });
  } catch (error) {
    console.error('Error updating action:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
