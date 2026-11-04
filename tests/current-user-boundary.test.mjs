import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Execute the real identity resolver; replace only SSR Auth/cookie I/O.
function harness({ user = null, error = null, refresh = false, readOnlyCookies = false } = {}) {
  let verificationCalls = 0;
  const writes = [];
  const exports = {};
  const stubs = {
    'next/headers': { cookies: async () => ({
      getAll: () => [],
      set: (...args) => { if (readOnlyCookies) throw new Error('Server Component cookies are read-only'); writes.push(args); },
    }) },
    '@supabase/ssr': { createServerClient: (_url, _key, options) => ({ auth: {
      getUser: async () => {
        verificationCalls++;
        if (refresh) options.cookies.setAll([{ name: 'test-session', value: 'test-only', options: { httpOnly: true } }]);
        return { data: { user }, error };
      },
      getSession: () => { throw new Error('Identity cannot use an unverified cached session'); },
    } }) },
  };
  const source = ts.transpileModule(readFileSync(new URL('../lib/currentUser.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'exports', source)(specifier => {
    assert.ok(Object.hasOwn(stubs, specifier), `Unexpected dependency: ${specifier}`);
    return stubs[specifier];
  }, exports);
  return { getUser: exports.getCurrentAuthenticatedUser, writes, get verificationCalls() { return verificationCalls; } };
}

test('canonical current user uses verified Auth ID/email despite editable metadata claims', async () => {
  const h = harness({ user: {
    id: 'verified-user', email: 'ordinary@example.test',
    user_metadata: { id: 'forged-user', email: 'admin@example.test', role: 'admin', full_name: 'Display name', avatar_url: 'https://example.test/avatar' },
  } });
  assert.deepEqual(await h.getUser(), { id: 'verified-user', email: 'ordinary@example.test', displayName: 'Display name', avatarUrl: 'https://example.test/avatar' });
  assert.equal(h.verificationCalls, 1);
});

test('Auth verification error rejects a populated cached user', async () => {
  const h = harness({ user: { id: 'cached-user', email: 'cached@example.test' }, error: { message: 'Verification failed' } });
  assert.equal(await h.getUser(), null);
  assert.equal(h.verificationCalls, 1);
});

test('missing verified Auth user stays signed out', async () => {
  const h = harness();
  assert.equal(await h.getUser(), null);
});

test('verified identity survives server-component cookie restriction and persists writable refreshes', async () => {
  for (const readOnlyCookies of [false, true]) {
    const h = harness({ user: { id: 'verified-user', email: 'ordinary@example.test' }, refresh: true, readOnlyCookies });
    assert.equal((await h.getUser()).id, 'verified-user');
    assert.deepEqual(h.writes, readOnlyCookies ? [] : [['test-session', 'test-only', { httpOnly: true }]]);
  }
});
