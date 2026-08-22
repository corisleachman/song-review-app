import { expect, test } from '@playwright/test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const blockingImpacts = new Set(['serious', 'critical']);

async function prepareDeterministicPage(page, { consent = 'rejected' } = {}) {
  await page.route('https://raw.githubusercontent.com/**', (route) => route.abort());
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  if (consent) {
    await page.addInitScript((choice) => {
      window.localStorage.setItem('tsr_analytics_consent', choice);
    }, consent);
  }
}

async function expectNoBlockingAxeViolations(page) {
  await page.addStyleTag({ content: '.reveal { transition: none !important; }' });
  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () => {
    const results = await window.axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
    });
    return results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        html: node.html,
        failureSummary: node.failureSummary,
      })),
    }));
  });
  const unexpectedBlocking = violations
    .filter((violation) => blockingImpacts.has(violation.impact))
    .flatMap((violation) => violation.nodes.map((node) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      ...node,
    })));
  expect(unexpectedBlocking, JSON.stringify(unexpectedBlocking, null, 2)).toEqual([]);
}

async function tabTo(page, target, limit = 12) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  for (let index = 0; index < limit; index += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`Keyboard focus did not reach ${await target.evaluate((element) => element.outerHTML)}`);
}

test('homepage exposes its primary account journey without blocking accessibility violations', async ({ page }) => {
  await prepareDeterministicPage(page);
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(/The Song Room/i);
  await expect(page.getByText('What is The Song Room?', { exact: true })).toBeVisible();

  const primaryAccountLink = page.locator('#hero-cta').getByRole('link', { name: 'Start for free' });
  await expect(primaryAccountLink).toBeVisible();
  await expectNoBlockingAxeViolations(page);

  await tabTo(page, primaryAccountLink);
  await expect(primaryAccountLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/login$/);
});

test('login keeps the beta account journey Google-only and keyboard reachable', async ({ page }) => {
  await prepareDeterministicPage(page);
  const response = await page.goto('/login', { waitUntil: 'domcontentloaded' });

  expect(response?.ok()).toBe(true);
  await expect(page.getByText('Use Google to log in or create your Song Room account.')).toBeVisible();
  await expect(page.getByText(/Google is the only account option/)).toBeVisible();
  await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0);

  const googleButton = page.getByRole('button', { name: 'Continue with Google' });
  await tabTo(page, googleButton);
  await expect(googleButton).toBeFocused();
  await expectNoBlockingAxeViolations(page);
});

test('cookie rejection is keyboard operable and persists', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'One browser is enough for consent persistence.');
  await prepareDeterministicPage(page, { consent: null });
  await page.addInitScript(() => window.localStorage.removeItem('tsr_analytics_consent'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const preferences = page.getByRole('region', { name: 'Cookie preferences' });
  await expect(preferences).toBeVisible();
  const rejectButton = page.getByRole('button', { name: 'Reject' });
  await tabTo(page, rejectButton, 40);
  await page.keyboard.press('Enter');

  await expect(preferences).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('tsr_analytics_consent')))
    .toBe('rejected');
});

test('mobile homepage respects reduced motion and avoids horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'This assertion targets the phone composition.');
  await prepareDeterministicPage(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const wordmark = page.locator('.mobile-hero-wordmark');
  await expect(wordmark).toBeVisible();
  await expect(page.locator('.mobile-hero-wordmark path').first()).toHaveCSS('animation-name', 'none');

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test('public responses advertise report-only CSP and accept bounded violation reports', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'One browser is enough for the header contract.');
  await prepareDeterministicPage(page);
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  const headers = response?.headers() ?? {};

  expect(headers['content-security-policy-report-only']).toContain("default-src 'self';");
  expect(headers['content-security-policy-report-only']).toContain("frame-ancestors 'none';");
  expect(headers['content-security-policy-report-only']).toContain('report-uri /api/csp-report;');
  expect(headers['reporting-endpoints']).toBe('csp-endpoint="/api/csp-report"');
  expect(headers['content-security-policy']).toBeUndefined();

  const reportResponse = await request.post('/api/csp-report', {
    headers: { 'Content-Type': 'application/csp-report' },
    data: JSON.stringify({
      'csp-report': {
        'document-uri': 'http://127.0.0.1:3100/login?code=sensitive#fragment',
        'effective-directive': 'img-src',
        'violated-directive': 'img-src',
        'blocked-uri': 'https://images.example.test/avatar.png?token=sensitive',
        'original-policy': 'not logged',
        'script-sample': 'not logged',
        'status-code': 200,
      },
    }),
  });
  expect(reportResponse.status()).toBe(204);
  expect(reportResponse.headers()['cache-control']).toBe('no-store');

  const oversizedResponse = await request.post('/api/csp-report', {
    headers: { 'Content-Type': 'application/csp-report' },
    data: JSON.stringify({ 'csp-report': { sample: 'x'.repeat(17 * 1024) } }),
  });
  expect(oversizedResponse.status()).toBe(413);
});
