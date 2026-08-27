/**
 * Tiny formula DSL for rollup / computed fields — pure functions, safe by
 * construction (no eval, no dynamic property lookups beyond the whitelist).
 *
 * Supported forms:
 *   count(subtasks)                — # sub-tasks
 *   count(subtasks.done)           — # sub-tasks with status='done'
 *   count(subtasks.status:in_progress)
 *   sum(subtasks.<field>)          — story_points | estimated_hours | actual_hours
 *   avg(subtasks.<field>)
 *   days_until(<date-field>)       — due_date | created_at (self)
 *   days_since(<date-field>)
 *   progress_pct(subtasks)         — done/total * 100
 *
 * Anything else → "—" (rendered as em dash), never throws.
 */

export interface FormulaContext {
  self: {
    id: string;
    due_date?: string | null;
    created_at?: string;
    completed_at?: string | null;
    story_points?: number | null;
    estimated_hours?: number | null;
    actual_hours?: number | null;
  };
  subtasks: Array<{
    id: string;
    status?: string;
    story_points?: number | null;
    estimated_hours?: number | null;
    actual_hours?: number | null;
  }>;
}

export type FormulaValue = number | string | null;

const NUM_FIELDS = new Set(['story_points', 'estimated_hours', 'actual_hours']);
const DATE_SELF_FIELDS = new Set(['due_date', 'created_at', 'completed_at']);

function daysBetween(iso: string, now = Date.now()): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return NaN;
  return Math.round((t - now) / 86_400_000);
}

function sumField(subs: FormulaContext['subtasks'], field: string): number {
  return subs.reduce((s, t) => s + (Number((t as Record<string, unknown>)[field]) || 0), 0);
}

/** Evaluate a formula string against a task context. Returns null on
 *  unknown formula, NaN on bad date input; never throws. */
export function evalFormula(raw: string, ctx: FormulaContext, now = Date.now()): FormulaValue {
  const src = raw.trim();
  if (!src) return null;

  // count(subtasks) | count(subtasks.done) | count(subtasks.status:in_progress)
  let m = src.match(/^count\(subtasks(?:\.(\w+)(?::(\w+))?)?\)$/i);
  if (m) {
    const filter = m[1];
    const value = m[2];
    if (!filter) return ctx.subtasks.length;
    if (filter === 'done')       return ctx.subtasks.filter(t => t.status === 'done').length;
    if (filter === 'open')       return ctx.subtasks.filter(t => t.status !== 'done').length;
    if (filter === 'status' && value) {
      return ctx.subtasks.filter(t => t.status === value).length;
    }
    return null;
  }

  // sum(subtasks.<field>) | avg(subtasks.<field>)
  m = src.match(/^(sum|avg)\(subtasks\.(\w+)\)$/i);
  if (m) {
    const op = m[1].toLowerCase();
    const field = m[2];
    if (!NUM_FIELDS.has(field)) return null;
    const total = sumField(ctx.subtasks, field);
    if (op === 'sum') return total;
    if (op === 'avg') return ctx.subtasks.length ? Math.round((total / ctx.subtasks.length) * 100) / 100 : 0;
  }

  // days_until(<field>) | days_since(<field>)
  m = src.match(/^(days_until|days_since)\((\w+)\)$/i);
  if (m) {
    const kind = m[1].toLowerCase();
    const field = m[2];
    if (!DATE_SELF_FIELDS.has(field)) return null;
    const iso = ctx.self[field as keyof FormulaContext['self']] as string | null | undefined;
    if (!iso) return null;
    const days = daysBetween(iso, now);
    if (Number.isNaN(days)) return null;
    return kind === 'days_until' ? days : -days;
  }

  // progress_pct(subtasks)
  if (/^progress_pct\(subtasks\)$/i.test(src)) {
    if (ctx.subtasks.length === 0) return 0;
    const done = ctx.subtasks.filter(t => t.status === 'done').length;
    return Math.round((done / ctx.subtasks.length) * 100);
  }

  return null;
}

/** Human-readable menu of supported formulas, for UI hints. */
export const FORMULA_EXAMPLES: { label: string; formula: string }[] = [
  { label: 'Alt-task sayısı',            formula: 'count(subtasks)' },
  { label: 'Tamamlanan alt-task sayısı', formula: 'count(subtasks.done)' },
  { label: 'İlerleme %',                 formula: 'progress_pct(subtasks)' },
  { label: 'Story points toplamı',       formula: 'sum(subtasks.story_points)' },
  { label: 'Tahmini saat toplamı',       formula: 'sum(subtasks.estimated_hours)' },
  { label: 'Ortalama tahmini saat',      formula: 'avg(subtasks.estimated_hours)' },
  { label: 'Bitiş tarihine kalan gün',   formula: 'days_until(due_date)' },
  { label: 'Oluşturmadan bu yana gün',   formula: 'days_since(created_at)' },
];

export function formatFormulaValue(v: FormulaValue, suffix?: string): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return `${v}${suffix ?? ''}`;
  return String(v);
}
