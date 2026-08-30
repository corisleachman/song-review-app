import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

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

test('response headers expose a route-aware report-only CSP without changing embed framing', async () => {
  const nextConfig = require(path.join(repoRoot, 'next.config.js'));
  const headerRules = await nextConfig.headers();
  const standardRule = headerRules.find((rule) => rule.source === '/((?!embed).*)');
  const embedRule = headerRules.find((rule) => rule.source === '/embed/:path*');

  assert.ok(standardRule, 'standard security header rule is missing');
  assert.ok(embedRule, 'embed security header rule is missing');

  const standardHeaders = new Map(standardRule.headers.map(({ key, value }) => [key, value]));
  const embedHeaders = new Map(embedRule.headers.map(({ key, value }) => [key, value]));
  const standardReportOnly = standardHeaders.get('Content-Security-Policy-Report-Only') ?? '';
  const embedReportOnly = embedHeaders.get('Content-Security-Policy-Report-Only') ?? '';

  assertIncludesAll(standardReportOnly, [
    "default-src 'self';",
    "base-uri 'self';",
    "object-src 'none';",
    "frame-ancestors 'none';",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
    'https://fonts.gstatic.com',
    'https://raw.githubusercontent.com',
    'https://corisleachman.github.io',
    'https://*.googleusercontent.com',
    'supabase.co',
    'report-uri /api/csp-report;',
    'report-to csp-endpoint;',
  ], 'standard report-only CSP');
  assert.match(
    standardReportOnly,
    /img-src [^;]*https:\/\/www\.googletagmanager\.com[^;]*;/u,
    'standard report-only CSP should allow the Google Tag Manager image beacon',
  );
  assert.equal(standardHeaders.get('Reporting-Endpoints'), 'csp-endpoint="/api/csp-report"');
  assert.equal(standardHeaders.get('X-Frame-Options'), 'DENY');
  assert.equal(standardHeaders.has('Content-Security-Policy'), false);

  assert.match(embedReportOnly, /frame-ancestors \*;/u);
  assert.match(
    embedReportOnly,
    /img-src [^;]*https:\/\/www\.googletagmanager\.com[^;]*;/u,
    'embed report-only CSP should allow the Google Tag Manager image beacon',
  );
  assert.equal(embedHeaders.get('Content-Security-Policy'), 'frame-ancestors *');
  assert.equal(embedHeaders.has('X-Frame-Options'), false);
});

