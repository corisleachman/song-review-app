import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function compactSql(relativePath) {
  return read(relativePath).replace(/\s+/g, ' ').trim();
}

function assertIncludesAll(source, expected, context) {
  for (const value of expected) {
    assert.ok(source.includes(value), `${context}: missing ${JSON.stringify(value)}`);
  }
}

test('auth middleware applies to pages but skips APIs and static files', () => {
  const middleware = read('middleware.ts');
  const literal = middleware.match(/matcher:\s*\[\s*'((?:\\.|[^'])+)'/u)?.[1];

  assert.ok(literal, 'middleware matcher literal could not be found');

  const matcher = new RegExp(`^${literal.replaceAll('\\\\', '\\')}$`);
  const cases = new Map([
    ['/', true],
    ['/dashboard', true],
    ['/songs/song-id', true],
    ['/settings/profile', true],
    ['/api/dashboard', false],
    ['/_next/static/chunks/app.js', false],
    ['/_next/image', false],
    ['/favicon.ico', false],
    ['/icon.svg', false],
    ['/assets/demo.track.mp3', false],
    ['/cookie-consent.js', false],
  ]);

  for (const [pathname, expected] of cases) {
    assert.equal(matcher.test(pathname), expected, `unexpected matcher result for ${pathname}`);
  }
});

test('workspace invite emails build links from the request origin', () => {
  const route = read('app/api/workspace/invites/route.ts');
  const requestOriginCalls = route.match(
    /buildInviteLink\([^)]*req\.nextUrl\.origin\)/gu
  ) ?? [];

  assert.match(
    route,
    /new URL\(`\/invite\/\$\{encodeURIComponent\(inviteToken\)\}`, requestOrigin\)\.toString\(\)/u
  );
  assert.equal(requestOriginCalls.length, 2, 'new and repeated invites must use the request origin');
  assert.doesNotMatch(route, /localhost(?::\d+)?/iu);
});

test('authenticated playlist access stays inside the active workspace', () => {
  const access = read('lib/playlistAccess.ts');

  assertIncludesAll(access, [
    "const accountId = resolved.identity.workspaceId",
    ".select('id, account_id, title, is_public, image_url')",
    "data.account_id !== accountId",
    "return { error: 'notfound', accountId, userId }",
  ], 'playlist workspace boundary');
});

test('public song reads expose only public songs with finalized audio', () => {
  const route = read('app/api/public/song/[songId]/route.ts');

  assertIncludesAll(route, [
    "if (!song.is_public)",
    "return NextResponse.json({ error: 'Not found' }, { status: 404 })",
    ".not('upload_finalized_at', 'is', null)",
    ".order('version_number', { ascending: false })",
    ".limit(1)",
  ], 'public song boundary');
});

test('public playlist reads stay public, workspace-scoped, finalized, and batched', () => {
  const route = read('app/api/public/playlist/[id]/route.ts');

  assertIncludesAll(route, [
    "if (!playlist || !playlist.is_public)",
    "return respond({ error: 'Not found' }, 404)",
    ".eq('account_id', playlist.account_id)",
    ".in('song_id', songIdBatch)",
    ".not('upload_finalized_at', 'is', null)",
    "const scopedSongIds = songIds.filter((songId) => songMeta.has(songId))",
  ], 'public playlist boundary');
  assert.doesNotMatch(
    route,
    /for\s*\(\s*const\s+songId\s+of\s+songIds\s*\)/u,
    'public playlist versions must not regress to one database request per song'
  );
});

test('public comments require both public sharing and comment permission', () => {
  const route = read('app/api/public/song/[songId]/comments/route.ts');

  assertIncludesAll(route, [
    ".select('id, is_public, public_comments_enabled')",
    "Boolean(song && song.is_public && song.public_comments_enabled)",
    "if (!(await songAllowsComments(songId)))",
    "{ comments: [], enabled: false }",
    "{ error: 'Comments are not available for this track.' }",
  ], 'public comment boundary');
});

