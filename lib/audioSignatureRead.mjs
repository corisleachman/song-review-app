/** @param {Response} response @param {number} maxBytes */
export async function readBoundedResponseBody(response, maxBytes) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (totalBytes < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = maxBytes - totalBytes;
      const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value;
      chunks.push(chunk);
      totalBytes += chunk.byteLength;
    }
  } finally {
    // A tee'd response waits for BOTH branches to cancel. The fetch owner aborts
    // its request separately; stream cleanup must not hold up signature validation.
    void reader.cancel().catch(() => undefined);
  }
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

/**
 * @param {string} signedUrl
 * @param {number} maxBytes
 * @param {{fetchImpl?: typeof fetch, timeoutMs?: number, trace?: (stage: string) => void}} options
 */
export async function fetchAudioSignaturePrefix(
  signedUrl,
  maxBytes,
  { fetchImpl = fetch, timeoutMs = 10_000, trace = () => undefined } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    trace('signature_fetch_started');
    const response = await fetchImpl(signedUrl, {
      cache: 'no-store',
      // An explicit signal opts out of Next's deduplicated response cloning.
      signal: controller.signal,
      headers: { Range: `bytes=0-${maxBytes - 1}` },
    });
    trace('signature_headers_received');
    if (!response.ok) {
      void response.body?.cancel().catch(() => undefined);
      throw new Error(`Audio inspection returned status ${response.status}.`);
    }
    trace('signature_body_started');
    const signature = await readBoundedResponseBody(response, maxBytes);
    trace('signature_body_finished');
    return signature;
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
