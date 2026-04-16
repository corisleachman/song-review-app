export type VersionDisplayLike = {
  id?: string;
  label?: string | null;
  version_number?: number | null;
};

export function getVersionDisplayLabel(version: VersionDisplayLike) {
  const trimmed = version.label?.trim();
  if (trimmed) return trimmed;

  if (version.version_number != null) {
    return `v${version.version_number}`;
  }

  return 'Untitled version';
}

export function withVersionDisplayName<T extends VersionDisplayLike>(version: T) {
  return {
    ...version,
    display_name: getVersionDisplayLabel(version),
  };
}
