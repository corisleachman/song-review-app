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
    const optimisedBuffer = await sharp(rawBuffer)
      .resize(IMAGE_MAX_PX, IMAGE_MAX_PX, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: IMAGE_QUALITY, mozjpeg: true })
      .toBuffer();

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
