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
function routeHarness(route, { identity = null, user = null, tables = {}, storage = null, rpc = undefined, mutationResult = null, mutationError = null, limitResponse = null, overrides = {}, logger = console } = {}) {
  const reads = [];
  const queries = [];
  const writes = [];
  let notifications = 0;
  const limitCalls = [];
  const db = {
    rpc,
    from(table) {
      reads.push(table);
      const predicates = [];
      const filters = [];
      queries.push({ table, filters });
      let single = false;
      let mutation = false;
      let selection = '';
      const query = {
        select(columns = '') { selection = columns; return query; },
        eq(key, value) { filters.push([key, value]); predicates.push(row => row[key] === value); return query; },
        in(key, values) { predicates.push(row => values.includes(row[key])); return query; },
        not(key, operator, value) {
          assert.equal(operator, 'is');
          predicates.push(row => row[key] !== value); return query;
        },
        order() { return query; },
        range() { return query; },
        returns() { return query; },
        limit() { return query; },
        maybeSingle() { single = true; return query; },
        single() { single = true; return query; },
        update(value) { mutation = true; writes.push({ table, value }); return query; },
        insert(value) { mutation = true; writes.push({ table, value }); return query; },
        delete() { mutation = true; writes.push({ table, delete: true }); return query; },
        then(resolve, reject) {
          let rows = (tables[table] ?? []).filter(row => predicates.every(check => check(row)));
          // Model the actual foreign-key joins at the database boundary.
          if (selection.includes('song:songs!inner')) rows = rows.flatMap(row => {
            const parent = (tables.songs ?? []).find(song => song.id === row.song_id);
            return parent ? [{ ...row, song: parent }] : [];
          });
          if (selection.includes('workspace_song:songs!song_versions_song_id_fkey')) rows = rows.map(row => ({
            ...row,
            workspace_song: (tables.songs ?? []).find(song => song.id === row.song_id) ?? null,
          }));
          if (selection.includes('playlist:playlists!inner')) rows = rows.flatMap(row => {
            const parent = (tables.playlists ?? []).find(playlist => playlist.id === row.playlist_id);
            return parent ? [{ ...row, playlist: parent }] : [];
          });
          return Promise.resolve({ data: mutation ? (typeof mutationResult === 'function' ? mutationResult() : mutationResult) : single ? rows[0] ?? null : rows, error: mutation ? mutationError : null }).then(resolve, reject);
        },
      };
      return query;
    },
    storage: storage ?? { from() { throw new Error('Unexpected access to audio/storage'); } },
  };
  const stubs = {
    '@/lib/mutationRateLimit': {
      enforceMutationRateLimit: async (...args) => { limitCalls.push(args); return limitResponse; },
      enforcePublicCommentRateLimit: async () => { limitCalls.push(['public_comment']); return limitResponse; },
    },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    'next/cache': { unstable_noStore() {} },
    '@/lib/canonicalIdentity': { resolveCanonicalIdentity: async () => identity },
    '@/lib/currentUser': { getCurrentAuthenticatedUser: async () => user },
    '@/lib/supabaseServer': { supabaseServer: db },
    '@/lib/workspaceMembers': { listWorkspaceMembers: async () => [] },
    '@/lib/threadNotifications': { scheduleThreadNotification: () => { notifications++; }, sendThreadNotification: async () => { notifications++; throw new Error('Unexpected send'); } },
  };
  Object.assign(stubs, overrides);
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const localRequire = specifier => {
      if (Object.hasOwn(stubs, specifier)) return stubs[specifier];
      if (specifier.startsWith('@/')) {
        const relative = specifier.slice(2);
        return load(path.join(root, path.extname(relative) ? relative : `${relative}.ts`));
      }
      return require(specifier);
    };
    const evaluate = new Function('require', 'exports', 'console', compiled);
    evaluate(localRequire, exports, logger);
    return exports;
  }
  return { handler: load(path.join(root, route)), reads, queries, writes, limitCalls, get notifications() { return notifications; } };
}

const session = role => ({ identity: { workspaceId: 'workspace-a', userId: `user-${role}`, membershipRole: role, displayName: 'Test Owner', workspaceName: 'Test Workspace' }, bootstrap: { workspace: { plan: 'free' } } });
const song = { id: 'song-a', account_id: 'workspace-a', title: 'Allowed', image_url: null };
const foreignSong = { id: 'song-b', account_id: 'workspace-b', title: 'PRIVATE-TITLE', image_url: 'PRIVATE-ARTWORK' };

test('membership removal preserves owner-only canonical workspace boundary', async t => {
  for (const role of [null, 'admin', 'member']) {
    await t.test(`${role ?? 'signed out'} cannot remove members`, async () => {
      const calls = [];
      const { handler } = routeHarness('app/api/workspace/members/[userId]/route.ts', {
        identity: role ? session(role) : null,
        overrides: { '@/lib/workspaceMembers': {
          findWorkspaceMembershipByUserId: async (...args) => { calls.push(args); },
          deleteWorkspaceMembershipByUserId: async (...args) => { calls.push(args); },
        } },
      });
      const response = await handler.DELETE(new Request('https://test.invalid'), { params: Promise.resolve({ userId: 'target' }) });
      assert.equal(response.status, role ? 403 : 401);
      assert.deepEqual(calls, []);
    });
  }
  for (const [target, membership, status] of [
    ['user-owner', null, 400],
    ['other-owner', { role: 'owner' }, 400],
    ['foreign-user', null, 404],
    ['collaborator', { role: 'member' }, 200],
  ]) {
    await t.test(`owner removal of ${target} returns ${status}`, async () => {
      const reads = [], writes = [];
      const { handler } = routeHarness('app/api/workspace/members/[userId]/route.ts', {
        identity: session('owner'),
        overrides: { '@/lib/workspaceMembers': {
          findWorkspaceMembershipByUserId: async (...args) => { reads.push(args); return membership; },
          deleteWorkspaceMembershipByUserId: async (...args) => { writes.push(args); },
        } },
      });
      const response = await handler.DELETE(new Request('https://test.invalid'), { params: Promise.resolve({ userId: target }) });
      assert.equal(response.status, status);
      assert.deepEqual(reads, target === 'user-owner' ? [] : [['workspace-a', target]]);
      assert.deepEqual(writes, status === 200 ? [['workspace-a', target]] : []);
    });
  }
});
const getRequest = () => {
  const request = new Request('https://staging.invalid/api/test');
  request.nextUrl = new URL(request.url);
  return request;
};
const jsonRequest = (body, method = 'POST') => {
  const request = new Request('https://staging.invalid/api/test', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  request.nextUrl = new URL(request.url);
  return request;
};
const params = values => ({ params: Promise.resolve(values) });

for (const role of ['owner', 'member']) {
  const collaborationTables = {
    songs: [song, foreignSong],
    song_versions: [{ id: 'source-version', song_id: song.id }, { id: 'foreign-version', song_id: foreignSong.id }],
    comment_threads: [{ id: 'source-thread', song_version_id: 'source-version' }, { id: 'foreign-thread', song_version_id: 'foreign-version' }],
    comments: [{ id: 'source-comment', thread_id: 'source-thread' }, { id: 'foreign-comment', thread_id: 'foreign-thread' }],
    actions: [{ id: 'action-a', account_id: 'workspace-a', song_id: song.id }],
  };
  test(`action create ${role} rejects another song's comment before writing`, async () => {
    const h = routeHarness('app/api/actions/create/route.ts', { identity: session(role), tables: collaborationTables });
    const response = await h.handler.POST(jsonRequest({ songId: song.id, commentId: 'foreign-comment', description: 'Fixture' }));
    assert.equal(response.status, 400);
    assert.deepEqual(h.writes, []);
  });
  test(`action create ${role} rejects an unrelated assignee`, async () => {
    const h = routeHarness('app/api/actions/create/route.ts', { identity: session(role), tables: collaborationTables });
    const response = await h.handler.POST(jsonRequest({ songId: song.id, commentId: 'source-comment', description: 'Fixture', assignedToUserId: 'outsider' }));
    assert.equal(response.status, 400);
    assert.deepEqual(h.writes, []);
  });
  test(`action create ${role} stamps canonical workspace and creator`, async () => {
    const identity = session(role); identity.identity.authorName = 'Actual author';
    const h = routeHarness('app/api/actions/create/route.ts', { identity, tables: collaborationTables, mutationResult: { id: 'new-action' } });
    const response = await h.handler.POST(jsonRequest({ songId: song.id, commentId: 'source-comment', description: 'Fixture', account_id: 'workspace-b', created_by_user_id: 'outsider', suggested_by: 'Forged', resolved_in_version_id: 'foreign-version' }));
    assert.equal(response.status, 201);
    const saved = h.writes[0].value[0];
    assert.equal(saved.account_id, 'workspace-a');
    assert.equal(saved.created_by_user_id, `user-${role}`);
    assert.equal(saved.suggested_by, 'Actual author');
    assert.equal(saved.resolved_in_version_id, null);
  });
  for (const body of [{ resolvedInVersionId: 'foreign-version' }, { assignedToUserId: 'outsider' }]) {
    test(`action update ${role} rejects unrelated ${Object.keys(body)[0]}`, async () => {
      const h = routeHarness('app/api/actions/[actionId]/route.ts', { identity: session(role), tables: collaborationTables });
      const response = await h.handler.PATCH(jsonRequest(body, 'PATCH'), params({ actionId: 'action-a' }));
      assert.equal(response.status, 400);
      assert.deepEqual(h.writes, []);
    });
  }
  test(`playlist add ${role} refuses another workspace's song`, async () => {
    const h = routeHarness('app/api/playlists/[id]/songs/route.ts', {
      identity: session(role), tables: { songs: [foreignSong], playlists: [{ id: 'playlist-a', account_id: 'workspace-a', title: 'Fixture' }] },
    });
    const response = await h.handler.POST(jsonRequest({ songId: foreignSong.id }), params({ id: 'playlist-a' }));
    assert.equal(response.status, 404);
    assert.deepEqual(h.writes, []);
  });
  test(`task update ${role} ignores injected parent and account fields`, async () => {
    const h = routeHarness('app/api/tasks/[taskId]/route.ts', { identity: session(role), tables: { songs: [song], song_tasks: [{ id: 'task-a', song_id: song.id }] }, mutationResult: { id: 'task-a' } });
    const response = await h.handler.PATCH(jsonRequest({ description: 'Updated fixture', account_id: 'workspace-b', song_id: foreignSong.id, created_by_user_id: 'outsider' }, 'PATCH'), params({ taskId: 'task-a' }));
    assert.equal(response.status, 200);
    assert.deepEqual(h.writes, [{ table: 'song_tasks', value: { description: 'Updated fixture' } }]);
  });
  test(`task update ${role} rejects a foreign song's task`, async () => {
    const h = routeHarness('app/api/tasks/[taskId]/route.ts', { identity: session(role), tables: { songs: [foreignSong], song_tasks: [{ id: 'task-b', song_id: foreignSong.id }] } });
    const response = await h.handler.PATCH(jsonRequest({ description: 'Forbidden fixture' }, 'PATCH'), params({ taskId: 'task-b' }));
    assert.equal(response.status, 403);
    assert.deepEqual(h.writes, []);
  });
}

for (const role of ['owner', 'admin', 'member']) {
  test(`upload allocation ${role} rejects a foreign song before signing or writing`, async () => {
    const h = routeHarness('app/api/versions/create/route.ts', { identity: session(role), tables: { songs: [foreignSong] } });
    const response = await h.handler.POST(jsonRequest({ songId: foreignSong.id, fileName: 'fixture.mp3', fileSize: 512, fileType: 'audio/mpeg' }));
    assert.equal(response.status, 403);
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.reads, ['songs']);
  });
  for (const method of ['POST', 'DELETE']) {
    test(`upload ${method} ${role} rejects foreign finalized versions before Storage access`, async () => {
      const h = routeHarness('app/api/versions/[versionId]/finalize/route.ts', {
        identity: session(role), tables: { songs: [foreignSong], song_versions: [{ id: 'foreign-version', song_id: foreignSong.id, file_path: 'PRIVATE-AUDIO', upload_finalized_at: '2026-11-01' }] },
      });
      const response = await h.handler[method](jsonRequest({}, method), params({ versionId: 'foreign-version' }));
      assert.equal(response.status, 403);
      assert.deepEqual(h.writes, []);
      assert.doesNotMatch(await response.text(), /PRIVATE-AUDIO/);
    });
  }
  test(`version metadata ${role} whitelists labels and notes while preserving server-owned fields`, async () => {
    const version = { id: 'version-a', song_id: song.id, version_number: 1, file_name: 'fixture.mp3', label: 'New label', notes: 'New notes' };
    const h = routeHarness('app/api/versions/[versionId]/route.ts', {
      identity: session(role), tables: { songs: [song], song_versions: [version] }, mutationResult: version,
    });
    const response = await h.handler.PATCH(jsonRequest({ label: 'New label', notes: ' New notes ', file_path: 'INJECTED', file_size_bytes: 999, upload_finalized_at: null, song_id: foreignSong.id, account_id: 'workspace-b' }, 'PATCH'), params({ versionId: version.id }));
    assert.equal(response.status, 200);
    assert.deepEqual(h.writes, [{ table: 'song_versions', value: { label: 'New label', notes: 'New notes' } }]);
  });
}
for (const role of ['admin', 'member']) {
  test(`song deletion ${role} cannot bypass owner-only server path`, async () => {
    const h = routeHarness('app/api/songs/[songId]/route.ts', { identity: session(role), tables: { songs: [song] } });
    const response = await h.handler.DELETE(jsonRequest({}, 'DELETE'), params({ songId: song.id }));
    assert.equal(response.status, 403);
    assert.deepEqual(h.writes, []);
  });
}

