import { describe, it, expect } from 'vitest';
import {
  waitDays,
  summarizeWait,
  buildSnapshotDeltas,
  SNAPSHOT_FIELDS,
  type WaitItem,
} from './founder-metrics';

/**
 * FH-01/02 · Company Pulse + Bottleneck Radar temel metrikleri.
 * Zaman `now` parametre olarak enjekte edilir → deterministik.
 */

const NOW = new Date('2026-08-06T00:00:00.000Z');
const isoAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe('waitDays', () => {
  it('closed item returns decided_at - created_at', () => {
    const item: WaitItem = {
      created_at: isoAgo(5),
      decided_at: isoAgo(2),
      status: 'approved',
    };
    expect(waitDays(item, NOW)).toBeCloseTo(3, 5);
  });

  it('open item uses now as end', () => {
    const item: WaitItem = { created_at: isoAgo(4), decided_at: null, status: 'pending' };
    expect(waitDays(item, NOW)).toBeCloseTo(4, 5);
  });

  it('never negative — decided_at before created_at clamps to 0', () => {
    const item: WaitItem = {
      created_at: isoAgo(1),
      decided_at: isoAgo(3),
      status: 'approved',
    };
    expect(waitDays(item, NOW)).toBe(0);
  });
});

describe('summarizeWait', () => {
  it('empty list → zero-summary with null change', () => {
    const s = summarizeWait([], NOW);
    expect(s).toEqual({
      currentDays: 0,
      previousDays: 0,
      changePct: null,
      openCount: 0,
      longestOpenDays: 0,
    });
  });

  it('buckets waits by created_at month', () => {
    // Ağustos = mevcut ay; Temmuz = önceki ay
    const items: WaitItem[] = [
      { created_at: '2026-08-02T00:00:00Z', decided_at: '2026-08-05T00:00:00Z', status: 'approved' }, // 3g bu ay
      { created_at: '2026-07-01T00:00:00Z', decided_at: '2026-07-06T00:00:00Z', status: 'approved' }, // 5g geçen ay
      { created_at: '2026-07-15T00:00:00Z', decided_at: '2026-07-17T00:00:00Z', status: 'approved' }, // 2g geçen ay
    ];
    const s = summarizeWait(items, NOW);
    expect(s.currentDays).toBe(3);
    expect(s.previousDays).toBe(7);
  });

  it('changePct = null when previous month has no data', () => {
    const items: WaitItem[] = [
      { created_at: '2026-08-01T00:00:00Z', decided_at: '2026-08-03T00:00:00Z', status: 'approved' },
    ];
    expect(summarizeWait(items, NOW).changePct).toBeNull();
  });

  it('changePct positive when this month is slower', () => {
    const items: WaitItem[] = [
      { created_at: '2026-08-01T00:00:00Z', decided_at: '2026-08-05T00:00:00Z', status: 'approved' }, // 4g
      { created_at: '2026-07-01T00:00:00Z', decided_at: '2026-07-03T00:00:00Z', status: 'approved' }, // 2g
    ];
    expect(summarizeWait(items, NOW).changePct).toBe(100);
  });

  it('changePct negative = iyileşme', () => {
    const items: WaitItem[] = [
      { created_at: '2026-08-01T00:00:00Z', decided_at: '2026-08-02T00:00:00Z', status: 'approved' }, // 1g
      { created_at: '2026-07-01T00:00:00Z', decided_at: '2026-07-05T00:00:00Z', status: 'approved' }, // 4g
    ];
    expect(summarizeWait(items, NOW).changePct).toBe(-75);
  });

  it('counts pending items → openCount + longestOpenDays', () => {
    const items: WaitItem[] = [
      { created_at: isoAgo(2), decided_at: null, status: 'pending' },
      { created_at: isoAgo(10), decided_at: null, status: 'pending' },
      { created_at: isoAgo(5), decided_at: isoAgo(3), status: 'approved' },
    ];
    const s = summarizeWait(items, NOW);
    expect(s.openCount).toBe(2);
    expect(s.longestOpenDays).toBe(10);
  });

  it('closed items do not contribute to openCount', () => {
    const items: WaitItem[] = [
      { created_at: isoAgo(1), decided_at: isoAgo(0), status: 'approved' },
      { created_at: isoAgo(1), decided_at: isoAgo(0), status: 'rejected' },
    ];
    expect(summarizeWait(items, NOW).openCount).toBe(0);
  });
});

describe('buildSnapshotDeltas', () => {
  it('empty then → empty array', () => {
    expect(buildSnapshotDeltas(null, { cash_position: 100 })).toEqual([]);
  });

  it('missing now field → 0', () => {
    const deltas = buildSnapshotDeltas({ cash_position: 500 }, null);
    const cash = deltas.find((d) => d.key === 'cash_position');
    expect(cash?.then).toBe(500);
    expect(cash?.now).toBe(0);
  });

  it('preserves higherIsBetter from SNAPSHOT_FIELDS', () => {
    const deltas = buildSnapshotDeltas({ cash_position: 1 }, { cash_position: 2 });
    expect(deltas.every((d) => typeof d.higherIsBetter === 'boolean')).toBe(true);
    expect(deltas.find((d) => d.key === 'cash_position')?.higherIsBetter).toBe(true);
    expect(deltas.find((d) => d.key === 'open_tasks')?.higherIsBetter).toBe(false);
  });

  it('non-numeric string currently yields NaN (regression note)', () => {
    // Number('abc') is NaN. buildSnapshotDeltas has no isFinite guard.
    // If a fix lands (e.g. `Number.isFinite(v) ? v : 0`), flip this to `.toBe(0)`.
    const deltas = buildSnapshotDeltas({ cash_position: 'abc' as unknown }, null);
    expect(Number.isNaN(deltas.find((d) => d.key === 'cash_position')?.then)).toBe(true);
  });

  it('returns one row per SNAPSHOT_FIELDS entry', () => {
    const deltas = buildSnapshotDeltas({ x: 1 }, { y: 2 });
    expect(deltas.length).toBe(SNAPSHOT_FIELDS.length);
  });
});
