import { describe, it, expect } from 'vitest';
import { normalizeConfidence, riceScore, iceScore, sortByRice } from './rice';

/**
 * PRD-02 · RICE / ICE puanlama testleri.
 * Backend-bağımsız, saf fonksiyon.
 */

describe('normalizeConfidence', () => {
  it.each([
    [0, 0],
    [-1, 0],
    [0.5, 0.5],
    [1, 1],
    [50, 0.5],
    [100, 1],
    [150, 1], // clamp
    [NaN, 0],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeConfidence(raw as number)).toBe(expected);
  });
});

describe('riceScore', () => {
  it('canonical example (1000 × 2 × 0.8 / 4 = 400)', () => {
    expect(riceScore({ reach: 1000, impact: 2, confidence: 0.8, effort: 4 })).toBe(400);
  });

  it('accepts confidence as percentage', () => {
    expect(riceScore({ reach: 1000, impact: 2, confidence: 80, effort: 4 })).toBe(400);
  });

  it('rounds to two decimals', () => {
    // 1 × 1 × 0.333 / 1 = 0.333 → 0.33
    expect(riceScore({ reach: 1, impact: 1, confidence: 0.333, effort: 1 })).toBe(0.33);
  });

  it('effort 0 → null (undefined skor anlamsız)', () => {
    expect(riceScore({ reach: 100, impact: 3, confidence: 1, effort: 0 })).toBeNull();
  });

  it('negative reach → null', () => {
    expect(riceScore({ reach: -1, impact: 2, confidence: 1, effort: 1 })).toBeNull();
  });

  it('negative impact → null', () => {
    expect(riceScore({ reach: 100, impact: -1, confidence: 1, effort: 1 })).toBeNull();
  });

  it('NaN inputs → null', () => {
    expect(riceScore({ reach: NaN, impact: 1, confidence: 1, effort: 1 })).toBeNull();
    expect(riceScore({ reach: 1, impact: NaN, confidence: 1, effort: 1 })).toBeNull();
    expect(riceScore({ reach: 1, impact: 1, confidence: 1, effort: NaN })).toBeNull();
  });

  it('confidence <=0 → skor 0', () => {
    expect(riceScore({ reach: 100, impact: 2, confidence: 0, effort: 4 })).toBe(0);
  });
});

describe('iceScore', () => {
  it('canonical example (impact 8 × 0.7 × ease 5 = 28)', () => {
    expect(iceScore({ impact: 8, confidence: 0.7, ease: 5 })).toBe(28);
  });

  it('ease 0 → 0 (skorlanabilir ama en alt)', () => {
    expect(iceScore({ impact: 10, confidence: 1, ease: 0 })).toBe(0);
  });

  it('negative impact clamps to 0', () => {
    expect(iceScore({ impact: -5, confidence: 1, ease: 5 })).toBe(0);
  });

  it('accepts confidence as percentage', () => {
    expect(iceScore({ impact: 8, confidence: 70, ease: 5 })).toBe(28);
  });
});

describe('sortByRice', () => {
  it('descending by rice, nulls last', () => {
    const items = [
      { name: 'a', rice: 100 },
      { name: 'b', rice: null },
      { name: 'c', rice: 400 },
      { name: 'd', rice: 50 },
    ];
    expect(sortByRice(items).map((i) => i.name)).toEqual(['c', 'a', 'd', 'b']);
  });

  it('all-null items sort by id/name tie-breaker', () => {
    const items = [
      { name: 'b', rice: null },
      { name: 'a', rice: null },
    ];
    expect(sortByRice(items).map((i) => i.name)).toEqual(['a', 'b']);
  });

  it('empty array', () => {
    expect(sortByRice([])).toEqual([]);
  });
});
