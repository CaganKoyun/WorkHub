import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyTimeEntries, useDeleteTimeEntry, formatHMS, formatSeconds } from '@/lib/time-tracking-hooks';
import { useWorkspaceIssues } from '@/lib/tasks-hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Trash2, Timer } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, isSameDay } from 'date-fns';

export default function Timesheet() {
  const [weekOffset, setWeekOffset] = useState(0);
  const anchor = addWeeks(new Date(), weekOffset);
  const rangeStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(anchor, { weekStartsOn: 1 });

  const { data: entries, isLoading } = useMyTimeEntries(rangeStart.toISOString());
  const { data: tasks } = useWorkspaceIssues();
  const del = useDeleteTimeEntry();

  const taskMap = useMemo(() => new Map((tasks ?? []).map(t => [t.id, t])), [tasks]);

  const weekEntries = useMemo(() => {
    return (entries ?? []).filter(e => {
      const d = new Date(e.started_at);
      return d >= rangeStart && d <= rangeEnd;
    });
  }, [entries, rangeStart, rangeEnd]);

  const days = useMemo(() => {
    const arr: { date: Date; entries: typeof weekEntries; total: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + i);
      const es = weekEntries.filter(e => isSameDay(new Date(e.started_at), d));
      const total = es.reduce((s, e) => s + (e.duration_seconds ?? 0), 0);
      arr.push({ date: d, entries: es, total });
    }
    return arr;
  }, [weekEntries, rangeStart]);

  const weekTotal = days.reduce((s, d) => s + d.total, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight">Timesheet</h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Kaydettiğin süreler haftalık dilimlerde. TaskDetail'de timer başlat/manuel süre ekleyebilirsin.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border/60 bg-card px-3 py-2">
        <Button size="sm" variant="ghost" onClick={() => setWeekOffset(w => w - 1)} className="h-7 text-[12px]">← Önceki hafta</Button>
        <div className="text-[13px] font-medium">
          {format(rangeStart, 'MMM d')} – {format(rangeEnd, 'MMM d, yyyy')}
          <span className="ml-2 font-mono tabular-nums text-muted-foreground">{formatSeconds(weekTotal)}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setWeekOffset(w => w + 1)} className="h-7 text-[12px]" disabled={weekOffset >= 0}>Sonraki hafta →</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : weekTotal === 0 ? (
        <div className="rounded-md border border-border/60 py-16 text-center">
          <Timer className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-[13px] text-muted-foreground">Bu hafta kayıt yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {days.filter(d => d.entries.length > 0).map(d => (
            <section key={d.date.toISOString()} className="rounded-md border border-border/60 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30 px-3 py-1.5">
                <span className="text-[12px] font-medium">
                  {format(d.date, 'EEEE, MMM d')}
                </span>
                <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground">
                  {formatSeconds(d.total)}
                </span>
              </div>
              {d.entries.map(e => {
                const task = taskMap.get(e.task_id);
                return (
                  <div key={e.id} className="group flex items-center gap-3 border-b border-border/60 px-3 py-1.5 last:border-b-0 text-[12.5px] hover:bg-sidebar-accent/30">
                    <span className="font-mono tabular-nums text-muted-foreground w-14">
                      {e.duration_seconds != null ? formatHMS(e.duration_seconds) : '● live'}
                    </span>
                    <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground/70 w-14 shrink-0">
                      {task?.tracking_id ?? 'WH-—'}
                    </span>
                    {task ? (
                      <Link to={`/projects/${task.project_id}`} className="flex-1 truncate hover:underline">
                        {task.title}
                      </Link>
                    ) : (
                      <span className="flex-1 truncate text-muted-foreground">(silinmiş görev)</span>
                    )}
                    <span className="text-muted-foreground text-[11px] tabular-nums shrink-0">
                      {format(new Date(e.started_at), 'HH:mm')}
                      {e.ended_at && <> – {format(new Date(e.ended_at), 'HH:mm')}</>}
                    </span>
                    {e.note && <span className="text-muted-foreground text-[11px] truncate max-w-[200px] shrink-0">· {e.note}</span>}
                    <button
                      type="button"
                      onClick={() => del.mutate(e.id)}
                      className="h-6 w-6 grid place-items-center rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 text-muted-foreground"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
