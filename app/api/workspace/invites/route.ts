import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { Resend } from 'resend';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';
import {
  createWorkspaceInvite,
  findPendingInviteByEmail,
  getInviteState,
  isExistingWorkspaceMemberEmail,
  isValidInviteEmail,
  listWorkspaceInvites,
  normalizeInviteEmail,
} from '@/lib/accountInvites';
import {
  type AccountPlan,
  createPlanLimitPayload,
  getCollaboratorLimit,
  isMissingPlanColumnError,
  normalizeAccountPlan,
} from '@/lib/plans';
import { logPlanEvent } from '@/lib/planEvents';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const resend = new Resend(process.env.RESEND_API_KEY);

function requireOwner(identity: Awaited<ReturnType<typeof resolveCanonicalIdentity>>) {
  if (!identity) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  if (identity.identity.membershipRole !== 'owner') {
    return NextResponse.json({ error: 'Only the workspace owner can manage invites.' }, { status: 403 });
  }

  return null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not manage workspace invites.';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildInviteLink(inviteToken: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/invite/${inviteToken}`;
}

function getInviteEmailHtml(params: {
  inviterName: string;
  workspaceName: string;
  inviteLink: string;
}) {
  const { inviterName, workspaceName, inviteLink } = params;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; line-height: 1.5;">
      <p style="margin: 0 0 16px;"><strong>${escapeHtml(inviterName)}</strong> invited you to join <strong>${escapeHtml(workspaceName)}</strong> on Song Review.</p>
      <p style="margin: 0 0 20px;">Sign in with your invited Google account to accept the workspace invite and start collaborating.</p>
      <p style="margin: 0 0 20px;">
        <a href="${inviteLink}" style="display: inline-block; padding: 10px 16px; background-color: #111; color: #fff; text-decoration: none; border-radius: 6px;">
          Open invite
        </a>
      </p>
      <p style="margin: 0 0 8px; color: #555;">If the button does not work, use this link:</p>
      <p style="margin: 0; word-break: break-word;"><a href="${inviteLink}">${inviteLink}</a></p>
    </div>
  `.trim();
}

function getInviteEmailText(params: {
  inviterName: string;
  workspaceName: string;
  inviteLink: string;
}) {
  const { inviterName, workspaceName, inviteLink } = params;

  return [
    `${inviterName} invited you to join ${workspaceName} on Song Review.`,
    '',
    'Sign in with your invited Google account to accept the workspace invite.',
    '',
    `Open invite: ${inviteLink}`,
  ].join('\n');
}

async function sendInviteEmail(params: {
  to: string;
  inviterName: string;
  workspaceName: string;
  inviteLink: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    return {
      emailSent: false,
      emailWarning: 'Invite created, but RESEND_API_KEY is not configured. Copy the invite link manually.',
    };
  }

  try {
    await resend.emails.send({
      from: 'Song Review <onboarding@resend.dev>',
      to: params.to,
      subject: `${params.inviterName} invited you to join ${params.workspaceName}`,
      text: getInviteEmailText(params),
      html: getInviteEmailHtml(params),
    });

    return {
      emailSent: true,
      emailWarning: null as string | null,
    };
  } catch (error) {
    console.error('Error sending invite email:', error);
    return {
      emailSent: false,
      emailWarning: 'Invite created, but the email could not be sent. Copy the invite link manually.',
    };
  }
}

async function getWorkspacePlan(workspaceId: string): Promise<AccountPlan> {
  const planResult = await supabaseServer
    .from('accounts')
    .select('plan')
    .eq('id', workspaceId)
    .single();

  if (!planResult.error) {
    return normalizeAccountPlan(planResult.data?.plan);
  }

  if (isMissingPlanColumnError(planResult.error)) {
    return 'free';
  }

  throw planResult.error;
}

export async function GET() {
  try {
    noStore();

    const resolved = await resolveCanonicalIdentity();
    const ownerError = requireOwner(resolved);
    if (ownerError) return ownerError;

    const invites = await listWorkspaceInvites(resolved.identity.workspaceId);

    return NextResponse.json(
      { invites },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error loading workspace invites:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    noStore();

    const resolved = await resolveCanonicalIdentity();
    const ownerError = requireOwner(resolved);
    if (ownerError) return ownerError;

    const { email } = await req.json();

    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    if (!isValidInviteEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    const { normalizedEmail } = normalizeInviteEmail(email);

    const isMember = await isExistingWorkspaceMemberEmail(resolved.identity.workspaceId, normalizedEmail);
    if (isMember) {
      return NextResponse.json(
        { error: 'This email already belongs to a member of the workspace.' },
        { status: 400 }
      );
    }

    const existingInvite = await findPendingInviteByEmail(resolved.identity.workspaceId, normalizedEmail);
    if (existingInvite) {
      return NextResponse.json(
        {
          created: false,
          duplicate: true,
          emailSent: false,
          invite: existingInvite,
        },
        { status: 200 }
      );
    }

    const plan = await getWorkspacePlan(resolved.identity.workspaceId);
    const collaboratorLimit = getCollaboratorLimit(plan);

    if (collaboratorLimit !== null) {
      const [members, invites] = await Promise.all([
        supabaseServer
          .from('account_members')
          .select('user_id, role')
          .eq('account_id', resolved.identity.workspaceId),
        listWorkspaceInvites(resolved.identity.workspaceId),
      ]);

      if (members.error) throw members.error;

      const currentCollaboratorCount = (members.data ?? []).filter(member => member.role !== 'owner').length;
      const pendingInviteCount = invites.filter(invite => getInviteState(invite) === 'pending').length;
      const activeCollaboratorSlots = currentCollaboratorCount + pendingInviteCount;

      if (activeCollaboratorSlots >= collaboratorLimit) {
        logPlanEvent({
          event: 'plan_limit_hit',
          type: 'collaborators',
          workspaceId: resolved.identity.workspaceId,
          userId: resolved.identity.userId,
        });

        return NextResponse.json(
          createPlanLimitPayload('collaborators'),
          { status: 400 }
        );
      }
    }

    const invite = await createWorkspaceInvite({
      workspaceId: resolved.identity.workspaceId,
      invitedByUserId: resolved.identity.userId,
      email,
    });

    const emailResult = await sendInviteEmail({
      to: invite.email,
      inviterName: resolved.identity.displayName,
      workspaceName: resolved.identity.workspaceName,
      inviteLink: buildInviteLink(invite.invite_token),
    });

    return NextResponse.json(
      {
        created: true,
        duplicate: false,
        emailSent: emailResult.emailSent,
        emailWarning: emailResult.emailWarning,
        invite,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating workspace invite:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