for (const result of ['accepted', 'already_accepted', 'already_used', 'expired']) {
  test(`invite acceptance ${result} respects canonical identity and only switches workspace on success`, async () => {
    const calls = [], workspaceReads = [], cookieWrites = [];
    const success = ['accepted', 'already_accepted'].includes(result);
    const h = routeHarness('app/api/invites/[token]/accept/route.ts', {
      user: { id: 'actual-user', email: ' Actual@Example.Test ' },
      overrides: {
        '@/lib/accountInvites': {
          isValidInviteToken: () => true,
          acceptWorkspaceInviteAtomically: async input => {
            calls.push(input);
            return { result, accountId: success ? 'invited-workspace' : null, alreadyMember: result === 'already_accepted' };
          },
          getInviteWorkspace: async id => { workspaceReads.push(id); return { id, name: 'Invited workspace' }; },
        },
        '@/lib/activeWorkspace': { writeActiveWorkspaceCookie: (_response, id) => cookieWrites.push(id) },
      },
    });
    const response = await h.handler.POST(jsonRequest({ userId: 'spoofed-user', userEmail: 'other@example.test' }), params({ token: 'original-token' }));
    assert.equal(response.status, success ? 200 : 400);
    assert.deepEqual(calls, [{ inviteToken: 'original-token', userId: 'actual-user', userEmail: 'actual@example.test' }]);
    assert.deepEqual(workspaceReads, success ? ['invited-workspace'] : []);
    assert.deepEqual(cookieWrites, success ? ['invited-workspace'] : []);
    const body = await response.json();
    if (success) assert.equal(body.accepted, true);
    else {
      assert.equal(body.accepted, undefined);
      assert.equal(body.workspace, undefined);
    }
  });
}

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


const mediaRoute = 'app/api/media/audio/[versionId]/route.ts';
const finalizedVersion = { id: 'version-a', song_id: 'song-a', version_number: 2, file_path: 'song-files/songs/song-a/uploads/audio.mp3', upload_finalized_at: '2026-11-01' };
function mediaHarness({ identity = session('member'), publicSong = false, version = finalizedVersion, playlistPublic = true, playlistWorkspace = 'workspace-a', entry = true, signingError = false, latest = version } = {}) {
  const signs = [];
  const h = routeHarness(mediaRoute, {
    identity,
    tables: {
      songs: [{ ...song, is_public: publicSong }],
      song_versions: latest.id === version.id ? [version] : [latest, version],
      playlists: [{ id: 'playlist-a', account_id: playlistWorkspace, is_public: playlistPublic }],
      playlist_songs: entry ? [{ playlist_id: 'playlist-a', song_id: 'song-a' }] : [],
    },
    storage: { from(bucket) { return { async createSignedUrl(path, seconds) {
      signs.push({ bucket, path, seconds });
      return signingError ? { data: null, error: new Error('SECRET-PROVIDER-URL') }
        : { data: { signedUrl: 'https://storage.invalid/signed?token=SECRET-TOKEN' }, error: null };
    } }; } },
  });
  return { ...h, signs };
}
function mediaRequest(query = '') {
  const request = new Request(`https://staging.invalid/api/media/audio/version-a${query}`);
  request.nextUrl = new URL(request.url);
  return request;
}
for (const role of ['owner', 'member']) {
  test(`media: ${role} gets uncached ten-minute access without proxying audio`, async () => {
    const h = mediaHarness({ identity: session(role) });
    const response = await h.handler.GET(mediaRequest(), params({ versionId: 'version-a' }));
    assert.equal(response.status, 307);
    assert.match(response.headers.get('cache-control'), /private.*no-store/);
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('location'), 'https://storage.invalid/signed?token=SECRET-TOKEN');
    assert.equal(await response.text(), '');
    assert.deepEqual(h.signs, [{ bucket: 'song-files', path: 'songs/song-a/uploads/audio.mp3', seconds: 600 }]);
    assert.deepEqual(h.reads, ['song_versions'], 'parent song is authorised in the same database read');
  });
}
for (const [name, options, query, status] of [
  ['signed out', { identity: null }, '', 401],
  ['outsider', { identity: { identity: { workspaceId: 'other' } } }, '', 404],
  ['private public-song context', { identity: null }, '?song=song-a', 404],
  ['mismatched public-song context', { identity: null, publicSong: true }, '?song=other', 404],
  ['revoked playlist', { identity: null, playlistPublic: false }, '?playlist=playlist-a', 404],
  ['foreign workspace playlist', { identity: null, playlistWorkspace: 'workspace-b' }, '?playlist=playlist-a', 404],
  ['removed playlist entry', { identity: null, entry: false }, '?playlist=playlist-a', 404],
  ['ambiguous context', { publicSong: true }, '?song=song-a&playlist=playlist-a', 404],
  ['empty public context', {}, '?song=', 404],
  ['pending upload', { version: { ...finalizedVersion, upload_finalized_at: null } }, '', 404],
  ['public history', { identity: null, publicSong: true, latest: { ...finalizedVersion, id: 'newer' } }, '?song=song-a', 404],
]) {
  test(`media: denies ${name} before signing`, async () => {
    const h = mediaHarness(options);
    const response = await h.handler.GET(mediaRequest(query), params({ versionId: 'version-a' }));
    assert.equal(response.status, status);
    assert.equal(response.headers.get('location'), null);
    assert.equal(h.signs.length, 0);
    assert.doesNotMatch(await response.text(), /audio.mp3|SECRET/);
  });
}
for (const query of ['?song=song-a', '?playlist=playlist-a']) {
  test(`media: permits intended anonymous public context ${query}`, async () => {
    const h = mediaHarness({ identity: null, publicSong: true });
    const response = await h.handler.HEAD(mediaRequest(query), params({ versionId: 'version-a' }));
    assert.equal(response.status, 307);
    assert.equal(h.signs.length, 1);
  });
}
test('media: public playlist can intentionally share a private song in its own workspace', async () => {
  const h = mediaHarness({ identity: null });
  const response = await h.handler.GET(mediaRequest('?playlist=playlist-a'), params({ versionId: 'version-a' }));
  assert.equal(response.status, 307);
});
for (const file_path of ['../audio.mp3', 'folder/../audio.mp3', 'https://other.invalid/file', '/file', 'folder\\file', 'file?token=x', 'file#fragment', '', 'songs/other-song/uploads/file.mp3', 'songs/song-a/%2e%2e/file.mp3']) {
  test(`media: refuses malformed storage reference ${JSON.stringify(file_path)}`, async () => {
    const h = mediaHarness({ version: { ...finalizedVersion, file_path } });
    const response = await h.handler.GET(mediaRequest(), params({ versionId: 'version-a' }));
    assert.equal(response.status, 404);
    assert.equal(h.signs.length, 0);
  });
}
test('media: signing failure has safe uncached error', async () => {
  const h = mediaHarness({ signingError: true });
  const response = await h.handler.GET(mediaRequest(), params({ versionId: 'version-a' }));
  assert.equal(response.status, 503);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.doesNotMatch(await response.text(), /SECRET/);
});
test('media: each request renews access without changing the player source', async () => {
  const h = mediaHarness();
  for (let i = 0; i < 2; i++) assert.equal((await h.handler.GET(mediaRequest(), params({ versionId: 'version-a' }))).status, 307);
  assert.equal(h.signs.length, 2);
});


test('version API returns stable media access URL after workspace and object checks', async () => {
  const h = routeHarness('app/api/versions/[versionId]/route.ts', {
    identity: session('member'), tables: { songs: [song], song_versions: [finalizedVersion] },
    storage: { from() { return { list: async () => ({ data: [{ name: 'audio.mp3' }], error: null }) }; } },
  });
  const response = await h.handler.GET(getRequest(), params({ versionId: 'version-a' }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).version.audioUrl, '/api/media/audio/version-a');
});
test('public song API returns song-scoped media URL, never a permanent Storage URL', async () => {
  const h = routeHarness('app/api/public/song/[songId]/route.ts', {
    tables: { songs: [{ ...song, is_public: true }], song_versions: [finalizedVersion], accounts: [] },
  });
  const response = await h.handler.GET(getRequest(), params({ songId: 'song-a' }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).version.audioUrl, '/api/media/audio/version-a?song=song-a');
});
test('public playlist API returns playlist-scoped stable media URLs', async () => {
  const h = routeHarness('app/api/public/playlist/[id]/route.ts', {
    tables: {
      songs: [song], song_versions: [finalizedVersion], accounts: [],
      playlists: [{ id: 'playlist-a', account_id: 'workspace-a', is_public: true }],
      playlist_songs: [{ playlist_id: 'playlist-a', song_id: 'song-a', position: 0 }],
    },
  });
  const response = await h.handler.GET(getRequest(), params({ id: 'playlist-a' }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).tracks[0].audioUrl, '/api/media/audio/version-a?playlist=playlist-a');
});

