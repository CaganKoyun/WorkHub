import { test, expect } from '@playwright/test';

/**
 * P0 · Password reset end-to-end (test-scope §3.14).
 *
 * Needs the mail fixture (same as invite.spec) to grab the reset link
 * from the outbound email. Skipped until that's wired.
 */

test.describe('Password reset', () => {
  test.skip('user resets password, old creds invalid, new creds work', async ({ page }) => {
    // TODO(P0):
    // 1. Go to /auth, click "Forgot password", enter test user email
    // 2. Poll mail fixture for the reset link, visit it
    // 3. Set a new password
    // 4. Try to sign in with the OLD password → expect error
    // 5. Sign in with the NEW password → land on /home
    await expect(page).toHaveURL(/./);
  });

  test.skip('reset link is single-use', async ({ page }) => {
    // TODO(P0): consume a link once, then visit it again — second visit
    // must not let anyone set a password.
    await expect(page).toHaveURL(/./);
  });

  test.skip('reset with a mismatched confirmation shows inline error', async ({ page }) => {
    // TODO(P0): pw + confirm mismatch → the form must NOT submit and the
    // supabase call must NOT fire (spy on network).
    await expect(page).toHaveURL(/./);
  });
});
