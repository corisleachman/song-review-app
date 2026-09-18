import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../app/songs/[id]/versions/[versionId]/page.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const nodes = [];
function visit(node) {
  nodes.push(node);
  ts.forEachChild(node, visit);
}
visit(ast);

// Execute the real page callbacks, not a separately maintained playback model.
// Media, timers, state updates and module import are deterministic test boundaries.
function callback(name) {
  const node = nodes.find(n => ts.isVariableDeclaration(n) && n.name.getText(ast) === name);
  assert.ok(node, `Missing callback ${name}`);
  return node.initializer.arguments[0].getText(ast);
}
const button = nodes.find(n => ts.isJsxOpeningElement(n) && n.tagName.getText(ast) === 'button'
  && n.attributes.properties.some(a => a.name?.getText(ast) === 'className'
    && a.initializer?.getText(ast) === '{styles.heroPlayBtn}'));
assert.ok(button, 'Missing hero Play button');
assert.equal(button.attributes.properties.find(a => a.name?.getText(ast) === 'onClick')
  .initializer.expression.getText(ast), 'handlePlaybackToggle');
const disabled = button.attributes.properties.find(a => a.name?.getText(ast) === 'disabled')
  .initializer.expression.getText(ast);
const lifecycle = nodes.find(n => ts.isCallExpression(n) && n.expression.getText(ast) === 'useEffect'
  && n.arguments[1]?.getText(ast) === '[audioUrl, versionId, waveReloadNonce, loading]');
assert.ok(lifecycle, 'Missing waveform lifecycle effect');
const keyboard = nodes.find(n => ts.isCallExpression(n) && n.expression.getText(ast) === 'useEffect'
  && n.arguments[1]?.getText(ast) === '[handlePlaybackToggle]');
assert.ok(keyboard, 'Missing shared keyboard playback handler');
const init = callback('initWaveSurfer');
assert.equal(init.split("await import('wavesurfer.js')").length, 2);
const code = [
  ...['clearWaveTimers', 'retryWaveform', 'attachNativeAudioEvents', 'playNativeAudioFallback',
    'reportPlaybackFailure', 'handlePlaybackToggle', 'stopPlayback', 'pauseForComment']
    .map(name => `globalThis.${name} = ${callback(name)};`),
  `globalThis.initWaveSurfer = ${init.replace("await import('wavesurfer.js')", 'await loadWaveSurferModule()')};`,
  `globalThis.lifecycle = ${lifecycle.arguments[0].getText(ast)};`,
  `globalThis.keyboard = ${keyboard.arguments[0].getText(ast)};`,
  `globalThis.isDisabled = () => ${disabled};`,
].join('\n');
const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
const flush = async () => {
  for (let turn = 0; turn < 8; turn++) await Promise.resolve();
};

