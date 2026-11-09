import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
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

const thread = {
  origin: 'https://www.song-room.live',
  link: 'https://www.song-room.live/songs/song-a/versions/version-b?thread=t1',
  songTitle: 'Rebel Lovers',
  artworkUrl: null,
  versionNumber: 4,
  versionLabel: 'Rough mix',
  timestampSeconds: 84.4,
  actorName: 'Alex',
  commentBody: 'The snare is too loud here.',
  isReply: false,
  parent: null,
  workspaceName: 'Polite Rebels',
};

test('comment email: subject, eyebrow and button follow the standard', () => {
  const email = templates.buildThreadEmail(thread);
  assert.equal(email.subject, 'Rebel Lovers: Alex commented at 1:24');
  for (const part of ['New comment', 'Alex commented on Rebel Lovers at 1:24.', 'Version 4 · Rough mix', 'The snare is too loud here.', 'Reply to Alex', 'Polite Rebels', 'email-artwork-fallback.png']) {
    assert.ok(email.html.includes(part), `html has ${part}`);
  }
  assert.ok(email.text.includes(thread.link));
  assert.ok(email.html.includes('<body class="body"'), 'Gmail dark-mode protection applies');
});

test('reply email: shows what was replied to and opens the thread', () => {
  const email = templates.buildThreadEmail({ ...thread, isReply: true, actorName: 'Coris', commentBody: 'Pulled it back 2dB.', parent: { author: 'Alex', body: 'The snare is too loud here.' } });
  assert.equal(email.subject, 'Rebel Lovers: Coris replied at 1:24');
  for (const part of ['New reply', 'Coris replied to Alex on Rebel Lovers at 1:24.', 'Alex wrote', 'The snare is too loud here.', 'Coris replied', 'Pulled it back 2dB.', 'Open the thread']) {
    assert.ok(email.html.includes(part), `html has ${part}`);
  }
  assert.ok(email.text.includes('Alex wrote:'));
});

test('thread email: escapes user text, trims long comments and handles missing values', () => {
  const email = templates.buildThreadEmail({ ...thread, songTitle: '<b>x</b>', actorName: '', commentBody: 'y'.repeat(2000), versionNumber: null, versionLabel: null, timestampSeconds: 3725 });
  assert.ok(!email.html.includes('<b>x</b>'));
  assert.ok(email.html.includes('&lt;b&gt;x&lt;/b&gt;'));
  assert.ok(email.subject.startsWith('<b>x</b>: Someone commented at 1:02:05'));
  assert.ok(email.html.includes('Read the full comment in Song Room'));
  assert.ok(!email.html.includes('y'.repeat(700)));
  assert.ok(email.html.includes('This version'));
  assert.ok(email.preheader.length <= 140);
});

test('invite email: says Song Room, not the old name, and has no settings link', () => {
  const email = templates.buildInviteEmail({ origin: 'https://www.song-room.live', link: 'https://www.song-room.live/invite/tok', inviterName: 'Coris', workspaceName: 'Polite Rebels' });
  assert.equal(email.subject, 'Coris invited you to Polite Rebels on Song Room');
  for (const part of ['You’re invited', 'Coris invited you to join Polite Rebels on Song Room.', 'Join Polite Rebels', 'https://www.song-room.live/invite/tok']) {
    assert.ok(email.html.includes(part), `html has ${part}`);
  }
  assert.ok(!/Song Review/.test(email.html + email.text));
  assert.ok(!email.html.includes('Notification settings'));
  assert.ok(email.text.includes('Join Polite Rebels: https://www.song-room.live/invite/tok'));
});

test('auth templates keep the tested Supabase link contracts', () => {
  const confirm = templates.buildAuthTemplate('confirm_signup');
  assert.ok(confirm.html.includes('href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup"'));
  assert.ok(templates.buildAuthTemplate('reset_password').html.includes('href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery"'));
  const code = templates.buildAuthTemplate('reauthentication');
  assert.equal(code.subject, '{{ .Token }} is your Song Room verification code');
  assert.ok(code.html.includes('{{ .Token }}'));
  assert.ok(!code.html.includes('class="btnt"'), 'code email has no button');
  const changed = templates.buildAuthTemplate('password_changed');
  assert.equal(changed.subject, 'Your Song Room password was changed');
  assert.ok(changed.html.includes('{{ .Email }}'));
  assert.ok(changed.html.includes('hello@song-room.live'));
  for (const kind of ['confirm_signup', 'reset_password', 'reauthentication', 'password_changed']) {
    const { html } = templates.buildAuthTemplate(kind);
    assert.ok(!html.includes('__AUTH_') && !html.includes('song-room.invalid'), `${kind} has no unfilled slot`);
    assert.ok(!html.includes('Notification settings'));
    assert.ok(!/ConfirmationURL/.test(html));
  }
});

test('committed Supabase template files match the builder', () => {
  for (const kind of ['confirm_signup', 'reset_password', 'reauthentication', 'password_changed']) {
    const file = readFileSync(new URL(`../supabase/auth-email-templates/${kind}.html`, import.meta.url), 'utf8');
    assert.equal(file, `${templates.buildAuthTemplate(kind).html}\n`, `${kind}.html is stale: run node scripts/build-auth-email-templates.mjs`);
  }
});
