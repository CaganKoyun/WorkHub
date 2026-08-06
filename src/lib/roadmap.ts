/**
 * Roadmap timeline math. Pure — no React, no DOM.
 * Given a set of projects with optional start/end dates, compute a padded
 * range then map each project to `{left, width}` percentages within it.
 */

export interface TimelineItem {
  id: string;
  start: Date | null;
  end: Date | null;
}

export interface Positioned {
  id: string;
  leftPct: number;
  widthPct: number;
  scheduled: boolean;
}

const DAY_MS = 86_400_000;

export function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const t = new Date(iso);
  return isNaN(t.getTime()) ? null : t;
}

export function computeRange(items: TimelineItem[], today: Date): { start: Date; end: Date } {
  const startCandidates = items.map(i => i.start).filter((d): d is Date => !!d);
  const endCandidates = items.map(i => i.end).filter((d): d is Date => !!d);
  let start: Date;
  let end: Date;
  if (startCandidates.length === 0 && endCandidates.length === 0) {
    start = new Date(today.getTime() - 30 * DAY_MS);
    end = new Date(today.getTime() + 90 * DAY_MS);
  } else {
    const s = startCandidates.length ? Math.min(...startCandidates.map(d => d.getTime())) : today.getTime();
    const e = endCandidates.length ? Math.max(...endCandidates.map(d => d.getTime())) : today.getTime();
    start = new Date(Math.min(s, e) - 14 * DAY_MS);
    end = new Date(Math.max(s, e) + 14 * DAY_MS);
  }
  // Ensure at least a 60-day window so tiny ranges are readable.
  if (end.getTime() - start.getTime() < 60 * DAY_MS) {
    end = new Date(start.getTime() + 60 * DAY_MS);
  }
  return { start, end };
}

export function positionItems(items: TimelineItem[], range: { start: Date; end: Date }): Positioned[] {
  const total = range.end.getTime() - range.start.getTime();
  return items.map(i => {
    if (!i.start || !i.end) {
      return { id: i.id, leftPct: 0, widthPct: 0, scheduled: false };
    }
    const startMs = Math.max(i.start.getTime(), range.start.getTime());
    const endMs = Math.min(i.end.getTime(), range.end.getTime());
    const left = ((startMs - range.start.getTime()) / total) * 100;
    const width = Math.max(1.5, ((endMs - startMs) / total) * 100);
    return { id: i.id, leftPct: left, widthPct: width, scheduled: true };
  });
}

/** Month tick labels between range.start and range.end (first of each month). */
export function monthTicks(range: { start: Date; end: Date }): { label: string; leftPct: number }[] {
  const total = range.end.getTime() - range.start.getTime();
  const out: { label: string; leftPct: number }[] = [];
  const cursor = new Date(range.start.getFullYear(), range.start.getMonth() + 1, 1);
  while (cursor.getTime() < range.end.getTime()) {
    const leftPct = ((cursor.getTime() - range.start.getTime()) / total) * 100;
    out.push({
      label: cursor.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
      leftPct,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

export function todayMarker(range: { start: Date; end: Date }, today: Date): number | null {
  if (today.getTime() < range.start.getTime() || today.getTime() > range.end.getTime()) return null;
  const total = range.end.getTime() - range.start.getTime();
  return ((today.getTime() - range.start.getTime()) / total) * 100;
}
