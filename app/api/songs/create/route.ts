import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { title } = await req.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('songs')
      .insert([{ title: title.trim() }])
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ songId: data.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating song:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
