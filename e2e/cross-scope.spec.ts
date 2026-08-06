/**
 * Cross-workspace + cross-user isolation — the classic RLS mistakes.
 * Uses fake UUIDs and other-workspace-scoped queries to make sure the
 * REST layer refuses to leak.
 */
import { test, expect } from '@playwright/test';
import { tokenFor, requireSupabaseEnv, USER_IDS } from './_helpers';

test.beforeAll(() => requireSupabaseEnv());
const URL = () => process.env.VITE_SUPABASE_URL!;
const KEY = () => process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const FAKE_WS = '00000000-0000-0000-0000-000000000fff';
const FAKE_PROJ = '00000000-0000-0000-0000-000000000eee';

test('a member cannot read tasks scoped to a workspace they are not in', async ({ request }) => {
  const jwt = await tokenFor(request, 'member1');
  const res = await request.get(
    `${URL()}/rest/v1/tasks?workspace_id=eq.${FAKE_WS}&select=id&limit=10`,
    { headers: { apikey: KEY(), Authorization: `Bearer ${jwt}` } },
  );
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual([]);
});

test('a member cannot insert a task into a foreign workspace', async ({ request }) => {
  const jwt = await tokenFor(request, 'member1');
  const res = await request.post(`${URL()}/rest/v1/tasks`, {
    headers: {
      apikey: KEY(),
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    data: {
      workspace_id: FAKE_WS,
      project_id: FAKE_PROJ,
      title: 'foreign-insert-attempt',
      status: 'todo',
      reporter_id: USER_IDS.member1,
    },
  });
  // RLS must reject.
  expect(res.status(), `foreign insert status`).toBeGreaterThanOrEqual(400);
});

test('viewer cannot read another user\'s notifications', async ({ request }) => {
  const jwt = await tokenFor(request, 'viewer');
  const res = await request.get(
    `${URL()}/rest/v1/notifications?user_id=eq.${USER_IDS.owner}&select=id&limit=5`,
    { headers: { apikey: KEY(), Authorization: `Bearer ${jwt}` } },
  );
  if (res.ok()) {
    expect((await res.json()).length, 'viewer sees no owner notifs').toBe(0);
  } else {
    expect(res.status(), 'RLS-error is acceptable').toBeGreaterThanOrEqual(400);
  }
});
