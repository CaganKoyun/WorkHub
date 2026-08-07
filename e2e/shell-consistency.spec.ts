/**
 * Shell consistency — every protected route MUST render the app shell
 * (sidebar + topbar), so users are never stranded. Regression guard
 * against pages forgetting to wrap in AppLayout/DomainWorkspace.
 *
 * Historic bug: /issues, /cycles, /docs and 25+ others rendered raw
 * page content with no sidebar and no back button — user had to hit
 * browser-back or type a URL. Fix routed all protected pages through
 * WorkspaceGate which now injects AppLayout unconditionally.
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './_helpers';

const ROUTES_TO_CHECK = [
  '/home', '/inbox', '/dashboard', '/issues', '/tasks', '/projects',
  '/bugs', '/cycles', '/roadmap', '/portfolios', '/workload',
  '/insights', '/product', '/timesheet', '/teams', '/leaderboard',
  '/assets', '/employees', '/company', '/portals', '/audit',
  '/admin', '/ai-chat', '/agent', '/meetings', '/chat', '/docs',
  '/automations', '/forms', '/whiteboards', '/desk', '/templates',
  '/integrations', '/api-tokens', '/settings',
  '/notification-settings', '/workspace/settings', '/analytics',
  '/crm', '/finance', '/goals', '/risks', '/decisions', '/import',
  '/custom-fields', '/workflow-states',
];

async function hasShell(page: Page): Promise<boolean> {
  // Sidebar is rendered by AppSidebar as <aside>. TopBar has a Breadcrumb nav.
  // Wait up to 8s for either to appear (workspace context may still be loading).
  try {
    await page.locator('aside').first().waitFor({ state: 'attached', timeout: 8_000 });
    return true;
  } catch {
    // aside not found; try breadcrumb nav
  }
  const nav = await page.getByRole('navigation', { name: /breadcrumb/i }).count();
  return nav > 0;
}

test('every protected route renders sidebar + topbar', async ({ page }) => {
  test.setTimeout(300_000);
  await loginAs(page, 'owner');
  const orphaned: string[] = [];
  for (const path of ROUTES_TO_CHECK) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    if (!(await hasShell(page))) orphaned.push(path);
  }
  expect(orphaned, `these routes render without app shell: ${orphaned.join(', ')}`).toEqual([]);
});
