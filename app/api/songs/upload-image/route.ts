import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

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
