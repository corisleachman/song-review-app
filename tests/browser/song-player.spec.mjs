import { expect, test } from '@playwright/test';

// Silent PCM audio exercises real browser playback without hosted media or accounts.
function silentWav(seconds = 4) {
  const samples = 16000 * seconds;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8);
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  return wav;
}

async function preparePlayer(page, fallback, renewal = false, requireGesture = false, bootstrapFirstResponse = 200) {
  const errors = [];
  const unexpectedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.context().addCookies([
    { name: 'song_review_auth', value: 'test-auth', domain: '127.0.0.1', path: '/' },
    { name: 'song_review_identity', value: bootstrapFirstResponse === 200 ? 'test-identity' : '', domain: '127.0.0.1', path: '/' },
  ]);
  await page.addInitScript(requireGesture => {
    window.requireFirstPlayGesture = requireGesture;
    let inGesture = false;
    const authorised = new WeakSet();
    document.addEventListener('click', () => {
      inGesture = true;
      setTimeout(() => { inGesture = false; }, 0);
    }, true);
    window.firstPlayGestureFailures = 0;
    window.isPlayerGesture = () => inGesture;
    window.authorisedPlayerMedia = authorised;
    localStorage.setItem('tsr_analytics_consent', 'rejected');
    window.playerTestMedia = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!window.playerTestMedia.includes(this)) window.playerTestMedia.push(this);
      if (window.requireFirstPlayGesture && !window.authorisedPlayerMedia.has(this)) {
        if (!window.isPlayerGesture()) {
          window.firstPlayGestureFailures++;
          return Promise.reject(new DOMException('First play must run inside the tap', 'NotAllowedError'));
        }
        window.authorisedPlayerMedia.add(this);
      }
      if (window.failNextNativeResume) {
        window.failNextNativeResume = false;
        return Promise.reject(new DOMException('Fixture expired-source failure', 'NotSupportedError'));
      }
      return play.call(this);
    };
  }, requireGesture);
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
  let bootstrapRequests = 0;
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
      const body = silentWav(renewal ? 12 : 4);
      const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers().range || '');
      const headers = { 'accept-ranges': 'bytes', 'cache-control': 'no-store' };
      if (range) {
        const start = Number(range[1]);
        const end = Math.min(range[2] ? Number(range[2]) : body.length - 1, body.length - 1);
        if (start > end) return route.fulfill({ status: 416, headers: { ...headers, 'content-range': `bytes */${body.length}` } });
        return route.fulfill({ status: 206, contentType: 'audio/wav', headers: { ...headers, 'content-range': `bytes ${start}-${end}/${body.length}` }, body: body.subarray(start, end + 1) });
      }
      return route.fulfill({ status: 200, contentType: 'audio/wav', headers, body });
    }
    if (url.pathname === '/api/auth/bootstrap' && ++bootstrapRequests === 1) {
      if (bootstrapFirstResponse === 'timeout') {
        await new Promise(resolve => setTimeout(resolve, 9000));
        return route.fulfill({ status: 200, json: payloads[url.pathname] }).catch(() => {});
      }
      if (bootstrapFirstResponse === 401) {
        return route.fulfill({ status: 401, json: { error: 'Unauthenticated' } });
      }
    }
    if (url.pathname.startsWith('/api/')) {
      if (!(url.pathname in payloads)) unexpectedRequests.push(url.pathname);
      return route.fulfill({ status: 200, json: payloads[url.pathname] || {} });
    }
    return route.continue();
  });
  await page.goto('/songs/song-one/versions/version-one');
  if (bootstrapFirstResponse === 200) {
    await expect(page.getByRole('heading', { name: 'Player fixture', exact: true })).toBeVisible();
  }
  return { errors, unexpectedRequests, waveformFailures: () => waveformFailures, renewalSources: () => renewedSources.size };
}

