import { test, expect } from '@playwright/test';

/**
 * P0 · Team invite + magic-link accept (test-scope §3.2).
 *
 * Requires a Resend sandbox key so we can inspect the sent link. Skipped
 * until CI has RESEND_TEST_API_KEY + a webhook that stashes the last
 * outgoing message somewhere fetchable.
 */

test.describe('Invite → accept', () => {
  test.skip('owner sends invite, invitee lands, signs up, joins workspace', async ({ page }) => {
    // TODO(P0):
    // 1. Login as owner, /workspace/settings → add invitee@example.test as member
    // 2. Poll the mail fixture for the last email to invitee@example.test
    // 3. Extract /invite/:token from the body
    // 4. New browser context → visit that URL
    // 5. Sign-up flow completes → land on /home in the SAME workspace
    // 6. Owner /teams sees the new member with role=member
    await expect(page).toHaveURL(/./);
  });

  test.skip('expired token surfaces a clear message and no join happens', async ({ page }) => {
    // TODO(P0): use a token expired by fixture SQL. Expect user-facing
    // "invitation expired" copy and NO membership row created.
    await expect(page).toHaveURL(/./);
  });

  test.skip('accepting an invite while logged in as a different user re-prompts', async ({ page }) => {
    // TODO(P0): sign in as userA, click invite link addressed to userB → the
    // app must not silently join userA to the workspace.
    await expect(page).toHaveURL(/./);
  });
});
