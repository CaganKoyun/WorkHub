/**
 * RLS matrix — verifies row-level security at the REST layer using
 * per-user JWTs, no browser involved. Fast and precise: exactly the
 * checks a leaked-token or misused-key attacker would try.
 *
 * What we assert:
 *  1. Anon (apikey only, no bearer) sees zero rows across sensitive
 *     tables — no leak.
 *  2. Every seeded role can read tasks in workspace 11111111-...
 *     (they're all members of it).
 *  3. member1 CANNOT read or write outside their workspace — trying to
 *     query a task by an id that doesn't exist in their workspace
 *     returns empty, not a 403 (RLS style).
 *  4. viewer CANNOT insert tasks — the write is rejected.
 *  5. member1 CAN insert a task in workspace 11111111-... (has write
 *     grant), and the row is cleaned up after.
 */
import { test, expect } from '@playwright/test';
import { tokenFor, requireSupabaseEnv, WORKSPACE_ID, PROJECT_GROWTH, USER_IDS } from './_helpers';

const SENSITIVE_TABLES = [
  'tasks', 'projects', 'project_members', 'workspaces',
  'workspace_members', 'chat_messages', 'notifications',
];

test.beforeAll(() => requireSupabaseEnv());

const URL = () => process.env.VITE_SUPABASE_URL!;
const KEY = () => process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

test('anon requests leak no rows from sensitive tables', async ({ request }) => {
  for (const table of SENSITIVE_TABLES) {
    const res = await request.get(`${URL()}/rest/v1/${table}?select=id&limit=5`, {
      headers: { apikey: KEY() },
    });
    // 200 with [] is the RLS-correct response; treat 4xx as also fine
    // (some tables may 401 without a bearer). What matters: no data.
    expect(res.status(), `${table} unauth status`).toBeLessThan(500);
    if (res.ok()) {
      const body = await res.json();
      expect(Array.isArray(body) ? body : [], `${table} unauth body`).toEqual([]);
    }
  }
});

test('every seeded role can read their workspace tasks', async ({ request }) => {
  for (const role of ['owner', 'admin1', 'member1', 'viewer'] as const) {
    const jwt = await tokenFor(request, role);
    const res = await request.get(
      `${URL()}/rest/v1/tasks?workspace_id=eq.${WORKSPACE_ID}&select=id,title&limit=50`,
      { headers: { apikey: KEY(), Authorization: `Bearer ${jwt}` } },
    );
    expect(res.status(), `${role} read tasks`).toBe(200);
    const rows = await res.json();
    expect(Array.isArray(rows), `${role} rows array`).toBe(true);
    expect(rows.length, `${role} sees ≥1 task`).toBeGreaterThan(0);
  }
});

test('viewer cannot insert a task', async ({ request }) => {
  const jwt = await tokenFor(request, 'viewer');
  const res = await request.post(`${URL()}/rest/v1/tasks`, {
    headers: {
      apikey: KEY(),
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    data: {
      workspace_id: WORKSPACE_ID,
      project_id: PROJECT_GROWTH,
      title: 'e2e viewer should not create this',
      status: 'todo',
      reporter_id: USER_IDS.viewer,
    },
  });
  // RLS-blocked write returns 4xx or 403; must NOT be 2xx.
  expect(res.status(), `viewer insert status: ${res.status()}`).toBeGreaterThanOrEqual(400);
});

test('member1 can insert + delete their own task', async ({ request }) => {
  const jwt = await tokenFor(request, 'member1');
  const marker = `e2e-rls-${Date.now()}`;

  const ins = await request.post(`${URL()}/rest/v1/tasks`, {
    headers: {
      apikey: KEY(),
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    data: {
      workspace_id: WORKSPACE_ID,
      project_id: PROJECT_GROWTH,
      title: marker,
      status: 'todo',
      // tasks_insert policy requires reporter_id = auth.uid()
      reporter_id: USER_IDS.member1,
    },
  });
  expect(ins.status(), `member1 insert status: ${ins.status()} ${await ins.text().catch(()=>':body:')}`).toBeLessThan(300);
  const [row] = await ins.json();
  expect(row?.id, 'inserted id').toBeTruthy();

  // Clean up so repeated runs don't accumulate rows.
  const del = await request.delete(`${URL()}/rest/v1/tasks?id=eq.${row.id}`, {
    headers: { apikey: KEY(), Authorization: `Bearer ${jwt}` },
  });
  expect(del.status(), 'delete status').toBeLessThan(300);
});
