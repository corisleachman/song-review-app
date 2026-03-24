import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { actionId: string } }
) {
  try {
    const actionId = params.actionId;
    const { status } = await req.json();

    if (!status || !['pending', 'approved', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from('actions')
      .update({ status, updated_at: new Date().toISOString() })
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