test('CSP reporting endpoint bounds input and logs only sanitized fields', () => {
  const route = read('app/api/csp-report/route.ts');

  assertIncludesAll(route, [
    'const MAX_REPORT_BYTES = 16 * 1024',
    'const MAX_REPORTS_PER_REQUEST = 10',
    "'application/csp-report'",
    "'application/reports+json'",
    "return `${url.origin}${url.pathname}`.slice(0, 500)",
    "console.warn('[csp-report]', JSON.stringify(report))",
    "'Cache-Control': 'no-store'",
  ], 'CSP report safeguards');
  assertOrdered(route, [
    "request.headers.get('content-length')",
    'declaredLength > MAX_REPORT_BYTES',
    'const rawBody = await request.text()',
    "Buffer.byteLength(rawBody, 'utf8') > MAX_REPORT_BYTES",
    'JSON.parse(rawBody)',
  ], 'CSP report request validation');
  assert.doesNotMatch(
    route,
    /console\.warn\([^\n]*(?:original-policy|script-sample|request\.headers)/u,
  );
});

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

test('feedback and initial cookie consent clear the player while preferences live in settings', () => {
  const dashboard = read('app/dashboard/page.tsx');
  const dashboardCss = read('app/dashboard/dashboard.module.css');
  const appShell = read('components/AppShell.tsx');
  const appSidebar = read('components/AppSidebar.tsx');
  const feedback = read('components/BetaFeedback.tsx');
  const feedbackCss = read('components/BetaFeedback.module.css');
  const cookieController = read('public/cookie-consent.js');
  const cookieCss = read('public/cookie-consent.css');
  const settingsLayout = read('app/settings/layout.tsx');
  const privacySettings = read('app/settings/privacy/page.tsx');

  assertIncludesAll(dashboard, [
    'const miniPlayerRef = useRef<HTMLDivElement>(null)',
    "root.style.setProperty('--tsr-player-safe-area', `${height}px`)",
    "root.style.removeProperty('--tsr-player-safe-area')",
    'new ResizeObserver(updatePlayerSafeArea)',
    '<div ref={miniPlayerRef} className={styles.miniPlayer}>',
  ], 'dashboard player safe area');
  const playSongStart = dashboard.indexOf('async function playSong');
  const queueSeed = dashboard.indexOf('queueRef.current = queue;', playSongStart);
  const firstPlayingIdUpdate = dashboard.indexOf('setPlayingId(song.id);', playSongStart);
  assert.ok(
    playSongStart >= 0 && queueSeed > playSongStart && queueSeed < firstPlayingIdUpdate,
    'the queue must exist before the first playingId render so the mini player can be measured'
  );
  assert.match(
    feedbackCss,
    /bottom:\s*calc\(var\(--tsr-player-safe-area, 0px\) \+ (?:16|22)px\)/u
  );
  assert.match(feedbackCss, /\.wrap\s*\{[^}]*right:\s*22px;/u);
  assert.doesNotMatch(feedback, /usePathname|onPlayerRoute|styles\.left/u);
  assert.doesNotMatch(feedbackCss, /\.wrap\.left/u);
  assert.match(
    cookieCss,
    /bottom:\s*calc\(var\(--tsr-player-safe-area, 0px\) \+ (?:8|10|12|18)px\)/u
  );
  assert.match(dashboardCss, /\.miniPlayer\s*\{[^}]*left:\s*76px;/u);
  assert.match(
    dashboardCss,
    /@media \(max-width:\s*768px\)\s*\{\s*\.miniPlayer\s*\{[^}]*left:\s*0;/u
  );
  assert.doesNotMatch(appShell, /data-tsr-app-shell/u);
  assert.doesNotMatch(appSidebar, /label: 'Cookie settings'|handleCookieSettings/u);
  assert.doesNotMatch(cookieController, /SETTINGS_ID|showSettingsButton|className = 'tsr-cookie-settings'/u);
  assert.doesNotMatch(cookieCss, /\.tsr-cookie-settings/u);
  assertIncludesAll(cookieController, [
    "const OPEN_SETTINGS_EVENT = 'tsr:open-cookie-settings'",
    'window.addEventListener(OPEN_SETTINGS_EVENT, showBanner)',
  ], 'cookie settings event controller');
  assert.match(settingsLayout, /label: 'Privacy & cookies'.*href: '\/settings\/privacy'/u);
  assertIncludesAll(privacySettings, [
    "const OPEN_COOKIE_SETTINGS_EVENT = 'tsr:open-cookie-settings'",
    'window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))',
    '<h2>Privacy & cookies</h2>',
    'Cookie settings',
  ], 'settings-only cookie preference control');
});

test('dashboard mini-player gives transport and timeline the primary space', () => {
  const dashboard = read('app/dashboard/page.tsx');
  const dashboardCss = read('app/dashboard/dashboard.module.css');

  assertIncludesAll(dashboard, [
    'className={styles.miniPlayerTransport}',
    'className={styles.miniPlayerTimeline}',
    'const sourceQueueRef = useRef<Song[]>([])',
    'const shuffleEnabledRef = useRef(false)',
    'const [shuffleEnabled, setShuffleEnabled] = useState(false)',
    'const [loopEnabled, setLoopEnabled] = useState(false)',
    'function buildShuffledQueue(queue: Song[], currentSongId: string)',
    'const nextEnabled = !shuffleEnabledRef.current',
    'const playbackQueue = shuffleEnabledRef.current',
    'loop={loopEnabled}',
    'aria-label="Previous song"',
    'aria-label="Next song"',
    'aria-label="Playback position"',
    'aria-label="Close player"',
    "aria-label={shuffleEnabled ? 'Turn shuffle off' : 'Turn shuffle on'}",
    "aria-label={loopEnabled ? 'Turn loop off' : 'Loop current song'}",
    'aria-pressed={shuffleEnabled}',
    'aria-pressed={loopEnabled}',
    '{formatTime(playerCurrentTime)}',
    '{formatTime(playerDuration)}',
    'in queue',
  ], 'prominent dashboard player controls');
  assert.match(
    dashboardCss,
    /\.miniPlayerRow\s*\{[^}]*grid-template-columns:\s*minmax\(220px, 320px\) minmax\(320px, 1fr\) 44px;/u
  );
  assert.match(
    dashboardCss,
    /\.miniPlayerTransport\s*\{[^}]*grid-template-columns:\s*auto 40px minmax\(120px, 1fr\) 40px;/u
  );
  assert.match(
    dashboardCss,
    /\.miniPlayerPlayBtn\s*\{[^}]*width:\s*52px;[^}]*height:\s*52px;/u
  );
  assert.match(
    dashboardCss,
    /grid-template-areas:\s*'identity close'\s*'transport transport';/u
  );
  assert.match(
    dashboardCss,
    /grid-template-areas:\s*'controls controls controls'\s*'current timeline duration';/u
  );
  assert.match(dashboardCss, /\.miniPlayerModeBtnActive[^}]*color:\s*#f0e48c;/u);
  assert.match(
    dashboardCss,
    /\.miniPlayer\s*\{[^}]*border-top:\s*1px solid rgba\(244, 237, 228, 0\.18\);/u
  );
  assert.match(
    dashboardCss,
    /@media \(max-width:\s*768px\)[\s\S]*?\.miniPlayer\s*\{[^}]*left:\s*0;[^}]*background:\s*#140e0e;[^}]*backdrop-filter:\s*none;[^}]*-webkit-backdrop-filter:\s*none;[^}]*border-top:\s*0;/u
  );
});

