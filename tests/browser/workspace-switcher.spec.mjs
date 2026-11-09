import { expect, test } from '@playwright/test';
import axe from 'axe-core';

async function openSwitcher(page) {
  await page.context().addCookies([
    { name: 'song_review_auth', value: 'test-auth', domain: '127.0.0.1', path: '/' },
    { name: 'song_review_identity', value: 'test-identity', domain: '127.0.0.1', path: '/' },
  ]);
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname === '/api/dashboard') {
      return route.fulfill({ json: {
        identity: {
          authorName: 'Fixture user', userId: 'fixture-user', workspaceId: 'workspace-1',
          workspaceName: 'Workspace 1', membershipRole: 'member',
        },
        workspace: { plan: 'free' }, songs: [], actions: [],
      } });
    }
    if (url.pathname === '/api/workspaces') {
      return route.fulfill({ json: {
        currentWorkspaceId: 'workspace-1',
        workspaces: Array.from({ length: 15 }, (_, index) => ({
          id: `workspace-${index + 1}`, name: `Workspace ${index + 1}`, isActive: index === 0,
          role: 'member', plan: 'free', songCount: 2,
        })),
      } });
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: {} });
    return route.continue();
  });
  await page.goto('/dashboard');
  const trigger = page.getByRole('button', { name: /^Current workspace: Workspace 1/ });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /^Workspace 2 / })).toBeVisible();
  return trigger;
}

test('workspace switcher restores focus after Escape and exposes its last option', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile-chromium';
  await page.setViewportSize(mobile ? { width: 320, height: 568 } : { width: 1280, height: 720 });
  const trigger = await openSwitcher(page);
  const firstOption = page.getByRole('button', { name: /^Workspace 2 / });
  await firstOption.focus();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  await page.keyboard.press('Enter');
  await expect(firstOption).toBeVisible();
  await page.addScriptTag({ content: axe.source });
  const contrastViolations = await firstOption.evaluate(async option => {
    const panel = option.closest('[class*="WorkspaceSwitcher_panel__"]');
    const { violations } = await window.axe.run(panel, { runOnly: ['color-contrast'] });
    return violations.flatMap(violation => violation.nodes.map(node => node.failureSummary));
  });
  expect(contrastViolations).toEqual([]);
  const lastOption = page.getByRole('button', { name: /^Workspace 15 / });
  const bounds = await firstOption.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.wheel(0, 1000);
  await expect(lastOption).toBeInViewport();
});
