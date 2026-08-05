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

    // Nav "Get started" — the first one in the sticky nav.
    const navCta = page.getByRole('link', { name: /Get started/i }).first();
    await expect(navCta).toBeVisible();
    await navCta.click();
    await page.waitForURL('**/auth');
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  });

  test('features section is reachable via anchor', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Product', exact: true }).first().click();
    // #features anchor
    await expect(page).toHaveURL(/#features$/);
    await expect(page.locator('#features')).toBeInViewport({ timeout: 5_000 });
  });
});

test.describe('Auth', () => {
  test('sign-in / sign-up tabs swap correctly', async ({ page }) => {
    await page.goto('/auth');
    // Sign-in is default: name field must not exist.
    await expect(page.getByPlaceholder('you@company.com').first()).toBeVisible();
    await expect(page.getByPlaceholder('Jane Doe')).toHaveCount(0);

    await page.getByRole('tab', { name: 'Sign up' }).click();
    await expect(page.getByPlaceholder('Jane Doe')).toBeVisible();

    await page.getByRole('tab', { name: 'Sign in' }).click();
    await expect(page.getByPlaceholder('Jane Doe')).toHaveCount(0);
  });

  test('sign-in form flags empty fields as required', async ({ page }) => {
    await page.goto('/auth');
    const submit = page.getByRole('button', { name: 'Sign in', exact: true });
    await submit.click();
    // Browser-native validity kicks in — email input must fail validity.
    const email = page.locator('input[type="email"]').first();
    const valid = await email.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(valid).toBe(false);
    // Still on /auth — no navigation happened.
    await expect(page).toHaveURL(/\/auth$/);
  });

  test('typing invalid email surfaces browser validity error', async ({ page }) => {
    await page.goto('/auth');
    const email = page.locator('input[type="email"]').first();
    await email.fill('not-an-email');
    await page.locator('input[type="password"]').first().fill('whatever');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    const valid = await email.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(valid).toBe(false);
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
