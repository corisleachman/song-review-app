import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { songId, fileName, fileSize, createdBy, label, notes } = await req.json();

    if (!songId || !fileName || !createdBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Count existing versions to determine next version number
    const { count } = await supabaseServer
      .from('song_versions')
      .select('id', { count: 'exact', head: true })
      .eq('song_id', songId);

    const versionNumber = (count ?? 0) + 1;
    const filePath = `songs/${songId}/v${versionNumber}/${fileName}`;

    // Create signed upload URL
    const { data: urlData, error: urlError } = await supabaseServer.storage
      .from('song-files')
      .createSignedUploadUrl(filePath);

    if (urlError) throw urlError;

    // Insert version record
    const { data, error } = await supabaseServer
      .from('song_versions')
      .insert([{
        song_id: songId,
        version_number: versionNumber,
        label: label ?? null,
        notes: notes?.trim() ? notes.trim() : null,
        file_path: filePath,
        file_name: fileName,
        created_by: createdBy,
      }])
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json(
      { versionId: data.id, uploadUrl: urlData.signedUrl, filePath },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
