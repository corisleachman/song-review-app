import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { writeActiveWorkspaceCookie } from '@/lib/activeWorkspace';
import { supabaseServer } from '@/lib/supabaseServer';
import { listUserWorkspaces } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not create workspace.';
}

function getDefaultWorkspaceName(displayName: string | null | undefined, email: string | null | undefined) {
  const base = displayName?.trim() || email?.split('@')[0]?.trim() || 'My';
  return `${base}'s Workspace`;
}

function normalizeWorkspaceName(input: unknown, fallback: string) {
  if (typeof input !== 'string') return fallback;

  const trimmed = input.trim();
  if (!trimmed) return fallback;

  return trimmed.slice(0, 80);
}

async function findExistingOwnerWorkspace(userId: string) {
  const { data, error } = await supabaseServer
    .from('account_members')
    .select('account_id, user_id, role, joined_at')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function POST(req: NextRequest) {
  try {
    noStore();

    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const existingOwner = await findExistingOwnerWorkspace(resolved.identity.userId);

    if (existingOwner) {
      return NextResponse.json(
        { error: 'You already own a workspace.' },
        { status: 409 }
      );
    }

    const payload = await req.json().catch(() => null);
    const fallbackName = getDefaultWorkspaceName(
      resolved.identity.displayName,
      resolved.identity.email
    );
    const workspaceName = normalizeWorkspaceName(payload?.name, fallbackName);

    const { data: account, error: accountError } = await supabaseServer
      .from('accounts')
      .insert([
        {
          created_by_user_id: resolved.identity.userId,
          name: workspaceName,
        },
      ])
      .select('id')
      .single();

    if (accountError) throw accountError;

    const { error: membershipError } = await supabaseServer
      .from('account_members')
      .insert([
        {
          account_id: account.id,
          user_id: resolved.identity.userId,
          role: 'owner',
        },
      ]);

    if (membershipError) throw membershipError;

    const workspaces = await listUserWorkspaces(resolved.identity.userId, account.id);
    const workspace = workspaces.find(item => item.id === account.id) ?? null;

    const response = NextResponse.json(
      {
        created: true,
        currentWorkspaceId: account.id,
        workspace,
        workspaces,
      },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );

    writeActiveWorkspaceCookie(response, account.id);
    return response;
  } catch (error) {
    console.error('Error creating workspace:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
