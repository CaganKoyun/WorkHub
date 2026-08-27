import { test, expect } from '@playwright/test';

/**
 * UI/UX flow layer — public-surface interactions that don't need an
 * authenticated session. Complements smoke.spec.ts (which asserts pages
 * merely open) by driving keyboard + click paths a real user takes.
 */

test.describe('Landing', () => {
  test('hero CTAs render and navigate', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Nav "Ücretsiz başla" — the first one in the sticky nav (TR locale).
    const navCta = page.getByRole('link', { name: /Ücretsiz başla|Get started/i }).first();
    await expect(navCta).toBeVisible();
    await navCta.click();
    await page.waitForURL('**/auth');
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  });

  test('features section is reachable via anchor', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /^(Product|Ürün)$/ }).first().click();
    // #features anchor
    await expect(page).toHaveURL(/#features$/);
    await expect(page.locator('#features')).toBeInViewport({ timeout: 5_000 });
  });
});

test.describe('Auth', () => {
  test('auth page shows Auth0 sign-in and sign-up buttons', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in with auth0/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create a new account/i })).toBeVisible();
  });

  test('auth page shows brand panel on wide viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/auth');
    await expect(page.getByText(/where your company/i)).toBeVisible();
  });

  test('auth page shows terms notice', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByText(/terms and privacy/i)).toBeVisible();
  });
});

test.describe('404 & routing', () => {
  test('typing a bad URL falls to 404 with a link home', async ({ page }) => {
    await page.goto('/bu-sayfa-yok-12345');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    const home = page.getByRole('link', { name: /home|ana|başlangıç/i }).first();
    if (await home.count()) {
      await home.click();
      await page.waitForURL(/\/$/);
    }
  });
});
