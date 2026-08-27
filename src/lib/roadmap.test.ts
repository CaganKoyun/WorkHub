import { describe, it, expect } from 'vitest';
import { computeRange, positionItems, monthTicks, todayMarker, toDate } from './roadmap';

const today = new Date('2026-05-15T00:00:00Z');

describe('computeRange', () => {
  it('falls back to today ±30/90d when no dates', () => {
    const r = computeRange([], today);
    expect(r.start.getTime()).toBeLessThan(today.getTime());
    expect(r.end.getTime()).toBeGreaterThan(today.getTime());
    expect(r.end.getTime() - r.start.getTime()).toBeGreaterThan(60 * 86_400_000);
  });

  it('pads the min/max by 14 days', () => {
    const items = [
      { id: 'a', start: new Date('2026-04-01'), end: new Date('2026-06-01') },
    ];
    const r = computeRange(items, today);
    expect(r.start.getTime()).toBeLessThan(new Date('2026-04-01').getTime());
    expect(r.end.getTime()).toBeGreaterThan(new Date('2026-06-01').getTime());
  });

  it('enforces min 60-day window', () => {
    const items = [
      { id: 'a', start: new Date('2026-05-10'), end: new Date('2026-05-14') },
    ];
    const r = computeRange(items, today);
    expect(r.end.getTime() - r.start.getTime()).toBeGreaterThanOrEqual(60 * 86_400_000);
  });
});

describe('positionItems', () => {
  const range = { start: new Date('2026-01-01'), end: new Date('2026-12-31') };

  it('marks unscheduled when either date is missing', () => {
    const [p] = positionItems([{ id: 'a', start: null, end: null }], range);
    expect(p.scheduled).toBe(false);
    expect(p.widthPct).toBe(0);
  });

  it('positions a mid-year bar around the middle', () => {
    const [p] = positionItems(
      [{ id: 'a', start: new Date('2026-04-01'), end: new Date('2026-08-01') }],
      range,
    );
    expect(p.leftPct).toBeGreaterThan(20);
    expect(p.leftPct).toBeLessThan(30);
    expect(p.widthPct).toBeGreaterThan(30);
  });

  it('enforces a min visible width', () => {
    const [p] = positionItems(
      [{ id: 'a', start: new Date('2026-06-15'), end: new Date('2026-06-16') }],
      range,
    );
    expect(p.widthPct).toBeGreaterThanOrEqual(1.5);
  });
});

describe('monthTicks', () => {
  it('emits one entry per crossed month boundary', () => {
    const ticks = monthTicks({ start: new Date('2026-03-15'), end: new Date('2026-06-15') });
    // Apr, May, Jun start crossings = 3
    expect(ticks).toHaveLength(3);
  });
});

describe('todayMarker', () => {
  it('returns null when today is outside the range', () => {
    expect(todayMarker({ start: new Date('2026-01-01'), end: new Date('2026-02-01') }, today)).toBeNull();
  });
  it('returns a percentage when inside', () => {
    const p = todayMarker({ start: new Date('2026-05-01'), end: new Date('2026-05-31') }, today);
    expect(p).not.toBeNull();
    expect(p!).toBeGreaterThan(0);
    expect(p!).toBeLessThan(100);
  });
});

describe('toDate', () => {
  it('returns null for empty/invalid', () => {
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
    expect(toDate('not a date')).toBeNull();
  });
  it('parses ISO', () => {
    expect(toDate('2026-05-15')?.getUTCFullYear()).toBe(2026);
  });
});
