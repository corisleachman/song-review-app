import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const diagnostics = {};
new Function('exports', ts.transpileModule(
  readFileSync(new URL('../lib/safeErrorDetails.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText)(diagnostics);
const user = { id: 'user-a', email: 'new@example.test', displayName: 'New User', avatarUrl: null };
const membership = (account_id, role = 'owner') => ({ account_id, user_id: user.id, role, joined_at: '2026-01-01T00:00:00Z' });
const workspace = id => ({ id, name: 'Existing workspace', plan: 'free', notification_mode: 'all_members' });

function harness({ concurrentReads = 1, memberships = [], accounts = [], activeId = null, failMembership = false, rpcError = null, invalidRpc = null, profileError = null } = {}) {
  const state = { memberships: [...memberships], accounts: [...accounts], referrals: [], rpcCalls: [], profilePayloads: [], tableWrites: [], reads: [] };
  let membershipReads = 0; let release;
  const gate = new Promise(resolve => { release = resolve; });
  let serial = Promise.resolve();
  const db = {
    from(table) {
      let operation = 'read'; let payload; let single = false; const filters = [];
      const q = {
        select() { return q; }, eq(k, v) { filters.push(row => row[k] === v); return q; }, order() { return q; }, returns() { return q; },
        single() { single = true; return q; },
        upsert(value) { operation = 'upsert'; payload = value; state.profilePayloads.push(value); return q; },
        insert(value) { operation = 'insert'; payload = Array.isArray(value) ? value[0] : value; state.tableWrites.push(table); return q; },
        async then(resolve, reject) {
          try {
            if (table === 'profiles') return resolve({ data: { ...payload, created_at: '2026-01-01' }, error: profileError });
            if (table === 'account_members' && operation === 'read') {
              state.reads.push(table);
              const snapshot = state.memberships.filter(row => filters.every(f => f(row)));
              membershipReads++;
              if (membershipReads >= concurrentReads) release();
              await gate;
              return resolve({ data: snapshot, error: null });
            }
            if (table === 'accounts' && operation === 'insert') {
              const account = { ...workspace(`created-${state.accounts.length + 1}`), ...payload };
              state.accounts.push(account); return resolve({ data: { id: account.id }, error: null });
            }
            if (table === 'account_members' && operation === 'insert') {
              if (failMembership) return resolve({ data: null, error: new Error('Membership write failed') });
              const created = { ...payload, joined_at: '2026-01-01' }; state.memberships.push(created);
              return resolve({ data: created, error: null });
            }
            const rows = state.accounts.filter(row => filters.every(f => f(row)));
            return resolve({ data: single ? rows[0] ?? null : rows, error: null });
          } catch (error) { return reject(error); }
        },
      };
      return q;
    },
    rpc(name, args) {
      state.rpcCalls.push({ name, args });
      // Fake atomic DB I/O only. Actual transaction/role behaviour is exercised
      // by the hosted rollback-only SQL probe, not this in-memory stand-in.
      const attempt = serial.then(() => {
        if (rpcError) return { data: null, error: rpcError };
        if (invalidRpc !== null) return { data: invalidRpc, error: null };
        const existing = state.memberships.find(m => m.role === 'member') ?? state.memberships.find(m => m.role === 'owner');
        if (existing) return { data: [{ ...existing, was_created: false }], error: null };
        if (failMembership) return { data: null, error: new Error('Membership write failed') };
        const account = { ...workspace(`created-${state.accounts.length + 1}`), name: args.p_workspace_name };
        const m = membership(account.id); state.accounts.push(account); state.memberships.push(m);
        return { data: [{ ...m, was_created: true }], error: null };
      });
      serial = attempt.then(() => undefined);
      return attempt;
    },
  };
  const stubs = {
    '@/lib/safeErrorDetails': diagnostics,
    '@/lib/supabaseServer': { supabaseServer: db },
    '@/lib/referrals': { REFERRAL_COOKIE_NAME: 'tsr_ref', attributeReferralOnSignup: async value => { state.referrals.push(value); } },
    '@/lib/plans': { normalizeAccountPlan: plan => plan ?? 'free', isMissingPlanColumnError: () => false },
    '@/lib/activeWorkspace': { readActiveWorkspaceCookie: async () => activeId, findValidActiveWorkspaceMembership: async (uid, id) => state.memberships.find(m => m.user_id === uid && m.account_id === id) ?? null },
    'next/headers': { cookies: async () => ({ get: () => undefined, delete() {} }) },
  };
  const source = ts.transpileModule(readFileSync(new URL('../lib/bootstrapAccount.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', source)(name => stubs[name] ?? require(name), exports);
  return { run: exports.bootstrapAccountForUser, state };
}

test('six first-request membership snapshots reuse one workspace and attribute once', async () => {
  const h = harness({ concurrentReads: 6 });
  const results = await Promise.all(Array.from({ length: 6 }, () => h.run(user, undefined, 'sealed-referral')));
  assert.equal(new Set(results.map(result => result.workspace.id)).size, 1);
  assert.equal(h.state.accounts.length, 1); assert.equal(h.state.memberships.length, 1); assert.equal(h.state.referrals.length, 1);
  assert.equal(h.state.referrals[0].referredAccountId, results[0].workspace.id);
});
test('failed owner membership leaves no orphan workspace', async () => {
  const h = harness({ failMembership: true });
  await assert.rejects(h.run(user), /Membership write failed/);
  assert.equal(h.state.accounts.length, 0); assert.equal(h.state.memberships.length, 0); assert.equal(h.state.referrals.length, 0);
});
for (const activeId of [null, 'owned', 'foreign']) {
  test(`existing selection keeps member preference and valid active workspace: ${activeId}`, async () => {
    const h = harness({ activeId, memberships: [membership('owned'), membership('shared', 'member')], accounts: [workspace('owned'), workspace('shared')] });
    const result = await h.run(user);
    assert.equal(result.workspace.id, activeId === 'owned' ? 'owned' : 'shared');
    assert.deepEqual(h.state.rpcCalls, []); assert.deepEqual(h.state.tableWrites, []);
  });
}
test('profile errors prevent workspace provisioning', async () => {
  const h = harness({ profileError: new Error('Profile write failed') });
  await assert.rejects(h.run(user), /Profile write failed/); assert.deepEqual(h.state.rpcCalls, []); assert.deepEqual(h.state.tableWrites, []);
});
test('profile avatar writes remain optional and existing users still use the current path', async () => {
  const h = harness({ memberships: [membership('owned')], accounts: [workspace('owned')] });
  await h.run(user); await h.run({ ...user, avatarUrl: 'https://example.test/avatar.jpg' });
  assert.equal('avatar_url' in h.state.profilePayloads[0], false); assert.equal(h.state.profilePayloads[1].avatar_url, 'https://example.test/avatar.jpg');
  assert.deepEqual(h.state.rpcCalls, []);
});

for (const invalidRpc of [[], [{}], [{ ...membership('other'), user_id: 'other-user', was_created: false }], [{ ...membership('other', 'member'), was_created: true }], [{ ...membership('other'), was_created: 'true' }]]) {
  test(`invalid provisioning result is rejected without a direct-write fallback: ${JSON.stringify(invalidRpc)}`, async () => {
    const h = harness({ invalidRpc });
    await assert.rejects(h.run(user), /Could not finish workspace setup/);
    assert.deepEqual(h.state.tableWrites, []); assert.equal(h.state.referrals.length, 0);
  });
}
test('provisioning failure does not fall back to separate writes', async () => {
  const h = harness({ rpcError: new Error('Provisioning unavailable') });
  await assert.rejects(h.run(user), /Provisioning unavailable/); assert.deepEqual(h.state.tableWrites, []);
});
test('first setup uses canonical user and existing workspace-name rules', async () => {
  const h = harness();
  await h.run(user);
  assert.deepEqual(h.state.rpcCalls, [{ name: 'ensure_initial_workspace_membership', args: { p_user_id: user.id, p_workspace_name: "New User's Workspace" } }]);
});
