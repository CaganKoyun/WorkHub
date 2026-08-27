import { test, expect } from '@playwright/test';

/**
 * Regression · Reg #4 — My Tasks must expose an "Unassigned" group.
 *
 * Known-open (PRD §6.4): tasks with assignee_id = null currently drop
 * out of the visible grouping on /tasks. This spec skips until the
 * grouping is added, then goes green.
 */

test.describe('Regression · My Tasks Unassigned bucket', () => {
  test.skip('a task with no assignee shows up under an Unassigned header', async ({ page }) => {
    // TODO(regression):
    // - Seed a task in the current workspace with assignee_id = null
    // - Login, go to /tasks
    // - Expect a header with text /^Unassigned|Atanmadı$/i
    // - Expect the seeded task to be inside that group
    await expect(page).toHaveURL(/./);
  });
});
