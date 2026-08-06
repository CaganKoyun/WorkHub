import { describe, it, expect, beforeEach } from 'vitest';
import { loadRecents, pushRecent, clearRecents } from './recents';

beforeEach(() => {
  localStorage.clear();
});

describe('recents', () => {
  it('returns [] when nothing stored', () => {
    expect(loadRecents('u1', 'w1')).toEqual([]);
  });

  it('pushes and reads in most-recent-first order', () => {
    pushRecent('u1', 'w1', { kind: 'task', id: 'a', label: 'A', to: '/a' });
    pushRecent('u1', 'w1', { kind: 'doc', id: 'b', label: 'B', to: '/b' });
    const out = loadRecents('u1', 'w1');
    expect(out.map(r => r.id)).toEqual(['b', 'a']);
  });

  it('dedupes by (kind,id) and moves to top', () => {
    pushRecent('u1', 'w1', { kind: 'task', id: 'a', label: 'A', to: '/a' });
    pushRecent('u1', 'w1', { kind: 'doc', id: 'b', label: 'B', to: '/b' });
    pushRecent('u1', 'w1', { kind: 'task', id: 'a', label: 'A2', to: '/a' });
    const out = loadRecents('u1', 'w1');
    expect(out.map(r => r.id)).toEqual(['a', 'b']);
    expect(out[0].label).toBe('A2');
  });

  it('caps at 8', () => {
    for (let i = 0; i < 12; i++) {
      pushRecent('u1', 'w1', { kind: 'task', id: `t${i}`, label: `T${i}`, to: `/t${i}` });
    }
    const out = loadRecents('u1', 'w1');
    expect(out).toHaveLength(8);
    expect(out[0].id).toBe('t11');
  });

  it('isolates per user + workspace', () => {
    pushRecent('u1', 'w1', { kind: 'task', id: 'a', label: 'A', to: '/a' });
    pushRecent('u2', 'w1', { kind: 'task', id: 'x', label: 'X', to: '/x' });
    pushRecent('u1', 'w2', { kind: 'task', id: 'y', label: 'Y', to: '/y' });
    expect(loadRecents('u1', 'w1').map(r => r.id)).toEqual(['a']);
    expect(loadRecents('u2', 'w1').map(r => r.id)).toEqual(['x']);
    expect(loadRecents('u1', 'w2').map(r => r.id)).toEqual(['y']);
  });

  it('clearRecents removes only its scope', () => {
    pushRecent('u1', 'w1', { kind: 'task', id: 'a', label: 'A', to: '/a' });
    pushRecent('u2', 'w1', { kind: 'task', id: 'x', label: 'X', to: '/x' });
    clearRecents('u1', 'w1');
    expect(loadRecents('u1', 'w1')).toEqual([]);
    expect(loadRecents('u2', 'w1').map(r => r.id)).toEqual(['x']);
  });

  it('survives garbage in storage', () => {
    localStorage.setItem('wh:recents:u1:w1', 'not json');
    expect(loadRecents('u1', 'w1')).toEqual([]);
  });
});
