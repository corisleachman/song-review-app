import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { title, versionLabel, fileName, fileSize } = await req.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Missing title' },
        { status: 400 }
      );
    }

    // Create song
    const { data: songData, error: songError } = await supabaseServer
      .from('songs')
      .insert([{ title }])
      .select('id')
      .single();

    if (songError) {
      console.error('Supabase insert error:', {
        message: songError.message,
        code: songError.code,
        details: songError.details,
      });
      throw songError;
    }

    const songId = songData.id;

    // If no file, just return the song ID (version will be created later when file is uploaded)
    if (!fileName) {
      console.log('Song created successfully:', songId);
      return NextResponse.json({
        songId,
        versionId: null,
        uploadUrl: null,
      });
    }

    const filePath = `songs/${songId}/version-1/${fileName}`;

    // Create signed URL for upload
    const { data: urlData, error: urlError } = await supabaseServer.storage
      .from('song-files')
      .createSignedUploadUrl(filePath);

    if (urlError) {
      console.error('Signed URL error:', urlError);
      throw urlError;
    }

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

    if (versionError) {
      console.error('Version creation error:', versionError);
      throw versionError;
    }

    console.log('Song and version created successfully:', { songId, versionId: versionData.id });
    return NextResponse.json({
      songId,
      versionId: versionData.id,
      uploadUrl: urlData.signedUrl,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating song:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: errorMessage || 'Failed to create song' },
      { status: 500 }
    );
  }
}
