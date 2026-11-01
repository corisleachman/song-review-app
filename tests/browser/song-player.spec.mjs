import { expect, test } from '@playwright/test';

// Silent PCM audio exercises real browser playback without hosted media or accounts.
function silentWav() {
  const samples = 16000 * 4;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8);
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  return wav;
}

async function preparePlayer(page, fallback, renewal = false) {
  const errors = [];
  const unexpectedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.context().addCookies([
    { name: 'song_review_auth', value: 'test-auth', domain: '127.0.0.1', path: '/' },
    { name: 'song_review_identity', value: 'test-identity', domain: '127.0.0.1', path: '/' },
  ]);
  await page.addInitScript(() => {
    localStorage.setItem('tsr_analytics_consent', 'rejected');
    window.playerTestMedia = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!window.playerTestMedia.includes(this)) window.playerTestMedia.push(this);
      if (window.failNextNativeResume) {
        window.failNextNativeResume = false;
        return Promise.reject(new DOMException('Fixture expired-source failure', 'NotSupportedError'));
      }
      return play.call(this);
    };
  });
  const versions = ['version-one', 'version-two'].map((id, index) => ({
    id, version_number: index + 1, label: null, file_path: 'fixture.wav',
    file_name: 'fixture.wav', audioUrl: renewal ? `/api/media/audio/${id}` : '/fixture.wav', created_by: 'Player tester',
  }));
  const payloads = {
    '/api/auth/bootstrap': { identity: {
      authorName: 'Player tester', userId: 'fixture-user', workspaceName: 'Fixture', membershipRole: 'owner',
    } },
    '/api/profile/visualizer': { visualizer_enabled: false },
    '/api/workspace/members': { members: [] },
    '/api/songs/song-one': { song: { id: 'song-one', title: 'Player fixture', image_url: null } },
    '/api/songs/song-one/versions': { versions },
    '/api/actions/by-song/song-one': { actions: [] },
    '/api/songs/song-one/tasks': { tasks: [] },
  };
  for (const version of versions) {
    payloads[`/api/versions/${version.id}`] = { version };
    payloads[`/api/versions/${version.id}/threads`] = { threads: [] };
  }
  let waveformFailures = 0;
  const renewedSources = new Set();
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname === '/fixture.wav' || (renewal && url.pathname.startsWith('/api/media/audio/'))) {
      if (url.searchParams.has('renew')) renewedSources.add(url.search);
      if (fallback && request.resourceType() === 'fetch') {
        waveformFailures++;
        return route.abort('failed');
      }
      return route.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() });
    }
    if (url.pathname.startsWith('/api/')) {
      if (!(url.pathname in payloads)) unexpectedRequests.push(url.pathname);
      return route.fulfill({ status: 200, json: payloads[url.pathname] || {} });
    }
    return route.continue();
  });
  await page.goto('/songs/song-one/versions/version-one');
  await expect(page.getByRole('heading', { name: 'Player fixture', exact: true })).toBeVisible();
  return { errors, unexpectedRequests, waveformFailures: () => waveformFailures, renewalSources: () => renewedSources.size };
}

async function mediaState(page) {
  return page.evaluate(() => {
    const audio = window.playerTestMedia.at(-1);
    return audio ? {
      time: audio.currentTime, paused: audio.paused, loop: audio.loop,
      activePlayers: window.playerTestMedia.filter(media => !media.paused).length,
    } : null;
  });
}

async function seekAudio(page, time) {
  await page.evaluate(nextTime => new Promise(resolve => {
    const audio = window.playerTestMedia.at(-1);
    audio.addEventListener('seeked', () => resolve(), { once: true });
    audio.currentTime = nextTime;
  }), time);
}

for (const fallback of [false, true]) {
  test(`song transport works with ${fallback ? 'native fallback' : 'WaveSurfer'}`, async ({ page }, testInfo) => {
    const fixture = await preparePlayer(page, fallback);
    const restart = page.getByRole('button', { name: 'Play from Start', exact: true });
    const loop = page.getByRole('button', { name: 'Loop Song', exact: true });
    await expect(restart).toBeEnabled();
    await expect(loop).toHaveAttribute('aria-pressed', 'false');
    for (const button of [restart, loop]) {
      const box = await button.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
    }
    const restartBox = await restart.boundingBox();
    const loopBox = await loop.boundingBox();
    expect(loopBox.y).toBe(restartBox.y);
    await loop.click();
    await expect(loop).toHaveAttribute('aria-pressed', 'true');
    // Restart is also a first-Play entry point, including delayed initialization.
    await restart.click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
    await expect.poll(async () => (await mediaState(page))?.paused).toBe(false);
    expect((await mediaState(page)).loop).toBe(true);
    expect(fixture.waveformFailures()).toBe(fallback ? 1 : 0);

    // Restart while paused, then while already playing near track end.
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await seekAudio(page, 2);
    await restart.click();
    await expect.poll(async () => (await mediaState(page))?.paused).toBe(false);
    await expect.poll(async () => (await mediaState(page))?.time).toBeLessThan(1);
    await seekAudio(page, 3);
    await restart.click();
    await expect.poll(async () => (await mediaState(page))?.time).toBeLessThan(1);

    // Real native repeat must wrap without a second active player.
    await seekAudio(page, 3.8);
    await expect.poll(async () => (await mediaState(page))?.time).toBeLessThan(1);
    expect((await mediaState(page)).activePlayers).toBe(1);
    await loop.focus();
    await page.keyboard.press('Space');
    await expect(loop).toHaveAttribute('aria-pressed', 'false');
    expect((await mediaState(page)).loop).toBe(false);
    await seekAudio(page, 3.8);
    await expect.poll(async () => (await mediaState(page))?.paused).toBe(true);
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();

    await restart.focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await mediaState(page))?.paused).toBe(false);
    await expect.poll(async () => (await mediaState(page))?.time).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('player-controls.png') });

    await loop.click();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(loop).toHaveAttribute('aria-pressed', 'true');
    // The version selector uses the existing navigation/cleanup path.
    await page.getByRole('button', { name: 'Change Version', exact: true }).click();
    await page.getByRole('dialog', { name: 'Choose version' }).getByRole('button', { name: /v2/ }).click();
    await expect(page).toHaveURL(/version-two/);
    await expect(loop).toHaveAttribute('aria-pressed', 'false');
    expect((await mediaState(page)).activePlayers).toBe(0);
    expect(fixture.errors).toEqual([]);
    expect(fixture.unexpectedRequests).toEqual([]);
  });
}


test('native media resume reauthorises once without losing position or loop state', async ({ page }) => {
  const fixture = await preparePlayer(page, true, true);
  await page.getByRole('button', { name: 'Loop Song', exact: true }).click();
  await page.getByRole('button', { name: 'Play from Start', exact: true }).click();
  await expect.poll(async () => (await mediaState(page))?.paused).toBe(false);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await seekAudio(page, 2);
  // Simulate the browser refusing an old native source. The replacement request
  // serves real PCM bytes, so metadata/seek/play recovery runs in the browser.
  await page.evaluate(() => { window.failNextNativeResume = true; });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(async () => (await mediaState(page))?.paused).toBe(false);
  const state = await mediaState(page);
  expect(state.time).toBeGreaterThanOrEqual(1.8);
  expect(state.time).toBeLessThan(3.5);
  expect(state.loop).toBe(true);
  expect(state.activePlayers).toBe(1);
  expect(fixture.renewalSources()).toBe(1);
  expect(fixture.errors).toEqual([]);
  expect(fixture.unexpectedRequests).toEqual([]);
});
