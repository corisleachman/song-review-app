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

function assertOrdered(source, expected, context) {
  let previousIndex = -1;

  for (const value of expected) {
    const currentIndex = source.indexOf(value, previousIndex + 1);
    assert.ok(currentIndex > previousIndex, `${context}: expected ${JSON.stringify(value)} in order`);
    previousIndex = currentIndex;
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

test('pending workspace invites use Google-only account entry during beta', () => {
  const actions = read('app/invite/[token]/InviteActions.tsx');
  const page = read('app/invite/[token]/page.tsx');

  assertIncludesAll(actions, [
    'supabase.auth.signInWithOAuth({',
    "provider: 'google'",
    'Continue with Google',
    'we&apos;ll create your account automatically',
  ], 'invite Google account entry');
  assert.match(page, /Continue with Google using the invited email address/u);
  assert.doesNotMatch(actions, /signInWithPassword|Sign in with email|invite-password/u);
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

test('playlist cover uploads validate size and type before buffering or decoding', () => {
  const route = read('app/api/playlists/[id]/image/route.ts');
  const page = read('app/playlists/[id]/page.tsx');

  assertIncludesAll(route, [
    'const IMAGE_MAX_BYTES = 5 * 1024 * 1024',
    'const IMAGE_MAX_REQUEST_BYTES = IMAGE_MAX_BYTES + 1024 * 1024',
    'const IMAGE_MAX_INPUT_PIXELS = 40_000_000',
    "new Set(['image/jpeg', 'image/png', 'image/webp'])",
    "failOn: 'error'",
    'limitInputPixels: IMAGE_MAX_INPUT_PIXELS',
  ], 'playlist cover upload limits');
  assertOrdered(route, [
    "const contentLength = Number(req.headers.get('content-length') ?? 0)",
    'contentLength > IMAGE_MAX_REQUEST_BYTES',
    'const formData = await req.formData()',
  ], 'playlist request size validation');
  assertOrdered(route, [
    'file.size === 0 || file.size > IMAGE_MAX_BYTES',
    '!ACCEPTED_IMAGE_TYPES.has(file.type.toLowerCase())',
    'Buffer.from(await file.arrayBuffer())',
    'sharp(rawBuffer, {',
  ], 'playlist file validation');
  assert.match(page, /accept="image\/jpeg,image\/png,image\/webp"/u);
  assertOrdered(page, [
    'getPlaylistCoverValidationError(file)',
    'setCoverUploading(true)',
    'new FormData()',
  ], 'playlist client validation');
  assert.doesNotMatch(page, /URL\.createObjectURL/u);
  assertIncludesAll(page, [
    'role="alertdialog"',
    'useDialogFocus(Boolean(coverError), closeCoverError, coverErrorDialogRef)',
    'That image wasn’t uploaded',
    'Your current cover is unchanged.',
    'Choose another image',
  ], 'playlist cover error dialog');
});

test('fixed feedback and cookie controls clear the measured dashboard player', () => {
  const dashboard = read('app/dashboard/page.tsx');
  const dashboardCss = read('app/dashboard/dashboard.module.css');
  const appShell = read('components/AppShell.tsx');
  const appSidebar = read('components/AppSidebar.tsx');
  const feedbackCss = read('components/BetaFeedback.module.css');
  const cookieController = read('public/cookie-consent.js');
  const cookieCss = read('public/cookie-consent.css');

  assertIncludesAll(dashboard, [
    'const miniPlayerRef = useRef<HTMLDivElement>(null)',
    "root.style.setProperty('--tsr-player-safe-area', `${height}px`)",
    "root.style.removeProperty('--tsr-player-safe-area')",
    'new ResizeObserver(updatePlayerSafeArea)',
    '<div ref={miniPlayerRef} className={styles.miniPlayer}>',
  ], 'dashboard player safe area');
  assert.match(
    feedbackCss,
    /bottom:\s*calc\(var\(--tsr-player-safe-area, 0px\) \+ (?:16|22)px\)/u
  );
  assert.match(
    feedbackCss,
    /\.wrap\.left\s*\{[^}]*var\(--tsr-cookie-settings-clearance, 56px\)/u
  );
  assert.match(
    cookieCss,
    /bottom:\s*calc\(var\(--tsr-player-safe-area, 0px\) \+ (?:8|10|12|18)px\)/u
  );
  assertIncludesAll(cookieCss, [
    '--tsr-cookie-settings-clearance: 56px',
    '--tsr-cookie-settings-clearance: 52px',
  ], 'cookie settings desktop and mobile clearance');
  assert.match(dashboardCss, /\.miniPlayer\s*\{[^}]*left:\s*76px;/u);
  assert.match(
    dashboardCss,
    /@media \(max-width:\s*768px\)\s*\{\s*\.miniPlayer\s*\{[^}]*left:\s*0;/u
  );
  assert.match(appShell, /data-tsr-app-shell/u);
  assert.match(
    cookieCss,
    /body:has\(\[data-tsr-app-shell\]\) \.tsr-cookie-settings\s*\{[^}]*display:\s*none;/u
  );
  assertIncludesAll(appSidebar, [
    "window.dispatchEvent(new Event('tsr:open-cookie-settings'))",
    "label: 'Cookie settings'",
  ], 'desktop cookie settings navigation action');
  assertIncludesAll(cookieController, [
    "const OPEN_SETTINGS_EVENT = 'tsr:open-cookie-settings'",
    'window.addEventListener(OPEN_SETTINGS_EVENT, showBanner)',
  ], 'cookie settings event controller');
});

test('mobile marketing description occupies a separate row from the hero headline', () => {
  const marketing = read('public/marketing.html');
  const responsiveStart = marketing.indexOf('@media (max-width: 900px) {', marketing.indexOf('RESPONSIVE'));
  const responsiveEnd = marketing.indexOf('@media (prefers-reduced-motion: reduce)', responsiveStart);
  const responsiveCss = marketing.slice(responsiveStart, responsiveEnd);

  assert.match(responsiveCss, /\.cell-d\s*\{[^}]*grid-row:\s*2;/u);
  assert.match(responsiveCss, /\.cell-b\s*\{[^}]*grid-row:\s*3;/u);
  assert.match(responsiveCss, /\.cell-c\s*\{[^}]*grid-row:\s*3;/u);
  assert.match(responsiveCss, /\.bento-cell-text p\s*\{[^}]*font-size:\s*clamp\(15px, 4vw, 18px\);/u);
});

test('public playlist playback advances through its ordered tracks', () => {
  const player = read('app/listen/playlist/[id]/page.tsx');

  assertIncludesAll(player, [
    "ws.on('finish', () => { goNextRef.current(); })",
    "navigator.mediaSession.setActionHandler('nexttrack', () => goNextRef.current())",
    'const i = curRef.current + 1',
    'if (i < tracksRef.current.length) loadTrack(i)',
  ], 'public playlist sequence');
});

test('desktop card view exposes the same song-stage update path', () => {
  const dashboard = read('app/dashboard/page.tsx');

  assertIncludesAll(dashboard, [
    'id={`song-status-grid-${song.id}`}',
    'value={song.status}',
    'void updateSongStatus(song.id, e.target.value as SongStatus)',
    '{SONG_STATUS_VALUES.map(status => (',
    'aria-label="Change stage"',
  ], 'desktop card stage control');
});

test('visualizer preference is editable, persisted, and respected by the song player', () => {
  const settings = read('app/settings/appearance/page.tsx');
  const route = read('app/api/profile/visualizer/route.ts');
  const player = read('app/songs/[id]/versions/[versionId]/page.tsx');

  assertIncludesAll(settings, [
    '<h3>Audio visualizer</h3>',
    "fetch('/api/profile/visualizer'",
    'body: JSON.stringify({ visualizer_enabled: val })',
    'onClick={() => void setVisualizer(false)}',
  ], 'visualizer setting');
  assertIncludesAll(route, [
    ".select('visualizer_enabled')",
    'visualizer_enabled: body.visualizer_enabled',
    "return NextResponse.json({ visualizer_enabled: body.visualizer_enabled })",
  ], 'visualizer persistence');
  assertIncludesAll(player, [
    "fetch('/api/profile/visualizer'",
    'setVisualizerEnabled(data?.visualizer_enabled !== false)',
    '{visualizerEnabled && (',
  ], 'song player visualizer preference');
});

test('beta login and signup use a single Google account path', () => {
  const login = read('app/login/page.tsx');

  assertIncludesAll(login, [
    'Use Google to log in or create your Song Room account.',
    "provider: 'google'",
    "googleLoading ? 'Connecting...' : 'Continue with Google'",
    'During beta, Google is the only account option.',
  ], 'Google-only authentication controls');
  assert.doesNotMatch(
    login,
    /signInWithPassword|resetPasswordForEmail|\.auth\.signUp|Continue with email|Forgot password|type="password"/u
  );
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
