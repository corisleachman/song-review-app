import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

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

    // Derive extension — prefer MIME type, fall back to filename
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/avif': '.avif',
      'image/heic': '.heic',
    };
    const extFromMime = mimeToExt[file.type?.toLowerCase()] ?? null;
    const extFromName = file.name.includes('.')
      ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
      : '';
    const ext = extFromMime ?? extFromName ?? '.jpg';

    // Stable filename — same song always overwrites the same file in storage
    const fileName = `${songId}${ext}`;
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabaseServer.storage
      .from('song-images')
      .upload(fileName, fileBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL and append cache-buster so browsers show the new image immediately
    const { data: urlData } = supabaseServer.storage
      .from('song-images')
      .getPublicUrl(fileName);

    const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Update song with image URL (store without cache-buster — we add it fresh each upload)
    const { error: updateError } = await supabaseServer
      .from('songs')
      .update({ image_url: urlData.publicUrl })
      .eq('id', songId);

    if (updateError) throw updateError;

    return NextResponse.json(
      { imageUrl },
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
