import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fetchAudioSignaturePrefix, readBoundedResponseBody } from '../lib/audioSignatureRead.mjs';

const require = createRequire(import.meta.url);
const { cloneResponse } = require('next/dist/server/lib/clone-response.js');

test('signature reader returns its prefix without awaiting the other Next response branch', async () => {
  const [response, cachedResponse] = cloneResponse(new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array([1, 2, 3, 4, 5])); },
  })));
  try {
    const bytes = await Promise.race([
      readBoundedResponseBody(response, 4),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Reader awaited tee cancellation')), 100)),
    ]);
    assert.deepEqual(bytes, new Uint8Array([1, 2, 3, 4]));
  } finally {
    await cachedResponse.body.cancel();
  }
});

test('signature fetch owns its lifetime and requests only the bounded range', async () => {
  let signal;
  let cancelled = false;
  const bytes = await fetchAudioSignaturePrefix('https://example.invalid/signed-audio', 4, {
    fetchImpl: async (_, options) => {
      assert.equal(options.cache, 'no-store');
      assert.equal(options.headers.Range, 'bytes=0-3');
      signal = options.signal;
      assert.ok(signal instanceof AbortSignal);
      assert.equal(signal.aborted, false);
      return new Response(new ReadableStream({
        start(controller) { controller.enqueue(new Uint8Array([1, 2, 3, 4, 5])); },
        cancel() { cancelled = true; },
      }), { status: 206 });
    },
  });
  assert.deepEqual(bytes, new Uint8Array([1, 2, 3, 4]));
  assert.equal(signal.aborted, true);
  assert.equal(cancelled, true);
});

test('signature read deadline aborts a body that stops delivering bytes', async () => {
  await assert.rejects(fetchAudioSignaturePrefix('https://example.invalid/signed-audio', 4, {
    timeoutMs: 20,
    fetchImpl: async (_, { signal }) => new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1]));
        signal.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')));
      },
    })),
  }), { name: 'AbortError' });
});

test('signature fetch rejects HTTP errors without waiting for cloned body cleanup', async () => {
  const [response, cachedResponse] = cloneResponse(new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array([1])); },
  }), { status: 503 }));
  try {
    await assert.rejects(fetchAudioSignaturePrefix('https://example.invalid/signed-audio', 4, {
      fetchImpl: async () => response,
    }), /Audio inspection returned status 503/);
  } finally {
    await cachedResponse.body.cancel();
  }
});
