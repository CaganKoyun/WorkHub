import { describe, it, expect } from 'vitest';
import { matchesCombo } from './keybinds';

function key(k: string, mods: Partial<{ meta: boolean; ctrl: boolean; alt: boolean }> = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key: k,
    metaKey: mods.meta ?? false,
    ctrlKey: mods.ctrl ?? false,
    altKey: mods.alt ?? false,
  });
}

describe('matchesCombo', () => {
  it('matches ⌘K with meta or ctrl', () => {
    expect(matchesCombo(key('k', { meta: true }), [], '⌘K')).toBe(true);
    expect(matchesCombo(key('K', { ctrl: true }), [], '⌘K')).toBe(true);
  });

  it('rejects plain k for ⌘K', () => {
    expect(matchesCombo(key('k'), [], '⌘K')).toBe(false);
  });

  it('matches ? without modifiers', () => {
    expect(matchesCombo(key('?'), [], '?')).toBe(true);
    expect(matchesCombo(key('?', { meta: true }), [], '?')).toBe(false);
  });

  it('matches simple letter C without mods', () => {
    expect(matchesCombo(key('c'), [], 'C')).toBe(true);
    expect(matchesCombo(key('c', { meta: true }), [], 'C')).toBe(false);
  });

  it('matches chord "G H" only when chord starts with g', () => {
    expect(matchesCombo(key('h'), ['g'], 'G H')).toBe(true);
    expect(matchesCombo(key('h'), [], 'G H')).toBe(false);
    expect(matchesCombo(key('x'), ['g'], 'G H')).toBe(false);
  });
});
