/**
 * Write-affordance visibility per role — spot-check that pages hide
 * mutating buttons for read-only roles. This catches the class of
 * regression where a UI change accidentally re-exposes a "New X" or
 * "Delete" button to a viewer. RLS would still block the actual
 * write, but the button leaking is a UX bug worth catching early.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

const WRITE_AFFORDANCES: { path: string; missingFor: 'viewer'; patterns: RegExp[] }[] = [
  { path: '/projects', missingFor: 'viewer', patterns: [/new project/i] },
  { path: '/bugs',     missingFor: 'viewer', patterns: [/new bug/i, /report bug/i] },
  { path: '/assets',   missingFor: 'viewer', patterns: [/new asset/i, /upload/i] },
  { path: '/teams',    missingFor: 'viewer', patterns: [/invite/i, /new team/i] },
];

test.describe.configure({ mode: 'serial' });

for (const check of WRITE_AFFORDANCES) {
  test(`viewer sees no write CTA on ${check.path}`, async ({ page }) => {
    await loginAs(page, check.missingFor);
    await page.goto(check.path);
    await page.waitForTimeout(1500);
    for (const pat of check.patterns) {
      const btn = page.getByRole('button', { name: pat }).or(page.getByRole('link', { name: pat }));
      await expect(btn, `viewer must not see "${pat}" on ${check.path}`).toHaveCount(0);
    }
  });
}

test('owner CAN see new-project affordance on /projects (control)', async ({ page }) => {
  await loginAs(page, 'owner');
  await page.goto('/projects');
  await page.waitForTimeout(1500);
  // If this fails, either the app removed the New project button for
  // everyone (a regression) or seed roles are misassigned.
  const btn = page.getByRole('button', { name: /new project/i }).or(
    page.getByRole('link', { name: /new project/i }),
  );
  await expect(btn).toHaveCount(1);
});
