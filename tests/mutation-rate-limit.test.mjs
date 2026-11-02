import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);

function limiterHarness(result = { data: [{ allowed: true, retry_after_seconds: 0 }], error: null }) {
  const calls = [];
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL('../lib/mutationRateLimit.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const stubs = {
    'server-only': {},
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/supabaseServer': { supabaseServer: { rpc: async (name, args) => { calls.push({ name, args }); if (result instanceof Error) throw result; return result; } } },
    '@/lib/emailLoginRateLimitCore': { readVercelVisitorIp: headers => {
      const ip = headers.get('x-vercel-forwarded-for'); return require('node:net').isIP(ip ?? '') ? ip : null;
    } },
  };
  new Function('require', 'exports', source)(name => stubs[name] ?? require(name), exports);
  return { ...exports, calls };
}
const key = 'test-server-only-key-with-more-than-32-bytes';

// All module tests use fake RPC I/O, not hosted services or real credentials.
test('hashes are stable, domain separated and omit raw identifiers', async () => {
  const previous = process.env.SUPABASE_SERVICE_ROLE_KEY; process.env.SUPABASE_SERVICE_ROLE_KEY = key;
  try {
    const h = limiterHarness();
    await h.enforceMutationRateLimit('workspace_comment', 'user-a');
    await h.enforceMutationRateLimit('workspace_comment', 'user-a');
    await h.enforceMutationRateLimit('public_comment', 'user-a');
    await h.enforceMutationRateLimit('workspace_invite', 'workspace-a', 'person@example.test');
    await h.enforceMutationRateLimit('workspace_invite', 'workspace-b', 'person@example.test');
    assert.equal(h.calls[0].name, 'consume_mutation_attempt');
    assert.equal(h.calls[0].args.p_subject_hash, h.calls[1].args.p_subject_hash);
    assert.notEqual(h.calls[0].args.p_subject_hash, h.calls[2].args.p_subject_hash);
    assert.notEqual(h.calls[3].args.p_recipient_hash, h.calls[4].args.p_recipient_hash);
    for (const { args } of h.calls) {
      assert.match(args.p_subject_hash, /^[0-9a-f]{64}$/);
      if (args.p_recipient_hash) assert.match(args.p_recipient_hash, /^[0-9a-f]{64}$/);
    }
    assert.doesNotMatch(JSON.stringify(h.calls), /user-a|workspace-a|person@example|test-server/);
  } finally { if (previous === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previous; }
});

test('public comments trust the Vercel address and reject spoofable/missing addresses', async () => {
  const previous = process.env.SUPABASE_SERVICE_ROLE_KEY; process.env.SUPABASE_SERVICE_ROLE_KEY = key;
  try {
    const h = limiterHarness();
    for (const headers of [{}, { 'x-forwarded-for': '198.51.100.1' }, { 'x-real-ip': '198.51.100.1' }, { 'x-vercel-forwarded-for': 'invalid' }]) {
      assert.equal((await h.enforcePublicCommentRateLimit(new Request('https://test.invalid', { headers }))).status, 503);
    }
    assert.equal(h.calls.length, 0);
    assert.equal(await h.enforcePublicCommentRateLimit(new Request('https://test.invalid', { headers: { 'x-vercel-forwarded-for': '198.51.100.1', 'x-forwarded-for': '203.0.113.1' } })), null);
    assert.equal(h.calls.length, 1);
  } finally { if (previous === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previous; }
});

for (const scope of ['public_comment', 'workspace_comment', 'workspace_invite']) {
  test(`${scope}: throttling returns 429 with bounded Retry-After and no-store`, async () => {
    const previous = process.env.SUPABASE_SERVICE_ROLE_KEY; process.env.SUPABASE_SERVICE_ROLE_KEY = key;
    try {
      const h = limiterHarness({ data: [{ allowed: false, retry_after_seconds: 42 }], error: null });
      const response = await h.enforceMutationRateLimit(scope, 'subject-a', scope === 'workspace_invite' ? 'test@example.test' : undefined);
      assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '42'); assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal((await response.json()).retryAfterSeconds, 42);
    } finally { if (previous === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previous; }
  });
}
for (const result of [new Error('provider-secret'), { data: null, error: { message: 'provider-secret' } }, { data: [], error: null }, { data: [{ allowed: false, retry_after_seconds: 0 }], error: null }, { data: [{ allowed: true, retry_after_seconds: '0' }], error: null }, { data: [{ allowed: false, retry_after_seconds: 3601 }], error: null }]) {
  test(`invalid or unavailable RPC fails closed: ${JSON.stringify(result)}`, async () => {
    const previous = process.env.SUPABASE_SERVICE_ROLE_KEY; process.env.SUPABASE_SERVICE_ROLE_KEY = key;
    try {
      const response = await limiterHarness(result).enforceMutationRateLimit('workspace_comment', 'user-a');
      assert.equal(response.status, 503); assert.equal(response.headers.get('Retry-After'), '60');
      assert.doesNotMatch(await response.text(), /provider-secret/);
    } finally { if (previous === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previous; }
  });
}
test('missing server key fails closed before RPC', async () => {
  const previous = process.env.SUPABASE_SERVICE_ROLE_KEY; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const h = limiterHarness(); assert.equal((await h.enforceMutationRateLimit('workspace_comment', 'user')).status, 503); assert.equal(h.calls.length, 0);
  } finally { if (previous !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = previous; }
});
