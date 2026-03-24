import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const songId = formData.get('songId') as string;
    const file = formData.get('file') as File;

    if (!songId || !file) {
      return NextResponse.json(
        { error: 'Missing songId or file' },
        { status: 400 }
      );
    }

    // Upload file to Supabase Storage
    const fileName = `${songId}-${Date.now()}${file.name.substring(file.name.lastIndexOf('.'))}`;
    const fileBuffer = await file.arrayBuffer();

    const { data, error: uploadError } = await supabaseServer.storage
      .from('song-images')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabaseServer.storage
      .from('song-images')
      .getPublicUrl(fileName);

    // Update song with image URL
    const { error: updateError } = await supabaseServer
      .from('songs')
      .update({ image_url: urlData.publicUrl })
      .eq('id', songId);

    if (updateError) throw updateError;

    return NextResponse.json(
      { imageUrl: urlData.publicUrl },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