test('artwork HTTP capability and renewal boundaries', async t => {
  const key = 'artwork-http-signing-key-at-least-32-characters';
  const oldKey = process.env.INTERNAL_API_SECRET;
  const oldProject = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.INTERNAL_API_SECRET = key;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://storage.invalid';
  t.after(() => {
    if (oldKey === undefined) delete process.env.INTERNAL_API_SECRET; else process.env.INTERNAL_API_SECRET = oldKey;
    if (oldProject === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = oldProject;
  });
  const access = routeHarness('lib/artworkAccess.ts').handler;
  const record = { ...song, is_public: true, image_url: 'https://storage.invalid/storage/v1/object/public/song-images/song-a-123.jpg' };
  const claims = { kind: 'song', id: 'song-a', path: 'song-a-123.jpg' };
  const now = () => Math.floor(Date.now() / 1000);
  function h({ identity = null, tables = { songs: [record] }, contentType = 'image/jpeg', bytes = 12, error = null } = {}) {
    const downloads = [];
    return { ...routeHarness('app/api/media/artwork/route.ts', {
      identity, tables,
      storage: { from(bucket) { return { async download(path) {
        downloads.push({ bucket, path });
        return { data: error ? null : new Blob([new Uint8Array(bytes)], { type: contentType }), error };
      } }; } },
    }), downloads };
  }
  function request(token) { return mediaRequest(`?access=${encodeURIComponent(token)}`); }
  await t.test('valid issued token serves privately cached raster without identity/database round trips', async () => {
    const token = access.signArtworkAccess(claims, key, now());
    const harness = h();
    const response = await harness.handler.GET(request(token));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/jpeg');
    assert.match(response.headers.get('cache-control'), /^private, max-age=\d+, must-revalidate$/);
    assert.match(response.headers.get('content-security-policy'), /sandbox/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(harness.reads.length, 0);
    assert.deepEqual(harness.downloads, [{ bucket: 'song-images', path: 'song-a-123.jpg' }]);
  });
  await t.test('tampered token cannot trigger a Storage read', async () => {
    const harness = h();
    const response = await harness.handler.GET(request('invalid.token'));
    assert.equal(response.status, 404);
    assert.equal(harness.reads.length, 0);
    assert.equal(harness.downloads.length, 0);
  });
  for (const [label, identity] of [['signed-out', null], ['other-workspace', { identity: { workspaceId: 'other' } }]]) {
    await t.test(`expired private capability cannot renew for ${label}`, async () => {
      const harness = h({ identity });
      const response = await harness.handler.GET(request(access.signArtworkAccess(claims, key, now() - 700)));
      assert.equal(response.status, 404);
      assert.equal(harness.downloads.length, 0);
    });
  }
  await t.test('expired private capability rechecks current workspace and resolves current artwork', async () => {
    const harness = h({ identity: session('member') });
    const response = await harness.handler.GET(request(access.signArtworkAccess(claims, key, now() - 700)));
    assert.equal(response.status, 307);
    assert.match(response.headers.get('cache-control'), /no-store/);
    const location = new URL(response.headers.get('location'), 'https://staging.invalid');
    assert.equal(access.readArtworkAccess(location.searchParams.get('access'), key).path, claims.path);
    assert.equal(harness.downloads.length, 0);
  });
  for (const is_public of [true, false]) {
    await t.test(`expired public-song image renewal respects current sharing ${is_public}`, async () => {
      const harness = h({ tables: { songs: [{ ...record, is_public }] } });
      const response = await harness.handler.GET(request(access.signArtworkAccess({ ...claims, publicSong: true }, key, now() - 700)));
      assert.equal(response.status, is_public ? 307 : 404);
      assert.equal(harness.downloads.length, 0);
    });
  }
  for (const [label, account, entry, published, expected] of [
    ['allowed', 'workspace-a', true, true, 307],
    ['foreign song', 'other', true, true, 404],
    ['removed entry', 'workspace-a', false, true, 404],
    ['revoked playlist', 'workspace-a', true, false, 404],
  ]) {
    await t.test(`expired public-playlist image: ${label}`, async () => {
      const harness = h({ tables: {
        songs: [record], playlists: [{ id: 'list-a', account_id: account, is_public: published }],
        playlist_songs: entry ? [{ playlist_id: 'list-a', song_id: 'song-a' }] : [],
      } });
      const response = await harness.handler.GET(request(access.signArtworkAccess({ ...claims, playlistId: 'list-a' }, key, now() - 700)));
      assert.equal(response.status, expected);
      assert.equal(harness.downloads.length, 0);
    });
  }
  for (const [label, type, bytes, expected] of [['SVG', 'image/svg+xml', 10, 404], ['HTML', 'text/html', 10, 404], ['oversized', 'image/jpeg', 5 * 1024 * 1024 + 1, 404], ['PNG', 'image/png', 10, 200]]) {
    await t.test(`image response ${label}`, async () => {
      const harness = h({ contentType: type, bytes });
      const response = await harness.handler.GET(request(access.signArtworkAccess(claims, key)));
      assert.equal(response.status, expected);
    });
  }
  await t.test('upstream errors disclose neither path nor provider URL', async () => {
    const harness = h({ error: new Error('SECRET-STORAGE-URL') });
    const response = await harness.handler.GET(request(access.signArtworkAccess(claims, key)));
    assert.equal(response.status, 404);
    assert.doesNotMatch(await response.text(), /SECRET|song-a/);
  });
  for (const member of [true, false]) {
    await t.test(`expired workspace image requires current membership ${member}`, async () => {
      const harness = h({ identity: session('member'), tables: {
        accounts: [{ id: 'workspace-a', image_url: 'https://storage.invalid/storage/v1/object/public/song-images/workspace-images/workspace-a-123.png' }],
        account_members: member ? [{ account_id: 'workspace-a', user_id: 'user-member' }] : [],
      } });
      const token = access.signArtworkAccess({ kind: 'workspace', id: 'workspace-a', path: 'workspace-images/workspace-a-123.png' }, key, now() - 700);
      const response = await harness.handler.GET(request(token));
      assert.equal(response.status, member ? 307 : 404);
      assert.equal(harness.downloads.length, 0);
    });
  }
  for (const is_public of [true, false]) {
    await t.test(`expired playlist custom cover respects current sharing ${is_public}`, async () => {
      const harness = h({ tables: { playlists: [{ id: 'list-a', account_id: 'workspace-a', is_public, image_url: 'https://storage.invalid/storage/v1/object/public/song-images/playlist-list-a-123.jpg' }] } });
      const token = access.signArtworkAccess({ kind: 'playlist', id: 'list-a', path: 'playlist-list-a-123.jpg', publicPlaylist: true }, key, now() - 700);
      assert.equal((await harness.handler.GET(request(token))).status, is_public ? 307 : 404);
      assert.equal(harness.downloads.length, 0);
    });
  }
  await t.test('renewal resolves replacement artwork instead of retaining removed canonical path', async () => {
    const harness = h({ identity: session('member'), tables: { songs: [{ ...record, image_url: record.image_url.replace('123.jpg', '456.jpg') }] } });
    const response = await harness.handler.GET(request(access.signArtworkAccess(claims, key, now() - 700)));
    const renewed = new URL(response.headers.get('location'), 'https://staging.invalid');
    assert.equal(access.readArtworkAccess(renewed.searchParams.get('access'), key).path, 'song-a-456.jpg');
  });
  await t.test('public song API projects an image token with only public-song scope', async () => {
    const harness = routeHarness('app/api/public/song/[songId]/route.ts', { tables: { songs: [record], song_versions: [finalizedVersion], accounts: [] } });
    const response = await harness.handler.GET(getRequest(), params({ songId: 'song-a' }));
    const image = new URL((await response.json()).song.image_url, 'https://staging.invalid');
    const token = access.readArtworkAccess(image.searchParams.get('access'), key);
    assert.equal(token.publicSong, true); assert.equal(token.playlistId, undefined);
    assert.equal(harness.writes.length, 0);
  });
  await t.test('public playlist metadata cannot mint artwork access for another workspace', async () => {
    const harness = routeHarness('app/listen/playlist/[id]/layout.tsx', { tables: {
      playlists: [{ id: 'list-a', account_id: 'workspace-a', is_public: true, image_url: null }],
      playlist_songs: [{ playlist_id: 'list-a', song_id: 'song-b', position: 0 }],
      songs: [{ ...foreignSong, image_url: 'https://storage.invalid/storage/v1/object/public/song-images/song-b-123.jpg' }],
    } });
    const metadata = await harness.handler.generateMetadata(params({ id: 'list-a' }));
    assert.equal(metadata.openGraph.images, undefined);
  });

  function uploadRequest(file) {
    const body = new FormData(); body.set('file', file);
    return new Request('https://staging.invalid/api/workspace/settings', { method: 'POST', body });
  }
  for (const [role, identity, status] of [['signed-out', null, 401], ['member', session('member'), 403]]) {
    await t.test(`workspace image upload stays owner-only: ${role}`, async () => {
      const harness = routeHarness('app/api/workspace/settings/route.ts', { identity });
      const response = await harness.handler.POST(uploadRequest(new File(['x'], 'image.png', { type: 'image/png' })));
      assert.equal(response.status, status); assert.equal(harness.writes.length, 0);
    });
  }
  await t.test('workspace active formats are rejected before upload rather than returning an unusable image URL', async () => {
    const harness = routeHarness('app/api/workspace/settings/route.ts', { identity: session('owner') });
    const response = await harness.handler.POST(uploadRequest(new File(['<svg/>'], 'cover.svg', { type: 'image/svg+xml' })));
    assert.equal(response.status, 400); assert.equal(harness.writes.length, 0);
    assert.match((await response.json()).error, /JPEG, PNG, WebP or GIF/);
  });
  await t.test('workspace upload normalises the extension, stores the canonical reference and returns delivered artwork', async () => {
    let uploaded;
    const harness = routeHarness('app/api/workspace/settings/route.ts', {
      identity: session('owner'),
      mutationResult: () => ({ id: 'workspace-a', name: 'Fixture', image_url: `https://storage.invalid/storage/v1/object/public/song-images/${uploaded.path}` }),
      storage: { from() { return {
        async upload(path, bytes, options) { uploaded = { path, bytes, options }; return { error: null }; },
        getPublicUrl(path) { return { data: { publicUrl: `https://storage.invalid/storage/v1/object/public/song-images/${path}` } }; },
      }; } },
    });
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=', 'base64');
    const response = await harness.handler.POST(uploadRequest(new File([png], 'misleading.svg', { type: 'image/png' })));
    assert.equal(response.status, 200);
    assert.match(uploaded.path, /^workspace-images\/workspace-a-\d+\.png$/);
    assert.equal(uploaded.options.contentType, 'image/png');
    const image = new URL((await response.json()).workspace.imageUrl, 'https://staging.invalid');
    assert.equal(access.readArtworkAccess(image.searchParams.get('access'), key).path, uploaded.path);
    assert.match(harness.writes[0].value.image_url, /^https:\/\/storage.invalid\/storage\/v1\/object\/public\/song-images\//);
  });

});


test('already finalized legacy audio above the new upload limit is preserved without Storage mutation', async () => {
  const harness = routeHarness('app/api/versions/[versionId]/finalize/route.ts', {
    identity: session('owner'), tables: { songs: [song], song_versions: [{ ...finalizedVersion, file_size_bytes: 100 * 1024 * 1024 }] },
  });
  const response = await harness.handler.POST(jsonRequest({}), params({ versionId: 'version-a' }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).alreadyFinalized, true);
  assert.equal(harness.writes.length, 0);
});

test('only the request that finalizes a new version schedules email', async t => {
  for (const [label, versionNumber, rpcResult, expectedStatus, expectedCalls] of [
    ['new version', 2, { data: true }, 200, 1],
    ['concurrent finalization lost', 2, { data: false }, 200, 0],
    ['first upload', 1, { data: true }, 200, 0],
    ['storage limit rejected', 2, { error: { message: 'STORAGE_LIMIT_REACHED' } }, 400, 0],
  ]) {
    await t.test(label, async () => {
      const calls = [];
      const handler = routeHarness('app/api/versions/[versionId]/finalize/route.ts', {
        identity: session('owner'),
        tables: {
          songs: [song],
          accounts: [{ id: 'workspace-a', plan: 'free', storage_bytes_used: 0 }],
          song_versions: [{
            ...finalizedVersion, version_number: versionNumber, upload_finalized_at: null,
            file_path: 'songs/song-a/mix.wav', file_size_bytes: 24,
          }],
        },
        rpc: async name => {
          assert.equal(name, 'finalize_song_version_upload');
          return rpcResult;
        },
        storage: { from: () => ({
          info: async () => ({ data: { size: 24, contentType: 'audio/wav' } }),
          createSignedUrl: async () => ({ data: { signedUrl: 'https://storage.invalid/audio' } }),
          remove: async () => ({ error: null }),
        }) },
        overrides: {
          '@/lib/audioSignatureRead.mjs': {
            fetchAudioSignaturePrefix: async () => Buffer.from('RIFF0000WAVE'),
          },
          '@/lib/versionUploadNotifications': {
            scheduleVersionUploadNotification: payload => calls.push(payload),
          },
        },
      }).handler;
      const response = await handler.POST(jsonRequest({}), params({ versionId: 'version-a' }));
      assert.equal(response.status, expectedStatus);
      assert.deepEqual(calls, expectedCalls ? [{
        workspaceId: 'workspace-a', songId: 'song-a', versionId: 'version-a',
      }] : []);
    });
  }
});

test('version emails use current membership and intersect the Preview allowlist', async t => {
  const envKeys = ['VERSION_UPLOAD_EMAILS_ENABLED', 'EMAIL_NOTIFICATIONS_ENABLED',
    'VERCEL_ENV', 'VERCEL_BRANCH_URL', 'VERSION_UPLOAD_EMAIL_TEST_TO', 'RESEND_API_KEY'];
  const original = new Map(envKeys.map(key => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  Object.assign(process.env, {
    EMAIL_NOTIFICATIONS_ENABLED: 'true',
    VERCEL_ENV: 'preview',
    VERCEL_BRANCH_URL: 'staging.invalid',
    VERSION_UPLOAD_EMAIL_TEST_TO: 'uploader@example.test, outsider@example.test',
    RESEND_API_KEY: 'fake',
  });
  delete process.env.VERSION_UPLOAD_EMAILS_ENABLED;
  const scheduled = [];
  const batches = [];
  const memberReads = [];
  const { handler } = routeHarness('lib/versionUploadNotifications.ts', {
    overrides: {
      'next/server': { after: callback => scheduled.push(callback) },
      '@/lib/workspaceMembers': {
        listWorkspaceMembers: async workspaceId => {
          memberReads.push(workspaceId);
          return [
            { email: 'uploader@example.test' }, { email: 'member@example.test' },
            { email: 'UPLOADER@example.test' }, { email: null },
          ];
        },
      },
      resend: { Resend: class {
        batch = { send: async (messages, options) => {
          batches.push({ messages, options });
          return { data: { data: messages.map(() => ({ id: 'fake' })) }, error: null };
        } };
      } },
    },
    logger: { info() {}, warn() {} },
  });
  const payload = { workspaceId: 'workspace-a', songId: 'song-a', versionId: 'version-a' };
  handler.scheduleVersionUploadNotification(payload);
  assert.equal(scheduled.length, 0);
  process.env.VERSION_UPLOAD_EMAILS_ENABLED = 'true';
  delete process.env.VERSION_UPLOAD_EMAIL_TEST_TO;
  handler.scheduleVersionUploadNotification(payload);
  assert.equal(scheduled.length, 0);
  process.env.VERSION_UPLOAD_EMAIL_TEST_TO = 'uploader@example.test, outsider@example.test';
  handler.scheduleVersionUploadNotification(payload);
  assert.equal(scheduled.length, 1);
  await scheduled.shift()();
  assert.deepEqual(memberReads, ['workspace-a']);
  assert.deepEqual(batches[0].messages.map(m => m.to.toLowerCase()), ['uploader@example.test']);
  assert.match(batches[0].messages[0].text, /https:\/\/staging\.invalid\/songs\/song-a\/versions\/version-a/);
  assert.equal(batches[0].options.idempotencyKey, 'version-upload/version-a/0');

  process.env.VERCEL_ENV = 'production';
  handler.scheduleVersionUploadNotification(payload);
  await scheduled.shift()();
  assert.deepEqual(batches[1].messages.map(m => m.to.toLowerCase()), ['uploader@example.test', 'member@example.test']);
  assert.match(batches[1].messages[0].text, /https:\/\/www\.song-room\.live\/songs\/song-a\/versions\/version-a/);
});

test('version allocation rejects over-50 MB metadata before any database or Storage work', async () => {
  const harness = routeHarness('app/api/versions/create/route.ts', { identity: session('owner') });
  const response = await harness.handler.POST(jsonRequest({ songId: 'song-a', fileName: 'mix.wav', fileSize: 50 * 1024 * 1024 + 1, fileType: 'audio/wav' }));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /50 MB/);
  assert.equal(harness.reads.length, 0); assert.equal(harness.writes.length, 0);
});

const createCommentBody = { versionId: 'version-a', songId: 'song-a', timestamp: 12.4, commentText: 'A useful note' };
for (const payload of [null, [], 7, 'note', { ...createCommentBody, versionId: {} }, { ...createCommentBody, songId: [] }, { ...createCommentBody, timestamp: '12' }, { ...createCommentBody, timestamp: -1 }, { ...createCommentBody, timestamp: 2147483648 }]) {
  test(`thread create rejects malformed input before database work: ${JSON.stringify(payload)}`, async () => {
    const h = routeHarness('app/api/threads/create/route.ts', { identity: session('member'), tables: { songs: [song], song_versions: [{ id: 'version-a', song_id: song.id }] } });
    const response = await h.handler.POST(jsonRequest(payload));
    assert.equal(response.status, 400); assert.deepEqual(h.reads, []); assert.deepEqual(h.writes, []); assert.equal(h.notifications, 0);
  });
}
for (const [route, payload] of [
  ['threads/create/route.ts', '{"versionId":"version-a","songId":"song-a","timestamp":1e999,"commentText":"note"}'],
  ['threads/create/route.ts', '{'], ['threads/reply/route.ts', '{'],
]) {
  test(`${route} rejects unreadable or overflowing JSON input`, async () => {
    const h = routeHarness(`app/api/${route}`, { identity: session('member'), tables: { songs: [song], song_versions: [{ id: 'version-a', song_id: song.id }] } });
    const response = await h.handler.POST(new Request('https://staging.invalid/api/test', { method: 'POST', body: payload }));
    assert.equal(response.status, 400); assert.deepEqual(h.writes, []); assert.equal(h.notifications, 0);
  });
}
for (const payload of [null, [], 1, 'note', { threadId: {}, text: 'note' }, { threadId: 'thread-a', text: 'note', songId: {} }, { threadId: 'thread-a', text: 'note', versionId: [] }]) {
  test(`reply rejects malformed input before reads/writes: ${JSON.stringify(payload)}`, async () => {
    const h = routeHarness('app/api/threads/reply/route.ts', { identity: session('member') });
    const response = await h.handler.POST(jsonRequest(payload));
    assert.equal(response.status, 400); assert.deepEqual(h.reads, []); assert.deepEqual(h.writes, []); assert.equal(h.notifications, 0);
  });
}
for (const payload of [null, [], 1, 'note', { author_name: {}, body: 'note' }, { author_name: 'Tester', body: [] }, { author_name: 'Tester', body: 'note', website: true }]) {
  test(`public comment handles malformed fields as a client error: ${JSON.stringify(payload)}`, async () => {
    const h = routeHarness('app/api/public/song/[songId]/comments/route.ts', { tables: { songs: [{ ...song, is_public: true, public_comments_enabled: true }] } });
    const response = await h.handler.POST(jsonRequest(payload), params({ songId: 'song-a' }));
    assert.equal(response.status, 400); assert.deepEqual(h.reads, []); assert.deepEqual(h.writes, []);
  });
}

for (const timestamp of [0, 12.4, 12.8, 2147483647]) {
  test(`valid thread creation preserves timestamp rounding and notification scheduling: ${timestamp}`, async () => {
    const h = routeHarness('app/api/threads/create/route.ts', {
      identity: session('member'), mutationResult: { id: 'new-id' },
      tables: { songs: [song], song_versions: [{ id: 'version-a', song_id: song.id }], comment_threads: [{ id: 'new-id', comments: [] }] },
    });
    const req = jsonRequest({ ...createCommentBody, timestamp, commentText: ' A useful note ' });
    req.nextUrl = new URL(req.url);
    const response = await h.handler.POST(req);
    assert.equal(response.status, 200);
    assert.equal(h.writes[0].value[0].timestamp_seconds, Math.round(timestamp));
    assert.equal(h.writes[1].value[0].body, 'A useful note');
    assert.equal(h.notifications, 1);
  });
}
test('valid reply still uses the canonical thread/version/song and schedules once', async () => {
  const h = routeHarness('app/api/threads/reply/route.ts', {
    identity: session('member'), mutationResult: { id: 'comment-new' },
    tables: { songs: [song], song_versions: [{ id: 'version-a', song_id: song.id }], comment_threads: [{ id: 'thread-a', song_version_id: 'version-a' }] },
  });
  const req = jsonRequest({ threadId: 'thread-a', text: ' A reply ', songId: song.id, versionId: 'version-a' });
  req.nextUrl = new URL(req.url);
  assert.equal((await h.handler.POST(req)).status, 200);
  assert.equal(h.writes[0].value[0].body, 'A reply'); assert.equal(h.notifications, 1);
});
for (const route of ['threads/create/route.ts', 'threads/reply/route.ts']) {
  test(`${route}: signed-out malformed requests still return 401 before database access`, async () => {
    const h = routeHarness(`app/api/${route}`);
    const response = await h.handler.POST(new Request('https://staging.invalid/api/test', { method: 'POST', body: '{' }));
    assert.equal(response.status, 401); assert.deepEqual(h.reads, []); assert.deepEqual(h.writes, []);
  });
}
test('public comment honeypot remains a no-write success', async () => {
  const h = routeHarness('app/api/public/song/[songId]/comments/route.ts');
  const response = await h.handler.POST(jsonRequest({ website: 'bot', author_name: {} }), params({ songId: 'song-a' }));
  assert.equal(response.status, 200); assert.deepEqual(h.reads, []); assert.deepEqual(h.writes, []);
});
test('valid public comments keep whitespace handling after the shared limiter allows posting', async () => {
  const h = routeHarness('app/api/public/song/[songId]/comments/route.ts', {
    tables: { songs: [{ ...song, is_public: true, public_comments_enabled: true }] },
    mutationResult: { id: 'comment-new', author_name: 'Tester', body: 'A note' },
  });
  for (let i = 0; i < 1; i++) {
    const req = jsonRequest({ author_name: ' Tester ', body: ' A note ', website: '' });
    req.headers.set('x-forwarded-for', '198.51.100.42');
    const response = await h.handler.POST(req, params({ songId: 'song-a' }));
    assert.equal(response.status, 201);
  }
  assert.deepEqual(h.limitCalls, [['public_comment']]);
  assert.equal(h.writes.length, 1); assert.equal(h.writes[0].value.body, 'A note'); assert.equal(h.writes[0].value.author_name, 'Tester');
});

for (const status of [429, 503]) {
  for (const route of ['threads/create/route.ts', 'threads/reply/route.ts', 'public/song/[songId]/comments/route.ts']) {
    test(`${route}: limiter ${status} blocks every write and notification`, async () => {
      const h = routeHarness(`app/api/${route}`, {
        identity: session('member'), limitResponse: Response.json({ error: 'Wait' }, { status, headers: { 'Retry-After': '60' } }),
        tables: { songs: [{ ...song, is_public: true, public_comments_enabled: true }], song_versions: [{ id: 'version-a', song_id: song.id }], comment_threads: [{ id: 'thread-a', song_version_id: 'version-a' }] },
      });
      const body = route.startsWith('public/') ? { author_name: 'Tester', body: 'Note' }
        : route.startsWith('threads/create') ? createCommentBody : { threadId: 'thread-a', text: 'Reply' };
      const response = await h.handler.POST(jsonRequest(body), params({ songId: song.id }));
      assert.equal(response.status, status); assert.equal(response.headers.get('Retry-After'), '60');
      assert.deepEqual(h.writes, []); assert.equal(h.notifications, 0);
      assert.deepEqual(h.limitCalls, route.startsWith('public/') ? [['public_comment']] : [['workspace_comment', 'user-member']]);
    });
  }
}

for (const duplicate of [false, true]) {
  for (const status of [429, 503, 200]) {
    test(`invite ${duplicate ? 'resend' : 'creation'}: limiter ${status} gates provider and creation`, async () => {
      let created = 0; let sent = 0;
      const invite = { email: 'tester@example.test', invite_token: 'test-token' };
      const h = routeHarness('app/api/workspace/invites/route.ts', {
        identity: session('owner'), tables: { accounts: [{ id: 'workspace-a', plan: 'studio' }] },
        limitResponse: status === 200 ? null : Response.json({ error: 'Wait' }, { status }),
        overrides: {
          '@/lib/accountInvites': {
            isValidInviteEmail: () => true,
            normalizeInviteEmail: email => ({ normalizedEmail: email.trim().toLowerCase() }),
            isExistingWorkspaceMemberEmail: async () => false,
            findPendingInviteByEmail: async () => duplicate ? invite : null,
            createWorkspaceInvite: async () => { created++; return invite; },
          },
          resend: { Resend: class { emails = { send: async () => { sent++; return {}; } }; } },
        },
      });
      const previous = process.env.RESEND_API_KEY;
      process.env.RESEND_API_KEY = 'test-only-key';
      try {
        const req = jsonRequest({ email: ' Tester@Example.test ' }); req.nextUrl = new URL(req.url);
        const response = await h.handler.POST(req);
        assert.equal(response.status, status === 200 && !duplicate ? 201 : status);
        assert.deepEqual(h.limitCalls, [['workspace_invite', 'workspace-a', 'tester@example.test']]);
        assert.equal(sent, status === 200 ? 1 : 0);
        assert.equal(created, status === 200 && !duplicate ? 1 : 0);
      } finally {
        if (previous === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previous;
      }
    });
  }
}
for (const role of [null, 'member']) {
  test(`invite ${role ?? 'signed-out'} cannot reach limiter or email provider`, async () => {
    const h = routeHarness('app/api/workspace/invites/route.ts', { identity: role ? session(role) : null });
    const response = await h.handler.POST(jsonRequest({ email: 'test@example.test' }));
    assert.equal(response.status, role ? 403 : 401); assert.deepEqual(h.limitCalls, []); assert.deepEqual(h.writes, []);
  });
}

const feedbackBody = { type: 'bug', message: 'A reproducible feedback note', email: 'tester@example.test' };
function feedbackRequest(body = feedbackBody, headers = {}) {
  return new Request('https://staging.invalid/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json', 'x-vercel-forwarded-for': '198.51.100.77', ...headers }, body: JSON.stringify(body) });
}
for (const payload of [null, [], 7, 'note', { ...feedbackBody, type: {} }, { ...feedbackBody, message: 'short' }, { ...feedbackBody, message: 'x'.repeat(2001) }, { ...feedbackBody, email: 'invalid' }]) {
  test(`feedback rejects invalid input without saving: ${JSON.stringify(payload).slice(0, 80)}`, async () => {
    const h = routeHarness('app/api/feedback/route.ts');
    assert.equal((await h.handler.POST(feedbackRequest(payload))).status, 400); assert.deepEqual(h.writes, []);
  });
}
test('feedback honeypot succeeds without authentication, database or visitor checks', async () => {
  const h = routeHarness('app/api/feedback/route.ts');
  assert.equal((await h.handler.POST(feedbackRequest({ website: 'bot' }))).status, 200); assert.deepEqual(h.reads, []);
});
test('anonymous feedback with missing or spoofable-only visitor address fails closed', async () => {
  const h = routeHarness('app/api/feedback/route.ts');
  for (const headers of [{}, { 'x-forwarded-for': '198.51.100.1' }, { 'x-real-ip': '198.51.100.1' }, { 'x-vercel-forwarded-for': 'bad' }]) {
    const req = new Request('https://staging.invalid/api/feedback', { method: 'POST', headers, body: JSON.stringify(feedbackBody) });
    const response = await h.handler.POST(req);
    assert.equal(response.status, 503); assert.equal(response.headers.get('Retry-After'), '60');
  }
  assert.deepEqual(h.writes, []);
});
for (const user of [null, { id: 'canonical-user', email: 'session@example.test' }]) {
  test(`feedback uses canonical identity and one insert with no separate count: ${user?.id ?? 'anonymous'}`, async () => {
    const h = routeHarness('app/api/feedback/route.ts', { user });
    const response = await h.handler.POST(feedbackRequest({ ...feedbackBody, user_id: 'forged', ip_hash: 'forged', page_url: 'p'.repeat(2100), user_agent: 'a'.repeat(1100), viewport: 'v'.repeat(30) }, { 'x-forwarded-for': '203.0.113.1' }));
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true });
    assert.deepEqual(h.reads, ['beta_feedback']); assert.equal(h.writes.length, 1);
    const saved = h.writes[0].value;
    assert.equal(saved.user_id, user?.id ?? null); assert.equal(saved.email, user?.email ?? feedbackBody.email);
    assert.match(saved.ip_hash, /^[a-f0-9]{64}$/); assert.equal(saved.page_url.length, 2000); assert.equal(saved.user_agent.length, 1000); assert.equal(saved.viewport.length, 20);
    assert.doesNotMatch(JSON.stringify(saved), /198\.51\.100|203\.0\.113|forged/);
  });
}
test('signed-in feedback can use the user quota without a visitor address', async () => {
  const h = routeHarness('app/api/feedback/route.ts', { user: { id: 'canonical-user', email: 'session@example.test' } });
  const req = new Request('https://staging.invalid/api/feedback', { method: 'POST', body: JSON.stringify(feedbackBody) });
  assert.equal((await h.handler.POST(req)).status, 200); assert.equal(h.writes[0].value.ip_hash, null);
});
for (const retry of [1, 42, 3600]) {
  test(`feedback database throttle returns safe 429 with Retry-After ${retry}`, async () => {
    const h = routeHarness('app/api/feedback/route.ts', { mutationError: { code: 'P0001', message: 'feedback_rate_limited', details: String(retry) } });
    const response = await h.handler.POST(feedbackRequest());
    assert.equal(response.status, 429); assert.equal(response.headers.get('Retry-After'), String(retry)); assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal((await response.json()).ok, false);
  });
}
for (const error of [{ code: '42501', message: 'PRIVATE PROVIDER DETAILS' }, { code: 'P0001', message: 'feedback_rate_limited', details: 'PRIVATE PROVIDER DETAILS' }, { code: 'P0001', message: 'feedback_rate_limited', details: '3601' }]) {
  test(`feedback database failure cannot report success or leak details: ${JSON.stringify(error)}`, async () => {
    const h = routeHarness('app/api/feedback/route.ts', { mutationError: error });
    const response = await h.handler.POST(feedbackRequest());
    assert.equal(response.status, 500); assert.doesNotMatch(await response.text(), /PRIVATE PROVIDER DETAILS|42501|P0001/);
  });
}

for (const playlist of [false, true]) {
  test(`public ${playlist ? 'playlist' : 'song'} projection excludes history, pending uploads and internal metadata`, async () => {
    const pending = { ...finalizedVersion, id: 'pending-version', version_number: 3, upload_finalized_at: null, notes: 'INTERNAL-PENDING' };
    const latest = { ...finalizedVersion, id: 'current-version', notes: 'INTERNAL-NOTE', file_name: 'INTERNAL-FILENAME', created_by_user_id: 'INTERNAL-USER' };
    const older = { ...latest, id: 'old-version', version_number: 1, notes: 'INTERNAL-HISTORY' };
    const sharedSong = { ...song, is_public: !playlist, created_by_user_id: 'INTERNAL-OWNER', status: 'INTERNAL-STATUS' };
    const h = routeHarness(playlist ? 'app/api/public/playlist/[id]/route.ts' : 'app/api/public/song/[songId]/route.ts', {
      tables: { songs: [sharedSong], song_versions: [pending, latest, older], accounts: [],
        playlists: [{ id: 'playlist-a', account_id: 'workspace-a', is_public: true }],
        playlist_songs: [{ playlist_id: 'playlist-a', song_id: 'song-a', position: 0 }],
      },
    });
    const response = await h.handler.GET(getRequest(), params(playlist ? { id: 'playlist-a' } : { songId: 'song-a' }));
    assert.equal(response.status, 200);
    const body = await response.json(); const serialized = JSON.stringify(body);
    assert.match(serialized, /current-version/);
    assert.doesNotMatch(serialized, /pending-version|old-version|INTERNAL-|song-files|uploads\/|workspace-a/);
    if (playlist) assert.equal(body.tracks.length, 1); else assert.equal(body.version.version_number, 2);
    assert.deepEqual(h.writes, []);
  });
}

const settingsBillingRoutes = [
  ['profile/settings', 'GET', 'Profile settings request failed.'],
  ['profile/settings', 'POST', 'Profile settings request failed.'],
  ['settings', 'GET', 'Profile settings request failed.'],
  ['settings', 'POST', 'Profile settings request failed.'],
  ['settings/summary', 'GET', 'Could not load settings summary.'],
  ['billing/checkout', 'POST', 'Could not start checkout.'],
  ['billing/portal', 'POST', 'Could not open billing portal.'],
  ['billing/activate', 'POST', 'Could not activate plan.'],
];
for (const [route, method, safeMessage] of settingsBillingRoutes) {
  test(`${route} ${method}: unexpected identity/provider exception stays server-side`, async () => {
    const h = routeHarness(`app/api/${route}/route.ts`, { overrides: {
      '@/lib/canonicalIdentity': { resolveCanonicalIdentity: async () => { throw new Error('INTERNAL-PROVIDER-DETAILS'); } },
    } });
    const response = await h.handler[method](jsonRequest({}));
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: safeMessage });
    assert.deepEqual(h.reads, []); assert.deepEqual(h.writes, []);
  });
}