test('song deletion is owner-only and reports storage cleanup failures', () => {
  const route = read('app/api/songs/[songId]/route.ts');

  assertIncludesAll(route, [
    "song.account_id !== resolved.identity.workspaceId",
    "resolved.identity.membershipRole !== 'owner'",
    "supabaseServer.rpc('delete_song_and_release_storage'",
    "p_account_id: resolved.identity.workspaceId",
    "removeStorageObjects('song-files', audioPaths)",
    "removeStorageObjects('song-images', coverPath ? [coverPath] : [])",
    "storageCleanupPending: audioCleanupPending || imageCleanupPending",
  ], 'song deletion contract');
});

test('upload allocation and finalization serialize writes and enforce quota', () => {
  const migration = compactSql('supabase/migrations/20260811130000_version_upload_integrity.sql');

  assertIncludesAll(migration, [
    'WHERE id = p_song_id AND account_id = p_account_id FOR UPDATE',
    'upload_finalized_at ) VALUES',
    'p_created_by, NULL',
    'WHERE sv.id = p_version_id AND s.account_id = p_account_id FOR UPDATE OF sv',
    'WHERE id = p_account_id FOR UPDATE',
    'IF used_bytes + p_file_size_bytes > p_storage_limit_bytes',
    'upload_finalized_at = now()',
    'SET storage_bytes_used = used_bytes + p_file_size_bytes',
  ], 'upload integrity migration');
});

test('song deletion releases finalized bytes atomically and never underflows quota', () => {
  const migration = compactSql('supabase/migrations/20260812201000_song_deletion_storage_accounting.sql');

  assertIncludesAll(migration, [
    'WHERE id = p_song_id AND account_id = p_account_id FOR UPDATE',
    'WHERE song_id = p_song_id FOR UPDATE',
    'WHEN upload_finalized_at IS NOT NULL THEN greatest(coalesce(file_size_bytes, 0), 0)',
    'WHERE id = p_account_id FOR UPDATE',
    'SET storage_bytes_used = greatest(0, coalesce(storage_bytes_used, 0) - bytes_to_release)',
    'DELETE FROM public.songs WHERE id = p_song_id AND account_id = p_account_id',
  ], 'song deletion migration');
});

test('privileged upload and deletion functions remain service-role-only', () => {
  const migrations = [
    compactSql('supabase/migrations/20260811130000_version_upload_integrity.sql'),
    compactSql('supabase/migrations/20260812201000_song_deletion_storage_accounting.sql'),
  ].join(' ');
  const functions = [
    'public.create_song_version_upload(UUID, UUID, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT)',
    'public.finalize_song_version_upload(UUID, UUID, BIGINT, BIGINT)',
    'public.delete_song_and_release_storage(UUID, UUID)',
  ];

  for (const functionName of functions) {
    assert.ok(
      migrations.includes(`REVOKE ALL ON FUNCTION ${functionName} FROM PUBLIC, anon, authenticated`),
      `${functionName} must be revoked from browser-facing roles`
    );
    assert.ok(
      migrations.includes(`GRANT EXECUTE ON FUNCTION ${functionName} TO service_role`),
      `${functionName} must be granted only to service_role`
    );
  }
});

test('RLS cleanup removes blanket policies and its rollback cannot restore them', () => {
  const migration = compactSql('supabase/migrations/20260812200000_remove_permissive_rls_policies.sql');
  const rollback = compactSql('migrations/20260520_rls_policies_down.sql');

  assertIncludesAll(migration, [
    'DROP POLICY IF EXISTS "Enable read access for all users" ON public.songs',
    'DROP POLICY IF EXISTS "settings_authenticated_all" ON public.settings',
  ], 'RLS cleanup migration');
  assert.doesNotMatch(rollback, /CREATE\s+POLICY/iu);
  assert.match(rollback, /restoring blanket RLS policies is unsafe/iu);
});
