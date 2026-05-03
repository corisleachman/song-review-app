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
