import { describe, it, expect } from 'vitest';
import { evalFormula, formatFormulaValue, type FormulaContext } from './formula-eval';

const NOW = new Date('2026-02-10T12:00:00Z').getTime();

function ctx(overrides: Partial<FormulaContext> = {}): FormulaContext {
  return {
    self: { id: 't1', created_at: '2026-02-01T00:00:00Z', due_date: '2026-02-20', story_points: 5 },
    subtasks: [
      { id: 's1', status: 'done',        story_points: 2, estimated_hours: 4 },
      { id: 's2', status: 'in_progress', story_points: 3, estimated_hours: 8 },
      { id: 's3', status: 'todo',        story_points: 1, estimated_hours: 2 },
    ],
    ...overrides,
  };
}

describe('evalFormula', () => {
  it('counts subtasks', () => {
    expect(evalFormula('count(subtasks)', ctx())).toBe(3);
  });

  it('counts done subtasks', () => {
    expect(evalFormula('count(subtasks.done)', ctx())).toBe(1);
    expect(evalFormula('count(subtasks.open)', ctx())).toBe(2);
  });

  it('counts by status', () => {
    expect(evalFormula('count(subtasks.status:in_progress)', ctx())).toBe(1);
    expect(evalFormula('count(subtasks.status:todo)', ctx())).toBe(1);
    expect(evalFormula('count(subtasks.status:missing)', ctx())).toBe(0);
  });

  it('sums numeric fields', () => {
    expect(evalFormula('sum(subtasks.story_points)', ctx())).toBe(6);
    expect(evalFormula('sum(subtasks.estimated_hours)', ctx())).toBe(14);
  });

  it('averages numeric fields', () => {
    expect(evalFormula('avg(subtasks.story_points)', ctx())).toBeCloseTo(2, 2);
  });

  it('rejects unknown numeric field', () => {
    expect(evalFormula('sum(subtasks.random)', ctx())).toBeNull();
  });

  it('computes days_until due_date', () => {
    // due_date 2026-02-20, now 2026-02-10 → 10 days
    expect(evalFormula('days_until(due_date)', ctx(), NOW)).toBe(10);
  });

  it('computes days_since created_at', () => {
    // created 2026-02-01, now 2026-02-10 → 9 days since
    expect(evalFormula('days_since(created_at)', ctx(), NOW)).toBe(9);
  });

  it('returns null for missing date field', () => {
    expect(evalFormula('days_until(due_date)', ctx({ self: { id: 't1', due_date: null } }), NOW)).toBeNull();
  });

  it('rejects date field not in self', () => {
    expect(evalFormula('days_until(random_date)', ctx(), NOW)).toBeNull();
  });

  it('computes progress_pct', () => {
    expect(evalFormula('progress_pct(subtasks)', ctx())).toBe(33); // 1/3 done
  });

  it('progress_pct is 0 with no subtasks', () => {
    expect(evalFormula('progress_pct(subtasks)', ctx({ subtasks: [] }))).toBe(0);
  });

  it('returns null for empty / unknown formula', () => {
    expect(evalFormula('', ctx())).toBeNull();
    expect(evalFormula('  bogus(x)  ', ctx())).toBeNull();
  });

  it('trims whitespace', () => {
    expect(evalFormula('  count(subtasks)  ', ctx())).toBe(3);
  });
});

describe('formatFormulaValue', () => {
  it('formats numbers', () => {
    expect(formatFormulaValue(42)).toBe('42');
    expect(formatFormulaValue(42, ' gün')).toBe('42 gün');
  });

  it('formats null as em-dash', () => {
    expect(formatFormulaValue(null)).toBe('—');
  });
});
