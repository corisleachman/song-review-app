// Keep malformed or oversized collaboration payloads out of database work.
// Matches the existing 16 KiB auth/internal request ceiling.
export async function readCollaborationInput(request: Request): Promise<Record<string, unknown> | null> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 16 * 1024) return null;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > 16 * 1024) return null;
    const value: unknown = JSON.parse(raw);
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
