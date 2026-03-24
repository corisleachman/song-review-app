import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { songId, versionNumber, label, filePath, fileName } = await req.json();

    if (!songId || !versionNumber || !filePath) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create signed URL for upload
    const { data: urlData, error: urlError } = await supabaseServer.storage
      .from('song-files')
      .createSignedUploadUrl(filePath);

    if (urlError) throw urlError;

    // Create version record
    const { data: versionData, error: versionError } = await supabaseServer
      .from('song_versions')
      .insert([
        {
          song_id: songId,
          version_number: versionNumber,
          label: label || `Version ${versionNumber}`,
          file_path: filePath,
          file_name: fileName,
          created_by: 'Coris', // Will be set to actual user on client
        },
      ])
      .select('id')
      .single();

    if (versionError) throw versionError;

    return NextResponse.json({
      versionId: versionData.id,
      uploadUrl: urlData.signedUrl,
    });
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    );
  }
}
