/**
 * Fixture factories — deterministic, framework-agnostic test data.
 *
 * Design rules (aligned with docs/TEST_COVERAGE_DETAILED.md §0):
 *  - Every factory takes an optional `overrides` argument.
 *  - IDs are deterministic per fixture-key so a single test file always
 *    yields the same values (helps snapshots and reproducibility).
 *  - No `Math.random()`, no `Date.now()`. Time comes from an injected
 *    `now` parameter with a safe UTC default.
 *  - No Supabase, no HTTP — plain objects only. Backend-dependent
 *    seeding lives in `src/test/fixtures/supabase.ts` (not yet).
 */

let seq = 0;
/** Reset per test file if you need stable ids: call in `beforeEach`. */
export function resetFixtureSequence(): void {
  seq = 0;
}
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq.toString().padStart(6, '0')}`;
}

const DEFAULT_NOW = new Date('2026-08-06T00:00:00.000Z');
const daysAgo = (n: number, now: Date = DEFAULT_NOW) =>
  new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

// ------------------------------------------------------------------
// Users, workspaces, members
// ------------------------------------------------------------------

export type Role = 'owner' | 'admin' | 'manager' | 'member' | 'viewer' | 'guest';

export interface UserFixture {
  id: string;
  email: string;
  full_name: string;
}

export function userFactory(overrides: Partial<UserFixture> = {}): UserFixture {
  const id = overrides.id ?? nextId('user');
  return {
    id,
    email: `${id}@qa.example`,
    full_name: `QA User ${id}`,
    ...overrides,
  };
}

export interface WorkspaceFixture {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
}

export function workspaceFactory(overrides: Partial<WorkspaceFixture> = {}): WorkspaceFixture {
  const id = overrides.id ?? nextId('ws');
  return {
    id,
    name: `Acme ${id.slice(-3)}`,
    slug: id,
    owner_id: overrides.owner_id ?? 'user_owner',
    created_at: daysAgo(30),
    ...overrides,
  };
}

export interface MemberFixture {
  workspace_id: string;
  user_id: string;
  role: Role;
}

export function memberFactory(overrides: Partial<MemberFixture> = {}): MemberFixture {
  return {
    workspace_id: 'ws_default',
    user_id: 'user_default',
    role: 'member',
    ...overrides,
  };
}

// ------------------------------------------------------------------
// Work — projects, tasks, bugs, cycles
// ------------------------------------------------------------------

export interface ProjectFixture {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  owner_id: string;
  status: 'active' | 'archived' | 'on_hold';
  created_at: string;
}

export function projectFactory(overrides: Partial<ProjectFixture> = {}): ProjectFixture {
  const id = overrides.id ?? nextId('prj');
  return {
    id,
    workspace_id: 'ws_default',
    name: `Project ${id.slice(-3)}`,
    description: '',
    owner_id: 'user_default',
    status: 'active',
    created_at: daysAgo(7),
    ...overrides,
  };
}

export interface TaskFixture {
  id: string;
  workspace_id: string;
  project_id: string | null;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'canceled';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  assignee_id: string | null;
  reporter_id: string;
  due_date: string | null;
  tags: string[];
  created_at: string;
}

export function taskFactory(overrides: Partial<TaskFixture> = {}): TaskFixture {
  const id = overrides.id ?? nextId('task');
  return {
    id,
    workspace_id: 'ws_default',
    project_id: 'prj_default',
    title: `Task ${id.slice(-3)}`,
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee_id: null,
    reporter_id: 'user_default',
    due_date: null,
    tags: [],
    created_at: daysAgo(1),
    ...overrides,
  };
}

export interface BugFixture {
  id: string;
  workspace_id: string;
  tracking_key: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
  reporter_id: string;
  assignee_id: string | null;
  created_at: string;
}

export function bugFactory(overrides: Partial<BugFixture> = {}): BugFixture {
  const id = overrides.id ?? nextId('bug');
  return {
    id,
    workspace_id: 'ws_default',
    tracking_key: `BUG-${(seq).toString().padStart(5, '0')}`,
    title: `Bug ${id.slice(-3)}`,
    severity: 'medium',
    status: 'open',
    reporter_id: 'user_default',
    assignee_id: null,
    created_at: daysAgo(2),
    ...overrides,
  };
}

// ------------------------------------------------------------------
// CRM — opportunity, quote
// ------------------------------------------------------------------

export interface OpportunityFixture {
  id: string;
  workspace_id: string;
  name: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'TRY';
  stage: string;
  probability: number;
  owner_id: string;
  created_at: string;
}

export function opportunityFactory(overrides: Partial<OpportunityFixture> = {}): OpportunityFixture {
  const id = overrides.id ?? nextId('opp');
  return {
    id,
    workspace_id: 'ws_default',
    name: `Deal ${id.slice(-3)}`,
    amount: 10_000,
    currency: 'USD',
    stage: 'qualified',
    probability: 40,
    owner_id: 'user_default',
    created_at: daysAgo(14),
    ...overrides,
  };
}

export interface QuoteItemFixture {
  description: string;
  qty: number;
  unit_price: number;
  discount_pct: number;
  tax_pct: number;
}

export function quoteItemFactory(overrides: Partial<QuoteItemFixture> = {}): QuoteItemFixture {
  return {
    description: 'Line item',
    qty: 1,
    unit_price: 100,
    discount_pct: 0,
    tax_pct: 20,
    ...overrides,
  };
}

// ------------------------------------------------------------------
// Finance
// ------------------------------------------------------------------

export interface FinTransactionFixture {
  id: string;
  workspace_id: string;
  account_id: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  occurred_at: string;
  direction: 'inflow' | 'outflow';
}

export function finTransactionFactory(overrides: Partial<FinTransactionFixture> = {}): FinTransactionFixture {
  const id = overrides.id ?? nextId('tx');
  return {
    id,
    workspace_id: 'ws_default',
    account_id: 'acc_default',
    amount: 1000,
    currency: 'USD',
    category: 'general',
    description: 'Transaction',
    occurred_at: daysAgo(3),
    direction: 'outflow',
    ...overrides,
  };
}

// ------------------------------------------------------------------
// Approvals (WaitItem-compatible for founder-metrics)
// ------------------------------------------------------------------

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'delegated' | 'snoozed';

export interface ApprovalFixture {
  id: string;
  workspace_id: string;
  type: 'expense' | 'hiring' | 'contract' | 'discount' | 'budget_change' | 'payment' | 'leave';
  status: ApprovalStatus;
  requester_id: string;
  decider_id: string | null;
  created_at: string;
  decided_at: string | null;
  amount_cents: number | null;
}

export function approvalFactory(overrides: Partial<ApprovalFixture> = {}): ApprovalFixture {
  const id = overrides.id ?? nextId('appr');
  return {
    id,
    workspace_id: 'ws_default',
    type: 'expense',
    status: 'pending',
    requester_id: 'user_manager',
    decider_id: null,
    created_at: daysAgo(1),
    decided_at: null,
    amount_cents: 100_000,
    ...overrides,
  };
}

// ------------------------------------------------------------------
// Convenience — a coherent multi-role workspace scenario
// ------------------------------------------------------------------

export interface Scenario {
  workspace: WorkspaceFixture;
  users: Record<Role, UserFixture>;
  members: MemberFixture[];
  now: Date;
}

/**
 * A canonical scenario used by permission and multi-tenant tests.
 * Each role has a dedicated user + membership row.
 */
export function buildScenario(now: Date = DEFAULT_NOW): Scenario {
  const owner = userFactory({ id: 'user_owner', full_name: 'Owner' });
  const admin = userFactory({ id: 'user_admin', full_name: 'Admin' });
  const manager = userFactory({ id: 'user_manager', full_name: 'Manager' });
  const member = userFactory({ id: 'user_member', full_name: 'Member' });
  const viewer = userFactory({ id: 'user_viewer', full_name: 'Viewer' });
  const guest = userFactory({ id: 'user_guest', full_name: 'Guest' });
  const workspace = workspaceFactory({ id: 'ws_acme', owner_id: owner.id });
  const members: MemberFixture[] = (
    ['owner', 'admin', 'manager', 'member', 'viewer', 'guest'] as Role[]
  ).map((role) =>
    memberFactory({ workspace_id: workspace.id, user_id: `user_${role}`, role }),
  );
  return {
    workspace,
    users: { owner, admin, manager, member, viewer, guest },
    members,
    now,
  };
}
