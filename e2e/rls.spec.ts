import { test, expect } from '@playwright/test';
import { clientAsRole, hasRoleFixtures } from './support/roles';

/**
 * P0 · Multi-tenant isolation (test-scope §3.6).
 *
 * The worst failure mode this product has: workspace A can see workspace
 * B's data. Every table we touch here must be blocked by RLS. Goes through
 * the raw Supabase client (no UI) so we can hit the wire directly.
 *
 * Skipped when TEST_USER_* env is missing. See e2e/support/roles.ts.
 */

test.describe('RLS — cross-workspace isolation', () => {
  test.skip(!hasRoleFixtures('owner', 'member'), 'Role fixture env not set');

  test.skip('member of workspace B cannot read workspace A tasks', async () => {
    // TODO(P0):
    // - const a = await clientAsRole('owner')      // seeded in workspace A
    // - const b = await clientAsRole('member')     // seeded in workspace B (distinct)
    // - const { data: seed } = await a.from('tasks').insert({...}).select().single()
    // - const { data: leak, error } = await b.from('tasks').select('*').eq('id', seed.id)
    // - expect(error).toBeNull(); expect(leak).toEqual([])   // RLS returns [], not 403
    expect(true).toBe(true);
  });

  test.skip('member cannot create a row that mentions foreign workspace_id', async () => {
    // TODO(P0): b.from('tasks').insert({workspace_id: <A>, ...}) must fail
    // (RLS with-check policy). If it succeeds we have a write-side leak.
    expect(true).toBe(true);
  });

  test.skip('workspace_admin_summary RPC never returns rows for a foreign workspace', async () => {
    // TODO(P0): call rpc('workspace_admin_summary', { _ws: <A> }) as user B.
    // Expect a row for THEIR workspace only, or an error — never foreign.
    expect(true).toBe(true);
  });
});
