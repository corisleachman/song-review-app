import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const exports = {};
new Function('require', 'exports', ts.transpileModule(readFileSync(new URL('../lib/resumeNativeAudio.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(createRequire(import.meta.url), exports);
const { resumeNativeAudio } = exports;
class AudioFixture extends EventTarget {
  constructor({ failures = 1, code = 4, name = 'NotSupportedError', source = '/api/media/audio/version-a?song=song-a' } = {}) {
    super(); this.failures = failures; this.error = { code }; this.name = name; this.src = source;
    this.currentTime = 42; this.duration = 120; this.loop = true; this.volume = 0.3; this.playbackRate = 1.5;
    this.loads = 0; this.plays = 0;
  }
  getAttribute(name) { return name === 'src' ? this.src : null; }
  async play() { this.plays++; if (this.plays <= this.failures) throw new DOMException('Media request failed.', this.name); }
  load() { this.loads++; this.currentTime = 0; this.error = null; queueMicrotask(() => this.dispatchEvent(new Event('loadedmetadata'))); }
}
const options = { isCurrent: () => true, origin: 'https://app.invalid', timeoutMs: 50 };
test('native renewal: healthy playback keeps its loaded source and position', async () => {
  const audio = new AudioFixture({ failures: 0 }); const source = audio.src;
  await resumeNativeAudio(audio, options);
  assert.equal(audio.loads, 0); assert.equal(audio.src, source); assert.equal(audio.currentTime, 42);
});
test('native renewal: expired-media failure reauthorises once and restores playback position/settings', async () => {
  const audio = new AudioFixture();
  await resumeNativeAudio(audio, options);
  const source = new URL(audio.src);
  assert.equal(source.origin, options.origin); assert.equal(source.pathname, '/api/media/audio/version-a');
  assert.equal(source.searchParams.get('song'), 'song-a'); assert.ok(source.searchParams.get('renew'));
  assert.equal(audio.plays, 2); assert.equal(audio.loads, 1); assert.equal(audio.currentTime, 42);
  assert.equal(audio.loop, true); assert.equal(audio.volume, 0.3); assert.equal(audio.playbackRate, 1.5);
  assert.equal(audio.crossOrigin, 'anonymous');
});
for (const name of ['NotAllowedError', 'AbortError']) {
  test(`native renewal: ${name} doesn't reload or retry`, async () => {
    const audio = new AudioFixture({ name });
    await assert.rejects(resumeNativeAudio(audio, options), { name });
    assert.equal(audio.loads, 0); assert.equal(audio.plays, 1);
  });
}
test('native renewal: failed retry is surfaced without a loop', async () => {
  const audio = new AudioFixture({ failures: 2 });
  await assert.rejects(resumeNativeAudio(audio, options));
  assert.equal(audio.loads, 1); assert.equal(audio.plays, 2);
});
test('native renewal: cannot refresh a foreign Storage URL', async () => {
  const audio = new AudioFixture({ source: 'https://storage.invalid/signed?token=old' });
  await assert.rejects(resumeNativeAudio(audio, options)); assert.equal(audio.loads, 0);
});
test('native renewal: song change before retry cannot overwrite the new source', async () => {
  const audio = new AudioFixture(); let current = true;
  audio.play = async () => { audio.plays++; current = false; throw new DOMException('Failed', 'NotSupportedError'); };
  await assert.rejects(resumeNativeAudio(audio, { ...options, isCurrent: () => current }), { name: 'AbortError' });
  assert.equal(audio.loads, 0);
});
test('native renewal: song change during metadata load prevents stale resume', async () => {
  const audio = new AudioFixture(); let current = true;
  audio.load = () => { audio.loads++; current = false; queueMicrotask(() => audio.dispatchEvent(new Event('loadedmetadata'))); };
  await assert.rejects(resumeNativeAudio(audio, { ...options, isCurrent: () => current }), { name: 'AbortError' });
  assert.equal(audio.plays, 1);
});
test('native renewal: unavailable replacement times out instead of hanging', async () => {
  const audio = new AudioFixture(); audio.load = () => { audio.loads++; };
  await assert.rejects(resumeNativeAudio(audio, { ...options, timeoutMs: 5 }), /could not be renewed/);
  assert.equal(audio.plays, 1);
});
test('native renewal: seeks within a shortened replacement duration', async () => {
  const audio = new AudioFixture(); audio.duration = 20;
  await resumeNativeAudio(audio, options); assert.equal(audio.currentTime, 20);
});