function harness() {
  const gate = deferred();
  const timers = new Map();
  let nextTimer = 0;
  const instances = [];
  const native = [];
  const logs = [];
  const keys = new Map();
  const refs = {};
  for (const name of source.matchAll(/\b(\w+Ref)\b/g)) refs[name[1]] = { current: null };
  const ctx = {
    ...refs, console, Error,
    navigator: { userAgent: 'Desktop Chrome' },
    audioUrl: 'https://example.invalid/fixture.mp3', versionId: 'version-one', loading: false,
    waveReloadNonce: 0, isReady: false, isPlaying: false, waveErr: null, isRetryingWave: false,
    currentTime: 0, duration: 0,
    logVersionInit: (event, details) => logs.push({ event, details }),
    stopReactiveDrawing() {}, drawReactiveIdle() {},
    setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    loadWaveSurferModule: () => gate.promise,
  };
  Object.assign(ctx, {
    waveLoadIdRef: { current: 0 }, waveAutoRetryUsedRef: { current: false },
    audioLoadedRef: { current: false }, playRequestedRef: { current: false },
    nativeAudioFallbackRef: { current: false },
    waveformRef: { current: { isConnected: true } },
  });
  ctx.window = {
    innerWidth: 1440, setTimeout: ctx.setTimeout, clearTimeout: ctx.clearTimeout,
    addEventListener: (name, fn) => keys.set(name, fn), removeEventListener: name => keys.delete(name),
  };
  for (const name of ['IsReady', 'IsPlaying', 'WaveErr', 'IsRetryingWave', 'Duration', 'CurrentTime', 'WaveReloadNonce']) {
    const key = name[0].toLowerCase() + name.slice(1);
    ctx[`set${name}`] = value => { ctx[key] = typeof value === 'function' ? value(ctx[key]) : value; };
  }

  function media() {
    const listeners = new Map();
    return {
      paused: true, src: '', duration: 123, currentTime: 0, playCalls: 0,
      playError: null, loadCalls: 0,
      addEventListener(name, fn) { const list = listeners.get(name) || []; list.push(fn); listeners.set(name, list); },
      removeEventListener(name, fn) { listeners.set(name, (listeners.get(name) || []).filter(f => f !== fn)); },
      emit(name) { for (const fn of [...(listeners.get(name) || [])]) fn(); },
      async play() {
        this.playCalls++;
        if (this.playError) throw this.playError;
        this.paused = false; this.emit('play');
      },
      pause() { this.paused = true; this.emit('pause'); },
      load() { this.loadCalls++; },
      removeAttribute(name) { if (name === 'src') this.src = ''; },
    };
  }
  ctx.Audio = function Audio() { const audio = media(); native.push(audio); return audio; };
  const waveModule = { default: { create() {
    const listeners = new Map();
    const audio = media();
    const loadGate = deferred();
    const ws = {
      audio, loadGate, loadCalls: 0, playCalls: 0, destroyed: false, playError: null,
      on(name, fn) { const list = listeners.get(name) || []; list.push(fn); listeners.set(name, list); },
      emit(name, ...args) { for (const fn of [...(listeners.get(name) || [])]) fn(...args); },
      getMediaElement: () => audio,
      load() { ws.loadCalls++; return loadGate.promise; },
      isPlaying: () => !audio.paused,
      async play() {
        ws.playCalls++;
        if (ws.playError) throw ws.playError;
        await audio.play(); ws.emit('play');
      },
      pause() { audio.pause(); ws.emit('pause'); },
      async playPause() { if (audio.paused) await ws.play(); else ws.pause(); },
      destroy() { ws.destroyed = true; },
      ready() { ws.emit('ready', 123); loadGate.resolve(); },
    };
    instances.push(ws); return ws;
  } } };
  vm.createContext(ctx);
  vm.runInContext(js, ctx);
  const fire = ms => {
    const timer = [...timers].find(([, value]) => value.ms === ms);
    assert.ok(timer, `Missing ${ms}ms timer`);
    timers.delete(timer[0]); timer[1].fn();
  };
  let cleanup;
  const mount = () => { cleanup = ctx.lifecycle(); };
  const unmount = () => { cleanup?.(); cleanup = null; };
  const rerender = () => { unmount(); mount(); fire(80); };
  const initialize = async () => { mount(); fire(80); gate.resolve(waveModule); await flush(); };
  return { ctx, timers, instances, native, logs, keys, gate, waveModule, fire, mount, unmount,
    rerender, initialize, press: () => ctx.handlePlaybackToggle(),
    resolveImport: async () => { gate.resolve(waveModule); await flush(); } };
}

test('idle version initializes without downloading audio or arming a load deadline', async () => {
  const h = harness(); await h.initialize();
  assert.equal(h.instances[0].loadCalls, 0);
  assert.equal(h.timers.size, 0);
  assert.equal(h.ctx.waveErr, null);
});

