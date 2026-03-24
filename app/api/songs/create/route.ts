import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { title, versionLabel, fileName, fileSize } = await req.json();

    if (!title || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create song
    const { data: songData, error: songError } = await supabaseServer
      .from('songs')
      .insert([{ title }])
      .select('id')
      .single();

    if (songError) throw songError;

    const songId = songData.id;
    const filePath = `songs/${songId}/version-1/${fileName}`;

    // Create signed URL for upload
    const { data: urlData, error: urlError } = await supabaseServer.storage
      .from('song-files')
      .createSignedUploadUrl(filePath);

    if (urlError) throw urlError;

    // Create song version
    const { data: versionData, error: versionError } = await supabaseServer
      .from('song_versions')
      .insert([
        {
          song_id: songId,
          version_number: 1,
          label: versionLabel || 'Demo',
          file_path: filePath,
          file_name: fileName,
          created_by: 'Coris', // Default, will be overridden on client
        },
      ])
      .select('id')
      .single();

    if (versionError) throw versionError;

    return NextResponse.json({
      songId,
      versionId: versionData.id,
      uploadUrl: urlData.signedUrl,
    });
  } catch (error) {
    console.error('Error creating song:', error);
    return NextResponse.json(
      { error: 'Failed to create song' },
      { status: 500 }
    );
  }
}
