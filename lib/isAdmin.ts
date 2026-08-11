// Admin gate driven by the ADMIN_EMAILS env var (comma-separated, case-insensitive).
// If ADMIN_EMAILS is unset, nobody is admin — safe default (deny-all).
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = getAdminEmails();
  return list.length > 0 && list.includes(email.toLowerCase());
}