for (const [route, methods] of [
  ['profile/settings', ['GET', 'POST']], ['settings', ['GET', 'POST']],
  ['profile/visualizer', ['GET', 'POST']], ['settings/summary', ['GET']],
  ['referrals/code', ['GET']], ['referrals/summary', ['GET']],
  ['billing/checkout', ['POST']], ['billing/portal', ['POST']], ['billing/activate', ['POST']],
]) for (const method of methods) {
  test(`${route} ${method}: signed out cannot access database or provider`, async () => {
    let providerCalls = 0;
    const h = routeHarness(`app/api/${route}/route.ts`, { overrides: {
      '@/lib/stripe': { getStripe: () => { providerCalls++; throw new Error('Unexpected provider call'); } },
    } });
    assert.equal((await h.handler[method](jsonRequest({}))).status, 401);
    assert.deepEqual(h.reads, []); assert.deepEqual(h.writes, []); assert.equal(providerCalls, 0);
  });
}

for (const route of ['checkout', 'portal', 'activate']) {
  test(`billing ${route}: ordinary member cannot access database or Stripe`, async () => {
    let providerCalls = 0;
    const h = routeHarness(`app/api/billing/${route}/route.ts`, { identity: session('member'), overrides: {
      '@/lib/stripe': { getStripe: () => { providerCalls++; throw new Error('Unexpected provider call'); } },
    } });
    assert.equal((await h.handler.POST(jsonRequest({ sessionId: 'foreign-checkout', accountId: 'workspace-b' }))).status, 403);
    assert.deepEqual(h.reads, []); assert.deepEqual(h.writes, []); assert.equal(providerCalls, 0);
  });
}

