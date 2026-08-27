import { describe, it, expect } from 'vitest';
import { parseQuickAdd } from './quick-add-parse';

describe('parseQuickAdd', () => {
  it('returns empty for empty input', () => {
    const r = parseQuickAdd('');
    expect(r.title).toBe('');
    expect(r.projectHint).toBeNull();
    expect(r.assigneeHint).toBeNull();
    expect(r.priority).toBeNull();
  });

  it('parses tokens anywhere in the string', () => {
    const r = parseQuickAdd('Fix login bug #product @cagan !urgent');
    expect(r.title).toBe('Fix login bug');
    expect(r.projectHint).toBe('product');
    expect(r.assigneeHint).toBe('cagan');
    expect(r.priority).toBe('urgent');
  });

  it('supports Turkish priority keywords', () => {
    expect(parseQuickAdd('CI\'yi düzelt !acil').priority).toBe('urgent');
    expect(parseQuickAdd('logo değiştir !yüksek').priority).toBe('high');
    expect(parseQuickAdd('küçük iş !düşük').priority).toBe('low');
  });

  it('first # is project, rest are tags', () => {
    const r = parseQuickAdd('Add auth #backend #urgent-fix #legacy');
    expect(r.projectHint).toBe('backend');
    expect(r.tags).toEqual(['urgent-fix', 'legacy']);
    expect(r.title).toBe('Add auth');
  });

  it('order-independent', () => {
    const r = parseQuickAdd('@ayse !high #product Ship login');
    expect(r.title).toBe('Ship login');
    expect(r.assigneeHint).toBe('ayse');
    expect(r.priority).toBe('high');
    expect(r.projectHint).toBe('product');
  });

  it('ignores unknown !bang', () => {
    const r = parseQuickAdd('title !nonesuch');
    expect(r.priority).toBeNull();
    expect(r.title).toBe('title');
  });

  it('collapses extra whitespace in title', () => {
    const r = parseQuickAdd('  hello   world   !urgent  ');
    expect(r.title).toBe('hello world');
  });
});