test('primary upload, navigation, and playlist controls use native buttons', () => {
  const upload = read('app/upload/page.tsx');
  const playlistManager = read('app/playlists/[id]/page.tsx');
  const dashboard = read('app/dashboard/page.tsx');
  const publicPlaylist = read('app/listen/playlist/[id]/page.tsx');

  assert.match(upload, /<button[^>]*className=\{`\$\{styles\.drop\}/u);
  assert.match(upload, /<button[^>]*className=\{styles\.dropMini\}/u);
  assert.match(upload, /<button[^>]*className=\{`\$\{styles\.thumb\} \$\{styles\.artSlot\}`\}/u);
  assertIncludesAll(upload, [
    'aria-label="Choose audio tracks to upload"',
    "aria-label={`${it.artPreview ? 'Replace' : 'Add'} cover for ${it.title || 'Untitled'}`}",
  ], 'keyboard-accessible upload controls');

  assert.match(playlistManager, /<button[^>]*className=\{styles\.coverSlot\}/u);
  assert.match(dashboard, /<button type="button" className=\{styles\.cardGhost\}/u);
  assert.match(dashboard, /<button[^>]*className=\{styles\.miniPlayerLeft\}/u);
  assert.match(publicPlaylist, /<button[^>]*className=\{`\$\{styles\.trackRow\}/u);
  assertIncludesAll(publicPlaylist, [
    "aria-current={i === cur ? 'true' : undefined}",
    'aria-label={`Play ${t.title}, track ${i + 1} of ${tracks.length}`}',
  ], 'keyboard-accessible public playlist tracks');
});

test('active dialogs share focus trapping, Escape dismissal, and labelled semantics', () => {
  const focusHelper = read('lib/useDialogFocus.ts');
  const dashboard = read('app/dashboard/page.tsx');
  const feedback = read('components/BetaFeedback.tsx');
  const versionPage = read('app/songs/[id]/versions/[versionId]/page.tsx');

  assertIncludesAll(focusHelper, [
    'const previouslyFocused = document.activeElement instanceof HTMLElement',
    "if (event.key === 'Escape')",
    "if (event.key !== 'Tab') return",
    "document.addEventListener('keydown', handleKeyDown)",
    'previouslyFocused?.focus()',
  ], 'shared dialog focus lifecycle');

  assertIncludesAll(dashboard, [
    'useDialogFocus(showNewModal, closeNewSongDialog, newSongDialogRef)',
    'useDialogFocus(Boolean(deletingId), closeDeleteSongDialog, deleteSongDialogRef)',
    'Boolean(acceptedInviteWorkspaceName)',
    'useDialogFocus(Boolean(sheetSongId), closeSongSheetDialog, songSheetDialogRef)',
    'aria-labelledby="dashboard-new-song-title"',
    'role="alertdialog"',
    'aria-labelledby="dashboard-invite-accepted-title"',
    "role={sheetSongId ? 'dialog' : undefined}",
  ], 'dashboard dialogs');

  assertIncludesAll(feedback, [
    'useDialogFocus(open, closeFeedback, panelRef)',
    'aria-modal="true"',
    'aria-labelledby="beta-feedback-title"',
    'aria-describedby="beta-feedback-description"',
  ], 'feedback dialog');

  assertIncludesAll(versionPage, [
    'useDialogFocus(showShareModal, closeShareDialog, shareDialogRef)',
    'Boolean(actionModalCommentId || editingActionId)',
    'useDialogFocus(showUploadVersionModal, closeUploadVersionDialog, uploadVersionDialogRef)',
    'useDialogFocus(showVersionModal, closeVersionPickerDialog, versionPickerDialogRef)',
    'aria-labelledby="share-song-dialog-title"',
    'aria-labelledby="song-action-dialog-title"',
    'aria-labelledby="upload-version-dialog-title"',
    'aria-labelledby="version-picker-dialog-title"',
  ], 'song-version dialogs');
});

test('interactive surfaces preserve readable red text and coarse-pointer targets', () => {
  const globals = read('styles/globals.css');
  const marketing = read('public/marketing.html');
  const contrastSurfaces = [
    'app/dashboard/dashboard.module.css',
    'app/songs/[id]/versions/[versionId]/version.module.css',
    'app/listen/[songId]/listen.module.css',
    'app/listen/playlist/[id]/listen-playlist.module.css',
    'app/embed/playlist/[id]/embed.module.css',
    'app/settings/settings.module.css',
    'app/upload/upload.module.css',
    'app/playlists/playlists.module.css',
  ].map(read);
  const touchSurfaces = [
    ...contrastSurfaces,
    read('components/AccountMenu.module.css'),
    read('components/BetaFeedback.module.css'),
  ];

  assert.match(globals, /--color-primary-readable:\s*#ED4D3B;/u);
  assert.match(marketing, /--red-readable:\s*#ED4D3B;/u);
  assert.match(marketing, /--red-muted-readable:\s*#A05048;/u);
  assert.match(marketing, /--dune-readable:\s*#8F7E70;/u);
  assert.match(marketing, /\.feature-number\s*\{[^}]*color:\s*var\(--red-muted-readable\);/u);
  assert.doesNotMatch(marketing, /\.feature-number\s*\{[^}]*opacity:/u);
  assert.match(marketing, /\.footer-brand em\s*\{[^}]*color:\s*var\(--red-readable\);/u);
  assert.match(marketing, /\.footer-link\s*\{[^}]*color:\s*var\(--dune-readable\);/u);
  assert.match(marketing, /\.footer-copy\s*\{[^}]*color:\s*var\(--dune-readable\);/u);

  for (const source of contrastSurfaces) {
    assert.doesNotMatch(
      source,
      /(?:^|[;{]\s*)color:\s*#C0392B\b/mu,
      'normal-size text must not reuse the darker CTA red'
    );
  }

  for (const source of touchSurfaces) {
    assert.match(source, /@media\s*\(pointer:\s*coarse\)/u);
    assert.match(source, /(?:min-)?height:\s*44px/u);
  }
});

test('mobile authenticated navigation keeps every global destination reachable', () => {
  const shell = read('components/AppShell.tsx');
  const switcher = read('components/WorkspaceSwitcher.tsx');
  const accountMenu = read('components/AccountMenu.tsx');

  assert.match(shell, /variant="mobile"/u);
  assert.match(switcher, /<AccountMenu/u);
  assertIncludesAll(accountMenu, [
    'href="/dashboard"',
    'href="/playlists"',
    'href="/settings"',
    "'Sign out'",
    'aria-haspopup="menu"',
  ], 'mobile account menu');
});

test('settings-backed app shells preserve the canonical profile avatar', () => {
  const context = read('lib/settingsContext.tsx');
  const layouts = [
    'app/settings/layout.tsx',
    'app/playlists/layout.tsx',
    'app/upload/layout.tsx',
  ].map(read);

  assertIncludesAll(context, [
    'avatarUrl: string | null;',
    'setAvatarUrl(s.identity.avatarUrl ?? null);',
    'avatarUrl,',
  ], 'settings avatar context');

  for (const layout of layouts) {
    assert.match(layout, /avatarUrl=\{avatarUrl\}/u);
  }
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

test('mobile marketing description is present on first paint', () => {
  const marketing = read('public/marketing.html');
  const phoneStart = marketing.indexOf('@media (max-width: 600px), (max-width: 900px) and (max-height: 600px) {', marketing.indexOf('RESPONSIVE'));
  const phoneEnd = marketing.indexOf('@media (prefers-reduced-motion: reduce)', phoneStart);
  const reducedMotionStart = phoneEnd;
  const reducedMotionEnd = marketing.indexOf('/*', reducedMotionStart + 1);
  const phoneCss = marketing.slice(phoneStart, phoneEnd);
  const reducedMotionCss = marketing.slice(reducedMotionStart, reducedMotionEnd);

  assert.match(phoneCss, /\.cell-d\s*\{[^}]*opacity:\s*1;/u);
  assert.match(reducedMotionCss, /\.cell-d\s*\{[^}]*opacity:\s*1;/u);
});

test('mobile marketing leads with a generous centre-cropped image and attached copy', () => {
  const marketing = read('public/marketing.html');
  const phoneStart = marketing.indexOf('@media (max-width: 600px), (max-width: 900px) and (max-height: 600px) {', marketing.indexOf('RESPONSIVE'));
  const phoneEnd = marketing.indexOf('@media (prefers-reduced-motion: reduce)', phoneStart);
  const phoneCss = marketing.slice(phoneStart, phoneEnd);

  assert.match(phoneCss, /\.hero-bento\s*\{[^}]*grid-template-rows:\s*minmax\(280px, 52svh\) 1fr 1fr;/u);
  assert.match(phoneCss, /\.cell-a\s*\{[^}]*display:\s*none;/u);
  assert.match(phoneCss, /\.cell-d\s*\{[^}]*grid-column:\s*1 \/ 3;[^}]*grid-row:\s*1;[^}]*opacity:\s*1;/u);
  assert.match(phoneCss, /\.cell-b\s*\{[^}]*grid-row:\s*2;/u);
  assert.match(phoneCss, /\.cell-e\s*\{[^}]*grid-row:\s*3;/u);
  assert.match(phoneCss, /\.bento-cell-img\s*\{[^}]*background-position:\s*center;/u);
  assert.match(phoneCss, /\.bento-cell-text\s*\{[^}]*justify-content:\s*flex-end;/u);
  assert.match(marketing, /function crossfadeCell\(cellId\)\s*\{[^}]*getComputedStyle\(cell\)\.display === 'none'/u);
});

test('mobile marketing leads with the approved Song Room bento wordmark', () => {
  const marketing = read('public/marketing.html');
  const phoneStart = marketing.indexOf('@media (max-width: 600px), (max-width: 900px) and (max-height: 600px) {', marketing.indexOf('RESPONSIVE'));
  const phoneEnd = marketing.indexOf('@media (prefers-reduced-motion: reduce)', phoneStart);
  const reducedMotionEnd = marketing.indexOf('/*', phoneEnd + 1);
  const phoneCss = marketing.slice(phoneStart, phoneEnd);
  const reducedMotionCss = marketing.slice(phoneEnd, reducedMotionEnd);
  const leadCellStart = marketing.indexOf('<div class="bento-cell cell-d"');
  const leadCellEnd = marketing.indexOf('<div class="bento-cell cell-e"', leadCellStart);
  const leadCell = marketing.slice(leadCellStart, leadCellEnd);

  assertIncludesAll(phoneCss, [
    '.nav { display: none; }',
    '.hero-headline-wrap,',
    '.hero-tagline { display: none; }',
    '.cell-b,',
    '.cell-f { opacity: 1; }',
    '.bento-copy-desktop { display: none; }',
    '.bento-copy-mobile { display: block; }',
    'justify-content: flex-start;',
    'padding-top: calc(clamp(210px, 28svh, 260px) + 12px);',
    'padding-bottom: 12px;',
    '.bento-cell-kicker {',
    'margin-top: 12px;',
    'font-size: clamp(15px, 4vw, 18px);',
    'line-height: 1.2;',
    '.mobile-hero-wordmark {',
    'display: block;',
    'top: 44px;',
    'width: clamp(158px, 44vw, 190px);',
    'mobile-wordmark-draw 3.8s',
    '@media (max-width: 340px)',
    'width: 145px;',
  ], 'mobile Song Room hierarchy');
  assertIncludesAll(leadCell, [
    'class="mobile-hero-wordmark"',
    '<title id="mobile-wordmark-title">Song Room</title>',
    'stroke-dasharray="564"',
    'stroke-dasharray="925"',
    'class="bento-cell-text"',
    'class="bento-copy-mobile">A collaboration space for artists, bands and producers.',
  ], 'mobile Song Room wordmark');
  assert.doesNotMatch(leadCell, /Create Together/iu);
  assert.match(reducedMotionCss, /\.mobile-hero-wordmark path\s*\{[^}]*opacity:\s*1;[^}]*stroke-dashoffset:\s*0;/u);
});

test('mobile homepage keeps its primary CTA visible in the thumb zone', () => {
  const marketing = read('public/marketing.html');
  const phoneStart = marketing.indexOf('@media (max-width: 600px), (max-width: 900px) and (max-height: 600px) {', marketing.indexOf('RESPONSIVE'));
  const phoneEnd = marketing.indexOf('@media (prefers-reduced-motion: reduce)', phoneStart);
  const phoneCss = marketing.slice(phoneStart, phoneEnd);
  const heroCtaStart = marketing.indexOf('<div class="hero-cta-row" id="hero-cta">');
  const heroCtaEnd = marketing.indexOf('</div>', heroCtaStart);
  const heroCta = marketing.slice(heroCtaStart, heroCtaEnd);

  assert.match(phoneCss, /\.nav-cta\s*\{[^}]*display:\s*none;/u);
  assert.match(phoneCss, /\.hero\s*\{[^}]*height:\s*auto;[^}]*min-height:\s*100svh;/u);
  assert.match(phoneCss, /padding-bottom:\s*max\(28px, calc\(18px \+ env\(safe-area-inset-bottom\)\)\);/u);
  assert.match(phoneCss, /\.hero-content\s*\{[^}]*padding-left:\s*max\(20px, env\(safe-area-inset-left\)\);/u);
  assert.match(phoneCss, /\.hero-cta-row\s*\{[^}]*width:\s*100%;[^}]*justify-content:\s*center;/u);
  assert.match(phoneCss, /\.btn-primary\s*\{[^}]*min-height:\s*48px;[^}]*justify-content:\s*center;/u);
  assert.match(phoneCss, /\.btn-ghost\s*\{[^}]*min-height:\s*44px;[^}]*justify-content:\s*center;/u);
  assert.match(phoneCss, /\.desktop-hero-secondary\s*\{[^}]*display:\s*none;/u);
  assert.match(phoneCss, /\.mobile-login-cta\s*\{[^}]*display:\s*flex;/u);
  assertIncludesAll(heroCta, [
    'class="btn-primary" href="/signup/free"',
    'class="btn-ghost desktop-hero-secondary" href="#features"',
    'class="btn-ghost mobile-login-cta" href="/login"',
    'aria-label="Log in to your existing Song Room account"',
  ], 'mobile signup and login actions');
});

test('mobile marketing display headings use a clearer phone type scale', () => {
  const marketing = read('public/marketing.html');
  const mobileTypeStart = marketing.indexOf('/* Keep the condensed display voice clear on phone screens. */');
  const mobileTypeEnd = marketing.indexOf('</style>', mobileTypeStart);
  const mobileTypeCss = marketing.slice(mobileTypeStart, mobileTypeEnd);

  assert.ok(
    mobileTypeStart > marketing.indexOf('.showcase-heading {'),
    'the phone type override must follow the later showcase heading rule',
  );
  assertIncludesAll(mobileTypeCss, [
    '@media (max-width: 600px)',
    '.problem-heading',
    '.product-heading',
    '.feature-heading',
    '.showcase-heading',
    '.pricing-heading',
    '.final-heading',
    'font-family: var(--tbold)',
    'line-height: 0.84',
    'letter-spacing: 0.01em',
    'font-size: clamp(4.5rem, 22vw, 6rem)',
    'font-size: clamp(3.75rem, 18vw, 5rem)',
  ], 'mobile display typography');
  assert.doesNotMatch(mobileTypeCss, /font-family:\s*var\(--tblack\)/u);
});

test('marketing pricing follows the upgrade path and defaults to annual billing', () => {
  const marketing = read('public/marketing.html');
  const pricingStart = marketing.indexOf('<!-- ══ PRICING ══ -->');
  const pricingEnd = marketing.indexOf('<!-- ══ FINAL CTA ══ -->', pricingStart);
  const pricing = marketing.slice(pricingStart, pricingEnd);

  assertOrdered(pricing, [
    '<!-- Free -->',
    '<!-- Pro -->',
    '<!-- Studio -->',
  ], 'pricing tier sequence');
  assertIncludesAll(pricing, [
    'class="billing-opt" data-cycle="monthly" aria-pressed="false"',
    'class="billing-opt is-active" data-cycle="annual" aria-pressed="true"',
    'data-monthly="£9" data-annual="£7.17">£7.17</span>',
    'data-monthly="billed monthly" data-annual="£86 billed yearly · save £22">£86 billed yearly · save £22</span>',
    'data-monthly="£19" data-annual="£15.83">£15.83</span>',
    'data-monthly="billed monthly" data-annual="£190 billed yearly · save £38">£190 billed yearly · save £38</span>',
    'href="/signup/free">Start for free</a>',
    'data-signup-plan="pro" href="/signup/pro?billing=year">Choose Pro</a>',
    'data-signup-plan="studio" href="/signup/studio?billing=year">Choose Studio</a>',
  ], 'annual pricing defaults');
  assert.match(marketing, /opts\.forEach\([^;]+;\s*setCycle\('annual'\);/u);
  assert.match(marketing, /link\.setAttribute\('href', `\/signup\/\$\{plan\}\?billing=\$\{billing\}`\)/u);
  assert.doesNotMatch(marketing, /\.tier\.featured\s*\{[^}]*order:\s*-1;/u);
});

test('tier-aware signup preserves a strict plan choice through Google auth and checkout', () => {
  const signupPage = read('app/signup/[plan]/page.tsx');
  const signupIntent = read('lib/signupIntent.ts');
  const login = read('app/login/page.tsx');
  const middleware = read('middleware.ts');
  const upgrade = read('app/upgrade/page.tsx');
  const checkout = read('app/api/billing/checkout/route.ts');
  const planSettings = read('app/settings/plan/page.tsx');

  assertIncludesAll(signupPage, [
    'getSignupIntent(plan, billing)',
    'if (!intent) notFound()',
    "new URLSearchParams({ signupPlan: intent.plan })",
    "redirect(`/login?${loginParams.toString()}`)",
  ], 'public signup route');
  assertIncludesAll(signupIntent, [
    "value === 'free' || value === 'pro' || value === 'studio'",
    "return value === 'month' ? 'month' : 'year'",
    "source: 'pricing'",
    "new Set(['plan', 'billing', 'source', 'billingStatus'])",
    "source === 'checkout' && billingStatus !== 'cancelled'",
  ], 'signup intent allowlists');
  assertIncludesAll(login, [
    'getSignupIntent(signupPlanParam, signupBillingParam)',
    'buildSignupDestination(signupIntent)',
    'normalizePostLoginUpgradePath(normalized)',
    'inviteRedirect',
    '?? requestedRedirect',
    "callbackUrl.searchParams.set('next', redirectTo)",
  ], 'post-login plan and invite routing');
  assertIncludesAll(middleware, [
    "pathname.startsWith('/signup/')",
    "pathname === '/upgrade'",
    '`${pathname}${request.nextUrl.search}`',
  ], 'signup access and upgrade query preservation');
  assertIncludesAll(upgrade, [
    "fetch('/api/auth/bootstrap'",
    "payload?.identity?.membershipRole === 'owner'",
    "normalizeAccountPlan(payload?.workspace?.plan)",
    "normalizeBillingInterval(searchParams.get('billing'))",
    "searchParams.get('plan')",
    "router.replace(`/upgrade?${params.toString()}`, { scroll: false })",
    'Only the workspace owner can change the plan.',
    'Checkout was cancelled. Your plan has not changed, and your selection is still here.',
    'const isSelectedPlan = selectedPlan === plan.id && hasSelectedPlanJourney',
    "const returnToSettings = searchParams.get('returnTo') === 'settings'",
    "if (returnToSettings) router.push('/settings/plan')",
    "returnTo: returnToSettings ? 'settings' : undefined",
    'const showCurrentPlanTreatment = !hasSelectedPlanJourney',
    'const showPopularRecommendation = Boolean(plan.popular)',
    "const ctaVariant = hasSelectedPlanJourney && !isSelectedPlan",
    'showCurrentPlanTreatment ? styles.currentPlan',
    'isSelectedPlan ? styles.selected',
    'Your current plan',
    '{showPopularRecommendation && (',
    'styles[ctaVariant]',
  ], 'plan confirmation and owner boundary');
  assertIncludesAll(planSettings, [
    "router.push('/upgrade?returnTo=settings')",
  ], 'Plan & Billing upgrade origin');
  assertIncludesAll(checkout, [
    "resolved.identity.membershipRole !== 'owner'",
    'body.plan === \'studio\' ? \'studio\' : \'pro\'',
    "body.interval === 'year' ? 'year' : 'month'",
    "code === 'resource_missing' || message.includes('no such customer')",
    'stripe.customers.retrieve(stripeCustomerId)',
    "'deleted' in customer && customer.deleted",
    'if (!isMissingStripeCustomerError(customerError))',
    'stripeCustomerId = null',
    ".update({ stripe_customer_id: stripeCustomerId })",
    "const returnTo   = body.returnTo === 'settings' ? 'settings' : null",
    "if (returnTo === 'settings') cancelParams.set('returnTo', 'settings')",
    'cancel_url:  `${origin}/upgrade?${cancelParams.toString()}`',
    'billing_interval: interval',
  ], 'Stripe checkout selection and stale-customer recovery');
});

test('public playlist playback advances through its ordered tracks', () => {
  // The audio engine (auto-advance, media-session next, queue progression) lives
  // in the shared hook consumed by both public players.
  const engine = read('lib/usePlaylistPlayer.ts');

  assertIncludesAll(engine, [
    "ws.on('finish', () => { goNextRef.current(); })",
    "navigator.mediaSession.setActionHandler('nexttrack', () => goNextRef.current())",
    'const i = curRef.current + 1',
    'if (i < tracksRef.current.length) loadTrack(i)',
  ], 'public playlist sequence');

  // Both public surfaces must drive that shared engine rather than forking it.
  assert.ok(
    read('app/listen/playlist/[id]/page.tsx').includes('usePlaylistPlayer(id)'),
    'immersive listen player must use the shared usePlaylistPlayer engine',
  );
  assert.ok(
    read('app/embed/playlist/[id]/EmbedPlayer.tsx').includes('usePlaylistPlayer(id)'),
    'embed player must use the shared usePlaylistPlayer engine',
  );
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

test('mobile dashboard condenses song filters into the primary toolbar', () => {
  const dashboard = read('app/dashboard/page.tsx');
  const dashboardCss = read('app/dashboard/dashboard.module.css');

  assertIncludesAll(dashboard, [
    'id="song-filter-mobile"',
    'className={`${styles.sortSelect} ${styles.mobileSongFilterSelect}`}',
    'onChange={e => setSongFilter(e.target.value as typeof songFilter)}',
    '{option.label} · {option.count}',
    'className={`${styles.filterRow} ${styles.songFilterRow}`}',
    'aria-label="New song"',
  ], 'mobile song filter control');
  assert.match(dashboardCss, /\.mobileSongFilter\s*\{\s*display:\s*none;/u);
  assert.match(dashboardCss, /\.mobileSongFilter::after\s*\{[^}]*pointer-events:\s*none;/u);
  assert.match(
    dashboardCss,
    /@media \(max-width:\s*768px\)[\s\S]*?\.songsPanel \.headerRight\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\) auto;/u,
  );
  assert.match(
    dashboardCss,
    /@media \(max-width:\s*768px\)[\s\S]*?\.mobileSongFilter\s*\{\s*display:\s*block;/u,
  );
  assert.match(
    dashboardCss,
    /@media \(max-width:\s*768px\)[\s\S]*?\.songFilterRow\s*\{\s*display:\s*none;/u,
  );
});

test('mobile song rows consolidate management into one accessible edit sheet', () => {
  const dashboard = read('app/dashboard/page.tsx');
  const dashboardCss = read('app/dashboard/dashboard.module.css');

  assertIncludesAll(dashboard, [
    'const renderSongManagementActions = (',
    'className={styles.mobileEditButton}',
    'aria-label={`Edit ${song.title}`}',
    'aria-haspopup="dialog"',
    'aria-controls="dashboard-song-sheet"',
    'window.innerWidth <= 768',
    'id="dashboard-song-sheet"',
    'className={styles.bsArtworkCta}',
    'event.stopPropagation();',
    'id="sheet-song-title"',
    'void saveSheetTitle(sheetSong)',
    "sheetSong.imageUploading ? 'Uploading…' : 'Change cover image'",
    'className={styles.bsDangerZone}',
    'className={styles.bsDangerAction}',
    'setDeletingId(sheetSong.id)',
    'Delete song',
    'renderSongManagementActions(song, isInfoOpen, true, `song-info-${song.id}`)',
    'renderSongManagementActions(song, isOverlayOpen, false, `song-overlay-${song.id}`)',
  ], 'mobile song edit sheet');
  assert.match(
    dashboardCss,
    /@media \(max-width:\s*768px\)[\s\S]*?\.desktopSongAction[^}]*\{[^}]*display:\s*none !important;/u,
  );
  assert.match(
    dashboardCss,
    /@media \(max-width:\s*768px\)[\s\S]*?\.mobileEditButton\s*\{[^}]*display:\s*inline-flex !important;[^}]*width:\s*44px;[^}]*height:\s*44px;/u,
  );
  assert.match(
    dashboardCss,
    /\.bottomSheet\s*\{[^}]*max-height:\s*100svh;[^}]*overflow-y:\s*auto;/u,
  );
  assertOrdered(dashboard, [
    'className={styles.bsArtBlock}',
    'className={styles.bsArtworkCta}',
    'className={styles.bsHeader}',
    'className={styles.bsEditor}',
    'className={styles.bsDangerZone}',
  ], 'mobile song edit sheet hierarchy');
  assert.doesNotMatch(dashboard, /className=\{styles\.bsCta\}/u);
  assertIncludesAll(dashboardCss, [
    '.bsEditorInput',
    'min-height: 44px;',
    '.bsSecondaryAction',
    '.bsArtworkCta',
    'bottom: 16px;',
    'background: rgba(192,57,43,0.9);',
    '.bsDangerZone',
    '.bsDangerAction',
  ], 'mobile song edit sheet controls');
  assert.match(dashboardCss, /\.bsOverlay\s*\{[^}]*z-index:\s*1100;/u);
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
    "? 'Connecting...'",
    ": 'Continue with Google'",
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
