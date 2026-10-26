import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';

const publicRoot = new URL('../public/', import.meta.url);
const html = readFileSync(new URL('marketing.html', publicRoot), 'utf8');
const fonts = readFileSync(new URL('marketing-assets/dm-sans.css', publicRoot), 'utf8');

test('homepage media and fonts resolve to deployment-managed files', () => {
  assert.doesNotMatch(html + fonts, /https:\/\/(?:raw\.githubusercontent\.com|corisleachman\.github\.io|fonts\.googleapis\.com|fonts\.gstatic\.com)/u);
  const references = new Set((html + fonts).match(/\/marketing-assets\/[a-z0-9._-]+/gu));
  for (const reference of references) {
    assert.ok(existsSync(new URL(reference.slice(1), publicRoot)), `Missing asset: ${reference}`);
  }
  // Slideshow paths are constructed at runtime, so check them separately.
  for (const n of [7, 8, 11, 13, 14, 15, 16, 17, 18, 20, 22, 23, 24, 25]) {
    assert.ok(existsSync(new URL(`marketing-assets/tsr${n}.jpeg`, publicRoot)));
  }
});

test('bundled media matches its recorded source snapshot', () => {
  const assets = JSON.parse(readFileSync(new URL('marketing-assets/manifest.json', publicRoot), 'utf8'));
  assert.equal(new Set(assets.map(({ path }) => path)).size, assets.length);
  for (const asset of assets) {
    const bytes = readFileSync(new URL(asset.path.slice(1), publicRoot));
    assert.equal(bytes.length, asset.bytes, asset.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.path);
  }
});
