import { test, expect } from '@playwright/test';

/**
 * P0 · Zero-to-hero workspace path (test-scope §3.1).
 *
 * Skipped until we have deterministic signup credentials in CI env —
 * flip `test.skip` → `test` once `TEST_USER_OWNER_*` is wired.
 */

test.describe('Zero to hero — new workspace', () => {
  test.skip('signup → onboarding 4 steps → first project → task', async ({ page }) => {
    // TODO(P0):
    // 1. page.goto('/auth')  → sign up with a random e2e- address
    // 2. Expect /onboarding, walk the 4 steps (profile → company → team → done)
    // 3. Create a project ("QA Sandbox") from the empty state
    // 4. Add a task ("Ship v1") assigned to self
    // 5. Assert task appears on /tasks under Today
    await expect(page).toHaveURL(/./);
  });

  test.skip('re-login mid-onboarding resumes at the correct step', async ({ page }) => {
    // TODO(P0): sign in as a user with company_step done but modules_step not;
    // expect the wizard to jump straight to step 2.
    await expect(page).toHaveURL(/./);
  });
});