for (const role of ['owner', 'member']) {
  test(`settings summary: ${role} uses canonical user/workspace and owner-only invites`, async () => {
    const calls = [];
    const h = routeHarness('app/api/settings/summary/route.ts', { identity: session(role), tables: { songs: [song, foreignSong] }, overrides: {
      '@/lib/profileThemeSettings': { loadThemeSettings: async identity => { calls.push(['theme', identity.userId]); return { primary_color: 'own-theme' }; } },
      '@/lib/workspaceMembers': { listWorkspaceMembers: async id => { calls.push(['members', id]); return []; } },
      '@/lib/accountInvites': { listWorkspaceInvites: async id => { calls.push(['invites', id]); return [{ id: 'own-invite' }]; } },
    } });
    const response = await h.handler.GET(getRequest()); assert.equal(response.status, 200);
    const body = await response.json(); assert.equal(body.identity.workspaceId, 'workspace-a');
    assert.deepEqual(calls, [['theme', `user-${role}`], ['members', 'workspace-a'], ...(role === 'owner' ? [['invites', 'workspace-a']] : [])]);
    assert.equal(body.invites.length, role === 'owner' ? 1 : 0);
    assert.match(response.headers.get('cache-control'), /no-store/); assert.deepEqual(h.writes, []);
    assert.deepEqual(h.queries.find(query => query.table === 'songs').filters, [['account_id', 'workspace-a']]);
  });
}

