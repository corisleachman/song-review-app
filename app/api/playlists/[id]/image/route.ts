import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolvePlaylistAccess } from '@/lib/playlistAccess';

const IMAGE_MAX_PX = 1200;
const IMAGE_QUALITY = 85;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await resolvePlaylistAccess(params.id);
  if ('error' in access) {
    return NextResponse.json(
      { error: access.error === 'unauthorized' ? 'Sign in required.' : 'Not found.' },
      { status: access.error === 'unauthorized' ? 401 : 404 },
    );
  }
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 });

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    let optimised: Buffer;
    try {
      optimised = await sharp(rawBuffer)
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

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await resolvePlaylistAccess(params.id);
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
