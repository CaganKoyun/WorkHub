/**
 * Project lifecycle — owner creates a project, verifies auto-owner-
 * membership trigger, adds an admin as project member, admin then
 * creates a task under it, owner deletes the project.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { tokenFor, requireSupabaseEnv, WORKSPACE_ID, USER_IDS } from './_helpers';

test.beforeAll(() => requireSupabaseEnv());
const URL = () => process.env.VITE_SUPABASE_URL!;
const KEY = () => process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

function auth(jwt: string) {
  return { apikey: KEY(), Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };
}
async function get(req: APIRequestContext, jwt: string, path: string) {
  return req.get(`${URL()}/rest/v1/${path}`, { headers: auth(jwt) });
}
async function post(req: APIRequestContext, jwt: string, path: string, body: unknown) {
  return req.post(`${URL()}/rest/v1/${path}`, {
    headers: { ...auth(jwt), Prefer: 'return=representation' }, data: body,
  });
}
async function del(req: APIRequestContext, jwt: string, path: string) {
  return req.delete(`${URL()}/rest/v1/${path}`, { headers: auth(jwt) });
}

test('project lifecycle: create → auto-membership → add admin → task → delete', async ({ request }) => {
  test.setTimeout(60_000);
  const ownerJwt = await tokenFor(request, 'owner');
  const adminJwt = await tokenFor(request, 'admin1');
  const marker = `proj-lifecycle-${Date.now()}`;

  const ins = await post(request, ownerJwt, 'projects', {
    workspace_id: WORKSPACE_ID,
    name: marker,
    owner_id: USER_IDS.owner,
    color: '#5E6AD2',
  });
  expect(ins.status(), `create project: ${await ins.text().catch(()=>'')}`).toBeLessThan(300);
  const [proj] = await ins.json();
  const projId = proj.id;

  try {
    // Auto-membership trigger should have added owner to project_members.
    const mem = await get(request, ownerJwt,
      `project_members?project_id=eq.${projId}&user_id=eq.${USER_IDS.owner}&select=user_id`);
    expect(mem.status()).toBe(200);
    expect((await mem.json()).length, 'owner auto-added as project member').toBe(1);

    // Owner adds admin1 as project member
    const add = await post(request, ownerJwt, 'project_members', {
      project_id: projId,
      user_id: USER_IDS.admin1,
      workspace_id: WORKSPACE_ID,
    });
    expect(add.status(), `add admin: ${await add.text().catch(()=>'')}`).toBeLessThan(300);

    // Admin1 can now see the project
    const adminView = await get(request, adminJwt,
      `projects?id=eq.${projId}&select=id,name`);
    const arr = await adminView.json();
    expect(arr.length, 'admin1 sees new project').toBe(1);
    expect(arr[0].name).toBe(marker);

    // Admin1 creates a task under it
    const tInsRes = await post(request, adminJwt, 'tasks', {
      workspace_id: WORKSPACE_ID,
      project_id: projId,
      title: `${marker}-task`,
      status: 'todo',
      reporter_id: USER_IDS.admin1,
    });
    expect(tInsRes.status(), `admin creates task: ${await tInsRes.text().catch(()=>'')}`).toBeLessThan(300);
    const [tRow] = await tInsRes.json();
    const taskId = tRow.id;

    // Owner deletes task, then project
    await del(request, ownerJwt, `tasks?id=eq.${taskId}`);
    const rm = await del(request, ownerJwt, `projects?id=eq.${projId}`);
    expect(rm.status(), 'delete project').toBeLessThan(300);

    const gone = await get(request, ownerJwt, `projects?id=eq.${projId}&select=id`);
    expect((await gone.json()).length).toBe(0);
  } catch (e) {
    await del(request, ownerJwt, `projects?id=eq.${projId}`).catch(() => {});
    throw e;
  }
});
