import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(path) {
  const exports = {};
  new Function('require', 'exports', ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText)(require, exports);
  return exports;
}

const templates = load('../lib/emailTemplates.ts');
const recipients = load('../lib/versionUploadRecipients.ts');
const artwork = load('../lib/emailArtworkAccess.ts');
const appArtwork = load('../lib/artworkAccess.ts');

const base = {
  origin: 'https://www.song-room.live',
  link: 'https://www.song-room.live/songs/song-a/versions/version-b',
  songTitle: 'Rebel Lovers',
  artworkUrl: 'https://www.song-room.live/api/media/email-artwork?access=abc',
  versionNumber: 5,
  versionLabel: 'Final mix',
  notes: 'Pulled the sub back.',
  uploaderName: 'Coris',
  uploadedAt: new Date('2026-11-09T08:13:00Z'),
  status: 'mixing',
  previous: { versionNumber: 4, uploadedAt: new Date('2026-11-06T10:00:00Z') },
  workspaceName: 'Polite Rebels',
};

test('version email: names the song, version, uploader and workspace', () => {
  const email = templates.buildVersionUploadEmail(base);
  assert.equal(email.subject, 'Rebel Lovers: Version 5 is ready to hear');
  for (const part of ['Rebel Lovers', 'Version 5 · Final mix', 'Coris', 'Polite Rebels', 'Mixing', 'Version 4 · 6 Nov', 'Pulled the sub back.', 'Listen to Version 5']) {
    assert.ok(email.html.includes(part), `html has ${part}`);
    assert.ok(email.text.includes(part), `text has ${part}`);
  }
  assert.ok(email.html.includes(base.artworkUrl.replace(/&/g, '&amp;')));
  assert.ok(email.html.includes('background-color:#C0392B;background-image:linear-gradient(#C0392B,#C0392B)'), 'primary button is brand red, painted so Gmail keeps it');
  assert.ok(!/every version/i.test(email.html), 'no link to a page that does not exist');
  assert.ok(email.text.includes(base.link));
});

test('version email: user-supplied fields are escaped', () => {
  const email = templates.buildVersionUploadEmail({
    ...base,
    songTitle: '<script>alert(1)</script>',
    versionLabel: '"><img src=x onerror=alert(1)>',
    notes: '<b>bold</b>',
    uploaderName: 'A & B',
    workspaceName: "O'Neil <Band>",
  });
  assert.ok(!email.html.includes('<script>'));
  assert.ok(!email.html.includes('<img src=x'));
  assert.ok(!email.html.includes('<b>bold</b>'));
  assert.ok(email.html.includes('A &amp; B'));
  assert.ok(email.html.includes('O&#39;Neil &lt;Band&gt;'));
});

test('version email: optional fields disappear and missing artwork uses the Song Room tile', () => {
  const email = templates.buildVersionUploadEmail({ ...base, artworkUrl: null, versionLabel: null, notes: null, status: null, previous: null });
  assert.ok(email.html.includes('/marketing-assets/email-artwork-fallback.png" width="132" height="132" alt="RL"'));
  assert.ok(!email.html.includes('Notes from'));
  assert.ok(!email.html.includes('Previous'));
  assert.ok(!email.html.includes('Status'));
  assert.ok(email.html.includes('Version 5</span>'));
  assert.ok(!email.text.includes('Notes from'));
});

test('version email: long notes are cut with a pointer to the app', () => {
  const email = templates.buildVersionUploadEmail({ ...base, notes: 'x'.repeat(1000) });
  assert.ok(email.html.includes('Read the full notes in Song Room'));
  assert.ok(!email.html.includes('x'.repeat(300)));
  assert.ok(email.preheader.length <= 140);
});

test('version email: blank values fall back to readable defaults', () => {
  const email = templates.buildVersionUploadEmail({ ...base, songTitle: '  ', uploaderName: '', workspaceName: '' });
  assert.equal(email.subject, 'Untitled song: Version 5 is ready to hear');
  assert.ok(email.html.includes('A collaborator uploaded a new version of Untitled song.'));
  assert.equal(templates.songInitials('the long way home'), 'TL');
  assert.equal(templates.songInitials('— 99 —'), '9');
});

const members = [
  { userId: 'owner', email: 'o@x.test', role: 'owner' },
  { userId: 'alex', email: 'a@x.test', role: 'member' },
  { userId: 'sam', email: 's@x.test', role: 'admin' },
];
const ids = list => list.map(member => member.userId).sort();

test('version recipients: the uploader is never emailed about their own upload', () => {
  assert.deepEqual(ids(recipients.selectVersionUploadRecipients(members, 'alex', 'all_members')), ['owner', 'sam']);
  assert.deepEqual(ids(recipients.selectVersionUploadRecipients(members, null, 'all_members')), ['alex', 'owner', 'sam']);
});