test('first Play before debounce or during delayed import is resumed exactly once', async () => {
  for (const duringImport of [false, true]) {
    const h = harness(); h.mount();
    if (duringImport) h.fire(80);
    assert.equal(h.ctx.isDisabled(), false);
    h.press(); h.press();
    assert.equal(h.ctx.isPlaying, true);
    assert.equal(h.ctx.isDisabled(), true);
    if (!duringImport) h.fire(80);
    await h.resolveImport();
    const ws = h.instances[0];
    assert.equal(ws.loadCalls, 1);
    assert.equal(ws.playCalls, 0);
    ws.ready(); await flush();
    assert.equal(ws.playCalls, 1);
    assert.equal(h.ctx.isReady, true);
    assert.equal(h.ctx.isDisabled(), false);
    assert.equal(h.timers.size, 0);
  }
});

test('initialized first Play waits for ready, then supports pause and resume', async () => {
  const h = harness(); await h.initialize(); h.press(); h.press();
  const ws = h.instances[0]; assert.equal(ws.loadCalls, 1);
  ws.ready(); await flush(); assert.equal(ws.playCalls, 1);
  h.press(); assert.equal(h.ctx.isPlaying, false);
  h.press(); await flush(); assert.equal(ws.playCalls, 2);
  assert.equal(ws.loadCalls, 1);
});

test('load timeout permits one automatic retry, resumes loading and leaves a stable exhausted error', async () => {
  const h = harness(); await h.initialize(); h.press();
  h.fire(12000); assert.equal(h.ctx.isRetryingWave, true);
  // Late ready from the failed attempt must not play or cancel its retry.
  h.instances[0].ready(); await flush(); assert.equal(h.instances[0].playCalls, 0);
  h.fire(350); h.rerender(); await flush();
  assert.equal(h.instances[0].destroyed, true);
  assert.equal(h.instances[1].loadCalls, 1);
  assert.equal(h.ctx.isPlaying, true);
  assert.equal(h.ctx.isDisabled(), true);
  assert.equal(h.ctx.isRetryingWave, true);
  assert.equal(h.ctx.waveAutoRetryUsedRef.current, true);
  h.fire(12000);
  assert.equal(h.ctx.waveErr, 'Waveform took too long to load. Try again.');
  assert.equal(h.ctx.isPlaying, false);
  assert.equal(h.ctx.isRetryingWave, false);
  assert.equal(h.timers.size, 0);
  assert.equal(h.ctx.isDisabled(), false);
});

test('automatic retry plays on ready without needing navigation or another Play', async () => {
  const h = harness(); await h.initialize(); h.press(); h.fire(12000); h.fire(350);
  h.rerender(); await flush(); h.instances[1].ready(); await flush();
  assert.equal(h.instances[1].playCalls, 1);
  assert.equal(h.ctx.waveErr, null); assert.equal(h.timers.size, 0);
});

test('manual Retry renews the retry budget and starts the requested load', async () => {
  const h = harness(); await h.initialize(); h.press(); h.fire(12000); h.fire(350);
  h.rerender(); await flush(); h.fire(12000);
  h.ctx.retryWaveform('manual'); h.rerender(); await flush();
  assert.equal(h.ctx.waveAutoRetryUsedRef.current, false);
  assert.equal(h.instances[2].loadCalls, 1);
  h.instances[2].ready(); await flush(); assert.equal(h.instances[2].playCalls, 1);
});

test('Play from an exhausted error explicitly retries instead of silently doing nothing', async () => {
  const h = harness(); await h.initialize(); h.press(); h.fire(12000); h.fire(350);
  h.rerender(); await flush(); h.fire(12000);
  h.press(); h.rerender(); await flush();
  assert.equal(h.instances[2].loadCalls, 1);
  assert.equal(h.ctx.waveAutoRetryUsedRef.current, false);
});