test('version page lets a signed-in user retry a timed-out session check', async ({ page }) => {
  await preparePlayer(page, false, false, false, 'timeout');
  await expect(page.getByText('Could not check your session. Please try again.')).toBeVisible({ timeout: 12000 });
  await expect(page).toHaveURL(/\/songs\/song-one\/versions\/version-one$/);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Player fixture', exact: true })).toBeVisible();
});

test('version page sends an unauthenticated user to sign in with a return link', async ({ page }) => {
  await preparePlayer(page, false, false, false, 401);
  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fsongs%2Fsong-one%2Fversions%2Fversion-one$/);
});

test('mobile version workspace switcher restores focus after Escape', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'This switcher is in the mobile version navigation.');
  await preparePlayer(page, false);
  await page.route('**/api/workspaces', route => route.fulfill({ json: {
    currentWorkspaceId: 'fixture',
    workspaces: [
      { id: 'fixture', name: 'Fixture', isActive: true, role: 'owner', plan: 'free', songCount: 2 },
      { id: 'other', name: 'Other workspace', isActive: false, role: 'member', plan: 'free', songCount: 1 },
    ],
  } }));
  const trigger = page.getByRole('button', { name: 'Switch workspace', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const option = page.getByRole('button', { name: /^Other workspace / });
  await expect(option).toBeVisible();
  await option.focus();
  await page.keyboard.press('Escape');
  await expect(option).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

async function mediaState(page) {
  return page.evaluate(() => {
    const audio = window.playerTestMedia.at(-1);
    return audio ? {
      time: audio.currentTime, paused: audio.paused, loop: audio.loop,
      duration: audio.duration, readyState: audio.readyState,
      seekableEnd: audio.seekable.length ? audio.seekable.end(audio.seekable.length - 1) : 0,
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
  await expect.poll(async () => {
    const state = await mediaState(page);
    return state && state.readyState >= 2 && state.duration > 3 && state.seekableEnd > 3;
  }).toBe(true);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await seekAudio(page, 2);
  const before = await mediaState(page);
  expect(before.time).toBeCloseTo(2, 1);
  // Simulate the browser refusing an old native source. The replacement request
  // serves real PCM bytes, so metadata/seek/play recovery runs in the browser.
  await page.evaluate(() => { window.failNextNativeResume = true; });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(async () => (await mediaState(page))?.paused).toBe(false);
  const state = await mediaState(page);
  expect(state.time, JSON.stringify({ before, after: state, renewed: fixture.renewalSources() })).toBeGreaterThanOrEqual(1.8);
  expect(state.time).toBeLessThan(3.5);
  expect(state.loop).toBe(true);
  expect(state.activePlayers).toBe(1);
  expect(fixture.renewalSources()).toBe(1);
  expect(fixture.errors).toEqual([]);
  expect(fixture.unexpectedRequests).toEqual([]);
});

 test('cold first tap starts media before waveform ready under a gesture-only policy', async ({ page }) => {
  const fixture = await preparePlayer(page, false, true, true);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(async () => (await mediaState(page))?.time ?? 0).toBeGreaterThan(0.1);
  expect(await page.evaluate(() => window.firstPlayGestureFailures)).toBe(0);
  expect(await page.evaluate(() => window.playerTestMedia.at(-1).src)).toContain('/api/media/audio/version-one');
  expect((await mediaState(page)).activePlayers).toBe(1);
  expect(fixture.errors).toEqual([]);
});

test('closing a new comment restores focus to its opener', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Both desktop comment entry points are visible');
  await preparePlayer(page, false);
  const comment = page.getByRole('textbox', { name: 'Comment', exact: true });
  const inline = page.getByRole('button', { name: /^\+ Add comment at/ });
  const panel = page.getByRole('button', { name: /^\+ Add at/ });

  await inline.press('Enter');
  await expect(comment).toBeFocused();
  await comment.press('Escape');
  await expect(comment).toHaveCount(0);
  await expect(inline).toBeFocused();

  await panel.press('Enter');
  await expect(comment).toBeFocused();
  await page.getByRole('button', { name: 'Cancel', exact: true }).press('Enter');
  await expect(comment).toHaveCount(0);
  await expect(panel).toBeFocused();
});
