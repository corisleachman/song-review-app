import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../public/marketing.html', import.meta.url), 'utf8');
const start = html.indexOf('(async function loadSignupDisclosure()');
const end = html.indexOf('// ── NAV SCROLL', start);
const disclosureScript = html.slice(start, end);
const fallback = "You'll choose how to sign in on the next page.";

async function renderDisclosure(response) {
  const notes = [{ textContent: fallback }, { textContent: fallback }];
  const requests = [];
  await vm.runInNewContext(disclosureScript, {
    document: { querySelectorAll: () => notes },
    fetch: async (url, options) => {
      requests.push({ url, cache: options.cache });
      if (response instanceof Error) throw response;
      return response;
    },
  });
  assert.deepEqual(requests, [{ url: '/api/auth/email/config', cache: 'no-store' }]);
  return notes.map(note => note.textContent);
}

test('homepage signup notes reflect the login page public configuration', async () => {
  assert.ok(start >= 0 && end > start, 'signup disclosure script exists');
  for (const enabled of [false, true]) {
    const notes = await renderDisclosure({ ok: true, json: async () => ({ enabled }) });
    const expected = enabled
      ? 'Sign up with Google or your email address.'
      : "During beta, you'll need a Google account to sign up.";
    assert.deepEqual(notes, [expected, expected]);
  }
});

test('unavailable or invalid signup configuration keeps the neutral note', async () => {
  for (const response of [
    new Error('Offline'),
    { ok: false },
    { ok: true, json: async () => ({}) },
    { ok: true, json: async () => ({ enabled: 'false' }) },
    { ok: true, json: async () => { throw new Error('Invalid JSON'); } },
  ]) {
    assert.deepEqual(await renderDisclosure(response), [fallback, fallback]);
  }
});

test('homepage inline JavaScript parses after copy edits', () => {
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gu)) {
    new vm.Script(match[1]);
  }
});
