import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import ts from 'typescript';

const exports = {};
new Function('require', 'exports', ts.transpileModule(readFileSync(new URL('../lib/artworkAccess.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(createRequire(import.meta.url), exports);
const { signArtworkAccess, readArtworkAccess, artworkStoragePath, validArtworkPath } = exports;
const key = 'artwork-test-signing-key-with-at-least-32-characters';
const now = 1800000030;
const input = { kind: 'song', id: 'song-a', path: 'song-a-123.jpg' };

test('artwork: capability is bounded, reusable within a minute and expires', () => {
  const token = signArtworkAccess(input, key, now);
  const access = readArtworkAccess(token, key, now);
  assert.equal(access.path, input.path);
  assert.equal(access.expiresAt - access.issuedAt, 600);
  assert.equal(signArtworkAccess(input, key, now + 1), token);
  assert.equal(readArtworkAccess(token, key, access.expiresAt), null);
  assert.equal(readArtworkAccess(token, key, access.expiresAt, true).id, input.id);
});
test('artwork: tampering, another key and internal-request signature cannot authorise media', () => {
  const token = signArtworkAccess(input, key, now);
  const [payload] = token.split('.');
  const changed = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url')), path: 'song-b-123.jpg' })).toString('base64url');
  assert.equal(readArtworkAccess(`${changed}.${token.split('.')[1]}`, key, now), null);
  assert.equal(readArtworkAccess(token, `${key}-other`, now), null);
  const otherContext = createHmac('sha256', key).update(`song-room-internal-request-v1.${payload}`).digest('base64url');
  assert.equal(readArtworkAccess(`${payload}.${otherContext}`, key, now), null);
});
for (const value of [null, '', 'a.b.c', ' '.repeat(100), 'x'.repeat(5000), 'a.!!!!']) {
  test(`artwork: invalid token is refused (${String(value).length} characters)`, () => {
    assert.equal(readArtworkAccess(value, key, now), null);
  });
}
for (const path of ['song-b-123.jpg', '../song-a-123.jpg', 'song-a-123.svg', 'song-a-%2e%2e.jpg', 'song-a-123.jpg?token=x', 'song-a-123.jpg#x', 'song-a-123/../file.jpg']) {
  test(`artwork: refuses unsafe or cross-resource path ${path}`, () => {
    assert.equal(validArtworkPath('song', 'song-a', path), false);
    assert.throws(() => signArtworkAccess({ ...input, path }, key, now));
  });
}
test('artwork: only canonical same-project legacy URLs map to a Storage object', () => {
  const url = 'https://storage.invalid/storage/v1/object/public/song-images/song-a-123.jpg';
  assert.equal(artworkStoragePath('song', 'song-a', url, 'https://storage.invalid'), input.path);
  assert.equal(artworkStoragePath('song', 'song-a', url.replace('storage.invalid', 'other.invalid'), 'https://storage.invalid'), null);
  assert.equal(artworkStoragePath('song', 'song-a', `${url}?token=bad`, 'https://storage.invalid'), null);
  assert.equal(artworkStoragePath('song', 'song-b', url, 'https://storage.invalid'), null);
});
for (const [kind, path] of [['playlist', 'playlist-list-a-123.jpg'], ['workspace', 'workspace-images/workspace-a-123.webp']]) {
  test(`artwork: validates ${kind} object ownership prefixes`, () => {
    const id = kind === 'playlist' ? 'list-a' : 'workspace-a';
    assert.equal(validArtworkPath(kind, id, path), true);
    assert.equal(validArtworkPath(kind, 'another', path), false);
  });
}
test('artwork: rejects ambiguous or resource-inappropriate public context', () => {
  assert.throws(() => signArtworkAccess({ ...input, publicSong: true, playlistId: 'list-a' }, key, now));
  assert.throws(() => signArtworkAccess({ ...input, publicPlaylist: true }, key, now));
  assert.throws(() => signArtworkAccess({ kind: 'workspace', id: 'workspace-a', path: 'workspace-images/workspace-a-123.png', publicSong: true }, key, now));
});
