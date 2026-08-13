import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolvePlaylistAccess } from '@/lib/playlistAccess';

const IMAGE_MAX_PX = 1200;
const IMAGE_QUALITY = 85;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_MAX_REQUEST_BYTES = IMAGE_MAX_BYTES + 1024 * 1024;
const IMAGE_MAX_INPUT_PIXELS = 40_000_000;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const access = await resolvePlaylistAccess(id);
  if ('error' in access) {
    return NextResponse.json(
      { error: access.error === 'unauthorized' ? 'Sign in required.' : 'Not found.' },
      { status: access.error === 'unauthorized' ? 401 : 404 },
    );
  }
  try {
    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > IMAGE_MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: 'Playlist cover must be 5MB or smaller.' }, { status: 413 });
    }

    const formData = await req.formData();
    const fileValue = formData.get('file');
    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const file = fileValue;

    if (file.size === 0 || file.size > IMAGE_MAX_BYTES) {
      return NextResponse.json(
        { error: 'Playlist cover must be between 1 byte and 5MB.' },
        { status: 400 },
      );
    }

    if (!ACCEPTED_IMAGE_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: 'Playlist cover must be a JPEG, PNG, or WebP file.' },
        { status: 400 },
      );
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    let optimised: Buffer;
    try {
      optimised = await sharp(rawBuffer, {
        failOn: 'error',
        limitInputPixels: IMAGE_MAX_INPUT_PIXELS,
      })
        .resize(IMAGE_MAX_PX, IMAGE_MAX_PX, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: IMAGE_QUALITY, mozjpeg: true })
        .toBuffer();
    } catch (sharpErr) {
      const message = sharpErr instanceof Error ? sharpErr.message : String(sharpErr);
      const moduleFail = /could not load the "?sharp"? module/i.test(message);
      return NextResponse.json(
        { error: moduleFail ? 'Image processing is temporarily unavailable. Please try again shortly.' : 'That image could not be read. Please try a JPEG, PNG, or WebP file.' },
        { status: moduleFail ? 500 : 400 },
      );
    }

    const fileName = `playlist-${access.playlist.id}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabaseServer.storage
      .from('song-images')
      .upload(fileName, optimised, { contentType: 'image/jpeg', upsert: false });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseServer.storage.from('song-images').getPublicUrl(fileName);

    const { error: updateError } = await supabaseServer
      .from('playlists')
      .update({ image_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', access.playlist.id);
    if (updateError) throw updateError;

    return NextResponse.json({ imageUrl: urlData.publicUrl }, { status: 200 });
  } catch (err) {
    console.error('[playlists/:id/image] error:', err);
    return NextResponse.json({ error: 'Could not upload cover.' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const access = await resolvePlaylistAccess(id);
  if ('error' in access) {
    return NextResponse.json(
      { error: access.error === 'unauthorized' ? 'Sign in required.' : 'Not found.' },
      { status: access.error === 'unauthorized' ? 401 : 404 },
    );
  }
  try {
    const { error } = await supabaseServer
      .from('playlists')
      .update({ image_url: null, updated_at: new Date().toISOString() })
      .eq('id', access.playlist.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[playlists/:id/image] delete error:', err);
    return NextResponse.json({ error: 'Could not remove cover.' }, { status: 500 });
  }
}
