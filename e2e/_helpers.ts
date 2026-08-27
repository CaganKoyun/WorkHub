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

/** Auth0 uses external redirects — browser-based login is not
 *  automatable in e2e without an Auth0 test tenant with ROPC grant.
 *  Tests that need an authenticated session should skip for now. */
export async function loginAs(_page: Page, _role: Role): Promise<void> {
  test.skip(true, 'loginAs requires Auth0 ROPC or test-tenant automation — skipped under Auth0');
}

/** Auth0 migration: Supabase password grant is no longer available.
 *  Tests using tokenFor should skip until an Auth0 machine-to-machine
 *  token flow is set up for the e2e test users. */
export async function tokenFor(_request: APIRequestContext, _role: Role): Promise<string> {
  test.skip(true, 'tokenFor requires Supabase-native auth — skipped under Auth0');
  return ''; // unreachable, satisfies TS
}

/** Skip the whole spec unless both Supabase env vars are present. */
export function requireSupabaseEnv() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  test.skip(!url || !key, 'VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY required');
}
