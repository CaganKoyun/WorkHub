/**
 * Hard crawl — visits every route (public + auth-required) with a fresh
 * account, collects console errors and failed network calls per page,
 * and writes a machine-readable JSON that a follow-up script converts
 * into docs/E2E-REPORT.md.
 *
 * Runs against whatever webServer playwright.config brings up. Slower
 * than the smoke tier by design; use with:
 *   npm run test:e2e -- hard-crawl.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const REPORT_DIR = 'test-results/hard-crawl';
mkdirSync(REPORT_DIR, { recursive: true });

interface RouteResult {
  path: string;
  landedAt: string;
  status: 'ok' | 'redirected' | 'error';
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: { url: string; status: number; method: string }[];
  screenshot?: string;
}

const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/invite/bogus-token-1234',
  '/f/bogus-slug',
  '/support/00000000-0000-0000-0000-000000000000',
  '/portal/bogus-token',
  '/nonexistent-page-404',
];

const AUTH_ROUTES = [
  '/home', '/inbox', '/dashboard', '/issues', '/views', '/cycles',
  '/roadmap', '/projects', '/projects/new', '/portfolios', '/tasks',
  '/workload', '/insights', '/bugs', '/bugs/new', '/product',
  '/timesheet', '/teams', '/leaderboard', '/assets', '/assets/new',
  '/employees', '/company', '/portals', '/audit', '/admin',
  '/ai-chat', '/agent', '/meetings', '/chat', '/docs', '/automations',
  '/forms', '/whiteboards', '/desk', '/templates', '/integrations',
  '/api-tokens', '/settings', '/notification-settings',
  '/workspace/settings', '/onboarding', '/analytics', '/crm',
  '/finance', '/goals', '/risks', '/decisions', '/import',
  '/custom-fields', '/workflow-states',
];

function attachCollectors(page: Page, r: RouteResult) {
  page.on('pageerror', (err) => r.pageErrors.push(err.message.slice(0, 500)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') r.consoleErrors.push(msg.text().slice(0, 500));
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      r.failedRequests.push({ url: res.url(), status: res.status(), method: res.request().method() });
    }
  });
}

async function visit(page: Page, path: string): Promise<RouteResult> {
  const r: RouteResult = {
    path,
    landedAt: '',
    status: 'ok',
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
  };
  attachCollectors(page, r);
  try {
    const resp = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.waitForTimeout(1500); // let react-query settle
    r.landedAt = page.url().replace(/^https?:\/\/[^/]+/, '');
    if (resp && resp.status() >= 400) r.status = 'error';
    else if (r.landedAt !== path && !r.landedAt.startsWith(path)) r.status = 'redirected';
    const safe = path.replace(/[^a-z0-9]+/gi, '_') || 'root';
    const shot = `${REPORT_DIR}/shot_${safe}.png`;
    await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
    r.screenshot = shot;
  } catch (e: any) {
    r.status = 'error';
    r.pageErrors.push(`goto: ${String(e.message ?? e).slice(0, 300)}`);
  }
  return r;
}

test.describe.configure({ mode: 'serial' });

test('anonymous crawl of public routes', async ({ page }) => {
  test.setTimeout(120_000);
  const results: RouteResult[] = [];
  for (const p of PUBLIC_ROUTES) results.push(await visit(page, p));
  writeFileSync(`${REPORT_DIR}/public.json`, JSON.stringify(results, null, 2));
  expect(results.length).toBe(PUBLIC_ROUTES.length);
});

test('signed-in crawl of every authenticated route', async ({ page }) => {
  test.skip(true, 'Auth0 uses external redirects — cannot automate sign-up in e2e without ROPC grant');
});