test('changing version cancels queued Play and stale module initialization', async () => {
  const h = harness(); h.mount(); h.fire(80); h.press(); h.unmount();
  h.ctx.versionId = 'version-two'; h.mount(); h.fire(80); await h.resolveImport();
  assert.equal(h.instances.length, 1);
  assert.equal(h.instances[0].loadCalls, 0);
  assert.equal(h.ctx.playRequestedRef.current, false);
});

test('old ready, media events and rejected loads cannot mutate or play a new version', async () => {
  const h = harness(); await h.initialize(); h.press(); const old = h.instances[0];
  h.unmount(); h.ctx.versionId = 'version-two'; h.mount(); h.fire(80); await flush();
  old.ready(); old.emit('play'); old.emit('pause'); old.emit('timeupdate', 77);
  old.emit('error', new Error('Failed to fetch')); await flush();
  assert.equal(old.playCalls, 0); assert.equal(h.ctx.isPlaying, false);
  assert.equal(h.ctx.currentTime, 0); assert.equal(h.ctx.waveErr, null);
  assert.equal(h.native.length, 0); assert.equal(h.instances[1].loadCalls, 0);
});

test('rejected load from an old version cannot start a native fallback', async () => {
  const h = harness(); await h.initialize(); h.press(); const old = h.instances[0];
  h.unmount(); h.ctx.versionId = 'version-two'; h.mount(); h.fire(80); await flush();
  old.loadGate.reject(new Error('Failed to fetch')); await flush();
  assert.equal(h.native.length, 0); assert.equal(h.ctx.waveErr, null);
});

test('load rejection and error event share one native fallback without losing Play intent', async () => {
  const h = harness(); await h.initialize(); h.press(); const ws = h.instances[0];
  const error = new Error('Failed to fetch'); ws.emit('error', error); ws.loadGate.reject(error);
  await flush();
  assert.equal(h.native.length, 1); assert.equal(h.native[0].playCalls, 1);
  assert.equal(h.ctx.playRequestedRef.current, true); assert.equal(h.ctx.isPlaying, true);
  assert.equal(h.ctx.isReady, true); assert.equal(h.timers.size, 0);
  ws.ready(); await flush(); assert.equal(ws.playCalls, 0);
  h.press(); assert.equal(h.native[0].paused, true);
  h.press(); await flush(); assert.equal(h.native[0].playCalls, 2);
});

test('stale asynchronous fallback cannot attach or play after version navigation', async () => {
  const h = harness(); await h.initialize(); h.press();
  const close = deferred(); h.ctx.reactiveAudioContextRef.current = { close: () => close.promise };
  h.instances[0].emit('error', new Error('Failed to fetch'));
  const fallback = h.native[0]; h.unmount(); h.ctx.versionId = 'version-two';
  h.mount(); h.fire(80); await flush(); close.resolve(); await flush();
  assert.equal(fallback.playCalls, 0); assert.equal(h.ctx.isReady, false);
  assert.equal(h.ctx.nativeAudioFallbackRef.current, false);
});

test('rejected playback is visible and a second press can retry without an unhandled promise', async () => {
  const h = harness(); await h.initialize(); h.press(); const ws = h.instances[0];
  ws.playError = new Error('Playback requires another gesture'); ws.ready(); await flush();
  assert.equal(h.ctx.isPlaying, false); assert.equal(h.ctx.playRequestedRef.current, false);
  assert.equal(h.ctx.waveErr, 'Playback requires another gesture');
  ws.playError = null; h.press(); await flush(); assert.equal(h.ctx.isPlaying, true);
  assert.equal(h.ctx.waveErr, null); assert.equal(ws.loadCalls, 1);
});

test('pausing for a comment or navigation cancels pending autoplay', async () => {
  for (const action of ['pauseForComment', 'stopPlayback']) {
    const h = harness(); await h.initialize(); h.press(); h.ctx[action]();
    h.instances[0].ready(); await flush(); assert.equal(h.instances[0].playCalls, 0);
    assert.equal(h.ctx.isPlaying, false);
  }
});

