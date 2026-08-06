/**
 * Shared helpers for role-based e2e specs. Every spec that logs in as
 * a seeded fixture user should import from here so the login + skip
 * behavior stays consistent.
 */
import { test, type Page, type APIRequestContext } from '@playwright/test';

export const PASSWORD = 'TestPw!e2e2026';

export const USERS = {
  owner:   'owner@e2e.test',
  admin1:  'admin1@e2e.test',
  admin2:  'admin2@e2e.test',
  member1: 'member1@e2e.test',
  member2: 'member2@e2e.test',
  viewer:  'viewer@e2e.test',
} as const;

export const USER_IDS = {
  owner:   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  admin1:  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  admin2:  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  member1: 'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  member2: 'cccccccc-cccc-cccc-cccc-ccccccccccc2',
  viewer:  'dddddddd-dddd-dddd-dddd-dddddddddddd',
} as const;

export const WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';
export const PROJECT_GROWTH = 'eeeeeeee-1111-eeee-1111-eeeeeeeeeeee';
export const PROJECT_DEBT   = 'eeeeeeee-2222-eeee-2222-eeeeeeeeeeee';

export type Role = keyof typeof USERS;

/** Sign in through the UI as a fixture user. Hard-fails with a
 *  diagnostic payload if the redirect never happens. */
export async function loginAs(page: Page, role: Role): Promise<void> {
  const email = USERS[role];
  const netErrs: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400 && (r.url().includes('supabase') || r.url().includes('/auth'))) {
      netErrs.push(`${r.status()} ${r.request().method()} ${r.url().slice(0, 100)}`);
    }
  });
  await page.goto('/auth');
  await page.locator('input[type="email"]:visible').first().fill(email);
  await page.locator('input[type="password"]:visible').first().fill(PASSWORD);
  await page.locator('input[type="password"]:visible').first().press('Enter');
  try {
    await page.waitForURL((u) => !u.toString().includes('/auth'), { timeout: 20_000 });
  } catch {
    throw new Error(
      `login stuck as ${role} (${email}). netErrs: ${netErrs.join(' | ') || '(none)'}`,
    );
  }
}

/** Get a Supabase access token via password grant. Handy for API-level
 *  specs that don't want a browser at all. */
export async function tokenFor(request: APIRequestContext, role: Role): Promise<string> {
  const url = process.env.VITE_SUPABASE_URL!;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
  const res = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: key, 'Content-Type': 'application/json' },
    data: { email: USERS[role], password: PASSWORD },
  });
  if (!res.ok()) throw new Error(`token grant failed for ${role}: ${res.status()} ${await res.text()}`);
  const body = await res.json();
  return body.access_token as string;
}

/** Skip the whole spec unless both Supabase env vars are present. */
export function requireSupabaseEnv() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  test.skip(!url || !key, 'VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY required');
}
