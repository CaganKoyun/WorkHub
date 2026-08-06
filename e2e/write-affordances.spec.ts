/**
 * Write-affordance visibility per role — spot-check that pages hide
 * mutating buttons for read-only roles. UI uses Turkish labels in
 * places, so patterns are bilingual.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

const WRITE_AFFORDANCES: { path: string; missingFor: 'viewer'; patterns: RegExp[] }[] = [
  { path: '/projects', missingFor: 'viewer', patterns: [/yeni proje|new project/i] },
  { path: '/bugs',     missingFor: 'viewer', patterns: [/report bug/i] },
  { path: '/teams',    missingFor: 'viewer', patterns: [/yeni ekip|new team/i, /davet|invite/i] },
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
  const btn = page.getByRole('button', { name: /yeni proje|new project/i }).or(
    page.getByRole('link', { name: /yeni proje|new project/i }),
  );
  await expect(btn).not.toHaveCount(0);
});
