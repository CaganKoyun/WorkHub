import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceIssues } from '@/lib/tasks-hooks';
import { useProjects, useAllProfiles } from '@/lib/projects-hooks';
import { useCycles } from '@/lib/cycles-hooks';
import type { Task } from '@/lib/tasks-types';
import { TASK_PRIORITY_LABELS } from '@/lib/tasks-types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { TaskStatusIcon, TaskPriorityIcon } from '@/components/tasks/TaskStatusIcon';
import { AlertCircle, CheckCircle2, Users, ChevronRight, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DomainWorkspace } from "@/components/DomainWorkspace";

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

function Row({ b, tasks, projectMap }: { b: Bucket; tasks: Task[]; projectMap: Map<string, string> }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const initials = b.key === UNASSIGNED
    ? '?'
    : b.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const active = b.todo + b.inProgress + b.review;
  const completion = b.total === 0 ? 0 : Math.round((b.done / b.total) * 100);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return (
    <div className="rounded-md border border-border/60 bg-card hover:border-border transition-colors">
      <div
        className="px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 mb-2">
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
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
      {expanded && tasks.length > 0 && (
        <div className="border-t border-border/40 px-4 py-1.5">
          {tasks.map(t => {
            const isOverdue = t.due_date && t.status !== 'done' && (() => {
              const d = new Date(t.due_date!); d.setHours(0, 0, 0, 0);
              return d < today;
            })();
            return (
              <div
                key={t.id}
                className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-muted/40 cursor-pointer transition-colors text-[12.5px]"
                onClick={(e) => { e.stopPropagation(); navigate(`/projects/${t.project_id}?task=${t.id}`); }}
              >
                <TaskStatusIcon status={t.status} size={12} />
                <TaskPriorityIcon priority={t.priority} size={12} />
                <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums w-16 shrink-0">{t.tracking_id ?? '—'}</span>
                <span className="truncate flex-1 font-medium">{t.title}</span>
                {t.project_id && projectMap.get(t.project_id) && (
                  <span className="text-[10.5px] text-muted-foreground truncate max-w-[100px] hidden md:inline">{projectMap.get(t.project_id)}</span>
                )}
                {t.due_date && (
                  <span className={cn("text-[10.5px] flex items-center gap-0.5 shrink-0", isOverdue ? "text-red-400 font-medium" : "text-muted-foreground")}>
                    <CalendarIcon className="h-3 w-3" /> {t.due_date}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
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

  const projectMap = useMemo(
    () => new Map((projects ?? []).map(p => [p.id, p.name])),
    [projects],
  );

  const tasksByAssignee = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of scoped) {
      const key = t.assignee_id ?? UNASSIGNED;
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [scoped]);

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
    <DomainWorkspace
      domain="tasks"
      title="İş Yükü"
      subtitle="Kimin üzerine ne kadar iş düştüğünü gör; kapasite dengesizliğini erken yakala."
      showAgent={false}
      maxWidth="max-w-4xl"
      headerActions={
        <div className="text-[11.5px] text-muted-foreground tabular-nums">
          {totals.total} görev · {totals.done} bitmiş
          {totals.overdue > 0 && <> · <span className="text-destructive">{totals.overdue} geciken</span></>}
          {totals.points > 0 && <> · {totals.points} pts</>}
        </div>
      }
    >
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
        <EmptyState
          icon={Users}
          title="Veri bulunamadi"
          description="Bu filtreye uyan is yok."
        />
      ) : (
        <div className="space-y-2">
          {buckets.map(b => <Row key={b.key} b={b} tasks={tasksByAssignee.get(b.key) ?? []} projectMap={projectMap} />)}
        </div>
      )}
    </DomainWorkspace>
  );
}
