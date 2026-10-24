import { expect, test } from '@playwright/test';

const emailEnabled = process.env.EMAIL_PASSWORD_AUTH_ENABLED === 'true';

test('recovery pages stay unavailable while Email authentication is off', async ({ page }) => {
  test.skip(emailEnabled, 'Run this case with the default-off server gate.');
  await page.goto('/forgot-password');
  await expect(page).toHaveURL(/\/login\?auth=email_unavailable$/);
  await page.goto('/auth/reset-password');
  await expect(page).toHaveURL(/\/login\?auth=email_unavailable$/);
});

test('enabled recovery explains an invalid link and gives a neutral request result', async ({ page }) => {
  test.skip(!emailEnabled, 'Run this case with the local Email gate enabled.');
  await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: '',
  }));
  await page.addInitScript(() => {
    window.localStorage.setItem('tsr_analytics_consent', 'rejected');
    window.turnstile = {
      render: (_container, options) => {
        options.callback('browser-test-token');
        return 'browser-test-widget';
      },
      reset: () => {},
      remove: () => {},
    };
  });
  let requestBody;
  await page.route('**/api/auth/email/recover', async route => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });

  await page.goto('/forgot-password?status=invalid_link');
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  await expect(page.locator('main').getByRole('alert')).toContainText('expired or already been used');
  await page.getByRole('textbox', { name: 'Email' }).fill('listener@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.locator('section').getByRole('status')).toContainText('If this address can use password recovery');
  await expect(page.getByRole('button', { name: /Send again in/ })).toBeDisabled();
  expect(requestBody).toEqual({ email: 'listener@example.com', captchaToken: 'browser-test-token' });

  await page.goto('/auth/reset-password');
  await expect(page.getByRole('heading', { name: 'Set a new password' })).toBeVisible();
  await expect(page.locator('main').getByRole('alert')).toContainText('expired or already been used');
  await expect(page.getByRole('link', { name: 'Request another link' })).toHaveAttribute('href', '/forgot-password');
  await expect(page.locator('#new-password')).toHaveCount(0);
});