test('cleanup cancels container polls and late initialization cannot create a player', async () => {
  const h = harness(); h.ctx.waveformRef.current = null; h.mount(); h.fire(80);
  assert.equal(h.timers.size, 1); h.unmount(); assert.equal(h.timers.size, 0);
  const pending = harness(); pending.mount(); pending.fire(80); pending.press(); pending.unmount();
  await pending.resolveImport(); assert.equal(pending.instances.length, 0);
});

test('module initialization failure presents a stable retryable error', async () => {
  const h = harness(); h.mount(); h.fire(80); h.press();
  h.gate.reject(new Error('Audio player chunk unavailable')); await flush();
  assert.equal(h.ctx.waveErr, 'Audio player chunk unavailable');
  assert.equal(h.ctx.isPlaying, false); assert.equal(h.ctx.isDisabled(), false);
});

test('pausing before delayed initialization keeps the new player idle', async () => {
  const h = harness(); h.mount(); h.fire(80); h.press(); h.ctx.pauseForComment();
  await h.resolveImport(); assert.equal(h.instances[0].loadCalls, 0);
  assert.equal(h.ctx.isPlaying, false); assert.equal(h.timers.size, 0);
});

test('Strict Mode effect remount invalidates old initialization and preserves a queued Play', async () => {
  const h = harness(); h.mount(); h.fire(80); h.press(); h.unmount();
  h.mount(); h.fire(80); await h.resolveImport();
  assert.equal(h.instances.length, 1); assert.equal(h.instances[0].loadCalls, 1);
  h.instances[0].ready(); await flush(); assert.equal(h.instances[0].playCalls, 1);
});

test('missing waveform container exhausts bounded polls with a readable error', async () => {
  const h = harness(); h.ctx.waveformRef.current = null; h.mount(); h.press(); h.fire(80);
  for (let attempt = 0; attempt < 20; attempt++) h.fire(50);
  assert.equal(h.ctx.waveErr, 'Waveform could not initialize. Try again.');
  assert.equal(h.ctx.isPlaying, false); assert.equal(h.timers.size, 0);
});

test('native playback rejection is visible and the next gesture recovers', async () => {
  const h = harness(); await h.initialize(); h.press();
  h.instances[0].emit('error', new Error('Failed to fetch')); await flush();
  const audio = h.native[0]; h.press(); audio.playError = new Error('Native play interrupted');
  h.press(); await flush(); assert.equal(h.ctx.isPlaying, false);
  assert.equal(h.ctx.waveErr, 'Native play interrupted');
  audio.playError = null; h.press(); await flush(); assert.equal(h.ctx.isPlaying, true);
  assert.equal(h.ctx.waveErr, null);
});

test('reactive drawing rechecks readiness after a Play queued before media initialization', () => {
  const reactive = nodes.find(n => ts.isCallExpression(n) && n.expression.getText(ast) === 'useEffect'
    && n.arguments[0].getText(ast).includes('ensureReactiveAudioGraph(analyserAudioRef.current)'));
  assert.ok(reactive);
  const dependencies = reactive.arguments[1].elements.map(n => n.getText(ast));
  assert.ok(dependencies.includes('isReady'), 'newly initialized media must trigger the drawing effect');
});

test('Space requests first Play through the same handler and ignores text inputs and mobile', async () => {
  const h = harness(); await h.initialize(); h.ctx.keyboard();
  const handler = h.keys.get('keydown'); let prevented = 0;
  const event = { code: 'Space', target: { tagName: 'TEXTAREA' }, preventDefault() { prevented++; } };
  handler(event); assert.equal(h.instances[0].loadCalls, 0);
  h.ctx.window.innerWidth = 600; handler({ ...event, target: null });
  assert.equal(h.instances[0].loadCalls, 0);
  h.ctx.window.innerWidth = 1440; handler({ ...event, target: null });
  assert.equal(h.instances[0].loadCalls, 1); assert.equal(prevented, 1);
});
