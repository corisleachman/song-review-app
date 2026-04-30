import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabaseServer } from '@/lib/supabaseServer';

// Target dimensions and quality for cover art.
// 1200x1200 JPEG at 85% quality keeps files well under 600 KB (WhatsApp limit)
// and loads quickly in the app. Square crop suits music artwork.
const IMAGE_MAX_PX = 1200;
const IMAGE_QUALITY = 85;

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

    // Always store as JPEG after optimisation — consistent format regardless of input
    const fileName = `${songId}.jpg`;

    // Read uploaded file into a buffer, then resize + compress with Sharp.
    // - Resizes to fit within 1200x1200, preserving aspect ratio (no upscaling)
    // - Converts to JPEG at 85% quality
    // - Strips EXIF/metadata to further reduce file size
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const optimisedBuffer = await sharp(rawBuffer)
      .resize(IMAGE_MAX_PX, IMAGE_MAX_PX, {
        fit: 'inside',      // preserve aspect ratio, no crop
        withoutEnlargement: true, // never upscale smaller images
      })
      .jpeg({ quality: IMAGE_QUALITY, mozjpeg: true })
      .toBuffer();

    const { error: uploadError } = await supabaseServer.storage
      .from('song-images')
      .upload(fileName, optimisedBuffer, {
        contentType: 'image/jpeg',
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
