import { bootstrapAccountForUser, type BootstrapResult } from '@/lib/bootstrapAccount';
import { getCurrentAuthenticatedUser } from '@/lib/currentUser';

export interface CanonicalIdentity {
  userId: string;
  email: string | null;
  profileId: string;
  displayName: string;
  authorName: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string | null;
  membershipRole: 'owner' | 'member';
}

function normalizeDisplayName(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';

  const firstWord = trimmed.split(/\s+/)[0] ?? '';
  return firstWord.trim();
}

function resolveLegacyCollaboratorAlias(email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase() ?? '';

  // Transitional compatibility for existing authored columns that still
  // store two collaborator labels instead of user ids.
  if (normalizedEmail === 'corisleachman@googlemail.com') return 'Coris';
  if (normalizedEmail === 'furthertcb@gmail.com') return 'Al';

  return null;
}

function getAuthorName(bootstrap: BootstrapResult) {
  const profileDisplayName = bootstrap.profile.display_name?.trim() || null;
  const firstWord = normalizeDisplayName(profileDisplayName || bootstrap.user.displayName);
  const legacyAlias = resolveLegacyCollaboratorAlias(bootstrap.user.email);

  if (firstWord === 'Coris' || firstWord === 'Al') return firstWord;
  if (legacyAlias) return legacyAlias;
  if (firstWord) return firstWord;

  return bootstrap.user.email?.split('@')[0]?.trim() || 'Unknown';
}

export function buildCanonicalIdentity(bootstrap: BootstrapResult): CanonicalIdentity {
  const displayName = bootstrap.profile.display_name?.trim()
    || bootstrap.user.displayName?.trim()
    || bootstrap.user.email?.split('@')[0]?.trim()
    || 'Unknown user';

  return {
    userId: bootstrap.user.id,
    email: bootstrap.user.email,
    profileId: bootstrap.profile.id,
    displayName,
    authorName: getAuthorName(bootstrap),
    workspaceId: bootstrap.workspace.id,
    workspaceName: bootstrap.workspace.name,
    workspaceSlug: bootstrap.workspace.slug,
    membershipRole: bootstrap.membership.role,
  };
}

export async function resolveCanonicalIdentity() {
  const user = await getCurrentAuthenticatedUser();

  if (!user) return null;

  const bootstrap = await bootstrapAccountForUser(user);

  return {
    bootstrap,
    identity: buildCanonicalIdentity(bootstrap),
  };
}
