// Mirrors comment notifications: the uploader is never emailed about their own
// upload, and an "owner only" workspace emails just the owner (or, when the
// owner uploaded, everyone else).
export interface VersionUploadRecipientCandidate {
  userId: string;
  email: string | null;
  role: string;
}

export function selectVersionUploadRecipients<T extends VersionUploadRecipientCandidate>(
  members: T[],
  uploaderUserId: string | null,
  notificationMode: string | null | undefined,
): T[] {
  const others = members.filter(member => member.userId !== uploaderUserId);
  if (notificationMode !== 'owner_only') return others;
  const owner = members.find(member => member.role === 'owner');
  if (!owner) return [];
  return owner.userId === uploaderUserId ? others : [owner];
}
