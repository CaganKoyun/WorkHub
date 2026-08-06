import { useMemo, useState } from 'react';
import { useWorkspaceIssues } from '@/lib/tasks-hooks';
import { useProjects, useAllProfiles } from '@/lib/projects-hooks';
import { useCycles } from '@/lib/cycles-hooks';
import type { Task } from '@/lib/tasks-types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskStatusIcon } from '@/components/tasks/TaskStatusIcon';
import { AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Bucket {
  key: string;
  name: string;
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  overdue: number;
  points: number;
  donePoints: number;
}

const UNASSIGNED = '__unassigned__';

function Row({ b }: { b: Bucket }) {
  const initials = b.key === UNASSIGNED
    ? '?'
    : b.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const active = b.todo + b.inProgress + b.review;
  const completion = b.total === 0 ? 0 : Math.round((b.done / b.total) * 100);
  return (
    <div className="rounded-md border border-border/60 bg-card px-4 py-3 hover:border-border transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <Avatar className="h-7 w-7">
          <AvatarFallback className={cn(
            "text-[10px] font-semibold",
            b.key === UNASSIGNED
              ? "bg-amber-500/20 text-warning"
              : "bg-sidebar-accent text-sidebar-accent-foreground"
          )}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-medium truncate">{b.name}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <span>{b.total} görev</span>
            {b.points > 0 && (
              <>
                <span className="opacity-60">·</span>
                <span className="font-mono tabular-nums">{b.donePoints}/{b.points} pts</span>
              </>
            )}
            {b.overdue > 0 && (
              <>
                <span className="opacity-60">·</span>
                <span className="text-destructive inline-flex items-center gap-0.5">
                  <AlertCircle className="h-3 w-3" /> {b.overdue} geciken
                </span>
              </>
            )}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-[11px] text-muted-foreground shrink-0">
          <div className="flex items-center gap-1">
            <TaskStatusIcon status="todo" size={11} />
            <span className="font-mono tabular-nums">{b.todo}</span>
          </div>
          <div className="flex items-center gap-1">
            <TaskStatusIcon status="in_progress" size={11} />
            <span className="font-mono tabular-nums">{b.inProgress}</span>
          </div>
          <div className="flex items-center gap-1">
            <TaskStatusIcon status="review" size={11} />
            <span className="font-mono tabular-nums">{b.review}</span>
          </div>
          <div className="flex items-center gap-1">
            <TaskStatusIcon status="done" size={11} />
            <span className="font-mono tabular-nums">{b.done}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-secondary/60 flex">
          {b.done > 0 && <div className="h-full bg-[hsl(var(--status-done))]" style={{ width: `${(b.done / b.total) * 100}%` }} />}
          {b.review > 0 && <div className="h-full bg-[hsl(var(--status-review))]" style={{ width: `${(b.review / b.total) * 100}%` }} />}
          {b.inProgress > 0 && <div className="h-full bg-[hsl(var(--status-in-progress))]" style={{ width: `${(b.inProgress / b.total) * 100}%` }} />}
          {b.todo > 0 && <div className="h-full bg-muted" style={{ width: `${(b.todo / b.total) * 100}%` }} />}
        </div>
        <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground w-14 text-right">
          %{completion} · {active}▮
        </span>
      </div>
    </div>
  );
}

export default function Workload() {
  const { data: tasks, isLoading } = useWorkspaceIssues();
  const { data: projects } = useProjects();
  const { data: profiles } = useAllProfiles();
  const { data: cycles } = useCycles();

  const [cycleFilter, setCycleFilter] = useState<'all' | string>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | string>('all');

  const nameMap = useMemo(
    () => new Map((profiles ?? []).map(p => [p.user_id, p.full_name ?? 'Kullanıcı'])),
    [profiles],
  );

  const scoped = useMemo(() => {
    let r = tasks ?? [];
    if (cycleFilter !== 'all') r = r.filter(t => t.cycle_id === cycleFilter);
    if (projectFilter !== 'all') r = r.filter(t => t.project_id === projectFilter);
    return r;
  }, [tasks, cycleFilter, projectFilter]);

  const buckets = useMemo<Bucket[]>(() => {
    const map = new Map<string, Bucket>();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const empty = (key: string, name: string): Bucket => ({
      key, name, total: 0, todo: 0, inProgress: 0, review: 0, done: 0,
      overdue: 0, points: 0, donePoints: 0,
    });
    for (const t of scoped) {
      const key = t.assignee_id ?? UNASSIGNED;
      const name = key === UNASSIGNED ? 'Atanmamış' : (nameMap.get(key) ?? 'Kullanıcı');
      const b = map.get(key) ?? empty(key, name);
      b.total++;
      if (t.status === 'todo' || t.status === 'backlog') b.todo++;
      else if (t.status === 'in_progress') b.inProgress++;
      else if (t.status === 'review') b.review++;
      else if (t.status === 'done') b.done++;

      if (t.due_date && t.status !== 'done') {
        const due = new Date(t.due_date); due.setHours(0, 0, 0, 0);
        if (due < today) b.overdue++;
      }
      if (t.story_points != null) {
        b.points += t.story_points;
        if (t.status === 'done') b.donePoints += t.story_points;
      }
      map.set(key, b);
    }
    return Array.from(map.values()).sort((a, b) => {
      // Unassigned last, then by total desc
      if (a.key === UNASSIGNED) return 1;
      if (b.key === UNASSIGNED) return -1;
      return b.total - a.total;
    });
  }, [scoped, nameMap]);

  const totals = useMemo(() => {
    return buckets.reduce(
      (acc, b) => ({
        total: acc.total + b.total,
        done: acc.done + b.done,
        overdue: acc.overdue + b.overdue,
        points: acc.points + b.points,
      }),
      { total: 0, done: 0, overdue: 0, points: 0 },
    );
  }, [buckets]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <div className="flex items-baseline justify-between">
          <h1 className="text-[20px] font-semibold tracking-tight">Workload</h1>
          <div className="text-[11.5px] text-muted-foreground tabular-nums">
            {totals.total} görev · {totals.done} bitmiş
            {totals.overdue > 0 && <> · <span className="text-destructive">{totals.overdue} geciken</span></>}
            {totals.points > 0 && <> · {totals.points} pts</>}
          </div>
        </div>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Kimin üzerine ne kadar iş düştüğünü gör; kapasite dengesizliğini erken yakala.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={cycleFilter} onValueChange={setCycleFilter}>
          <SelectTrigger className="w-40 h-8 text-[12px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm cycle'lar</SelectItem>
            {(cycles ?? []).map(c => (
              <SelectItem key={c.id} value={c.id}>#{c.number} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-40 h-8 text-[12px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm projeler</SelectItem>
            {(projects ?? []).map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : buckets.length === 0 ? (
        <div className="rounded-md border border-border/60 py-16 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-[13px] text-muted-foreground">Bu filtreye uyan iş yok.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {buckets.map(b => <Row key={b.key} b={b} />)}
        </div>
      )}
    </div>
  );
}
