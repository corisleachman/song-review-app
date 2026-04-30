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

    // Use a timestamp in the filename so every upload gets a unique path.
    // This bypasses the Supabase CDN cache entirely — no stale images served.
    // Old files accumulate in storage but remain small (JPEGs < 200 KB each).
    const timestamp = Date.now();
    const fileName = `${songId}-${timestamp}.jpg`;

    // Read uploaded file into a buffer, then resize + compress with Sharp.
    // - Resizes to fit within 1200x1200, preserving aspect ratio (no upscaling)
    // - Converts to JPEG at 85% quality
    // - Strips EXIF/metadata to further reduce file size
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const optimisedBuffer = await sharp(rawBuffer)
      .resize(IMAGE_MAX_PX, IMAGE_MAX_PX, {
        fit: 'inside',           // preserve aspect ratio, no crop
        withoutEnlargement: true, // never upscale smaller images
      })
      .jpeg({ quality: IMAGE_QUALITY, mozjpeg: true })
      .toBuffer();

    const { error: uploadError } = await supabaseServer.storage
      .from('song-images')
      .upload(fileName, optimisedBuffer, {
        contentType: 'image/jpeg',
        upsert: false, // new unique path each time — no overwrite needed
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseServer.storage
      .from('song-images')
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // Update song with the new public URL (no cache-buster needed — URL is already unique)
    const { error: updateError } = await supabaseServer
      .from('songs')
      .update({ image_url: imageUrl })
      .eq('id', songId);

    if (updateError) throw updateError;

    return NextResponse.json({ imageUrl }, { status: 200 });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
