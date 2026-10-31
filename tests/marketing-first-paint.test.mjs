import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../public/marketing.html', import.meta.url), 'utf8');
const bentoScript = html.slice(html.indexOf("const BASE_URL = '/marketing-assets/';"), html.indexOf('// ── SVG DRAW HEADLINE ──'));
const CELLS = ['a', 'b', 'c', 'd', 'e', 'f'];

// The opening bento images are real <img> elements in the HTML.
function initialImages() {
  const found = {};
  for (const id of CELLS) {
    const tag = html.match(new RegExp(`<img class="bento-cell-img" id="bci-${id}"[^>]*>`))?.[0];
    assert.ok(tag, `bci-${id} is an <img> in the HTML`);
    found[id] = {
      tag,
      src: tag.match(/ src="([^"]+)"/)?.[1],
      tsr: tag.match(/ data-tsr="(\d+)"/)?.[1],
    };
  }
  return found;
}

function harness(reducedMotion = false) {
  const initial = initialImages();
  const nodes = new Map();
  for (const id of CELLS) {
    for (const prefix of ['bc-', 'bci-', 'bcn-']) {
      const classes = new Set();
      const node = { style: {}, classes, classList: { add: name => classes.add(name) }, clientWidth: 400, dataset: {} };
      if (prefix === 'bci-') {
        node.src = initial[id].src;
        node.dataset.tsr = initial[id].tsr;
        node.removeAttribute = () => {};
        node.decode = () => ({ then: done => done() });
      }
      nodes.set(prefix + id, node);
    }
  }
  const timers = [], intervals = [], images = [];
  vm.runInNewContext(bentoScript, {
    document: { getElementById: id => nodes.get(id) },
    window: { matchMedia: () => ({ matches: reducedMotion }), devicePixelRatio: 1 },
    getComputedStyle: () => ({ display: 'block' }),
    setTimeout: (callback, delay) => timers.push({ callback, delay }),
    setInterval: (callback, delay) => intervals.push({ callback, delay }),
    Image: class { constructor() { images.push(this); } },
    Promise,
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
  const initial = initialImages();
  assert.equal(new Set(CELLS.map(id => initial[id].tsr)).size, 6, 'six different opening images');
  assert.ok(CELLS.every(id => initial[id].src && / width="\d+" height="\d+"/.test(initial[id].tag)));
  assert.ok(CELLS.every(id => !/loading="lazy"/.test(initial[id].tag)), 'hero images are never lazy-loaded');

  const { nodes, timers, images } = harness();
  for (const id of CELLS) assert.ok(nodes.get('bc-' + id).classes.has('on'));
  assert.equal(images.length, 0, 'initial composition does not wait on a preloader');
  assert.ok(timers.every(timer => timer.delay >= 5000), 'only later rotation is delayed');
});

test('LCP images are preloaded with the same sources as the HTML images', () => {
  const initial = initialImages();
  for (const id of ['a', 'd']) {
    assert.match(initial[id].tag, /fetchpriority="high"/);
    const srcset = initial[id].tag.match(/ srcset="([^"]+)"/)[1];
    const sizes = initial[id].tag.match(/ sizes="([^"]+)"/)[1];
    const preload = html.match(new RegExp(`<link rel="preload" as="image" href="${initial[id].src}"[^>]*>`))?.[0];
    assert.ok(preload, `preload for bci-${id}`);
    assert.ok(preload.includes(`imagesrcset="${srcset}"`));
    assert.ok(preload.includes(`imagesizes="${sizes}"`));
  }
});

test('later crossfade waits for its replacement image while keeping the initial image', () => {
  const { nodes, timers, images, intervals } = harness();
  const initial = nodes.get('bci-a').src;
  timers[0].callback();
  assert.equal(nodes.get('bci-a').src, initial);
  assert.equal(nodes.get('bcn-a').style.opacity, undefined);
  assert.equal(intervals.length, 1);
  images[0].onload();
  assert.equal(nodes.get('bcn-a').style.opacity, '1');
  const completion = timers.find(timer => timer.delay === 2600);
  assert.ok(completion);
  completion.callback();
  assert.notEqual(nodes.get('bci-a').src, initial);
  assert.match(nodes.get('bci-a').src, /\.webp$/);
  assert.equal(nodes.get('bcn-a').style.opacity, '0', 'overlay drops once the base image has decoded');
  assert.ok(nodes.get('bc-a').classes.has('on'));
});

test('reduced motion receives the full initial hero without background rotation', () => {
  const { nodes, timers, intervals } = harness(true);
  assert.equal(timers.length, 0);
  assert.equal(intervals.length, 0);
  assert.ok([...nodes].filter(([id]) => id.startsWith('bc-')).every(([, node]) => node.classes.has('on')));
});
