/**
 * Signed-in hard crawl — logs in as each seeded role and walks every
 * top-level authed route, collecting pageerror + failed Supabase
 * requests per page. Writes test-results/authed-crawl/<role>.json for
 * a follow-up report. This replaces the sign-up-based hard-crawl that
 * was blocked by email confirmation.
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { loginAs, type Role } from './_helpers';

const REPORT_DIR = 'test-results/authed-crawl';
mkdirSync(REPORT_DIR, { recursive: true });

interface RouteResult {
  path: string;
  landedAt: string;
  status: 'ok' | 'redirected' | 'error';
  pageErrors: string[];
  failedRequests: { url: string; status: number }[];
}

// Covers every left-nav destination + the create/detail entry points
// commonly linked from the app shell. Skips deeply-nested detail pages
// that need a specific id — role-flows covers those.
const ROUTES = [
  '/home', '/inbox', '/dashboard', '/issues', '/views', '/cycles',
  '/roadmap', '/projects', '/portfolios', '/tasks', '/workload',
  '/insights', '/bugs', '/product', '/timesheet', '/teams',
  '/leaderboard', '/assets', '/employees', '/company', '/portals',
  '/audit', '/admin', '/ai-chat', '/agent', '/meetings', '/chat',
  '/docs', '/automations', '/forms', '/whiteboards', '/desk',
  '/templates', '/integrations', '/api-tokens', '/settings',
  '/notification-settings', '/workspace/settings', '/analytics',
  '/crm', '/finance', '/goals', '/risks', '/decisions', '/import',
  '/custom-fields', '/workflow-states',
];

async function visit(page: Page, path: string): Promise<RouteResult> {
  const r: RouteResult = { path, landedAt: '', status: 'ok', pageErrors: [], failedRequests: [] };
  const onErr = (e: Error) => r.pageErrors.push(e.message.slice(0, 300));
  const onResp = (res: import('@playwright/test').Response) => {
    if (res.status() >= 400 && res.url().includes('supabase')) {
      r.failedRequests.push({ url: res.url().slice(0, 120), status: res.status() });
    }
  };
  page.on('pageerror', onErr);
  page.on('response', onResp);
  try {
    const resp = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.waitForTimeout(1200); // let react-query settle
    r.landedAt = page.url().replace(/^https?:\/\/[^/]+/, '');
    if (resp && resp.status() >= 400) r.status = 'error';
    else if (r.landedAt !== path && !r.landedAt.startsWith(path)) r.status = 'redirected';
  } catch (e) {
    r.status = 'error';
    r.pageErrors.push(`goto: ${String((e as Error).message).slice(0, 200)}`);
  } finally {
    page.off('pageerror', onErr);
    page.off('response', onResp);
  }
  return r;
}

test.describe.configure({ mode: 'serial' });

for (const role of ['owner', 'admin1', 'member1', 'viewer'] as Role[]) {
  test(`authed-crawl as ${role}`, async ({ page }) => {
    test.setTimeout(300_000);
    await loginAs(page, role);
    const results: RouteResult[] = [];
    for (const p of ROUTES) results.push(await visit(page, p));

    const brokenPages = results.filter((r) => r.pageErrors.length > 0);
    const failed4xx = results.flatMap((r) => r.failedRequests.filter((f) => f.status >= 400 && f.status < 500));
    const failed5xx = results.flatMap((r) => r.failedRequests.filter((f) => f.status >= 500));

    writeFileSync(
      `${REPORT_DIR}/${role}.json`,
      JSON.stringify({ role, routes: results.length, brokenPages: brokenPages.length,
        failed4xx: failed4xx.length, failed5xx: failed5xx.length, results }, null, 2),
    );

    // Any 5xx or unhandled pageerror is a real bug. 4xx (RLS deny)
    // is expected for some roles on some routes and not asserted.
    expect(failed5xx, `5xx Supabase calls for ${role}: ${JSON.stringify(failed5xx.slice(0, 5))}`).toEqual([]);
    expect(brokenPages.map((r) => `${r.path}: ${r.pageErrors[0]}`),
      `pageerrors for ${role}`).toEqual([]);
  });
}
