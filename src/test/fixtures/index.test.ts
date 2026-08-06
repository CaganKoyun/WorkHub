import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetFixtureSequence,
  userFactory,
  workspaceFactory,
  projectFactory,
  taskFactory,
  bugFactory,
  opportunityFactory,
  quoteItemFactory,
  finTransactionFactory,
  approvalFactory,
  buildScenario,
} from './index';

/**
 * Fixture factory sözleşmeleri:
 *  - Deterministik: ardışık çağrılar farklı ama tekrarlanabilir id üretir.
 *  - Overrides üstün: `{ id: 'x' }` verildiğinde onu koruyor.
 *  - Default değerler senaryolar için yeterince gerçekçi.
 */

beforeEach(() => resetFixtureSequence());

describe('factory basics', () => {
  it('userFactory generates unique deterministic ids per call', () => {
    const a = userFactory();
    const b = userFactory();
    expect(a.id).not.toBe(b.id);
    expect(a.email).toContain(a.id);
  });

  it('workspaceFactory owner_id is settable', () => {
    const ws = workspaceFactory({ owner_id: 'user_x' });
    expect(ws.owner_id).toBe('user_x');
  });

  it('taskFactory default has no assignee', () => {
    expect(taskFactory().assignee_id).toBeNull();
  });

  it('bugFactory produces BUG-##### tracking key', () => {
    const b = bugFactory();
    expect(b.tracking_key).toMatch(/^BUG-\d{5}$/);
  });

  it('opportunityFactory currency defaults USD', () => {
    expect(opportunityFactory().currency).toBe('USD');
  });

  it('quoteItemFactory tax defaults 20%', () => {
    expect(quoteItemFactory().tax_pct).toBe(20);
  });

  it('finTransactionFactory direction is outflow by default', () => {
    expect(finTransactionFactory().direction).toBe('outflow');
  });

  it('approvalFactory status is pending by default', () => {
    expect(approvalFactory().status).toBe('pending');
  });

  it('overrides win over defaults', () => {
    const p = projectFactory({ name: 'Override', status: 'archived' });
    expect(p.name).toBe('Override');
    expect(p.status).toBe('archived');
  });
});

describe('buildScenario', () => {
  it('creates one user per role and matching members', () => {
    const s = buildScenario();
    expect(Object.keys(s.users).sort()).toEqual(
      ['admin', 'guest', 'manager', 'member', 'owner', 'viewer'].sort(),
    );
    expect(s.members).toHaveLength(6);
    expect(new Set(s.members.map((m) => m.role)).size).toBe(6);
  });

  it('all members belong to the same workspace', () => {
    const s = buildScenario();
    for (const m of s.members) expect(m.workspace_id).toBe(s.workspace.id);
  });
});
