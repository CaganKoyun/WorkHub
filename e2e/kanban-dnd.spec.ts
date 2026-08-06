import { test, expect } from '@playwright/test';

/**
 * P0 · Kanban drag-and-drop (test-scope §3.5).
 *
 * Regression-fragile — DnD has broken silently three times. Assertions
 * must survive a full page reload so we catch persistence bugs, not just
 * client-state bugs.
 */

test.describe('Kanban board — drag & drop', () => {
  test.skip('drag task from Todo to In Progress persists across refresh', async ({ page }) => {
    // TODO(P0):
    // 1. Seed: one project with a "WH-QA1" task in status=todo
    // 2. Login, go to /issues → Board view
    // 3. Locate the WH-QA1 card via getByText, drag onto In Progress column
    // 4. Expect optimistic UI: card now under In Progress
    // 5. page.reload() → assert card is STILL under In Progress (DB persisted)
    // 6. Check task_activity has a status_change row for this task
    await expect(page).toHaveURL(/./);
  });

  test.skip('dropping outside any column reverts the card', async ({ page }) => {
    // TODO(P0): drag+drop onto empty canvas; card returns to origin column.
    await expect(page).toHaveURL(/./);
  });

  test.skip('optimistic UI reverts on server error', async ({ page }) => {
    // TODO(P0): stub supabase.update to return 500 for this task; the card
    // should snap back to origin and a toast should surface the failure.
    await expect(page).toHaveURL(/./);
  });
});
