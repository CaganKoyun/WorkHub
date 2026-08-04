import { useMemo } from 'react';
import type { Task } from '@/lib/tasks-types';
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@/lib/tasks-types';

const DAY = 24 * 60 * 60 * 1000;

export function ProjectTimelineTab({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  const timeline = useMemo(() => {
    const scheduled = tasks.filter(t => t.due_date);
    if (scheduled.length === 0) return null;
    const dates = scheduled.map(t => new Date(t.due_date!).getTime());
    const min = Math.min(...dates, Date.now());
    const max = Math.max(...dates, Date.now() + 14 * DAY);
    const start = new Date(min - 3 * DAY);
    const end = new Date(max + 3 * DAY);
    const totalDays = Math.max(14, Math.ceil((end.getTime() - start.getTime()) / DAY));
    return { start, end, totalDays, tasks: scheduled };
  }, [tasks]);

  if (!timeline) {
    return <p className="text-center py-16 text-sm text-muted-foreground">Tarihi olan görev yok. Görevlere bitiş tarihi ekleyince zaman çizelgesinde görünürler.</p>;
  }

  const { start, totalDays, tasks: scheduled } = timeline;
  const weeks = Math.ceil(totalDays / 7);

  return (
    <div className="border rounded-md overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid" style={{ gridTemplateColumns: `220px repeat(${totalDays}, minmax(24px, 1fr))` }}>
          <div className="bg-muted/50 border-b border-r px-3 py-2 text-xs font-medium">Görev</div>
          {Array.from({ length: weeks }).map((_, i) => {
            const d = new Date(start.getTime() + i * 7 * DAY);
            return (
              <div
                key={i}
                className="bg-muted/50 border-b text-[10px] text-muted-foreground px-1 py-2"
                style={{ gridColumn: `span 7` }}
              >
                {d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
              </div>
            );
          })}

          {scheduled.map(t => {
            const due = new Date(t.due_date!);
            const dayOffset = Math.max(0, Math.round((due.getTime() - start.getTime()) / DAY));
            const barStart = Math.max(0, dayOffset - 2);
            const barSpan = Math.min(4, totalDays - barStart);
            return (
              <>
                <button
                  key={`n-${t.id}`}
                  onClick={() => onOpen(t)}
                  className="border-b border-r px-3 py-2 text-xs text-left hover:bg-accent/50 truncate"
                  title={t.title}
                >
                  {t.title}
                </button>
                <div
                  key={`s-${t.id}`}
                  className="border-b relative h-8"
                  style={{ gridColumn: `${2 + barStart} / span ${barSpan}` }}
                >
                  <button
                    onClick={() => onOpen(t)}
                    className={`absolute inset-y-1 left-0 right-0 rounded border text-[10px] px-1.5 truncate ${TASK_STATUS_COLORS[t.status]}`}
                    title={`${TASK_STATUS_LABELS[t.status]} — ${t.due_date}`}
                  >
                    {TASK_STATUS_LABELS[t.status]}
                  </button>
                </div>
                <div key={`f-${t.id}`} className="border-b" style={{ gridColumn: `${2 + barStart + barSpan} / span ${Math.max(0, totalDays - barStart - barSpan)}` }} />
              </>
            );
          })}
        </div>
      </div>
    </div>
  );
}