for (const [workspace, paid, expected] of [['workspace-b', 'paid', 403], ['workspace-a', 'unpaid', 400], ['workspace-a', 'paid', 200]]) {
  test(`billing activation: ${workspace}/${paid} validates Stripe before canonical workspace update`, async () => {
    const calls = [];
    const h = routeHarness('app/api/billing/activate/route.ts', { identity: session('owner'), overrides: {
      '@/lib/stripe': { getStripe: () => ({ checkout: { sessions: { retrieve: async id => {
        calls.push(id); return { client_reference_id: workspace, payment_status: paid, metadata: { target_plan: 'pro' }, customer: 'test-customer', subscription: 'test-subscription' };
      } } } }), getPlanForStripePriceId: () => 'pro' },
    } });
    const response = await h.handler.POST(jsonRequest({ sessionId: 'test-checkout', accountId: 'workspace-b', plan: 'studio' }));
    assert.equal(response.status, expected); assert.deepEqual(calls, ['test-checkout']);
    if (expected !== 200) { assert.deepEqual(h.writes, []); assert.deepEqual(h.reads, []); }
    else { assert.equal(h.writes.length, 1); assert.equal(h.writes[0].table, 'accounts'); assert.equal(h.writes[0].value.plan, 'pro'); assert.deepEqual(h.queries[0].filters, [['id', 'workspace-a']]); }
  });
}

for (const route of ['profile/settings', 'settings']) {
  test(`${route}: theme reads/writes ignore supplied identity and use the signed-in user`, async () => {
    const calls = [];
    const theme = { primary_color: '#111111', accent_color: '#222222', background_color: '#333333' };
    const h = routeHarness(`app/api/${route}/route.ts`, { identity: session('member'), overrides: {
      '@/lib/profileThemeSettings': {
        isThemeSettingsInput: value => typeof value?.primary_color === 'string',
        loadThemeSettings: async identity => { calls.push(['read', identity.userId]); return theme; },
        saveThemeSettings: async (identity, value) => { calls.push(['write', identity.userId, value.primary_color]); return theme; },
      },
    } });
    assert.equal((await h.handler.GET(getRequest())).status, 200);
    assert.equal((await h.handler.POST(jsonRequest({ ...theme, userId: 'foreign-user', workspaceId: 'workspace-b' }))).status, 200);
    assert.deepEqual(calls, [['read', 'user-member'], ['write', 'user-member', '#111111']]);
  });
}

test('visualizer reads only the signed-in user preference', async () => {
  const h = routeHarness('app/api/profile/visualizer/route.ts', { identity: session('member'), tables: {
    profile_settings: [{ user_id: 'foreign-user', visualizer_enabled: true }, { user_id: 'user-member', visualizer_enabled: false }],
  } });
  const response = await h.handler.GET(getRequest());
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { visualizer_enabled: false });
  assert.deepEqual(h.queries[0].filters, [['user_id', 'user-member']]); assert.deepEqual(h.writes, []);
});

for (const route of ['code', 'summary']) {
  test(`referrals ${route}: canonical user code and masked own-referral projection`, async () => {
    const calls = [];
    const h = routeHarness(`app/api/referrals/${route}/route.ts`, { identity: session('member'), tables: {
      referrals: [
        { id: 'own-referral', referred_by_user_id: 'user-member', referred_user_id: 'referred-user', status: 'pending' },
        { id: 'FOREIGN-REFERRAL', referred_by_user_id: 'foreign-user', referred_user_id: 'PRIVATE-USER', status: 'pending' },
      ], profiles: [{ id: 'referred-user', email: 'person@example.test', display_name: 'Person' }, { id: 'PRIVATE-USER', email: 'PRIVATE-EMAIL@example.test' }],
    }, overrides: { '@/lib/referrals': {
      getOrCreateReferralCode: async (...args) => { calls.push(args); return { code: 'TSR-TEST' }; }, REFERRAL_REWARD_CAP: 5,
    } } });
    const response = await h.handler.GET(getRequest()); assert.equal(response.status, 200);
    const body = await response.json(); assert.deepEqual(calls, [['user-member', 'workspace-a']]);
    assert.equal(body.code, 'TSR-TEST'); assert.doesNotMatch(JSON.stringify(body), /FOREIGN|PRIVATE|person@example/);
    if (route === 'summary') { assert.equal(body.referrals.length, 1); assert.equal(body.referrals[0].maskedEmail, 'pe***@example.test'); }
    assert.deepEqual(h.writes, []);
  });
}

for (const route of ['checkout', 'portal']) {
  test(`billing ${route}: owner uses their stored customer despite foreign account/customer payload`, async () => {
    const calls = [];
    const stripe = {
      customers: { retrieve: async id => { calls.push(['customer', id]); return { id }; } },
      checkout: { sessions: { create: async payload => { calls.push(['checkout', payload]); return { url: 'https://checkout.example.test/session' }; } } },
      billingPortal: { sessions: { create: async payload => { calls.push(['portal', payload]); return { url: 'https://billing.example.test/session' }; } } },
    };
    const h = routeHarness(`app/api/billing/${route}/route.ts`, { identity: session('owner'), tables: {
      accounts: [{ id: 'workspace-b', plan: 'free', stripe_customer_id: 'FOREIGN-CUSTOMER' }, { id: 'workspace-a', plan: 'free', stripe_customer_id: 'own-customer' }],
    }, overrides: { '@/lib/stripe': { getStripe: () => stripe, getStripePriceId: (plan, interval) => `${plan}-${interval}` } } });
    const response = await h.handler.POST(jsonRequest({ accountId: 'workspace-b', customer: 'FOREIGN-CUSTOMER', plan: 'pro', interval: 'year' }));
    assert.equal(response.status, 200); assert.deepEqual(calls[0], ['customer', 'own-customer']);
    const payload = calls[1][1]; assert.equal(payload.customer, 'own-customer');
    if (route === 'checkout') { assert.equal(payload.client_reference_id, 'workspace-a'); assert.equal(payload.metadata.owner_user_id, 'user-owner'); assert.deepEqual(payload.line_items, [{ price: 'pro-year', quantity: 1 }]); }
    assert.deepEqual(h.queries[0].filters, [['id', 'workspace-a']]); assert.deepEqual(h.writes, []);
  });
}


test('actual billing handler keeps exception credentials out of both client response and server log', async () => {
  const logs = [];
  const error = Object.assign(new Error('PRIVATE-PROVIDER-MESSAGE'), {
    code: 'ECONNRESET', status: 503, stack: 'PRIVATE-STACK',
    cause: { headers: { authorization: 'PRIVATE-AUTH' }, url: 'https://example.test/?token=PRIVATE-TOKEN' },
  });
  const h = routeHarness('app/api/billing/checkout/route.ts', {
    logger: { error: (...args) => logs.push(args) },
    overrides: { '@/lib/canonicalIdentity': { resolveCanonicalIdentity: async () => { throw error; } } },
  });
  const response = await h.handler.POST(jsonRequest({})); assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Could not start checkout.' });
  assert.equal(logs.length, 1); assert.equal(logs[0][0], 'Billing checkout error:');
  assert.deepEqual(logs[0][1], { kind: 'exception', code: 'ECONNRESET', status: 503 });
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE-/); assert.deepEqual(h.writes, []);
});

for (const role of [null, 'member', 'owner']) {
  test(`workspace settings ${role ?? 'signed-out'}: canonical owner-only write ignores plan and Stripe fields`, async () => {
    const saved = { id: 'workspace-a', name: 'Updated fixture name', notification_mode: 'all_members' };
    const h = routeHarness('app/api/workspace/settings/route.ts', { identity: role ? session(role) : null, mutationResult: saved });
    const response = await h.handler.PATCH(jsonRequest({ name: saved.name, notification_mode: saved.notification_mode,
      workspaceId: 'workspace-b', plan: 'studio', stripe_customer_id: 'FOREIGN-CUSTOMER',
    }, 'PATCH'));
    assert.equal(response.status, role === 'owner' ? 200 : role ? 403 : 401);
    if (role === 'owner') {
      assert.deepEqual((await response.json()).workspace, saved);
      assert.deepEqual(h.writes, [{ table: 'accounts', value: { name: saved.name, notification_mode: saved.notification_mode } }]);
      assert.deepEqual(h.queries[0].filters, [['id', 'workspace-a']]);
    } else { assert.deepEqual(h.reads, []); assert.deepEqual(h.writes, []); }
  });
}


