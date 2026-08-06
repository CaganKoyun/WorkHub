/**
 * Role-flow E2E — uses the seeded fixture users from
 * supabase/seed/e2e-fixtures.sql. Each spec logs in as a specific role
 * and exercises the actions that role should be able to do.
 *
 * Prereq: run `./scripts/seed-e2e.sh` against the DB your dev server
 * is talking to. Login helper is in _helpers.ts.
 */
import { test, expect } from '@playwright/test';
import { loginAs, requireSupabaseEnv } from './_helpers';

test.describe.configure({ mode: 'serial' });

test('owner: home + issues + seeded task visible', async ({ page }) => {
  await loginAs(page, 'owner');
  await page.goto('/home');
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
  await page.goto('/issues');
  await page.waitForTimeout(1500);
  await expect(page.getByText(/ship pricing page rewrite/i).first()).toBeVisible();
});

test('admin1: opens platform-debt project + sees own task', async ({ page }) => {
  await loginAs(page, 'admin1');
  await page.goto('/projects');
  await page.waitForTimeout(1500);
  await expect(page.getByText(/platform debt/i).first()).toBeVisible();
  await page.goto('/tasks');
  await page.waitForTimeout(1500);
  await expect(page.getByText(/pin search_path/i).first()).toBeVisible();
});

test('member1: sees only assigned tasks list renders', async ({ page }) => {
  await loginAs(page, 'member1');
  await page.goto('/tasks');
  await page.waitForTimeout(1500);
  await expect(page.getByText(/ship pricing page rewrite/i).first()).toBeVisible();
});

test('viewer: nav renders but no "New project" CTA', async ({ page }) => {
  await loginAs(page, 'viewer');
  await page.goto('/projects');
  await page.waitForTimeout(1500);
  const btn = page.getByRole('link', { name: /new project/i }).or(
    page.getByRole('button', { name: /new project/i }),
  );
  await expect(btn).toHaveCount(0);
});

test('RLS: unauth request to a workspace row returns no data', async ({ request }) => {
  requireSupabaseEnv();
  const url = process.env.VITE_SUPABASE_URL!;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
  const res = await request.get(`${url}/rest/v1/tasks?select=id&limit=1`, {
    headers: { apikey: key },
  });
  expect(res.status()).toBeLessThan(500);
  const body = await res.json().catch(() => []);
  expect(Array.isArray(body) ? body : []).toEqual([]);
});
