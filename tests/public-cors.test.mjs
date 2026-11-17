import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parseAllowedOrigins, publicCorsHeaders } from '../lib/publicCors.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('no allow list means no CORS headers at all', () => {
  assert.deepEqual(publicCorsHeaders('https://politerebels.com', undefined), {});
  assert.deepEqual(publicCorsHeaders('https://politerebels.com', ''), {});
});

test('an allowed origin is echoed back with Vary: Origin', () => {
  const list = 'https://politerebels.com, https://www.politerebels.com/';
  assert.deepEqual(publicCorsHeaders('https://www.politerebels.com', list), {
    Vary: 'Origin',
    'Access-Control-Allow-Origin': 'https://www.politerebels.com',
  });
});

test('other origins, missing origins and wildcards are refused', () => {
  const list = 'https://politerebels.com';
  assert.deepEqual(publicCorsHeaders('https://evil.example', list), { Vary: 'Origin' });
  assert.deepEqual(publicCorsHeaders(null, list), { Vary: 'Origin' });
  assert.equal(parseAllowedOrigins('*, https://ok.example/path, notaurl').size, 0);
});

test('audio CORS is limited to public song or playlist plays', () => {
  const source = readFileSync(path.join(root, 'app/api/media/audio/[versionId]/route.ts'), 'utf8');
  assert.match(source, /songContext !== null \|\| playlistContext !== null \? publicCorsHeaders\(/);
});

test('public playlist responses carry the CORS headers', () => {
  const source = readFileSync(path.join(root, 'app/api/public/playlist/[id]/route.ts'), 'utf8');
  assert.match(source, /\.\.\.publicCorsHeaders\(req\.headers\.get\('origin'\)\)/);
});