test('version recipients: owner-only workspaces match comment notifications', () => {
  assert.deepEqual(ids(recipients.selectVersionUploadRecipients(members, 'alex', 'owner_only')), ['owner']);
  assert.deepEqual(ids(recipients.selectVersionUploadRecipients(members, 'owner', 'owner_only')), ['alex', 'sam']);
  assert.deepEqual(recipients.selectVersionUploadRecipients(members.slice(1), 'alex', 'owner_only'), []);
});

const key = 'artwork-test-signing-key-with-at-least-32-characters';
const audience = 'https://storage.invalid';
const now = 1800000030;
const input = { songId: 'song-a', path: 'song-a-123.jpg' };

test('email artwork: lasts 30 days, then reads as expired', () => {
  const token = artwork.signEmailArtworkAccess(input, key, now, audience);
  const access = artwork.readEmailArtworkAccess(token, key, now, audience);
  assert.equal(access.path, input.path);
  assert.equal(access.expired, false);
  assert.equal(access.expiresAt - access.issuedAt, 30 * 24 * 60 * 60);
  assert.equal(artwork.readEmailArtworkAccess(token, key, access.expiresAt - 1, audience).expired, false);
  assert.equal(artwork.readEmailArtworkAccess(token, key, access.expiresAt, audience).expired, true);
});

test('email artwork: tampering, other keys, other projects and other contexts are refused', () => {
  const token = artwork.signEmailArtworkAccess(input, key, now, audience);
  const [payload, signature] = token.split('.');
  const changed = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url')), path: 'song-b-123.jpg' })).toString('base64url');
  assert.equal(artwork.readEmailArtworkAccess(`${changed}.${signature}`, key, now, audience), null);
  assert.equal(artwork.readEmailArtworkAccess(token, `${key}-other`, now, audience), null);
  assert.equal(artwork.readEmailArtworkAccess(token, key, now, 'https://other.invalid'), null);
  const appContext = createHmac('sha256', key).update(`song-room-artwork-v1.${payload}`).digest('base64url');
  assert.equal(artwork.readEmailArtworkAccess(`${payload}.${appContext}`, key, now, audience), null);
  // An email token cannot be used as an app artwork token either.
  assert.equal(appArtwork.readArtworkAccess(token, key, now, true, audience), null);
  for (const value of [null, '', 'a.b.c', 'x'.repeat(5000), 'a.!!!!']) {
    assert.equal(artwork.readEmailArtworkAccess(value, key, now, audience), null);
  }
});

test('email artwork: only the song\'s own raster object can be signed', () => {
  for (const path of ['song-b-123.jpg', '../song-a-123.jpg', 'song-a-123.svg', 'song-a-%2e%2e.jpg', 'song-a-1.jpg?x=1', 'song-a-123/../f.jpg']) {
    assert.throws(() => artwork.signEmailArtworkAccess({ ...input, path }, key, now, audience));
  }
});

test('version email: long song titles step down in size', () => {
  assert.deepEqual(templates.songTitleSize('Rebel Lovers'), { px: 48, className: 'song-l' });
  assert.deepEqual(templates.songTitleSize('Midnight Drive Through Town'), { px: 36, className: 'song-m' });
  assert.deepEqual(templates.songTitleSize('The Ballad Of Everything We Never Said Out Loud'), { px: 28, className: 'song-s' });
  const email = templates.buildVersionUploadEmail({ ...base, songTitle: 'The Ballad Of Everything We Never Said Out Loud' });
  assert.ok(email.html.includes('class="song-s" style="font-family:'));
  assert.ok(email.html.includes('font-size:28px;line-height:.92'));
});

test('version email: survives Gmail iPhone dark mode inversion', () => {
  const email = templates.buildVersionUploadEmail(base);
  assert.ok(email.html.includes('<body class="body"'), 'Gmail selector hook');
  assert.ok(email.html.includes('u + .body .gm-s{background:#000;mix-blend-mode:screen}'));
  assert.ok(email.html.includes('u + .body .gm-d{background:#000;mix-blend-mode:difference}'));
  assert.ok(email.html.includes('linear-gradient(#0E0A0A,#0E0A0A)'), 'canvas painted as an image');
  assert.ok(email.html.includes('linear-gradient(#1C1515,#1C1515)'), 'card painted as an image');
  assert.ok(!/background:#(?!000)/.test(email.html), 'no plain background colour left for Gmail to invert');
  assert.ok(email.html.includes('<span class="gm-d" style="display:block;">REBEL LOVERS') || email.html.includes('<span class="gm-d" style="display:block;">Rebel Lovers'), 'song title is locked');
});
