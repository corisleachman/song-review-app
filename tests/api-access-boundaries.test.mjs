import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// Execute the real handler, replacing only framework/I/O boundaries. This
// checks runtime decisions; it is not a Supabase, cookie or hosted HTTP test.
function routeHarness(route, { identity = null, user = null, tables = {} } = {}) {
  const reads = [];
  const writes = [];
  let notifications = 0;
  const db = {
    from(table) {
      reads.push(table);
      const predicates = [];
      let single = false;
      let mutation = false;
      const query = {
        select() { return query; },
        eq(key, value) { predicates.push(row => row[key] === value); return query; },
        in(key, values) { predicates.push(row => values.includes(row[key])); return query; },
        not(key, operator, value) {
          assert.equal(operator, 'is');
          predicates.push(row => row[key] !== value); return query;
        },
        order() { return query; },
        limit() { return query; },
        maybeSingle() { single = true; return query; },
        single() { single = true; return query; },
        update(value) { mutation = true; writes.push({ table, value }); return query; },
        insert(value) { mutation = true; writes.push({ table, value }); return query; },
        delete() { mutation = true; writes.push({ table, delete: true }); return query; },
        then(resolve, reject) {
          const rows = (tables[table] ?? []).filter(row => predicates.every(check => check(row)));
          return Promise.resolve({ data: mutation ? null : single ? rows[0] ?? null : rows, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
    storage: { from() { throw new Error('Unexpected access to audio/storage'); } },
  };
  const stubs = {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    'next/cache': { unstable_noStore() {} },
    '@/lib/canonicalIdentity': { resolveCanonicalIdentity: async () => identity },
    '@/lib/currentUser': { getCurrentAuthenticatedUser: async () => user },
    '@/lib/supabaseServer': { supabaseServer: db },
    '@/lib/workspaceMembers': { listWorkspaceMembers: async () => [] },
    '@/lib/threadNotifications': { sendThreadNotification: async () => { notifications++; throw new Error('Unexpected send'); } },
  };
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = specifier => {
      if (Object.hasOwn(stubs, specifier)) return stubs[specifier];
      if (specifier.startsWith('@/')) {
        const relative = specifier.slice(2);
        return load(path.join(root, path.extname(relative) ? relative : `${relative}.ts`));
      }
      return require(specifier);
    };
    const evaluate = new Function('require', 'exports', compiled);
    evaluate(localRequire, exports);
    return exports;
  }
  return { handler: load(path.join(root, route)), reads, writes, get notifications() { return notifications; } };
}

const session = role => ({ identity: { workspaceId: 'workspace-a', userId: `user-${role}`, membershipRole: role }, bootstrap: { workspace: { plan: 'free' } } });
const song = { id: 'song-a', account_id: 'workspace-a', title: 'Allowed', image_url: null };
const foreignSong = { id: 'song-b', account_id: 'workspace-b', title: 'PRIVATE-TITLE', image_url: 'PRIVATE-ARTWORK' };
const getRequest = () => {
  const request = new Request('https://staging.invalid/api/test');
  request.nextUrl = new URL(request.url);
  return request;
};
const jsonRequest = (body, method = 'POST') => new Request('https://staging.invalid/api/test', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const params = values => ({ params: Promise.resolve(values) });

for (const role of ['owner', 'member']) {
  test(`song GET: ${role} can read own workspace but not another workspace`, async () => {
    const h = routeHarness('app/api/songs/[songId]/route.ts', { identity: session(role), tables: { songs: [song, foreignSong] } });
    const allowed = await h.handler.GET(getRequest(), params({ songId: song.id }));
    assert.equal(allowed.status, 200);
    assert.equal((await allowed.json()).song.title, song.title);
    const denied = await h.handler.GET(getRequest(), params({ songId: foreignSong.id }));
    assert.equal(denied.status, 403);
    assert.doesNotMatch(await denied.text(), /PRIVATE/);
    assert.equal(h.writes.length, 0);
  });
  test(`version GET: ${role} cannot obtain another workspace's audio`, async () => {
    const h = routeHarness('app/api/versions/[versionId]/route.ts', { identity: session(role), tables: {
      song_versions: [{ id: 'version-a', song_id: song.id, file_path: null }, { id: 'version-b', song_id: foreignSong.id, file_path: 'PRIVATE-AUDIO' }], songs: [song, foreignSong],
    } });
    assert.equal((await h.handler.GET(getRequest(), params({ versionId: 'version-a' }))).status, 200);
    const denied = await h.handler.GET(getRequest(), params({ versionId: 'version-b' }));
    assert.equal(denied.status, 403);
    assert.doesNotMatch(await denied.text(), /PRIVATE/);
    assert.equal(h.writes.length, 0);
  });
}

for (const [file, values] of [
  ['app/api/songs/[songId]/route.ts', { songId: song.id }],
  ['app/api/versions/[versionId]/route.ts', { versionId: 'version-a' }],
  ['app/api/dashboard/summary/route.ts', {}],
]) {
  test(`${file}: signed-out GET is rejected before database access`, async () => {
    const h = routeHarness(file);
    assert.equal((await h.handler.GET(getRequest(), params(values))).status, 401);
    assert.deepEqual(h.reads, []);
  });
}

test('dashboard summary filters song query by active workspace', async () => {
  const h = routeHarness('app/api/dashboard/summary/route.ts', { identity: session('member'), tables: { songs: [song, foreignSong] } });
  const response = await h.handler.GET(getRequest());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.songs.map(row => row.id), [song.id]);
  assert.doesNotMatch(JSON.stringify(body), /PRIVATE/);
});

test('admin feedback rejects signed-out and ordinary users even when they own a workspace', async () => {
  const previous = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = 'owner@example.test';
  try {
    for (const user of [null, { id: 'ordinary-owner', email: 'member@example.test' }]) {
      for (const [file, method] of [['app/api/admin/feedback/route.ts', 'GET'], ['app/api/admin/feedback/[id]/route.ts', 'PATCH']]) {
        const h = routeHarness(file, { user, identity: session('owner') });
        const response = await h.handler[method](jsonRequest({ action: 'approve' }, method === 'GET' ? 'POST' : method), params({ id: 'feedback-a' }));
        assert.equal(response.status, 404);
        assert.deepEqual(h.reads, []);
        assert.deepEqual(h.writes, []);
      }
    }
    const allowed = routeHarness('app/api/admin/feedback/route.ts', { user: { email: 'owner@example.test' } });
    assert.equal((await allowed.handler.GET(getRequest())).status, 200);
    assert.ok(allowed.reads.includes('beta_feedback'));
  } finally {
    if (previous === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = previous;
  }
});

test('task reorder rejects mixed-workspace IDs before writing any task', async () => {
  const tables = { song_tasks: [{ id: 'task-a', song_id: song.id }, { id: 'task-b', song_id: foreignSong.id }], songs: [song, foreignSong] };
  const h = routeHarness('app/api/tasks/reorder/route.ts', { identity: session('member'), tables });
  assert.equal((await h.handler.PATCH(jsonRequest({ orderedIds: ['task-a', 'task-b'] }, 'PATCH'))).status, 403);
  assert.deepEqual(h.writes, []);
  assert.equal((await h.handler.PATCH(jsonRequest({ orderedIds: ['task-a'] }, 'PATCH'))).status, 200);
  assert.equal(h.writes.length, 1);
});

test('unsigned internal notification request cannot dispatch email', async () => {
  const h = routeHarness('app/api/email/notify-thread/route.ts');
  const response = await h.handler.POST(jsonRequest({ threadId: 'thread', commentId: 'comment', songId: 'song', versionId: 'version', actorUserId: 'user' }));
  assert.equal(response.status, 401);
  assert.equal(h.notifications, 0);
  assert.deepEqual(h.reads, []);
});

test('legacy password verification fails closed when unconfigured or missing input', async () => {
  const previous = process.env.SHARED_PASSWORD;
  try {
    const h = routeHarness('app/api/auth/verify-password/route.ts');
    for (const configured of [undefined, '']) {
      if (configured === undefined) delete process.env.SHARED_PASSWORD; else process.env.SHARED_PASSWORD = configured;
      for (const body of [{}, { password: '' }, { password: null }, { password: 'test-only-password' }]) {
        const response = await h.handler.POST(jsonRequest(body));
        assert.equal(response.status, 401, 'unconfigured verifier must never report success');
        assert.deepEqual(await response.json(), { success: false });
      }
    }
    process.env.SHARED_PASSWORD = 'test-only-password';
    for (const body of [{}, { password: 123 }, { password: '' }, { password: 'wrong-test-password' }]) {
      assert.equal((await h.handler.POST(jsonRequest(body))).status, 401);
    }
    const valid = await h.handler.POST(jsonRequest({ password: 'test-only-password' }));
    assert.equal(valid.status, 200);
    assert.deepEqual(await valid.json(), { success: true });
    assert.equal(valid.headers.get('set-cookie'), null, 'this endpoint must not create a Supabase session');
  } finally {
    if (previous === undefined) delete process.env.SHARED_PASSWORD; else process.env.SHARED_PASSWORD = previous;
  }
});

for (const [route, methods] of [
  ['actions/route.ts', ['GET']],
  ['actions/create/route.ts', ['POST']],
  ['actions/[actionId]/route.ts', ['PATCH']],
  ['actions/by-song/[songId]/route.ts', ['GET']],
  ['tasks/create/route.ts', ['POST']],
  ['tasks/[taskId]/route.ts', ['PATCH', 'DELETE']],
  ['tasks/reorder/route.ts', ['PATCH']],
  ['threads/create/route.ts', ['POST']],
  ['threads/reply/route.ts', ['POST']],
  ['songs/create/route.ts', ['POST']],
  ['songs/[songId]/route.ts', ['PATCH', 'DELETE']],
  ['songs/[songId]/tasks/route.ts', ['GET']],
  ['songs/[songId]/versions/route.ts', ['GET']],
  ['songs/[songId]/visibility/route.ts', ['PATCH']],
  ['songs/[songId]/public-comments/route.ts', ['GET']],
  ['songs/[songId]/public-comments/[commentId]/route.ts', ['DELETE']],
  ['versions/[versionId]/route.ts', ['PATCH']],
  ['versions/[versionId]/threads/route.ts', ['GET']],
  ['versions/[versionId]/finalize/route.ts', ['POST', 'DELETE']],
  ['playlists/route.ts', ['GET', 'POST']],
  ['playlists/[id]/route.ts', ['GET', 'PATCH', 'DELETE']],
  ['playlists/[id]/songs/route.ts', ['POST', 'PATCH']],
  ['playlists/[id]/songs/[songId]/route.ts', ['DELETE']],
]) {
  for (const method of methods) {
    test(`${method} /api/${route.replace('/route.ts', '')}: signed-out requests cannot touch database`, async () => {
      const h = routeHarness(`app/api/${route}`);
      const request = method === 'GET' ? getRequest() : jsonRequest({
        songId: 'song-a', versionId: 'version-a', commentId: 'comment-a', threadId: 'thread-a',
        description: 'test', commentText: 'test', timestamp: 1, orderedIds: ['task-a'],
        title: 'test', status: 'pending', isPublic: true,
      }, method);
      const response = await h.handler[method](request, params({
        songId: 'song-a', versionId: 'version-a', actionId: 'action-a', taskId: 'task-a',
        id: 'playlist-a', commentId: 'comment-a',
      }));
      assert.equal(response.status, 401);
      assert.deepEqual(h.reads, []);
      assert.deepEqual(h.writes, []);
    });
  }
}
