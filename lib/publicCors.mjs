// Lets a named external website (for example a band's own site) read public
// playlist data and play public audio from the browser. Only origins listed in
// PUBLIC_EMBED_ORIGINS are allowed, and only on routes that already serve
// public content without credentials. With the variable unset, nothing changes.

/** @param {string | undefined} value */
export function parseAllowedOrigins(value) {
  if (!value) return new Set();
  return new Set(
    value.split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter((origin) => /^https?:\/\/[^/\s]+$/.test(origin))
  );
}

/**
 * @param {string | null | undefined} requestOrigin
 * @param {string | undefined} [allowList]
 * @returns {Record<string, string>}
 */
export function publicCorsHeaders(requestOrigin, allowList = process.env.PUBLIC_EMBED_ORIGINS) {
  const allowed = parseAllowedOrigins(allowList);
  if (allowed.size === 0) return {};
  const vary = { Vary: 'Origin' };
  if (!requestOrigin || !allowed.has(requestOrigin)) return vary;
  return { ...vary, 'Access-Control-Allow-Origin': requestOrigin };
}