const remainingSafeResponseCases = [
  ["actions/by-song/[songId]",["GET"],"Could not load actions."],
  ["actions",["GET"],"Could not load actions."],
  ["dashboard",["GET"],"Could not load dashboard data."],
  ["dashboard/summary",["GET"],"Could not load dashboard summary."],
  ["invites/[token]/accept",["POST"],"Could not accept invite."],
  ["invites/[token]",["GET"],"Could not load invite."],
  ["songs/[songId]",["GET","PATCH","DELETE"],"Song request failed."],
  ["songs/[songId]/tasks",["GET"],"Could not load tasks."],
  ["songs/[songId]/versions",["GET"],"Could not load versions."],
  ["songs/create",["POST"],"Could not create song."],
  ["threads/create",["POST"],"Failed to create thread"],
  ["versions/[versionId]",["GET","PATCH"],"Version request failed."],
  ["versions/[versionId]/threads",["GET"],"Could not load comments."],
  ["workspace/invites/[inviteId]",["PATCH"],"Could not update workspace invite."],
  ["workspace/invites",["GET","POST"],"Could not manage workspace invites."],
  ["workspace/members/[userId]",["DELETE"],"Could not remove workspace member."],
  ["workspace/plan",["PATCH"],"Could not update workspace plan."],
  ["workspace/settings",["PATCH","POST"],"Could not update workspace settings."],
  ["workspaces/create",["POST"],"Could not create workspace."],
  ["workspaces",["GET"],"Could not load workspaces."],
  ["workspaces/switch",["POST"],"Could not switch workspace."],
  ["actions/[actionId]",["PATCH"],"Could not update action."],
  ["tasks/create",["POST"],"Could not create task."],
  ["tasks/reorder",["PATCH"],"Could not reorder tasks."],
  ["tasks/[taskId]",["PATCH"],"Could not update task."],
  ["tasks/[taskId]",["DELETE"],"Could not delete task."],
  ["workspace/members",["GET"],"Could not load workspace members."],
];
for (const [route, methods, message] of remainingSafeResponseCases) for (const method of methods) {
  test(`${route} ${method}: unexpected errors never reach client responses`, async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    if (route === 'workspace/plan') process.env.NODE_ENV = 'development';
    try {
      const fail = async () => { throw new Error('PRIVATE-PROVIDER-RESPONSE'); };
      const h = routeHarness(`app/api/${route}/route.ts`, { overrides: {
        '@/lib/canonicalIdentity': { resolveCanonicalIdentity: fail },
        '@/lib/currentUser': { getCurrentAuthenticatedUser: fail },
        '@/lib/accountInvites': { getPublicInviteByToken: fail },
      } });
      const response = await h.handler[method](method === 'GET' ? getRequest() : jsonRequest({ title: 'Fixture', description: 'Fixture' }, method), params({
        songId: 'song-a', versionId: 'version-a', inviteId: 'invite-a', userId: 'user-a', taskId: 'task-a', actionId: 'action-a', token: '00000000-0000-0000-0000-000000000000',
      }));
      assert.equal(response.status, 500); assert.deepEqual(await response.json(), { error: message, ...(route === 'invites/[token]' ? { state: 'invalid' } : {}) });
      assert.deepEqual(h.reads, []); assert.deepEqual(h.writes, []); assert.equal(h.notifications, 0);
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNodeEnv;
    }
  });
}

test('provider email rejection preserves created invite and gives a safe manual-link warning', async () => {
  const priorKey = process.env.RESEND_API_KEY; process.env.RESEND_API_KEY = 'test-only-provider-key';
  let sends = 0;
  try {
    const invite = { id: 'invite-a', email: 'fixture@example.test', normalized_email: 'fixture@example.test', role: 'member', status: 'pending', invite_token: 'safe-fixture-token', expires_at: '2030-01-01', created_at: '2026-11-03' };
    const h = routeHarness('app/api/workspace/invites/route.ts', { identity: session('owner'), mutationResult: invite, tables: {
      accounts: [{ id: 'workspace-a', name: 'Fixture workspace', plan: 'free' }], account_invites: [],
    }, logger: { warn() {}, error() {} }, overrides: {
      resend: { Resend: class { emails = { send: async () => { sends++; return { error: { message: 'PRIVATE-PROVIDER-RESPONSE' } }; } }; } },
    } });
    const response = await h.handler.POST(jsonRequest({ email: 'fixture@example.test' }));
    assert.equal(response.status, 201); const body = await response.json();
    assert.equal(sends, 1); assert.equal(body.emailSent, false);
    assert.equal(body.emailWarning, 'Invite created, but the email could not be sent. Copy the invite link manually.');
    assert.doesNotMatch(JSON.stringify(body), /PRIVATE-PROVIDER/); assert.equal(h.writes.length, 1);
  } finally { if (priorKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = priorKey; }
});

for (const value of [{ message: 'PRIVATE-DATABASE-MESSAGE', details: 'PRIVATE-DETAILS', code: 'PRIVATE-CODE' }, 'PRIVATE-THROWN-STRING']) {
  test(`song create hides unexpected ${typeof value} failure content`, async () => {
    const h = routeHarness('app/api/songs/create/route.ts', { overrides: {
      '@/lib/canonicalIdentity': { resolveCanonicalIdentity: async () => { throw value; } },
    } });
    const response = await h.handler.POST(jsonRequest({ title: 'Fixture' }));
    assert.equal(response.status, 500); assert.deepEqual(await response.json(), { error: 'Could not create song.' });
    assert.deepEqual(h.reads, []); assert.deepEqual(h.writes, []);
  });
}

// B40: execute real collaboration handlers with malformed untrusted payloads.
const b40Routes = [
  ['actions/create/route.ts', 'POST', {}],
  ['actions/[actionId]/route.ts', 'PATCH', { actionId: 'action-a' }],
  ['tasks/create/route.ts', 'POST', {}],
  ['tasks/[taskId]/route.ts', 'PATCH', { taskId: 'task-a' }],
  ['tasks/reorder/route.ts', 'PATCH', {}],
];
const b40Tables = {
  songs: [song], song_tasks: [{ id: 'task-a', song_id: song.id }],
  actions: [{ id: 'action-a', song_id: song.id, account_id: 'workspace-a' }],
  comments: [{ id: 'comment-a', thread_id: 'thread-a' }],
  comment_threads: [{ id: 'thread-a', song_version_id: 'version-a' }],
  song_versions: [{ id: 'version-a', song_id: song.id }],
};
for (const [route, method, routeParams] of b40Routes) {
  for (const [label, raw] of [['null', 'null'], ['array', '[]'], ['malformed', '{'], ['oversize', JSON.stringify({ description: 'x'.repeat(16385) })]]) {
    test(`B40 ${route} rejects ${label} before data access`, async () => {
      const h = routeHarness(`app/api/${route}`, { identity: session('member'), tables: b40Tables, logger: { error() {} } });
      const req = new Request('https://test.invalid', { method, body: raw, headers: { 'content-type': 'application/json' } });
      const response = await h.handler[method](req, params(routeParams));
      assert.equal(response.status, 400);
      assert.deepEqual(h.reads, []);
      assert.deepEqual(h.writes, []);
    });
  }
  test(`B40 ${route} rejects signed-out malformed JSON without parsing`, async () => {
    const h = routeHarness(`app/api/${route}`, { logger: { error() {} } });
    const response = await h.handler[method](new Request('https://test.invalid', { method, body: '{' }), params(routeParams));
    assert.equal(response.status, 401);
    assert.deepEqual(h.reads, []);
  });
}
for (const timestampSeconds of [-1, '2', true, {}, 2147483648]) {
  test(`B40 action rejects timestamp ${JSON.stringify(timestampSeconds)}`, async () => {
    const h = routeHarness('app/api/actions/create/route.ts', { identity: session('member'), tables: b40Tables });
    const response = await h.handler.POST(jsonRequest({ songId: song.id, commentId: 'comment-a', description: 'Fixture', timestampSeconds }));
    assert.equal(response.status, 400);
    assert.deepEqual(h.reads, []);
    assert.deepEqual(h.writes, []);
  });
}
for (const [route,method,body,routeParams] of [
  ['actions/create/route.ts','POST',{songId:song.id,commentId:'comment-a',description:{}},{}],
  ['actions/create/route.ts','POST',{songId:song.id,commentId:'comment-a',description:'Fixture',assignedToUserId:{}},{}],
  ['actions/[actionId]/route.ts','PATCH',{description:42},{actionId:'action-a'}],
  ['actions/[actionId]/route.ts','PATCH',{assignedToUserId:42},{actionId:'action-a'}],
  ['actions/[actionId]/route.ts','PATCH',{resolvedInVersionId:{}},{actionId:'action-a'}],
  ['tasks/create/route.ts','POST',{songId:song.id,description:42},{}],
  ['tasks/[taskId]/route.ts','PATCH',{description:{}},{taskId:'task-a'}],
  ['tasks/[taskId]/route.ts','PATCH',{description:'   '},{taskId:'task-a'}],
  ['tasks/[taskId]/route.ts','PATCH',{status:'unknown'},{taskId:'task-a'}],
  ['tasks/[taskId]/route.ts','PATCH',{status:null},{taskId:'task-a'}],
]) {
  test(`B40 ${route} rejects invalid ${Object.keys(body).at(-1)} ${JSON.stringify(body)}`, async () => {
    const h = routeHarness(`app/api/${route}`, { identity: session('member'), tables:b40Tables, logger:{error(){}} });
    const response=await h.handler[method](jsonRequest(body,method),params(routeParams));
    assert.equal(response.status,400);
    assert.deepEqual(h.writes,[]);
  });
}
test('B40 valid action rounds numeric timestamp and derives canonical attribution',async()=>{
 const h=routeHarness('app/api/actions/create/route.ts',{identity:session('member'),tables:b40Tables,mutationResult:{id:'new-action'}});
 const response=await h.handler.POST(jsonRequest({songId:song.id,commentId:'comment-a',description:' Fixture ',timestampSeconds:2.6}));
 assert.equal(response.status,201);
 assert.equal(h.writes[0].value[0].timestamp_seconds,3);
 assert.equal(h.writes[0].value[0].description,'Fixture');
 assert.equal(h.writes[0].value[0].created_by_user_id,'user-member');
});
test('B40 task update preserves completed status and trims description',async()=>{
 const h=routeHarness('app/api/tasks/[taskId]/route.ts',{identity:session('member'),tables:b40Tables,mutationResult:{id:'task-a'}});
 const response=await h.handler.PATCH(jsonRequest({status:'completed',description:' Updated '},'PATCH'),params({taskId:'task-a'}));
 assert.equal(response.status,200);
 assert.deepEqual(h.writes[0].value,{status:'completed',description:'Updated'});
});
test('B40 task reorder does not report success after a database write failure',async()=>{
 const h=routeHarness('app/api/tasks/reorder/route.ts',{identity:session('member'),tables:b40Tables,mutationError:{code:'XX000'},logger:{error(){}}});
 const response=await h.handler.PATCH(jsonRequest({orderedIds:['task-a']},'PATCH'));
 assert.equal(response.status,500);
 assert.deepEqual(await response.json(),{error:'Could not reorder tasks.'});
});

test('B40 collaboration body ceiling measures UTF-8 bytes and accepts its exact boundary',async()=>{
 const {readCollaborationInput}=routeHarness('lib/collaborationInput.ts').handler;
 const overhead=Buffer.byteLength(JSON.stringify({description:''}));
 const exact=JSON.stringify({description:'x'.repeat(16384-overhead)});
 assert.equal(Buffer.byteLength(exact),16384);
 assert.equal((await readCollaborationInput(new Request('https://test.invalid',{method:'POST',body:exact}))).description.length,16384-overhead);
 assert.equal(await readCollaborationInput(new Request('https://test.invalid',{method:'POST',body:exact+' '})),null);
 const multibyte=JSON.stringify({description:'🎵'.repeat(4096)});
 assert.ok(multibyte.length<16384);
 assert.equal(await readCollaborationInput(new Request('https://test.invalid',{method:'POST',body:multibyte})),null);
 const declared=new Request('https://test.invalid',{method:'POST',body:'{}',headers:{'content-length':'16385'}});
 assert.equal(await readCollaborationInput(declared),null);
});

// B41: remaining metadata mutations keep malformed input out of writes.
const b41Routes=[
 ['songs/create/route.ts','POST',{}],
 ['songs/[songId]/route.ts','PATCH',{songId:song.id}],
 ['versions/[versionId]/route.ts','PATCH',{versionId:'version-a'}],
 ['playlists/route.ts','POST',{}],
 ['playlists/[id]/route.ts','PATCH',{id:'playlist-a'}],
 ['playlists/[id]/songs/route.ts','POST',{id:'playlist-a'}],
 ['playlists/[id]/songs/route.ts','PATCH',{id:'playlist-a'}],
 ['workspace/invites/[inviteId]/route.ts','PATCH',{inviteId:'invite-a'}],
 ['songs/[songId]/visibility/route.ts','PATCH',{songId:song.id}],
 ['profile/settings/route.ts','POST',{}],
];
const b41Tables={songs:[song],song_versions:[{id:'version-a',song_id:song.id,version_number:1}],
 playlists:[{id:'playlist-a',account_id:'workspace-a',title:'Fixture',is_public:false}],
 playlist_songs:[{playlist_id:'playlist-a',song_id:song.id,position:0}],
 account_invites:[{id:'invite-a',account_id:'workspace-a',status:'pending'}]};
for(const [route,method,routeParams] of b41Routes){
 for(const [label,raw] of [['null','null'],['array','[]'],['malformed','{'],['oversize',JSON.stringify({title:'x'.repeat(16385),label:'x'.repeat(16385),songId:song.id,orderedSongIds:[song.id],action:'revoke',is_public:true})]]){
  test(`B41 ${route} ${method} rejects ${label} without writes`,async()=>{
   const h=routeHarness('app/api/'+route,{identity:session('owner'),tables:b41Tables,mutationResult:{id:'new-id'},logger:{error(){}}});
   const response=await h.handler[method](new Request('https://test.invalid',{method,body:raw,headers:{'content-type':'application/json'}}),params(routeParams));
   assert.equal(response.status,400);assert.deepEqual(h.writes,[]);
  });
 }
 test(`B41 ${route} ${method} signed-out malformed input returns401`,async()=>{
  const h=routeHarness('app/api/'+route,{logger:{error(){}}});
  const response=await h.handler[method](new Request('https://test.invalid',{method,body:'{'}),params(routeParams));
  assert.equal(response.status,401);assert.deepEqual(h.reads,[]);assert.deepEqual(h.writes,[]);
 });
}
for(const [route,body,routeParams] of [
 ['songs/create/route.ts',{title:{}},{}],
 ['songs/[songId]/route.ts',{title:42},{songId:song.id}],
 ['songs/[songId]/route.ts',{title:'Fixture',status:false},{songId:song.id}],
 ['versions/[versionId]/route.ts',{label:{}},{versionId:'version-a'}],
 ['versions/[versionId]/route.ts',{notes:42},{versionId:'version-a'}],
 ['playlists/route.ts',{title:{}},{}],
 ['playlists/[id]/route.ts',{title:42},{id:'playlist-a'}],
 ['playlists/[id]/route.ts',{is_public:'true'},{id:'playlist-a'}],
 ['playlists/[id]/route.ts',{},{id:'playlist-a'}],
 ['playlists/[id]/songs/route.ts',{orderedSongIds:[song.id,false]},{id:'playlist-a'}],
 ['playlists/[id]/songs/route.ts',{orderedSongIds:[song.id,song.id]},{id:'playlist-a'}],
 ['playlists/[id]/songs/route.ts',{orderedSongIds:['foreign-song']},{id:'playlist-a'}],
]){
 const method=route.endsWith('create/route.ts')||route==='playlists/route.ts'?'POST':'PATCH';
 test(`B41 ${route} rejects typed fields ${JSON.stringify(body)}`,async()=>{
  const h=routeHarness('app/api/'+route,{identity:session('owner'),tables:b41Tables,mutationResult:{id:'new-id'},logger:{error(){}}});
  const response=await h.handler[method](jsonRequest(body,method),params(routeParams));
  assert.equal(response.status,400);assert.deepEqual(h.writes,[]);
 });
}
test('B41 playlist reorder reports an update error instead of success',async()=>{
 const h=routeHarness('app/api/playlists/[id]/songs/route.ts',{identity:session('owner'),tables:b41Tables,mutationError:{code:'XX000'},logger:{error(){}}});
 const response=await h.handler.PATCH(jsonRequest({orderedSongIds:[song.id]},'PATCH'),params({id:'playlist-a'}));
 assert.equal(response.status,500);assert.deepEqual(await response.json(),{error:'Could not reorder.'});
});
test('B41 empty playlist creation keeps the existing default title',async()=>{
 const h=routeHarness('app/api/playlists/route.ts',{identity:session('member'),mutationResult:{id:'new-playlist'}});
 assert.equal((await h.handler.POST(jsonRequest({}))).status,201);
 assert.deepEqual(h.writes[0].value,{account_id:'workspace-a',created_by:'user-member',title:'Untitled playlist'});
});
test('B41 version metadata accepts explicit clears and preserves notes trimming',async()=>{
 const h=routeHarness('app/api/versions/[versionId]/route.ts',{identity:session('member'),tables:b41Tables,mutationResult:{id:'version-a',version_number:1}});
 assert.equal((await h.handler.PATCH(jsonRequest({label:null,notes:' Updated '},'PATCH'),params({versionId:'version-a'}))).status,200);
 assert.deepEqual(h.writes[0].value,{label:null,notes:'Updated'});
 assert.equal((await h.handler.PATCH(jsonRequest({label:null,notes:null},'PATCH'),params({versionId:'version-a'}))).status,200);
 assert.deepEqual(h.writes[1].value,{label:null,notes:null});
});
test('B41 valid playlist reorder remains scoped to the selected playlist',async()=>{
 const h=routeHarness('app/api/playlists/[id]/songs/route.ts',{identity:session('member'),tables:b41Tables});
 assert.equal((await h.handler.PATCH(jsonRequest({orderedSongIds:[song.id]},'PATCH'),params({id:'playlist-a'}))).status,200);
 assert.ok(h.queries.filter(q=>q.table==='playlist_songs').every(q=>q.filters.some(([key,value])=>key==='playlist_id'&&value==='playlist-a')));
});

for (const role of ['owner', 'member']) {
 test(`B19 joined version read preserves ${role} payload without an extra song query`, async () => {
  const h = routeHarness('app/api/versions/[versionId]/route.ts', {
   identity: session(role), tables: { songs: [song], song_versions: [{...finalizedVersion, file_path: null, account_id: null}] },
  });
  const response = await h.handler.GET(getRequest(), params({versionId:'version-a'}));
  assert.equal(response.status,200);
  const {version} = await response.json();
  assert.equal(version.id,'version-a');
  assert.equal(version.audioUrl,null);
  assert.equal(Object.hasOwn(version,'workspace_song'),false);
  assert.equal(version.account_id,null);
  assert.deepEqual(h.reads,['song_versions']);
 });
}
for (const [label, parent, status] of [['foreign',foreignSong,403],['absent',null,403]]) {
 test(`B19 joined version read denies ${label} parent before storage`, async () => {
  const h = routeHarness('app/api/versions/[versionId]/route.ts', {
   identity:session('member'), tables:{songs:parent ? [{...parent,id:'song-a'}] : [],song_versions:[finalizedVersion]},
  });
  const response = await h.handler.GET(getRequest(),params({versionId:'version-a'}));
  assert.equal(response.status,status);
  assert.doesNotMatch(await response.text(),/PRIVATE-TITLE|PRIVATE-ARTWORK/);
 });
}

test('signed Stripe lifecycle events only change the linked subscription', async t => {
  const Stripe = require('stripe');
  const stripe = new Stripe('sk_test_local_fixture');
  const secret = 'whsec_local_fixture';
  for (const [type, subscriptionId, expectedPlan, expectedSubscription] of [
    ['customer.subscription.deleted', 'sub_previous', 'pro', 'sub_current'],
    ['customer.subscription.updated', 'sub_previous', 'pro', 'sub_current'],
    ['customer.subscription.updated', 'sub_current', 'studio', 'sub_current'],
    ['customer.subscription.deleted', 'sub_current', 'free', null],
  ]) {
    await t.test(`${type} for ${subscriptionId}`, async () => {
      const account = { stripe_customer_id: 'cus_fixture', stripe_subscription_id: 'sub_current', plan: 'pro' };
      const db = {
        rpc: async () => ({ data: true, error: null }),
        from(table) {
          assert.equal(table, 'accounts');
          let patch;
          const conditions = [];
          const query = {
            update(data) { patch = data; return query; },
            eq(key, value) { conditions.push(() => account[key] === value); return query; },
            then(resolve, reject) {
              if (conditions.every(match => match())) Object.assign(account, patch);
              return Promise.resolve({ error: null }).then(resolve, reject);
            },
          };
          return query;
        },
      };
      const { handler } = routeHarness('app/api/stripe/webhook/route.ts', {
        overrides: {
          '@/lib/supabaseServer': { supabaseServer: db },
          '@/lib/referrals': {},
          '@/lib/stripe': {
            getStripe: () => stripe,
            getStripeWebhookSecret: () => secret,
            getPlanForStripePriceId: () => 'studio',
          },
        },
      });
      const body = JSON.stringify({
        id: 'evt_fixture',
        type,
        data: { object: { id: subscriptionId, customer: 'cus_fixture', status: 'active' } },
      });
      const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });
      const response = await handler.POST(new Request('https://staging.invalid/api/stripe/webhook', {
        method: 'POST', headers: { 'stripe-signature': signature }, body,
      }));
      assert.equal(response.status, 200);
      assert.equal(account.plan, expectedPlan);
      assert.equal(account.stripe_subscription_id, expectedSubscription);
    });
  }
});

