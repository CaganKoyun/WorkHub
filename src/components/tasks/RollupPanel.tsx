import { useMemo } from 'react';
import { evalFormula, type FormulaContext } from '@/lib/formula-eval';
import { Sigma, TrendingUp, Timer, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  ctx: FormulaContext;
  className?: string;
}

/**
 * Compact rollup strip for task detail — only renders tiles whose value is
 * meaningful (e.g., "story points sum" hidden when no subtask carries points).
 * All values derive from evalFormula so behavior stays consistent with
 * user-defined formula custom fields.
 */
export function RollupPanel({ ctx, className }: Props) {
  const tiles = useMemo(() => {
    const total = ctx.subtasks.length;
    const spSum = evalFormula('sum(subtasks.story_points)', ctx) as number;
    const hoursSum = evalFormula('sum(subtasks.estimated_hours)', ctx) as number;
    const pct = evalFormula('progress_pct(subtasks)', ctx) as number;
    const dueDays = evalFormula('days_until(due_date)', ctx) as number | null;
    const sinceDays = evalFormula('days_since(created_at)', ctx) as number | null;

    const out: { label: string; value: string; hint?: string; icon: React.ElementType; tone?: 'ok' | 'warn' | 'bad' | 'muted' }[] = [];

    if (total > 0) {
      const done = evalFormula('count(subtasks.done)', ctx) as number;
      out.push({
        icon: TrendingUp, label: 'Alt-task ilerleme',
        value: `${done}/${total} · %${pct}`,
        tone: pct === 100 ? 'ok' : pct >= 50 ? 'warn' : 'muted',
      });
    }
    if (spSum > 0) {
      out.push({ icon: Sigma, label: 'Story points (roll-up)', value: `${spSum}`, tone: 'muted' });
    }
    if (hoursSum > 0) {
      const actual = ctx.self.actual_hours ?? 0;
      const over = actual > hoursSum && hoursSum > 0;
      out.push({
        icon: Timer, label: 'Tahmini saat (roll-up)',
        value: actual ? `${actual}h / ${hoursSum}h` : `${hoursSum}h`,
        tone: over ? 'bad' : 'muted',
        hint: over ? 'gerçekleşen tahmini geçti' : undefined,
      });
    }
    if (dueDays !== null) {
      const t: 'ok' | 'warn' | 'bad' = dueDays < 0 ? 'bad' : dueDays <= 3 ? 'warn' : 'ok';
      out.push({
        icon: CalendarDays, label: 'Bitiş',
        value: dueDays === 0 ? 'bugün' : dueDays > 0 ? `${dueDays}g kaldı` : `${-dueDays}g geçti`,
        tone: t,
      });
    }
    if (sinceDays !== null && dueDays === null) {
      out.push({ icon: CalendarDays, label: 'Oluşturma', value: `${sinceDays}g önce`, tone: 'muted' });
    }
    return out;
  }, [ctx]);

  if (tiles.length === 0) return null;

  const toneClass: Record<'ok' | 'warn' | 'bad' | 'muted', string> = {
    ok: 'text-success',
    warn: 'text-warning',
    bad: 'text-destructive',
    muted: 'text-foreground',
  };

  return (
    <section className={cn('grid grid-cols-2 sm:grid-cols-4 gap-2', className)}>
      {tiles.map((t, i) => (
        <div key={i} className="rounded-md border border-border/60 bg-secondary/20 px-2.5 py-2" title={t.hint}>
          <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-muted-foreground">
            <t.icon className="h-3 w-3" /> {t.label}
          </div>
          <div className={cn('mt-1 text-[14px] font-medium tabular-nums font-mono', toneClass[t.tone ?? 'muted'])}>
            {t.value}
          </div>
        </div>
      ))}
    </section>
  );
}
