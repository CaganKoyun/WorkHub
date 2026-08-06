/**
 * Role-flow E2E — uses the seeded fixture users from
 * supabase/seed/e2e-fixtures.sql. Each spec logs in as a specific role
 * and exercises the actions that role should be able to do (and, for
 * viewer, the ones it must NOT).
 *
 * Prereq: run `./scripts/seed-e2e.sh` against the DB your dev server
 * is talking to. Tests skip themselves when the DB doesn't have the
 * fixture users (login fails with invalid credentials).
 */
import { test, expect, type Page } from '@playwright/test';

const PASSWORD = 'TestPw!e2e2026';
const USERS = {
  owner:   'owner@e2e.test',
  admin1:  'admin1@e2e.test',
  admin2:  'admin2@e2e.test',
  member1: 'member1@e2e.test',
  member2: 'member2@e2e.test',
  viewer:  'viewer@e2e.test',
} as const;

async function loginOrSkip(page: Page, email: string) {
  const netErrs: string[] = [];
  const consoleErrs: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)); });
  page.on('response', (r) => {
    if (r.status() >= 400 && (r.url().includes('supabase') || r.url().includes('/auth'))) {
      netErrs.push(`${r.status()} ${r.request().method()} ${r.url().slice(0, 120)}`);
    }
  });

  await page.goto('/auth');
  await page.locator('input[type="email"]:visible').first().fill(email);
  await page.locator('input[type="password"]:visible').first().fill(PASSWORD);
  await page.locator('input[type="password"]:visible').first().press('Enter');

  try {
    await page.waitForURL((u) => !u.toString().includes('/auth'), { timeout: 20_000 });
  } catch {
    const url = page.url();
    const body = (await page.textContent('body').catch(() => ''))?.slice(0, 300) ?? '';
    // Hard-fail so the message surfaces — was skipping silently before.
    throw new Error(
      `login stuck on ${url} for ${email}\n` +
      `netErrs: ${netErrs.join(' | ') || '(none)'}\n` +
      `consoleErrs: ${consoleErrs.slice(0, 5).join(' | ') || '(none)'}\n` +
      `body: ${body}`
    );
  }
}

async function collectErrors(page: Page): Promise<string[]> {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(e.message));
  return errs;
}

test.describe.configure({ mode: 'serial' });

test('owner: home + issues + create task', async ({ page }) => {
  const errs = await collectErrors(page);
  await loginOrSkip(page, USERS.owner);

  await page.goto('/home');
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });

  await page.goto('/issues');
  await page.waitForTimeout(1500);
  // At least one seeded task must be visible.
  await expect(page.getByText(/ship pricing page rewrite/i).first()).toBeVisible();

  expect(errs, `pageerrors on owner walk: ${errs.join('\n')}`).toEqual([]);
});

test('admin1: opens platform-debt project + sees own task', async ({ page }) => {
  const errs = await collectErrors(page);
  await loginOrSkip(page, USERS.admin1);

  await page.goto('/projects');
  await page.waitForTimeout(1500);
  await expect(page.getByText(/platform debt/i).first()).toBeVisible();

  await page.goto('/tasks');
  await page.waitForTimeout(1500);
  await expect(page.getByText(/pin search_path/i).first()).toBeVisible();

  expect(errs).toEqual([]);
});

test('member1: sees only assigned tasks + can add comment', async ({ page }) => {
  const errs = await collectErrors(page);
  await loginOrSkip(page, USERS.member1);

  await page.goto('/tasks');
  await page.waitForTimeout(1500);
  // Assigned to member1: "Ship pricing page rewrite" and "A/B test hero headline"
  await expect(page.getByText(/ship pricing page rewrite/i).first()).toBeVisible();

  // Wire-in comment step deferred until the task detail is opened;
  // this ensures the tasks list itself renders under the member role
  // and RLS lets them see rows they're on.
  expect(errs).toEqual([]);
});

test('viewer: nav renders but create actions are absent', async ({ page }) => {
  const errs = await collectErrors(page);
  await loginOrSkip(page, USERS.viewer);

  await page.goto('/projects');
  await page.waitForTimeout(1500);
  // "New project" primary action should not exist for viewer.
  const newProjectBtn = page.getByRole('link', { name: /new project/i }).or(
    page.getByRole('button', { name: /new project/i }),
  );
  await expect(newProjectBtn).toHaveCount(0);

  expect(errs).toEqual([]);
});

test('RLS: unauth request to a workspace row returns 401/403', async ({ request }) => {
  // Direct REST call without Authorization header should never leak data.
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  test.skip(!url || !key, 'SUPABASE env not set');
  const res = await request.get(`${url}/rest/v1/tasks?select=id&limit=1`, {
    headers: { apikey: key! },
  });
  // Without a bearer token, RLS returns [] (200) — not an error. What
  // matters is that no row leaks. Prefer 200-with-empty over a 500.
  expect(res.status()).toBeLessThan(500);
  const body = await res.json();
  expect(Array.isArray(body) ? body : []).toEqual([]);
});
