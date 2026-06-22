import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

const IMAGE_MAX_PX = 1200;
const IMAGE_QUALITY = 85;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const songId = formData.get('songId') as string;
    const file = formData.get('file') as File;
    const resolved = await resolveCanonicalIdentity();

    if (!songId || !file) {
      return NextResponse.json(
        { error: 'Missing songId or file' },
        { status: 400 }
      );
    }

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to upload cover art.' }, { status: 401 });
    }

    const { data: song, error: songError } = await supabaseServer
      .from('songs')
      .select('id, account_id')
      .eq('id', songId)
      .maybeSingle();

    if (songError) throw songError;

    if (!song) {
      return NextResponse.json({ error: 'Song not found.' }, { status: 404 });
    }

    if (!song.account_id || song.account_id !== resolved.identity.workspaceId) {
      return NextResponse.json({ error: 'You do not have access to this song.' }, { status: 403 });
    }

    // Resize and compress with Sharp — 1200×1200 max, JPEG 85%, strip metadata
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    let optimisedBuffer: Buffer;
    try {
      optimisedBuffer = await sharp(rawBuffer)
        .resize(IMAGE_MAX_PX, IMAGE_MAX_PX, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: IMAGE_QUALITY, mozjpeg: true })
        .toBuffer();
    } catch (sharpError) {
      console.error('Sharp failed to process the uploaded image:', sharpError);
      const message = sharpError instanceof Error ? sharpError.message : String(sharpError);
      // Distinguish "couldn't load the sharp native module at all" (server/deploy
      // problem on our end) from "this specific file couldn't be decoded" (the
      // person picked an unsupported/corrupt file) so the right side gets blamed.
      const isModuleLoadFailure = /could not load the "?sharp"? module/i.test(message);
      return NextResponse.json(
        {
          error: isModuleLoadFailure
            ? 'Image processing is temporarily unavailable on our end. Please try again shortly.'
            : 'That image could not be read. Please try a JPEG, PNG, or WebP file.',
        },
        { status: isModuleLoadFailure ? 500 : 400 }
      );
    }

    // Unique filename with timestamp — bypasses CDN cache, no stale images
    const fileName = `${songId}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabaseServer.storage
      .from('song-images')
      .upload(fileName, optimisedBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseServer.storage
      .from('song-images')
      .getPublicUrl(fileName);

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
