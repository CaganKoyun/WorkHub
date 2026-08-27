import { useMemo, useState } from 'react';
import type { Task } from '@/lib/tasks-types';
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS, TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS } from '@/lib/tasks-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function fmt(d: Date) { return d.toISOString().slice(0, 10); }

export function ProjectCalendarTab({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  const [cursor, setCursor] = useState(() => new Date());

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    const startWeekday = (first.getDay() + 6) % 7; // Monday=0
    const days: (Date | null)[] = Array.from({ length: startWeekday }, () => null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [cursor]);

  const byDate = useMemo(() => {
    const m = new Map<string, Task[]>();
    tasks.forEach(t => {
      if (!t.due_date) return;
      const key = t.due_date.slice(0, 10);
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    });
    return m;
  }, [tasks]);

  const monthLabel = cursor.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium capitalize">{monthLabel}</p>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Önceki ay" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setCursor(new Date())}>Bugün</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Sonraki ay" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden border">
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
          <div key={d} className="bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground text-center">{d}</div>
        ))}
        {cells.map((d, i) => {
          const key = d ? fmt(d) : null;
          const items = key ? byDate.get(key) ?? [] : [];
          const isToday = key === fmt(new Date());
          return (
            <div key={i} className={`bg-card min-h-[92px] p-1.5 ${isToday ? 'ring-1 ring-primary ring-inset' : ''}`}>
              {d && <p className={`text-[11px] mb-1 ${isToday ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{d.getDate()}</p>}
              <div className="space-y-1">
                {items.slice(0, 3).map(t => (
                  <button
                    key={t.id}
                    onClick={() => onOpen(t)}
                    className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded border truncate ${TASK_STATUS_COLORS[t.status]}`}
                    title={t.title}
                  >
                    {t.title}
                  </button>
                ))}
                {items.length > 3 && <p className="text-[10px] text-muted-foreground">+{items.length - 3}</p>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 text-[10px]">
        {(Object.keys(TASK_STATUS_LABELS) as (keyof typeof TASK_STATUS_LABELS)[]).map(s => (
          <Badge key={s} className={`border ${TASK_STATUS_COLORS[s]}`}>{TASK_STATUS_LABELS[s]}</Badge>
        ))}
        {(Object.keys(TASK_PRIORITY_LABELS) as (keyof typeof TASK_PRIORITY_LABELS)[]).map(p => (
          <Badge key={p} className={TASK_PRIORITY_COLORS[p]}>{TASK_PRIORITY_LABELS[p]}</Badge>
        ))}
      </div>
    </div>
  );
}
