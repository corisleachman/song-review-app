import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function requireOwner(identity: Awaited<ReturnType<typeof resolveCanonicalIdentity>>) {
  if (!identity) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  if (identity.identity.membershipRole !== 'owner') {
    return NextResponse.json(
      { error: 'Only the workspace owner can update workspace settings.' },
      { status: 403 }
    );
  }

  return null;
}

function normalizeWorkspaceName(input: unknown) {
  if (typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  return trimmed.slice(0, 80);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not update workspace settings.';
}

function getFileExtension(file: File) {
  const fromName = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
  if (fromName) return fromName;

  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';

  return 'jpg';
}

export async function PATCH(request: NextRequest) {
  try {
    noStore();

    const resolved = await resolveCanonicalIdentity();
    const ownerError = requireOwner(resolved);
    if (ownerError) return ownerError;

    const body = await request.json().catch(() => null);
    const name = normalizeWorkspaceName(body?.name);

    if (!name) {
      return NextResponse.json(
        { error: 'Workspace name is required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from('accounts')
      .update({ name })
      .eq('id', resolved.identity.workspaceId)
      .select('id, name')
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        workspace: data,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error updating workspace settings:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    noStore();

    const resolved = await resolveCanonicalIdentity();
    const ownerError = requireOwner(resolved);
    if (ownerError) return ownerError;

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Workspace image file is required.' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Workspace image must be an image file.' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Workspace image must be 5MB or smaller.' },
        { status: 400 }
      );
    }

    const extension = getFileExtension(file);
    const filePath = `workspace-images/${resolved.identity.workspaceId}-${Date.now()}.${extension}`;
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabaseServer.storage
      .from('song-images')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseServer.storage
      .from('song-images')
      .getPublicUrl(filePath);

    const { data, error } = await supabaseServer
      .from('accounts')
      .update({ image_url: urlData.publicUrl })
      .eq('id', resolved.identity.workspaceId)
      .select('id, name, image_url')
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        workspace: {
          id: data.id,
          name: data.name,
          imageUrl: data.image_url,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error uploading workspace image:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
