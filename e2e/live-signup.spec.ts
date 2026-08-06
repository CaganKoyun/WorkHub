import { test, expect } from '@playwright/test';

/**
 * Live signup — creates a real user against whatever Supabase project the
 * dev server is pointed at. Gated on VITE_SUPABASE_URL so it silently skips
 * when the env isn't configured (typical for a fresh clone).
 *
 * If Supabase email confirmation is ON we can't finish the flow without a
 * mailbox, so we accept two outcomes: (a) redirected out of /auth into the
 * onboarding / home area, or (b) a "check your email" toast surfaced.
 *
 * Uses a random localhost-domain email each run so the same test can run
 * many times against the same project without collisions.
 */

const hasEnv = !!process.env.VITE_SUPABASE_URL && !!process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

test.describe('Live signup (env-gated)', () => {
  test.skip(!hasEnv, 'VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not set');

  test('yeni bir kullanıcı hesabı açar', async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 10);
    const email = `e2e-${Date.now()}-${rand}@example.test`;
    const password = `Pw!${rand}9aA`;
    const fullName = `E2E User ${rand}`;

    await page.goto('/auth');
    await page.getByRole('tab', { name: 'Sign up' }).click();
    await page.getByPlaceholder('Jane Doe').fill(fullName);
    // Radix Tabs sign-in panel'i unmount ediyor → sign-up formunda her
    // placeholder tek. `.first()` kullan.
    await page.getByPlaceholder('you@company.com').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole('button', { name: /^Sign up$/i }).click();

    // Either we get bounced out of /auth (confirmation off) or a toast tells
    // us to check the mailbox (confirmation on). Both mean "signup accepted".
    const leftAuth = page
      .waitForURL((url) => !url.toString().includes('/auth'), { timeout: 15_000 })
      .then(() => 'redirect' as const)
      .catch(() => null);

    const confirmToast = page
      .getByText(/check your email|e-posta|confirm/i)
      .first()
      .waitFor({ timeout: 15_000 })
      .then(() => 'toast' as const)
      .catch(() => null);

    const outcome = await Promise.race([leftAuth, confirmToast]);
    expect(outcome).not.toBeNull();
  });
});