test('dedicated staging webhook rejects events before passing them to billing', async t => {
  const Stripe = require('stripe');
  const stripe = new Stripe('sk_test_local_fixture');
  const secret = 'whsec_local_fixture';
  const stagingRef = 's'.repeat(20);
  const config = {
    STAGING_SUPABASE_PROJECT_REF: stagingRef,
    NEXT_PUBLIC_SUPABASE_URL: `https://${stagingRef}.supabase.co`,
    SUPABASE_SERVICE_ROLE_KEY: 'local_fixture',
    STRIPE_SECRET_KEY: 'sk_test_local_fixture',
    STRIPE_WEBHOOK_SECRET: secret,
  };
  const previous = Object.fromEntries(Object.keys(config).map(key => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  for (const { name, overrides, type, livemode, signature, status } of [
    { name: 'missing signature', signature: '', status: 400 },
    { name: 'invalid signature', signature: 'invalid', status: 400 },
    { name: 'live event', livemode: true, status: 400 },
    { name: 'unrelated event', type: 'invoice.paid', status: 400 },
    { name: 'live key', overrides: { STRIPE_SECRET_KEY: 'sk_live_fixture' }, status: 503 },
    { name: 'mismatched database', overrides: { NEXT_PUBLIC_SUPABASE_URL: 'https://other.supabase.co' }, status: 503 },
    {
      name: 'Production database',
      overrides: {
        STAGING_SUPABASE_PROJECT_REF: 'hxtsuhmqrufcdplidtov',
        NEXT_PUBLIC_SUPABASE_URL: 'https://hxtsuhmqrufcdplidtov.supabase.co',
      },
      status: 503,
    },
    { name: 'subscription update', status: 200 },
    { name: 'subscription expiry', type: 'customer.subscription.deleted', status: 200 },
  ]) {
    await t.test(name, async () => {
      Object.assign(process.env, config, overrides);
      const calls = [];
      const { handler } = routeHarness('staging-webhook/app/api/stripe/webhook/route.ts', {
        overrides: {
          stripe: { default: Stripe },
          '@/app/api/stripe/webhook/route': {
            POST: async request => {
              calls.push([request.headers.get('stripe-signature'), await request.text()]);
              return Response.json({ received: true });
            },
          },
        },
      });
      const body = JSON.stringify({
        id: 'evt_fixture',
        type: type ?? 'customer.subscription.updated',
        livemode: livemode ?? false,
      });
      const signed = signature ?? stripe.webhooks.generateTestHeaderString({ payload: body, secret });
      const response = await handler.POST(new Request('https://staging.invalid/api/stripe/webhook', {
        method: 'POST',
        headers: signed ? { 'stripe-signature': signed } : {},
        body,
      }));
      assert.equal(response.status, status);
      assert.deepEqual(calls, status === 200 ? [[signed, body]] : []);
    });
  }
});
