import { safeErrorDetails } from '@/lib/safeErrorDetails';
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { Resend } from 'resend';
import { buildInviteEmail, EMAIL_FROM } from '@/lib/emailTemplates';
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
import { enforceMutationRateLimit } from '@/lib/mutationRateLimit';
import { logPlanEvent } from '@/lib/planEvents';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function requireOwner(identity: Awaited<ReturnType<typeof resolveCanonicalIdentity>>) {
  if (!identity) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  if (identity.identity.membershipRole !== 'owner') {
    return NextResponse.json({ error: 'Only the workspace owner can manage invites.' }, { status: 403 });
  }

  return null;
}

function buildInviteLink(inviteToken: string, requestOrigin: string) {
  return new URL(`/invite/${encodeURIComponent(inviteToken)}`, requestOrigin).toString();
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
      emailWarning: 'Invite created, but the email could not be sent. Copy the invite link manually.',
    };
  }

  try {
    const email = buildInviteEmail({
      origin: new URL(params.inviteLink).origin,
      link: params.inviteLink,
      inviterName: params.inviterName,
      workspaceName: params.workspaceName,
    });
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    if (result.error) {
      console.warn('[invite-email] Provider rejected message:', safeErrorDetails(result.error));
      return {
        emailSent: false,
        emailWarning: 'Invite created, but the email could not be sent. Copy the invite link manually.',
      };
    }

    return {
      emailSent: true,
      emailWarning: null as string | null,
    };
  } catch (error) {
    console.error('[invite-email] Send failed:', safeErrorDetails(error));
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
    console.error('Error loading workspace invites:', safeErrorDetails(error));
    return NextResponse.json({ error: 'Could not manage workspace invites.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    noStore();

    const resolved = await resolveCanonicalIdentity();
    const ownerError = requireOwner(resolved);
    if (ownerError) return ownerError;

    const payload: unknown = await req.json().catch(() => null);
    const email = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>).email : undefined;

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
      const limitError = await enforceMutationRateLimit(
        'workspace_invite', resolved.identity.workspaceId, normalizedEmail,
      );
      if (limitError) return limitError;

      // Resend the invite email rather than silently skipping it
      const emailResult = await sendInviteEmail({
        to: existingInvite.email,
        inviterName: resolved.identity.displayName,
        workspaceName: resolved.identity.workspaceName,
        inviteLink: buildInviteLink(existingInvite.invite_token, req.nextUrl.origin),
      });

      return NextResponse.json(
        {
          created: false,
          duplicate: true,
          emailSent: emailResult.emailSent,
          emailWarning: emailResult.emailWarning,
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

    const limitError = await enforceMutationRateLimit(
      'workspace_invite', resolved.identity.workspaceId, normalizedEmail,
    );
    if (limitError) return limitError;

    const invite = await createWorkspaceInvite({
      workspaceId: resolved.identity.workspaceId,
      invitedByUserId: resolved.identity.userId,
      email,
    });

    const emailResult = await sendInviteEmail({
      to: invite.email,
      inviterName: resolved.identity.displayName,
      workspaceName: resolved.identity.workspaceName,
      inviteLink: buildInviteLink(invite.invite_token, req.nextUrl.origin),
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
    console.error('Error creating workspace invite:', safeErrorDetails(error));
    return NextResponse.json({ error: 'Could not manage workspace invites.' }, { status: 500 });
  }
}
