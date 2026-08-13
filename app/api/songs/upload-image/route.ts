import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

const IMAGE_MAX_PX = 1200;
const IMAGE_QUALITY = 85;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_MAX_REQUEST_BYTES = IMAGE_MAX_BYTES + 1024 * 1024;
const IMAGE_MAX_INPUT_PIXELS = 40_000_000;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(req: NextRequest) {
  try {
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in to upload cover art.' }, { status: 401 });
    }

    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > IMAGE_MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: 'Cover art must be 5MB or smaller.' }, { status: 413 });
    }

    const formData = await req.formData();
    const songIdValue = formData.get('songId');
    const fileValue = formData.get('file');
    const songId = typeof songIdValue === 'string' ? songIdValue.trim() : '';

    if (!songId || !(fileValue instanceof File)) {
      return NextResponse.json(
        { error: 'Missing songId or file' },
        { status: 400 }
      );
    }

    const file = fileValue;

    if (file.size === 0 || file.size > IMAGE_MAX_BYTES) {
      return NextResponse.json({ error: 'Cover art must be between 1 byte and 5MB.' }, { status: 400 });
    }

    if (!ACCEPTED_IMAGE_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: 'Cover art must be a JPEG, PNG, or WebP file.' },
        { status: 400 }
      );
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
      optimisedBuffer = await sharp(rawBuffer, {
        failOn: 'error',
        limitInputPixels: IMAGE_MAX_INPUT_PIXELS,
      })
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
      { error: 'That image could not be uploaded. Please try again.' },
      { status: 500 }
    );
  }
}
