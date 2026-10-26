import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../public/marketing.html', import.meta.url), 'utf8');
const bentoScript = html.slice(html.indexOf("const BASE_URL = '/marketing-assets/';"), html.indexOf('// ── SVG DRAW HEADLINE ──'));
function harness(reducedMotion = false) {
  const nodes = new Map();
  for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) {
    for (const prefix of ['bc-', 'bci-', 'bcn-']) {
      const classes = new Set();
      nodes.set(prefix + id, { style: {}, classes, classList: { add: name => classes.add(name) } });
    }
  }
  const timers = [], intervals = [], images = [];
  vm.runInNewContext(bentoScript, {
    document: { getElementById: id => nodes.get(id) },
    window: { matchMedia: () => ({ matches: reducedMotion }) },
    getComputedStyle: () => ({ display: 'block' }),
    setTimeout: (callback, delay) => timers.push({ callback, delay }),
    setInterval: (callback, delay) => intervals.push({ callback, delay }),
    Image: class { constructor() { images.push(this); } },
  });
  return { nodes, timers, intervals, images };
}

test('initial hero content is visible without waiting for images or timers', () => {
  for (const selector of ['.bento-cell', '.hero-cta-row', '.hero-tagline']) {
    const escaped = selector.replaceAll('.', '\\.');
    const rule = html.match(new RegExp(escaped + '\\s*\\{([^}]+)\\}'))?.[1];
    assert.ok(rule, selector);
    assert.match(rule, /opacity:\s*1\s*;/u);
    assert.doesNotMatch(rule, /transition:\s*opacity/u);
  }
  const { nodes, timers, images } = harness();
  const sources = [];
  for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) {
    assert.ok(nodes.get('bc-' + id).classes.has('on'));
    sources.push(nodes.get('bci-' + id).style.backgroundImage);
  }
  assert.equal(new Set(sources).size, 6);
  assert.ok(sources.every(Boolean));
  assert.equal(images.length, 0, 'initial composition does not wait on a preloader');
  assert.ok(timers.every(timer => timer.delay >= 5000), 'only later rotation is delayed');
});

test('later crossfade waits for its replacement image while keeping the initial image', () => {
  const { nodes, timers, images, intervals } = harness();
  const initial = nodes.get('bci-a').style.backgroundImage;
  timers[0].callback();
  assert.equal(nodes.get('bci-a').style.backgroundImage, initial);
  assert.equal(nodes.get('bcn-a').style.opacity, undefined);
  assert.equal(intervals.length, 1);
  images[0].onload();
  assert.equal(nodes.get('bcn-a').style.opacity, '1');
  const completion = timers.find(timer => timer.delay === 2600);
  assert.ok(completion);
  completion.callback();
  assert.notEqual(nodes.get('bci-a').style.backgroundImage, initial);
  assert.ok(nodes.get('bc-a').classes.has('on'));
});

test('reduced motion receives the full initial hero without background rotation', () => {
  const { nodes, timers, intervals } = harness(true);
  assert.equal(timers.length, 0);
  assert.equal(intervals.length, 0);
  assert.ok([...nodes].filter(([id]) => id.startsWith('bc-')).every(([, node]) => node.classes.has('on')));
});
